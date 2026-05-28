import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  MapPin, Calendar, GraduationCap, Sparkles,
  MessageCircle, Users, ChevronRight, Bot,
  Navigation, Route,
} from "lucide-react";

interface UnifiedSuggestion {
  id: string;
  first_name: string;
  last_name: string;
  username: string;
  badge_label: string;
  badge_style: string;
  reasons: string[];
  ai_summary: string | null;
  source: "route" | "proximity" | "smart";
  already_connected?: boolean;
  neighborhood?: string;
}

const SuggestedPartners = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [suggestions, setSuggestions] = useState<UnifiedSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [noAddress, setNoAddress] = useState(false);
  const [aiPowered, setAiPowered] = useState(false);

  useEffect(() => {
    if (!user) return;

    const fetchAll = async () => {
      setLoading(true);
      const unified: UnifiedSuggestion[] = [];
      const seenIds = new Set<string>();

      // Fetch both in parallel
      const [piggybackRes, partnerRes] = await Promise.all([
        supabase.functions.invoke("suggest-piggyback-routes").catch(() => ({ data: null, error: true })),
        supabase.functions.invoke("suggest-carpool-partners").catch(() => ({ data: null, error: true })),
      ]);

      // Process piggyback/route matches first (higher priority)
      const pbData = piggybackRes?.data;
      if (pbData?.suggestions?.length > 0) {
        for (const s of pbData.suggestions) {
          if (seenIds.has(s.parent_id)) continue;
          seenIds.add(s.parent_id);

          const distLabel = s.detour_label || (s.distance_from_route_miles < 0.3 ? "Right on your route" : s.distance_from_route_miles < 1 ? "Tiny detour" : "Small detour");
          const reasons: string[] = [];
          if (pbData.match_mode === "route") {
            reasons.push(s.distance_from_route_miles < 0.3 ? "Directly on your commute route" : `${s.distance_from_route_miles} mi from your route`);
          } else {
            reasons.push(`${s.distance_from_route_miles} mi from your home`);
          }
          if (s.their_grades?.length > 0) reasons.push(`Kids in ${[...new Set(s.their_grades)].join(", ")}`);
          if (s.their_kids?.length > 0) reasons.push(`${s.their_kids.length} kid${s.their_kids.length > 1 ? "s" : ""} in our community`);

          unified.push({
            id: s.parent_id,
            first_name: s.first_name,
            last_name: s.last_name,
            username: s.username,
            badge_label: distLabel,
            badge_style: getBadgeStyle(distLabel),
            reasons,
            ai_summary: s.ai_summary,
            source: pbData.match_mode === "route" ? "route" : "proximity",
            already_connected: s.already_connected,
            neighborhood: s.ride_pickup ? shortenAddress(s.ride_pickup) : "",
          });
        }
        if (pbData.ai_powered) setAiPowered(true);
      }

      // Process smart match suggestions
      const spData = partnerRes?.data;
      if (spData?.reason === "no_address" && unified.length === 0) {
        setNoAddress(true);
      }
      if (spData?.suggestions?.length > 0) {
        for (const s of spData.suggestions) {
          if (seenIds.has(s.id)) continue;
          seenIds.add(s.id);

          unified.push({
            id: s.id,
            first_name: s.first_name,
            last_name: s.last_name,
            username: s.username,
            badge_label: getConfidenceLabel(s.confidence),
            badge_style: getConfidenceStyle(s.confidence),
            reasons: s.reasons?.slice(0, 3) || [],
            ai_summary: s.ai_summary,
            source: "smart",
            neighborhood: s.neighborhood || "",
          });
        }
        if (spData.ai_powered) setAiPowered(true);
      }

      setSuggestions(unified.slice(0, 4));
      setLoading(false);
    };

    fetchAll();
  }, [user]);

  const getInitials = (first: string, last: string, username: string) => {
    if (first && last) return `${first[0]}${last[0]}`.toUpperCase();
    return username.substring(0, 2).toUpperCase();
  };

  const getName = (s: UnifiedSuggestion) =>
    [s.first_name, s.last_name].filter(Boolean).join(" ") || s.username;

  const shortenAddress = (addr: string) => {
    const parts = addr.split(",");
    return parts[0]?.trim() || addr;
  };

  const getReasonIcon = (reason: string) => {
    const r = reason.toLowerCase();
    if (r.includes("route") || r.includes("commute")) return <Navigation className="h-3 w-3" />;
    if (r.includes("mile") || r.includes("away") || r.includes("nearby") || r.includes("close") || r.includes("home")) return <MapPin className="h-3 w-3" />;
    if (r.includes("schedule") || r.includes("day") || r.includes("mon") || r.includes("tue") || r.includes("wed") || r.includes("thu") || r.includes("fri")) return <Calendar className="h-3 w-3" />;
    if (r.includes("grade") || r.includes("kid") || r.includes("child") || r.includes("th ") || r.includes("nd ") || r.includes("rd ") || r.includes("st ") || r.includes("community")) return <GraduationCap className="h-3 w-3" />;
    return <Sparkles className="h-3 w-3" />;
  };

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-5" />
          <Skeleton className="h-6 w-48" />
        </div>
        <div className="flex gap-3 overflow-x-auto pb-2">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="min-w-[280px] h-[200px] rounded-xl flex-shrink-0" />
          ))}
        </div>
      </div>
    );
  }

  if (noAddress) {
    return (
      <Card className="border-dashed border-2 border-muted-foreground/20">
        <CardContent className="p-5 text-center space-y-2">
          <MapPin className="h-8 w-8 mx-auto text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">
            Add your home address in{" "}
            <button className="text-primary underline" onClick={() => navigate("/profile")}>
              Profile Settings
            </button>{" "}
            to get personalized carpool suggestions.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (suggestions.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <h2 className="text-lg font-semibold text-foreground">Suggested for You</h2>
        </div>
        <Badge variant="secondary" className="text-xs gap-1">
          {aiPowered ? <Bot className="h-3 w-3" /> : <Sparkles className="h-3 w-3" />}
          {aiPowered ? "AI-Powered" : "Smart Match"}
        </Badge>
      </div>
      <p className="text-xs text-muted-foreground -mt-1">
        Families matched by route, proximity, schedule, and grade level
      </p>

      <div className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory sm:grid sm:grid-cols-2 lg:grid-cols-3 sm:overflow-visible">
        {suggestions.map(s => (
          <Card
            key={s.id}
            className="min-w-[280px] sm:min-w-0 flex-shrink-0 snap-start rounded-xl border hover:shadow-md transition-all"
          >
            <CardContent className="p-4 space-y-3">
              {/* Header */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                  <Avatar className="h-10 w-10 border border-primary/20">
                    <AvatarFallback className="bg-primary/10 text-primary text-sm font-bold">
                      {getInitials(s.first_name, s.last_name, s.username)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-semibold text-sm text-foreground leading-tight">{getName(s)}</h3>
                    <div className="flex items-center gap-1 mt-0.5">
                      {s.source === "route" ? (
                        <>
                          <Route className="h-3 w-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">On your route</span>
                        </>
                      ) : s.neighborhood ? (
                        <>
                          <MapPin className="h-3 w-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground truncate max-w-[140px]">{s.neighborhood}</span>
                        </>
                      ) : (
                        <>
                          <Users className="h-3 w-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">Parent</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <Badge className={`text-[10px] px-1.5 py-0.5 ${s.badge_style} border-0`}>
                  {s.badge_label}
                </Badge>
              </div>

              {/* AI Summary */}
              {s.ai_summary && (
                <p className="text-xs text-foreground/80 italic bg-muted/50 rounded-md px-2.5 py-1.5 leading-relaxed">
                  "{s.ai_summary}"
                </p>
              )}

              {/* Reasons */}
              <div className="space-y-1">
                {s.reasons.slice(0, 3).map((reason, i) => (
                  <div key={i} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span className="text-primary/70">{getReasonIcon(reason)}</span>
                    <span>{reason}</span>
                  </div>
                ))}
              </div>

              {/* Action */}
              <Button
                size="sm"
                variant="outline"
                className="w-full text-xs h-8 gap-1.5"
                onClick={() => navigate(`/series?startWith=${s.id}`)}
              >
                <MessageCircle className="h-3.5 w-3.5" />
                {s.already_connected ? "View Series" : "Start Series"}
                <ChevronRight className="h-3 w-3 ml-auto" />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

function getBadgeStyle(label: string): string {
  if (label.includes("Right on") || label.includes("Less than")) return "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400";
  if (label.includes("Tiny") || label.includes("Nearby")) return "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400";
  return "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400";
}

function getConfidenceStyle(confidence: string): string {
  if (confidence === "great") return "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400";
  if (confidence === "good") return "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400";
  return "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400";
}

function getConfidenceLabel(confidence: string): string {
  if (confidence === "great") return "Great Match";
  if (confidence === "good") return "Good Match";
  return "Potential Match";
}

export default SuggestedPartners;
