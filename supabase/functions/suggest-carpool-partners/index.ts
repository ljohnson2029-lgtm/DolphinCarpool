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

    // Fetch all data in parallel
    const [
      { data: myProfile },
      { data: myChildren },
      { data: allParents },
      { data: allChildren },
      { data: allRides },
      { data: recurringSchedules },
      { data: existingSpaces },
    ] = await Promise.all([
      supabase.from("profiles").select("id, first_name, last_name, home_latitude, home_longitude, home_address").eq("id", user.id).single(),
      supabase.from("children").select("first_name, grade_level").eq("user_id", user.id),
      supabase.from("profiles").select("id, first_name, last_name, username, home_latitude, home_longitude, home_address, account_type")
        .eq("account_type", "parent").neq("id", user.id)
        .not("home_latitude", "is", null).not("home_longitude", "is", null),
      supabase.from("children").select("user_id, grade_level, first_name"),
      supabase.from("rides").select("user_id, recurring_days, ride_date, type")
        .eq("status", "active"),
      supabase.from("recurring_schedules").select("proposer_id, recipient_id, day_assignments, status")
        .eq("status", "accepted"),
      supabase.from("series_spaces").select("parent_a_id, parent_b_id")
        .or(`parent_a_id.eq.${user.id},parent_b_id.eq.${user.id}`),
    ]);

    if (!myProfile?.home_latitude || !myProfile?.home_longitude) {
      return new Response(JSON.stringify({ suggestions: [], reason: "no_address" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const myGrades = new Set((myChildren || []).map(c => c.grade_level).filter(Boolean));
    const myKidNames = (myChildren || []).map(c => c.first_name).filter(Boolean);

    // Build children lookup
    const childrenByParent: Record<string, { grade_level: string | null; first_name: string }[]> = {};
    for (const c of (allChildren || [])) {
      if (!childrenByParent[c.user_id]) childrenByParent[c.user_id] = [];
      childrenByParent[c.user_id].push({ grade_level: c.grade_level, first_name: c.first_name });
    }

    // Build ride activity lookup
    const rideCountByUser: Record<string, number> = {};
    const activeDaysByUser: Record<string, Set<string>> = {};
    for (const r of (allRides || [])) {
      rideCountByUser[r.user_id] = (rideCountByUser[r.user_id] || 0) + 1;
      if (!activeDaysByUser[r.user_id]) activeDaysByUser[r.user_id] = new Set();
      if (r.recurring_days) {
        for (const d of r.recurring_days) activeDaysByUser[r.user_id].add(d);
      }
      if (r.ride_date) {
        const dayName = new Date(r.ride_date + "T12:00:00").toLocaleDateString("en-US", { weekday: "long" });
        activeDaysByUser[r.user_id].add(dayName);
      }
    }

    // Add recurring schedule days
    for (const s of (recurringSchedules || [])) {
      for (const uid of [s.proposer_id, s.recipient_id]) {
        if (!activeDaysByUser[uid]) activeDaysByUser[uid] = new Set();
        const assignments = s.day_assignments as Record<string, string> | null;
        if (assignments) {
          for (const day of Object.keys(assignments)) {
            activeDaysByUser[uid].add(day);
          }
        }
      }
      rideCountByUser[s.proposer_id] = (rideCountByUser[s.proposer_id] || 0) + 3;
      rideCountByUser[s.recipient_id] = (rideCountByUser[s.recipient_id] || 0) + 3;
    }

    const myDays = activeDaysByUser[user.id] || new Set();

    // Existing connections to exclude
    const existingPartners = new Set<string>();
    for (const sp of (existingSpaces || [])) {
      existingPartners.add(sp.parent_a_id === user.id ? sp.parent_b_id : sp.parent_a_id);
    }

    // Weights
    const W_DISTANCE = 40;
    const W_SCHEDULE = 25;
    const W_GRADE = 25;
    const W_ACTIVITY = 10;
    const MAX_DISTANCE = 10;

    // Stage 1: Score all candidates
    interface Candidate {
      id: string;
      first_name: string;
      last_name: string;
      username: string;
      distance_miles: number;
      grade_matches: string[];
      their_kids: string[];
      schedule_overlap_days: string[];
      their_active_days: string[];
      ride_count: number;
      score: number;
      neighborhood: string;
    }

    const candidates: Candidate[] = [];

    for (const p of (allParents || [])) {
      if (existingPartners.has(p.id)) continue;

      const dist = haversine(myProfile.home_latitude, myProfile.home_longitude, p.home_latitude!, p.home_longitude!);
      if (dist > MAX_DISTANCE) continue;

      const distScore = Math.max(0, 1 - (dist / MAX_DISTANCE)) * W_DISTANCE;

      const theirDays = activeDaysByUser[p.id] || new Set();
      const overlapDays: string[] = [];
      for (const d of myDays) { if (theirDays.has(d)) overlapDays.push(d); }
      const scheduleScore = myDays.size > 0 && theirDays.size > 0
        ? (overlapDays.length / Math.max(myDays.size, theirDays.size)) * W_SCHEDULE : 0;

      const theirChildren = childrenByParent[p.id] || [];
      const gradeMatches: string[] = [];
      for (const c of theirChildren) {
        if (c.grade_level && myGrades.has(c.grade_level)) gradeMatches.push(c.grade_level);
      }
      const gradeScore = myGrades.size > 0 && gradeMatches.length > 0
        ? Math.min(1, gradeMatches.length / myGrades.size) * W_GRADE : 0;

      const rideCount = rideCountByUser[p.id] || 0;
      const activityScore = Math.min(1, rideCount / 10) * W_ACTIVITY;

      const totalScore = distScore + scheduleScore + gradeScore + activityScore;
      if (totalScore < 5) continue;

      // Extract neighborhood from address (city/area only, not full address for privacy)
      const neighborhood = extractNeighborhood(p.home_address || "");

      candidates.push({
        id: p.id,
        first_name: p.first_name || "",
        last_name: p.last_name || "",
        username: p.username,
        distance_miles: Math.round(dist * 10) / 10,
        grade_matches: [...new Set(gradeMatches)],
        their_kids: theirChildren.map(c => c.first_name).filter(Boolean),
        schedule_overlap_days: overlapDays,
        their_active_days: [...theirDays],
        ride_count: rideCount,
        score: Math.round(totalScore * 10) / 10,
        neighborhood,
      });
    }

    // Sort and take top 8 for AI processing
    candidates.sort((a, b) => b.score - a.score);
    const topCandidates = candidates.slice(0, 8);

    if (topCandidates.length === 0) {
      return new Response(JSON.stringify({ suggestions: [] }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Stage 2: Use AI to rank and generate personalized summaries
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      // Fallback to rule-based if no API key
      const fallback = topCandidates.slice(0, 5).map(c => ({
        ...c,
        ai_summary: null,
        reasons: buildFallbackReasons(c),
        confidence: c.score >= 60 ? "great" : c.score >= 35 ? "good" : "potential",
      }));
      return new Response(JSON.stringify({ suggestions: fallback, ai_powered: false }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const myName = [myProfile.first_name, myProfile.last_name].filter(Boolean).join(" ");
    const myGradeList = [...myGrades].join(", ");
    const myDayList = [...myDays].join(", ");

    const candidateSummaries = topCandidates.map((c, i) => 
      `${i + 1}. "${c.first_name} ${c.last_name}" — ` +
      `${c.distance_miles} mi away, ` +
      `kids: ${c.their_kids.length > 0 ? c.their_kids.join(", ") : "unknown"}, ` +
      `grade matches: ${c.grade_matches.length > 0 ? c.grade_matches.join(", ") : "none"}, ` +
      `shared days: ${c.schedule_overlap_days.length > 0 ? c.schedule_overlap_days.join(", ") : "none"}, ` +
      `their active days: ${c.their_active_days.length > 0 ? c.their_active_days.join(", ") : "none"}, ` +
      `${c.ride_count} rides posted, ` +
      `base score: ${c.score}`
    ).join("\n");

    const prompt = `You are a carpool matching assistant for Dolphin Community families. Analyze these pre-scored candidates and re-rank them.

ABOUT THE USER:
- Name: ${myName}
- Children's grades: ${myGradeList || "unknown"}
- Active carpool days: ${myDayList || "none yet"}
- Children: ${myKidNames.join(", ") || "unknown"}

CANDIDATES (pre-scored by proximity, schedule, grade, activity):
${candidateSummaries}

TASK: Re-rank these candidates by real-world carpool practicality and for each produce:
1. A final rank (best match first)
2. A confidence tier: "great", "good", or "potential"
3. A single personalized summary sentence (max 25 words) that explains why this family is a great carpool partner. Write it warmly and conversationally, like a friend's recommendation. Do NOT include specific distances, grade levels, or child names — those facts will be displayed separately from verified data.

IMPORTANT: The summary must NOT contain any specific numbers, distances, grade levels, or names. Only provide a qualitative, warm description of why the match works well. Example good summaries: "A reliable nearby family with a similar school schedule — a natural carpool fit." or "You're practically neighbors with overlapping routines — this could work great."

Return the top 5 only.`;

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
            { role: "system", content: "You are a carpool matching AI. Return ONLY valid JSON, no markdown." },
            { role: "user", content: prompt },
          ],
          tools: [{
            type: "function",
            function: {
              name: "rank_matches",
              description: "Return the AI-ranked carpool partner suggestions with confidence and a warm summary",
              parameters: {
                type: "object",
                properties: {
                  matches: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        candidate_index: { type: "number", description: "1-based index from the candidate list" },
                        confidence: { type: "string", enum: ["great", "good", "potential"] },
                        summary: { type: "string", description: "Warm one-sentence recommendation without specific numbers, grades, or names" }
                      },
                      required: ["candidate_index", "confidence", "summary"],
                      additionalProperties: false,
                    }
                  }
                },
                required: ["matches"],
                additionalProperties: false,
              }
            }
          }],
          tool_choice: { type: "function", function: { name: "rank_matches" } },
        }),
      });

      if (!aiResponse.ok) {
        console.error("AI gateway error:", aiResponse.status);
        // Fallback
        const fallback = topCandidates.slice(0, 5).map(c => ({
          ...c,
          ai_summary: null,
          reasons: buildFallbackReasons(c),
          confidence: c.score >= 60 ? "great" : c.score >= 35 ? "good" : "potential",
        }));
        return new Response(JSON.stringify({ suggestions: fallback, ai_powered: false }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const aiData = await aiResponse.json();
      const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
      
      if (!toolCall) {
        throw new Error("No tool call in AI response");
      }

      const aiResult = JSON.parse(toolCall.function.arguments);
      const aiMatches = aiResult.matches || [];

      // Map AI results back to candidates — use VERIFIED data for reasons
      const suggestions = aiMatches.map((m: { candidate_index: number; confidence: string; summary: string }) => {
        const idx = m.candidate_index - 1;
        if (idx < 0 || idx >= topCandidates.length) return null;
        const c = topCandidates[idx];
        // Build reasons from VERIFIED database data only
        const verifiedReasons = buildVerifiedReasons(c);
        return {
          id: c.id,
          first_name: c.first_name,
          last_name: c.last_name,
          username: c.username,
          distance_miles: c.distance_miles,
          grade_matches: c.grade_matches,
          schedule_overlap_days: c.schedule_overlap_days,
          ride_count: c.ride_count,
          score: c.score,
          confidence: m.confidence,
          reasons: verifiedReasons,
          ai_summary: m.summary,
          neighborhood: c.neighborhood,
        };
      }).filter(Boolean).slice(0, 5);

      return new Response(JSON.stringify({ suggestions, ai_powered: true }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    } catch (aiError) {
      console.error("AI processing error:", aiError);
      // Fallback to rule-based
      const fallback = topCandidates.slice(0, 5).map(c => ({
        ...c,
        ai_summary: null,
        reasons: buildFallbackReasons(c),
        confidence: c.score >= 60 ? "great" : c.score >= 35 ? "good" : "potential",
      }));
      return new Response(JSON.stringify({ suggestions: fallback, ai_powered: false }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

  } catch (error) {
    console.error("Error in suggest-carpool-partners:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function buildVerifiedReasons(c: { distance_miles: number; grade_matches: string[]; their_kids: string[]; schedule_overlap_days: string[]; ride_count: number }): string[] {
  const reasons: string[] = [];
  
  // Distance — always from haversine calculation
  if (c.distance_miles < 0.5) reasons.push("Less than half a mile away");
  else if (c.distance_miles < 1) reasons.push(`${c.distance_miles} miles away`);
  else if (c.distance_miles < 5) reasons.push(`${c.distance_miles} miles away`);
  
  // Grade matches — from children table
  if (c.grade_matches.length > 0) {
    const uniqueGrades = [...new Set(c.grade_matches.map(g => g === "Chadwick" ? "our community" : g))];
    reasons.push(`Kids in ${uniqueGrades.join(", ")}`);
  }
  
  // Schedule overlap — from rides/recurring_schedules tables
  if (c.schedule_overlap_days.length > 0) {
    if (c.schedule_overlap_days.length >= 4) reasons.push("Same weekday schedule");
    else reasons.push(`Shares ${c.schedule_overlap_days.slice(0, 3).join(", ")} schedule`);
  }
  
  // Activity — from ride count
  if (c.ride_count >= 5) reasons.push("Active carpooler");
  
  if (reasons.length === 0) reasons.push("Nearby Dolphin Community family");
  return reasons;
}

// Alias for fallback paths
const buildFallbackReasons = buildVerifiedReasons;

// Extract neighborhood/city from a full address (privacy-safe, no street number)
function extractNeighborhood(address: string): string {
  if (!address) return "";
  const parts = address.split(",").map(p => p.trim());
  // Typical format: "123 Main St, Rancho Palos Verdes, CA 90275, USA"
  // Return the city part (2nd element typically)
  if (parts.length >= 3) return parts[1]; // city
  if (parts.length === 2) return parts[0]; // just area
  return "";
}
