import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

import { getCorsHeaders, handleCorsPreflightIfNeeded } from "../_shared/cors.ts";

/**
 * Cleanup logic:
 *  A) CONFIRMED rides (have an accepted match) → delete 1 hour AFTER ride start time.
 *     - Public rides: have ride_conversations row with status='accepted'
 *     - Private rides: status IN ('accepted','completed')
 *     No notification (ride already happened successfully).
 *
 *  B) UNMATCHED rides (no one accepted) → delete EXACTLY at ride start time.
 *     - Public rides: status='active', is_fulfilled=false, no accepted conversation
 *     - Private rides: status='pending'
 *     Send notification to the poster.
 *
 *  C) Long-tail retention: delete inactive (completed/cancelled/expired) rides + private
 *     requests older than 90 days.
 */
serve(async (req) => {
  const preflightResponse = handleCorsPreflightIfNeeded(req);
  if (preflightResponse) return preflightResponse;

  const corsHeaders = getCorsHeaders(req);

  try {
    // Require shared secret for invocation (cron jobs supply this header)
    const cronSecret = Deno.env.get("CRON_SECRET");
    const provided = req.headers.get("x-cron-secret") || req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
    if (!cronSecret || provided !== cronSecret) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );


    const now = new Date();
    const nowIso = now.toISOString();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    let unmatchedDeleted = 0;
    let confirmedDeleted = 0;
    let notificationsSent = 0;

    /* ─────────────── A. CONFIRMED PUBLIC RIDES (>1h past) ─────────────── */
    // Find active rides whose start time was > 1h ago AND have an accepted conversation
    const { data: confirmedConvs } = await supabase
      .from("ride_conversations")
      .select("ride_id")
      .eq("status", "accepted");

    const confirmedRideIds = new Set((confirmedConvs ?? []).map((c) => c.ride_id));

    if (confirmedRideIds.size > 0) {
      const { data: confirmedRides } = await supabase
        .from("rides")
        .select("id, ride_date, ride_time")
        .in("id", Array.from(confirmedRideIds));

      const toDelete: string[] = [];
      for (const r of confirmedRides ?? []) {
        const start = new Date(`${r.ride_date}T${r.ride_time}`);
        if (start.getTime() <= oneHourAgo.getTime()) toDelete.push(r.id);
      }

      if (toDelete.length > 0) {
        // Delete conversations first to avoid FK orphans on related tables
        await supabase.from("ride_conversations").delete().in("ride_id", toDelete);
        const { data: deletedConfirmed } = await supabase
          .from("rides")
          .delete()
          .in("id", toDelete)
          .select("id");
        confirmedDeleted += deletedConfirmed?.length || 0;
      }
    }

    /* ─────────────── A'. CONFIRMED PRIVATE RIDES (>1h past) ─────────────── */
    {
      const { data: privAccepted } = await supabase
        .from("private_ride_requests")
        .select("id, ride_date, pickup_time")
        .in("status", ["accepted", "completed"]);

      const toDelete: string[] = [];
      for (const r of privAccepted ?? []) {
        const start = new Date(`${r.ride_date}T${r.pickup_time}`);
        if (start.getTime() <= oneHourAgo.getTime()) toDelete.push(r.id);
      }
      if (toDelete.length > 0) {
        const { data: del } = await supabase
          .from("private_ride_requests")
          .delete()
          .in("id", toDelete)
          .select("id");
        confirmedDeleted += del?.length || 0;
      }
    }

    /* ─────────────── B. UNMATCHED PUBLIC RIDES (at start time) ─────────────── */
    // Active rides whose start time has passed AND have NO accepted conversation
    const { data: activePastRides } = await supabase
      .from("rides")
      .select("id, user_id, type, ride_date, ride_time, pickup_location, dropoff_location")
      .eq("status", "active");

    const candidates = (activePastRides ?? []).filter((r) => {
      const start = new Date(`${r.ride_date}T${r.ride_time}`);
      return start.getTime() <= now.getTime() && !confirmedRideIds.has(r.id);
    });

    for (const ride of candidates) {
      // Send notification before delete
      const message =
        ride.type === "request"
          ? "Sorry, no one was able to help you out this time. We hope you find a ride soon — try posting again for your next trip!"
          : "Thanks for offering your ride! Unfortunately no one took you up on it this time, but your generosity helps make the Chadwick community stronger. Feel free to post again anytime!";

      const { error: notifErr } = await supabase.from("notifications").insert({
        user_id: ride.user_id,
        type: ride.type === "request" ? "ride_request_expired" : "ride_offer_expired",
        message,
      });
      if (!notifErr) notificationsSent++;

      // Delete the unmatched ride (cascade pending conversations first)
      await supabase
        .from("ride_conversations")
        .delete()
        .eq("ride_id", ride.id);

      const { data: del } = await supabase
        .from("rides")
        .delete()
        .eq("id", ride.id)
        .select("id");
      unmatchedDeleted += del?.length || 0;
    }

    /* ─────────────── B'. UNMATCHED PRIVATE RIDES (at start time) ─────────────── */
    {
      const { data: pendingPriv } = await supabase
        .from("private_ride_requests")
        .select("id, sender_id, request_type, ride_date, pickup_time")
        .eq("status", "pending");

      const expiredPriv = (pendingPriv ?? []).filter((r) => {
        const start = new Date(`${r.ride_date}T${r.pickup_time}`);
        return start.getTime() <= now.getTime();
      });

      for (const r of expiredPriv) {
        const message =
          r.request_type === "request"
            ? "Sorry, no one was able to help you out this time. We hope you find a ride soon — try posting again for your next trip!"
            : "Thanks for offering your ride! Unfortunately no one took you up on it this time, but your generosity helps make the Chadwick community stronger. Feel free to post again anytime!";

        const { error: notifErr } = await supabase.from("notifications").insert({
          user_id: r.sender_id,
          type: r.request_type === "request" ? "ride_request_expired" : "ride_offer_expired",
          message,
        });
        if (!notifErr) notificationsSent++;

        const { data: del } = await supabase
          .from("private_ride_requests")
          .delete()
          .eq("id", r.id)
          .select("id");
        unmatchedDeleted += del?.length || 0;
      }
    }

    /* ─────────────── C. 90-day retention (long tail safety net) ─────────────── */
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString();

    const { data: oldPrivate } = await supabase
      .from("private_ride_requests")
      .delete()
      .lt("created_at", ninetyDaysAgo)
      .select("id");

    const { data: oldRides } = await supabase
      .from("rides")
      .delete()
      .in("status", ["completed", "cancelled", "expired"])
      .lt("created_at", ninetyDaysAgo)
      .select("id");

    const retentionDeleted = (oldPrivate?.length || 0) + (oldRides?.length || 0);

    return new Response(
      JSON.stringify({
        success: true,
        confirmedDeleted,
        unmatchedDeleted,
        notificationsSent,
        retentionDeleted,
        runAt: nowIso,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("cleanup-expired-rides error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
