import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import { getCorsHeaders, handleCorsPreflightIfNeeded } from "../_shared/cors.ts";

interface NotificationRequest {
  userId: string;
  type: string;
  message: string;
  linkId?: string;
}

serve(async (req) => {
  const preflightResponse = handleCorsPreflightIfNeeded(req);
  if (preflightResponse) return preflightResponse;

  const corsHeaders = getCorsHeaders(req);

  try {
    // Verify JWT - user must be authenticated
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authorization header required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create client with user's auth to verify they're authenticated
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify the user is authenticated
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { userId, type, message, linkId }: NotificationRequest = await req.json();

    // Validate required fields
    if (!userId || !type || !message) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: userId, type, message" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Authorization: caller must either be sending to themselves, or have an
    // established relationship with the recipient (linked parent/student,
    // co-parent, ride conversation participant, or private ride participant).
    if (userId !== user.id) {
      const serviceCheck = createClient(supabaseUrl, supabaseServiceKey);
      const [linkA, linkB, coA, coB, conv, priv, seriesSpace] = await Promise.all([
        serviceCheck.from("account_links").select("id").eq("parent_id", user.id).eq("student_id", userId).eq("status", "approved").limit(1),
        serviceCheck.from("account_links").select("id").eq("student_id", user.id).eq("parent_id", userId).eq("status", "approved").limit(1),
        serviceCheck.from("co_parent_links").select("id").eq("requester_id", user.id).eq("recipient_id", userId).limit(1),
        serviceCheck.from("co_parent_links").select("id").eq("recipient_id", user.id).eq("requester_id", userId).limit(1),
        serviceCheck.from("ride_conversations").select("id").or(`and(sender_id.eq.${user.id},recipient_id.eq.${userId}),and(sender_id.eq.${userId},recipient_id.eq.${user.id})`).limit(1),
        serviceCheck.from("private_ride_requests").select("id").or(`and(sender_id.eq.${user.id},recipient_id.eq.${userId}),and(sender_id.eq.${userId},recipient_id.eq.${user.id})`).limit(1),
        linkId
          ? serviceCheck.from("series_spaces").select("id").eq("id", linkId).or(`and(parent_a_id.eq.${user.id},parent_b_id.eq.${userId}),and(parent_a_id.eq.${userId},parent_b_id.eq.${user.id})`).limit(1)
          : Promise.resolve({ data: [] }),
      ]);
      const hasRelationship =
        (linkA.data?.length ?? 0) > 0 || (linkB.data?.length ?? 0) > 0 ||
        (coA.data?.length ?? 0) > 0 || (coB.data?.length ?? 0) > 0 ||
        (conv.data?.length ?? 0) > 0 || (priv.data?.length ?? 0) > 0 ||
        (seriesSpace.data?.length ?? 0) > 0;
      if (!hasRelationship) {
        return new Response(
          JSON.stringify({ error: "Forbidden: no relationship with target user" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Validate message length to prevent abuse
    if (message.length > 500) {
      return new Response(
        JSON.stringify({ error: "Message too long (max 500 characters)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate type to only allow known notification types
    const allowedTypes = [
      'link_request', 
      'link_approved', 
      'link_denied', 
      'unlinked',
      'co_parent_request',
      'co_parent_approved', 
      'co_parent_denied',
      'ride_request',
      'ride_accepted',
      'ride_declined',
      'ride_connected',
      'ride_offer_received',
      'ride_join_request',
      'ride_join_accepted',
      'ride_join_declined',
      'ride_left',
      'ride_cancelled',
      'private_ride_request_received',
      'private_ride_offer_received',
      'direct_ride_request',
      'direct_ride_offer',
      'direct_ride_accepted',
      'direct_ride_declined',
      'direct_ride_cancelled',
      'ride_message',
      'series_message',
      'series_ride',
      'schedule_proposal',
      'schedule_accepted',
      'schedule_declined',
      'schedule_cancelled',
      'schedule_cancel_one',
      'schedule_leave_one'
    ];
    
    if (!allowedTypes.includes(type)) {
      return new Response(
        JSON.stringify({ error: "Invalid notification type" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use service role to insert notification (bypasses RLS)
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

    const { error: insertError } = await serviceClient
      .from("notifications")
      .insert({
        user_id: userId,
        type,
        message,
        link_id: linkId || null,
        is_read: false,
      });

    if (insertError) {
      console.error("Error creating notification:", insertError);
      return new Response(
        JSON.stringify({ error: "Failed to create notification" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
