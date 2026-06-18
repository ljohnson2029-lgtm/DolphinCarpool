import { useState, useEffect, useCallback } from "react";
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
      const name = p ? [p.first_name, p.last_name].filter(Boolean).join(" ") || p.username : "Parent";
      const lastMsg = msgRes.data?.[0];

      enriched.push({
        ...sp,
        other_parent_name: name,
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
