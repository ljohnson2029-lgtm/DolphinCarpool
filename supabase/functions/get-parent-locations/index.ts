import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

import { getCorsHeaders, handleCorsPreflightIfNeeded } from "../_shared/cors.ts";

// Round coordinates to ~1km grid (3 decimal places) to avoid leaking precise home GPS
function fuzzCoord(n: number | null): number | null {
  if (n === null || n === undefined) return null;
  return Math.round(n * 1000) / 1000;
}

// Extract neighborhood/city only from full address
function neighborhoodOnly(address: string | null): string | null {
  if (!address) return null;
  const parts = address.split(",").map(p => p.trim()).filter(Boolean);
  if (parts.length >= 3) return parts.slice(1, -1).join(", "); // strip street and country/postal
  return parts[parts.length - 1] || null;
}

serve(async (req) => {
  const preflightResponse = handleCorsPreflightIfNeeded(req);
  if (preflightResponse) return preflightResponse;

  const corsHeaders = getCorsHeaders(req);

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, serviceKey);

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Only return parents who either (a) have an active ride listed publicly,
    // or (b) are already connected to the caller via series_spaces/account_links/co_parent_links.
    // For ANY parent in the result, we omit precise GPS and full address; we return
    // fuzzed (~1km) coordinates and neighborhood/city only.
    const [
      { data: rideUsers },
      { data: spaces },
      { data: links },
      { data: coLinks },
    ] = await Promise.all([
      supabase.from("rides").select("user_id").eq("status", "active"),
      supabase.from("series_spaces").select("parent_a_id, parent_b_id")
        .or(`parent_a_id.eq.${user.id},parent_b_id.eq.${user.id}`),
      supabase.from("account_links").select("parent_id, student_id")
        .or(`parent_id.eq.${user.id},student_id.eq.${user.id}`)
        .eq("status", "approved"),
      supabase.from("co_parent_links").select("requester_id, recipient_id")
        .or(`requester_id.eq.${user.id},recipient_id.eq.${user.id}`)
        .eq("status", "approved"),
    ]);

    const eligibleIds = new Set<string>();
    for (const r of rideUsers ?? []) eligibleIds.add(r.user_id);
    for (const s of spaces ?? []) {
      eligibleIds.add(s.parent_a_id === user.id ? s.parent_b_id : s.parent_a_id);
    }
    for (const l of links ?? []) {
      eligibleIds.add(l.parent_id === user.id ? l.student_id : l.parent_id);
    }
    for (const l of coLinks ?? []) {
      eligibleIds.add(l.requester_id === user.id ? l.recipient_id : l.requester_id);
    }
    eligibleIds.delete(user.id);

    if (eligibleIds.size === 0) {
      return new Response(JSON.stringify({ parents: [] }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data, error } = await supabase
      .from("profiles")
      .select("id, username, first_name, last_name, home_address, home_latitude, home_longitude, account_type")
      .eq("account_type", "parent")
      .in("id", Array.from(eligibleIds))
      .not("home_latitude", "is", null)
      .not("home_longitude", "is", null);

    if (error) {
      console.error("Error fetching parent locations:", error);
      return new Response(
        JSON.stringify({ error: "Failed to fetch parent locations" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Strip sensitive fields: no phone, no full street address, fuzzed coordinates
    const parents = (data ?? []).map((p) => ({
      id: p.id,
      username: p.username,
      first_name: p.first_name,
      last_name: p.last_name,
      neighborhood: neighborhoodOnly(p.home_address),
      home_latitude: fuzzCoord(p.home_latitude as number),
      home_longitude: fuzzCoord(p.home_longitude as number),
      account_type: p.account_type,
    }));

    return new Response(
      JSON.stringify({ parents }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in get-parent-locations function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
