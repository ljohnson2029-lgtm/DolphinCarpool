import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

import { getCorsHeaders, handleCorsPreflightIfNeeded } from "../_shared/cors.ts";

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
      console.error("Auth error:", authError);
      return new Response(
        JSON.stringify({ error: "Invalid or expired token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { parentId } = await req.json();
    if (!parentId) {
      return new Response(
        JSON.stringify({ error: "Parent ID is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const isSelf = parentId === user.id;

    // Verify relationship if not viewing own profile
    let hasRelationship = isSelf;
    if (!isSelf) {
      const [{ data: al }, { data: cp }, { data: ss }, { data: conv }, { data: pr }] = await Promise.all([
        supabase.from("account_links").select("id")
          .or(`and(parent_id.eq.${user.id},student_id.eq.${parentId}),and(parent_id.eq.${parentId},student_id.eq.${user.id})`)
          .eq("status", "approved").limit(1),
        supabase.from("co_parent_links").select("id")
          .or(`and(requester_id.eq.${user.id},recipient_id.eq.${parentId}),and(requester_id.eq.${parentId},recipient_id.eq.${user.id})`)
          .eq("status", "approved").limit(1),
        supabase.from("series_spaces").select("id")
          .or(`and(parent_a_id.eq.${user.id},parent_b_id.eq.${parentId}),and(parent_a_id.eq.${parentId},parent_b_id.eq.${user.id})`).limit(1),
        supabase.from("ride_conversations").select("id").eq("status", "accepted")
          .or(`and(sender_id.eq.${user.id},recipient_id.eq.${parentId}),and(sender_id.eq.${parentId},recipient_id.eq.${user.id})`).limit(1),
        supabase.from("private_ride_requests").select("id").in("status", ["accepted", "completed"])
          .or(`and(sender_id.eq.${user.id},recipient_id.eq.${parentId}),and(sender_id.eq.${parentId},recipient_id.eq.${user.id})`).limit(1),
      ]);
      hasRelationship =
        (al?.length ?? 0) > 0 || (cp?.length ?? 0) > 0 ||
        (ss?.length ?? 0) > 0 || (conv?.length ?? 0) > 0 || (pr?.length ?? 0) > 0;
    }

    // Fetch profile data (only the columns we may need)
    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("id, username, first_name, last_name, home_address, phone_number, created_at, account_type, grade_level, share_phone, share_email, car_make, car_model, car_color, license_plate")
      .eq("id", parentId)
      .eq("account_type", "parent")
      .single();

    if (profileError) {
      console.error("Error fetching profile:", profileError);
      return new Response(
        JSON.stringify({ error: "Parent not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Enforce sharing flags server-side
    const includePhone = isSelf || (hasRelationship && !!profileData.share_phone);
    const includeEmail = isSelf || (hasRelationship && !!profileData.share_email);
    const includeFullAddress = isSelf; // never share full home address with others

    let email: string | null = null;
    if (includeEmail) {
      const { data: userData } = await supabase
        .from("users")
        .select("email")
        .eq("user_id", parentId)
        .single();
      email = userData?.email ?? null;
    }

    // Children list: only return for self or confirmed relationships
    let linkedStudents: Array<{ id: string; first_name: string; last_name: string; grade_level: string | null }> = [];
    if (isSelf || hasRelationship) {
      const { data: childrenData } = await supabase
        .from("children")
        .select("id, first_name, last_name, grade_level")
        .eq("user_id", parentId);
      linkedStudents = (childrenData || []).map(c => ({
        id: c.id,
        first_name: c.first_name || "Unknown",
        last_name: c.last_name || "",
        grade_level: c.grade_level,
      }));
    }

    const safeProfile = {
      id: profileData.id,
      username: profileData.username,
      first_name: profileData.first_name,
      last_name: profileData.last_name,
      account_type: profileData.account_type,
      created_at: profileData.created_at,
      grade_level: profileData.grade_level,
      car_make: profileData.car_make,
      car_model: profileData.car_model,
      car_color: profileData.car_color,
      // License plate is sensitive — only owner
      license_plate: isSelf ? profileData.license_plate : null,
      home_address: includeFullAddress ? profileData.home_address : null,
      phone_number: includePhone ? profileData.phone_number : null,
      email,
      share_phone: profileData.share_phone,
      share_email: profileData.share_email,
      linked_students_count: linkedStudents.length,
      linked_students: linkedStudents,
    };

    return new Response(
      JSON.stringify({ profile: safeProfile }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in get-parent-profile function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
