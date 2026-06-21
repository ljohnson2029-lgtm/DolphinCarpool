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
  Route, MapPin, GraduationCap, ChevronRight,
  MessageCircle, Users, Bot, Zap, Navigation,
} from "lucide-react";

interface PiggybackSuggestion {
  parent_id: string;
  first_name: string;
  last_name: string;
  username: string;
  distance_from_route_miles: number;
  ride_pickup: string;
  ride_dropoff: string;
  ride_date: string;
  ride_type: string;
  their_kids: string[];
  their_grades: string[];
  already_connected: boolean;
  ai_summary: string | null;
  detour_label: string;
}

const PiggybackRoutes = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [suggestions, setSuggestions] = useState<PiggybackSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [noRides, setNoRides] = useState(false);
  const [aiPowered, setAiPowered] = useState(false);
  const [matchMode, setMatchMode] = useState<"route" | "proximity">("route");

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase.functions.invoke("suggest-piggyback-routes");
        if (error) throw error;
        if (data?.reason === "no_matches") {
          setNoRides(true);
          setSuggestions([]);
        } else {
          setSuggestions(data?.suggestions || []);
          setAiPowered(data?.ai_powered || false);
          setMatchMode(data?.match_mode || "route");
        }
      } catch {
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [user]);

  const getInitials = (first: string, last: string, username: string) => {
    if (first && last) return `${first[0]}${last[0]}`.toUpperCase();
    return username.substring(0, 2).toUpperCase();
  };

  const getName = (s: PiggybackSuggestion) =>
    [s.first_name, s.last_name].filter(Boolean).join(" ") || s.username;

  const getDetourStyle = (label: string) => {
    if (label === "Right on your route") return "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400";
    if (label === "Tiny detour") return "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400";
    return "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400";
  };

  const shortenAddress = (addr: string) => {
    const parts = addr.split(",");
    return parts[0]?.trim() || addr;
  };

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-5" />
          <Skeleton className="h-6 w-52" />
        </div>
        <div className="flex gap-3 overflow-x-auto pb-2">
          {[1, 2].map(i => (
            <Skeleton key={i} className="min-w-[300px] h-[210px] rounded-xl flex-shrink-0" />
          ))}
        </div>
      </div>
    );
  }

  if (noRides || suggestions.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-violet-100 dark:bg-violet-950 flex items-center justify-center">
            <Route className="h-4 w-4 text-violet-600 dark:text-violet-400" />
          </div>
          <h2 className="text-lg font-semibold text-foreground">
            {matchMode === "route" ? "On Your Route" : "Nearby Families"}
          </h2>
        </div>
        <Badge variant="secondary" className="text-xs gap-1">
          {aiPowered ? <Bot className="h-3 w-3" /> : <Zap className="h-3 w-3" />}
          {aiPowered ? "AI-Powered" : matchMode === "route" ? "Route Match" : "Proximity"}
        </Badge>
      </div>
      <p className="text-xs text-muted-foreground -mt-1">
        {matchMode === "route"
          ? "Families who live along your existing commute — easy piggyback carpools"
          : "Families who live near you — great potential carpool partners"}
      </p>

      <div className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory sm:grid sm:grid-cols-2 lg:grid-cols-3 sm:overflow-visible">
        {suggestions.map(s => (
          <Card
            key={s.parent_id}
            className="min-w-[290px] sm:min-w-0 flex-shrink-0 snap-start rounded-xl border hover:shadow-md transition-all"
          >
            <CardContent className="p-4 space-y-3">
              {/* Header */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                  <Avatar className="h-10 w-10 border border-violet-200 dark:border-violet-800">
                    <AvatarFallback className="bg-violet-50 dark:bg-violet-950 text-violet-600 dark:text-violet-400 text-sm font-bold">
                      {getInitials(s.first_name, s.last_name, s.username)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-semibold text-sm text-foreground leading-tight">{getName(s)}</h3>
                    <div className="flex items-center gap-1 mt-0.5">
                      <Users className="h-3 w-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">Parent</span>
                    </div>
                  </div>
                </div>
                <Badge className={`text-[10px] px-1.5 py-0.5 ${getDetourStyle(s.detour_label)} border-0`}>
                  {s.detour_label}
                </Badge>
              </div>

              {/* AI Summary */}
              {s.ai_summary && (
                <p className="text-xs text-foreground/80 italic bg-muted/50 rounded-md px-2.5 py-1.5 leading-relaxed">
                  "{s.ai_summary}"
                </p>
              )}

              {/* Verified facts */}
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Navigation className="h-3 w-3 text-violet-500" />
                  <span>{s.distance_from_route_miles < 0.3 ? "Directly on" : `${s.distance_from_route_miles} mi from`} your route</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <MapPin className="h-3 w-3 text-violet-500" />
                  <span className="truncate">{shortenAddress(s.ride_pickup)} → {shortenAddress(s.ride_dropoff)}</span>
                </div>
                {s.their_grades.length > 0 && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <GraduationCap className="h-3 w-3 text-violet-500" />
                    <span>Kids in {[...new Set(s.their_grades)].join(", ")}</span>
                  </div>
                )}
              </div>

              {/* Action */}
              <Button
                size="sm"
                variant="outline"
                className="w-full text-xs h-8 gap-1.5"
                onClick={() => {
                  const nm = encodeURIComponent([s.first_name, s.last_name].filter(Boolean).join(" ") || s.username);
                  navigate(`/series?startWith=${s.parent_id}&name=${nm}`);
                }}
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

export default PiggybackRoutes;
