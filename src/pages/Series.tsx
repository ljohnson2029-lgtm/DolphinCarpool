import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { DashboardLayout } from "@/components/DashboardLayout";
import SEO from "@/components/SEO";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, MessageSquare, Users } from "lucide-react";
import SeriesParentSearch from "@/components/series/SeriesParentSearch";
import SeriesSpaceView from "@/components/series/SeriesSpaceView";

interface SeriesSpace {
  id: string;
  parent_a_id: string;
  parent_b_id: string;
  created_at: string;
  other_parent_name: string;
  last_message?: string;
  last_message_at?: string;
  unread_count: number;
}

const Series = () => {
  const { user } = useAuth();
  const [spaces, setSpaces] = useState<SeriesSpace[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSearch, setShowSearch] = useState(false);
  const [activeSpaceId, setActiveSpaceId] = useState<string | null>(null);
  const [activeOtherParentName, setActiveOtherParentName] = useState("");
  const [searchParams, setSearchParams] = useSearchParams();

  const fetchSpaces = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const { data: rawSpaces } = await supabase
      .from("series_spaces")
      .select("*")
      .or(`parent_a_id.eq.${user.id},parent_b_id.eq.${user.id}`)
      .order("created_at", { ascending: false });

    if (!rawSpaces || rawSpaces.length === 0) {
      setSpaces([]);
      setLoading(false);
      return;
    }

    const enriched: SeriesSpace[] = [];
    for (const sp of rawSpaces) {
      const otherId = sp.parent_a_id === user.id ? sp.parent_b_id : sp.parent_a_id;

      const [profileRes, msgRes, unreadRes] = await Promise.all([
        supabase.from("profiles").select("first_name, last_name, username").eq("id", otherId).maybeSingle(),
        supabase.from("series_messages").select("message_text, created_at").eq("space_id", sp.id).order("created_at", { ascending: false }).limit(1),
        supabase.from("series_messages").select("id", { count: "exact", head: true }).eq("space_id", sp.id).eq("is_read", false).neq("sender_id", user.id),
      ]);

      const p = profileRes.data;
      let name = p ? [p.first_name, p.last_name].filter(Boolean).join(" ") || p.username || "" : "";

      // Fallback: RLS blocks cross-party profile reads on pending spaces — use edge function
      if (!name) {
        try {
          const { data: edgeData } = await supabase.functions.invoke("get-parent-profile", {
            body: { parent_id: otherId },
          });
          const ep = (edgeData as any)?.profile;
          if (ep) {
            name = [ep.first_name, ep.last_name].filter(Boolean).join(" ") || ep.username || "";
          }
        } catch { /* ignore */ }
      }

      const lastMsg = msgRes.data?.[0];

      enriched.push({
        ...sp,
        other_parent_name: name || "Partner",
        last_message: lastMsg?.message_text,
        last_message_at: lastMsg?.created_at,
        unread_count: unreadRes.count || 0,
      });

    }

    setSpaces(enriched);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchSpaces();
  }, [fetchSpaces]);

  // Auto-open a space when navigated with ?space=<id>
  useEffect(() => {
    const targetSpaceId = searchParams.get("space");
    if (!targetSpaceId || activeSpaceId === targetSpaceId || spaces.length === 0) return;
    const match = spaces.find((s) => s.id === targetSpaceId);
    if (match) {
      setActiveSpaceId(match.id);
      setActiveOtherParentName(match.other_parent_name);
      searchParams.delete("space");
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, spaces, activeSpaceId, setSearchParams]);

  // Auto-start (or open) a space when navigated with ?startWith=<parentId>
  useEffect(() => {
    const startWith = searchParams.get("startWith");
    if (!startWith || !user || loading) return;

    const existing = spaces.find(
      (s) =>
        (s.parent_a_id === user.id && s.parent_b_id === startWith) ||
        (s.parent_b_id === user.id && s.parent_a_id === startWith)
    );
    if (existing) {
      setActiveSpaceId(existing.id);
      setActiveOtherParentName(existing.other_parent_name);
      searchParams.delete("startWith");
      setSearchParams(searchParams, { replace: true });
      return;
    }

    let cancelled = false;
    (async () => {
      const nameFromUrl = searchParams.get("name");
      let name = nameFromUrl?.trim() || "";
      if (!name) {
        const { data: prof } = await supabase
          .from("profiles")
          .select("first_name, last_name, username")
          .eq("id", startWith)
          .maybeSingle();
        if (prof) {
          name = [prof.first_name, prof.last_name].filter(Boolean).join(" ") || prof.username || "";
        }
        if (!name) {
          try {
            const { data: edgeData } = await supabase.functions.invoke("get-parent-profile", {
              body: { parent_id: startWith },
            });
            const p = (edgeData as any)?.profile;
            if (p) {
              name = [p.first_name, p.last_name].filter(Boolean).join(" ") || p.username || "";
            }
          } catch { /* ignore */ }
        }
      }
      if (!name) name = "Parent";
      const [aId, bId] = [user.id, startWith].sort();
      const { data, error } = await supabase
        .from("series_spaces")
        .insert({ parent_a_id: aId, parent_b_id: bId, created_by: user.id, status: "pending" })
        .select("id")
        .single();

      let spaceId = data?.id;
      if (error || !spaceId) {
        const { data: found } = await supabase
          .from("series_spaces")
          .select("id")
          .or(`and(parent_a_id.eq.${aId},parent_b_id.eq.${bId}),and(parent_a_id.eq.${bId},parent_b_id.eq.${aId})`)
          .maybeSingle();
        spaceId = found?.id;
      }
      if (cancelled || !spaceId) return;
      searchParams.delete("startWith");
      searchParams.delete("name");
      setSearchParams(searchParams, { replace: true });
      setActiveSpaceId(spaceId);
      setActiveOtherParentName(name);
      fetchSpaces();
    })();
    return () => { cancelled = true; };
  }, [searchParams, user, spaces, loading, setSearchParams, fetchSpaces]);


  const handleSpaceCreated = (spaceId: string, otherParentName: string) => {
    setShowSearch(false);
    setActiveSpaceId(spaceId);
    setActiveOtherParentName(otherParentName);
    fetchSpaces();
  };

  const openSpace = (space: SeriesSpace) => {
    setActiveSpaceId(space.id);
    setActiveOtherParentName(space.other_parent_name);
  };

  if (activeSpaceId) {
    return (
      <DashboardLayout>
        <SeriesSpaceView
          spaceId={activeSpaceId}
          otherParentName={activeOtherParentName}
          onBack={() => {
            setActiveSpaceId(null);
            fetchSpaces();
          }}
        />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <SEO
        title="Carpool Series — Dolphin Carpool"
        description="Set up and manage recurring weekly carpool series with linked partner parents."
        path="/series"
      />
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Series</h1>
          <p className="text-sm text-muted-foreground mt-1">
            For weekly recurring rides with another parent, use this tab to coordinate and set up your schedule together
          </p>
        </div>

        {showSearch ? (
          <div className="space-y-4">
            <Button variant="ghost" size="sm" onClick={() => setShowSearch(false)}>← Back</Button>
            <SeriesParentSearch onSpaceCreated={handleSpaceCreated} existingSpaces={spaces} />
          </div>
        ) : (
          <>
            <Button onClick={() => setShowSearch(true)} className="gap-2">
              <Plus className="h-4 w-4" /> Start New Series
            </Button>

            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 w-full rounded-lg" />)}
              </div>
            ) : spaces.length === 0 ? (
              <div className="text-center py-12">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">No series spaces yet. Start one with another parent!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {spaces.map((space) => (
                  <Card
                    key={space.id}
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => openSpace(space)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-foreground">{space.other_parent_name}</h3>
                            {space.unread_count > 0 && (
                              <Badge className="bg-primary text-primary-foreground text-xs">
                                {space.unread_count} new
                              </Badge>
                            )}
                          </div>
                          {space.last_message && (
                            <p className="text-sm text-muted-foreground truncate mt-1">
                              <MessageSquare className="h-3 w-3 inline mr-1" />
                              {space.last_message}
                            </p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Series;
