import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { getCorsHeaders, handleCorsPreflightIfNeeded } from "../_shared/cors.ts";

function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3958.8;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(a));
}

function pointToSegmentDistance(
  pLat: number, pLon: number,
  aLat: number, aLon: number,
  bLat: number, bLon: number,
): number {
  const cosLat = Math.cos(((aLat + bLat) / 2) * Math.PI / 180);
  const ax = aLon * cosLat, ay = aLat;
  const bx = bLon * cosLat, by = bLat;
  const px = pLon * cosLat, py = pLat;
  const dx = bx - ax, dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  let t = lenSq === 0 ? 0 : ((px - ax) * dx + (py - ay) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const closestLat = aLat + t * (bLat - aLat);
  const closestLon = aLon + t * (bLon - aLon);
  return haversine(pLat, pLon, closestLat, closestLon);
}

interface PiggybackMatch {
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
}

serve(async (req) => {
  const preflightResponse = handleCorsPreflightIfNeeded(req);
  if (preflightResponse) return preflightResponse;
  const corsHeaders = getCorsHeaders(req);

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, serviceKey);

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const [
      { data: myProfile },
      { data: myRides },
      { data: allParents },
      { data: allChildren },
      { data: existingSpaces },
    ] = await Promise.all([
      supabase.from("profiles").select("id, first_name, last_name, home_latitude, home_longitude")
        .eq("id", user.id).single(),
      supabase.from("rides").select("id, pickup_latitude, pickup_longitude, dropoff_latitude, dropoff_longitude, pickup_location, dropoff_location, ride_date, ride_time, type")
        .eq("user_id", user.id).eq("status", "active")
        .not("pickup_latitude", "is", null).not("dropoff_latitude", "is", null),
      supabase.from("profiles").select("id, first_name, last_name, username, home_latitude, home_longitude, home_address, account_type")
        .eq("account_type", "parent").neq("id", user.id)
        .not("home_latitude", "is", null).not("home_longitude", "is", null),
      supabase.from("children").select("user_id, first_name, grade_level"),
      supabase.from("series_spaces").select("parent_a_id, parent_b_id")
        .or(`parent_a_id.eq.${user.id},parent_b_id.eq.${user.id}`),
    ]);

    // Build children lookup
    const childrenByParent: Record<string, { first_name: string; grade_level: string | null }[]> = {};
    for (const c of (allChildren || [])) {
      if (!childrenByParent[c.user_id]) childrenByParent[c.user_id] = [];
      childrenByParent[c.user_id].push({ first_name: c.first_name, grade_level: c.grade_level });
    }

    // Existing connections to exclude
    const connectedPartners = new Set<string>();
    for (const sp of (existingSpaces || [])) {
      connectedPartners.add(sp.parent_a_id === user.id ? sp.parent_b_id : sp.parent_a_id);
    }

    const MAX_DETOUR_MILES = 2.0;
    const MAX_PROXIMITY_MILES = 5.0;
    const matchMap = new Map<string, PiggybackMatch>();
    let matchMode: "route" | "proximity" = "route";

    // --- MODE 1: Route-based matching (when user has active rides) ---
    if (myRides && myRides.length > 0) {
      for (const ride of myRides) {
        const pLat = ride.pickup_latitude!;
        const pLon = ride.pickup_longitude!;
        const dLat = ride.dropoff_latitude!;
        const dLon = ride.dropoff_longitude!;

        for (const parent of (allParents || [])) {
          const distFromRoute = pointToSegmentDistance(
            parent.home_latitude!, parent.home_longitude!,
            pLat, pLon, dLat, dLon,
          );
          if (distFromRoute > MAX_DETOUR_MILES) continue;

          const existing = matchMap.get(parent.id);
          if (existing && existing.distance_from_route_miles <= distFromRoute) continue;

          const kids = childrenByParent[parent.id] || [];
          matchMap.set(parent.id, {
            parent_id: parent.id,
            first_name: parent.first_name || "",
            last_name: parent.last_name || "",
            username: parent.username,
            distance_from_route_miles: Math.round(distFromRoute * 10) / 10,
            ride_pickup: ride.pickup_location,
            ride_dropoff: ride.dropoff_location,
            ride_date: ride.ride_date,
            ride_type: ride.type,
            their_kids: kids.map(k => k.first_name).filter(Boolean),
            their_grades: kids.map(k => k.grade_level).filter((g): g is string => !!g),
            already_connected: connectedPartners.has(parent.id),
          });
        }
      }
    }

    // --- MODE 2: Home proximity fallback (when no rides or no route matches) ---
    if (matchMap.size === 0 && myProfile?.home_latitude && myProfile?.home_longitude) {
      matchMode = "proximity";
      for (const parent of (allParents || [])) {
        const dist = haversine(
          myProfile.home_latitude, myProfile.home_longitude,
          parent.home_latitude!, parent.home_longitude!,
        );
        if (dist > MAX_PROXIMITY_MILES) continue;

        const kids = childrenByParent[parent.id] || [];
        matchMap.set(parent.id, {
          parent_id: parent.id,
          first_name: parent.first_name || "",
          last_name: parent.last_name || "",
          username: parent.username,
          distance_from_route_miles: Math.round(dist * 10) / 10,
          ride_pickup: parent.home_address || "Near you",
          ride_dropoff: "Chadwick School",
          ride_date: "",
          ride_type: "nearby",
          their_kids: kids.map(k => k.first_name).filter(Boolean),
          their_grades: kids.map(k => k.grade_level).filter((g): g is string => !!g),
          already_connected: connectedPartners.has(parent.id),
        });
      }
    }

    if (matchMap.size === 0) {
      return new Response(JSON.stringify({ suggestions: [], reason: "no_matches" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const allMatches = [...matchMap.values()]
      .sort((a, b) => a.distance_from_route_miles - b.distance_from_route_miles)
      .slice(0, 10);

    // Detour labels
    const getDetourLabel = (dist: number, mode: string) => {
      if (mode === "proximity") {
        if (dist < 1) return "Less than 1 mi away";
        if (dist < 2) return "Nearby neighbor";
        return `${dist} mi away`;
      }
      if (dist < 0.3) return "Right on your route";
      if (dist < 1) return "Tiny detour";
      return "Small detour";
    };

    // Try AI summaries
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const myName = [myProfile?.first_name, myProfile?.last_name].filter(Boolean).join(" ");

    if (!LOVABLE_API_KEY) {
      const suggestions = allMatches.slice(0, 5).map(m => ({
        ...m,
        ai_summary: null,
        detour_label: getDetourLabel(m.distance_from_route_miles, matchMode),
      }));
      return new Response(JSON.stringify({ suggestions, ai_powered: false, match_mode: matchMode }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const contextDesc = matchMode === "route"
      ? `${myName} has active rides. We found parents whose homes are near ${myName}'s existing routes.`
      : `${myName} has no active rides yet but we found parents who live nearby and could be great carpool partners.`;

    const candidateLines = allMatches.map((m, i) =>
      `${i + 1}. "${m.first_name} ${m.last_name}" — ${matchMode === "route" ? `home is ${m.distance_from_route_miles} mi from route` : `lives ${m.distance_from_route_miles} mi away`}, ` +
      `kids: ${m.their_kids.length > 0 ? m.their_kids.join(", ") : "unknown"}, ` +
      `grades: ${m.their_grades.length > 0 ? m.their_grades.join(", ") : "unknown"}, ` +
      `${m.already_connected ? "already connected" : "not yet connected"}`
    ).join("\n");

    const prompt = `You are a carpool matching assistant for Dolphin Community families.

CONTEXT: ${contextDesc}

CANDIDATES:
${candidateLines}

TASK: For each candidate, write a single warm sentence (max 25 words) explaining why carpooling would be convenient. Do NOT include specific distances, grade levels, or child names — those are displayed separately. Focus on proximity and convenience.

Return the top 5.`;

    try {
      const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: "You are a carpool route matching AI. Return ONLY valid JSON via the tool call." },
            { role: "user", content: prompt },
          ],
          tools: [{
            type: "function",
            function: {
              name: "piggyback_suggestions",
              description: "Return piggyback route suggestions with AI summaries",
              parameters: {
                type: "object",
                properties: {
                  matches: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        candidate_index: { type: "number", description: "1-based index" },
                        summary: { type: "string", description: "Warm one-sentence, no specific numbers or names" },
                      },
                      required: ["candidate_index", "summary"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["matches"],
                additionalProperties: false,
              },
            },
          }],
          tool_choice: { type: "function", function: { name: "piggyback_suggestions" } },
        }),
      });

      if (!aiResponse.ok) throw new Error("AI gateway error");

      const aiData = await aiResponse.json();
      const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
      if (!toolCall) throw new Error("No tool call in response");

      const aiResult = JSON.parse(toolCall.function.arguments);
      const aiMatches = aiResult.matches || [];

      const suggestions = aiMatches.map((am: { candidate_index: number; summary: string }) => {
        const idx = am.candidate_index - 1;
        if (idx < 0 || idx >= allMatches.length) return null;
        const m = allMatches[idx];
        return {
          ...m,
          ai_summary: am.summary,
          detour_label: getDetourLabel(m.distance_from_route_miles, matchMode),
        };
      }).filter(Boolean).slice(0, 5);

      return new Response(JSON.stringify({ suggestions, ai_powered: true, match_mode: matchMode }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    } catch (aiError) {
      console.error("AI error:", aiError);
      const suggestions = allMatches.slice(0, 5).map(m => ({
        ...m,
        ai_summary: null,
        detour_label: getDetourLabel(m.distance_from_route_miles, matchMode),
      }));
      return new Response(JSON.stringify({ suggestions, ai_powered: false, match_mode: matchMode }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

  } catch (error) {
    console.error("Error in suggest-piggyback-routes:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
