import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { getCorsHeaders, handleCorsPreflightIfNeeded } from "../_shared/cors.ts";

serve(async (req) => {
  const preflight = handleCorsPreflightIfNeeded(req);
  if (preflight) return preflight;
  const corsHeaders = getCorsHeaders(req);

  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return new Response(JSON.stringify({ error: "Email and password are required." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (typeof password !== "string" || password.length < 6) {
      return new Response(JSON.stringify({ error: "Password must be at least 6 characters." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const normalizedEmail = String(email).toLowerCase().trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return new Response(JSON.stringify({ error: "Please enter a valid email address." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // 1) Find the parent whose children list contains this email
    const { data: matchRows, error: matchErr } = await supabase.rpc("find_parent_by_child_email", {
      _email: normalizedEmail,
    });
    if (matchErr) {
      console.error("find_parent_by_child_email error:", matchErr);
      return new Response(JSON.stringify({ error: "Unable to look up your email right now. Please try again." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const match = Array.isArray(matchRows) && matchRows.length > 0 ? matchRows[0] : null;
    if (!match) {
      return new Response(
        JSON.stringify({
          error:
            "Your email was not found in our system. Please ask your parent to add your email to their Dolphin Carpool account first, then try again.",
        }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2) Email already an auth user?
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const existing = existingUsers?.users?.find((u) => u.email?.toLowerCase() === normalizedEmail);
    if (existing) {
      return new Response(JSON.stringify({ error: "This email is already registered. Please log in instead." }), {
        status: 409,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3) Create auth user (email pre-confirmed)
    const username = normalizedEmail.split("@")[0].replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 24) ||
      `student_${Date.now().toString(36)}`;

    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: normalizedEmail,
      password,
      email_confirm: true,
      user_metadata: {
        username,
        first_name: match.first_name,
        last_name: match.last_name,
        account_type: "student",
      },
    });

    if (authError || !authData?.user) {
      console.error("createUser error:", authError);
      return new Response(JSON.stringify({ error: `Failed to create account: ${authError?.message ?? "Unknown error"}` }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = authData.user.id;

    // Make sure username is unique — if not, suffix with id slice
    let finalUsername = username;
    const { data: usernameTaken } = await supabase
      .from("users")
      .select("user_id")
      .ilike("username", finalUsername)
      .maybeSingle();
    if (usernameTaken) {
      finalUsername = `${username}_${userId.slice(0, 6)}`;
    }

    // 4) Insert users row (no phone)
    const { error: usersErr } = await supabase.from("users").insert({
      user_id: userId,
      email: normalizedEmail,
      username: finalUsername,
      password_hash: "",
      first_name: match.first_name || "",
      last_name: match.last_name || "",
      phone_number: null,
      is_verified: true,
    });
    if (usersErr) {
      console.error("users insert error:", usersErr);
      await supabase.auth.admin.deleteUser(userId);
      return new Response(JSON.stringify({ error: `Failed to create user record: ${usersErr.message}` }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 5) Insert profile row, marked complete (student is read-only)
    const { error: profileErr } = await supabase.from("profiles").insert({
      id: userId,
      username: finalUsername,
      first_name: match.first_name || "",
      last_name: match.last_name || "",
      phone_number: null,
      account_type: "student",
      grade_level: match.grade_level || null,
      profile_complete: true,
    });
    if (profileErr) console.error("profiles insert error:", profileErr);

    // 6) user_roles
    const { error: roleErr } = await supabase.from("user_roles").insert({
      user_id: userId,
      role: "student",
    });
    if (roleErr) console.error("user_roles insert error:", roleErr);

    // 7) Auto-link to parent (approved)
    const { error: linkErr } = await supabase.from("account_links").insert({
      student_id: userId,
      parent_id: match.parent_id,
      status: "approved",
      requested_by: match.parent_id,
    });
    if (linkErr) console.error("account_links insert error:", linkErr);

    return new Response(
      JSON.stringify({ success: true, userId, email: normalizedEmail }),
      { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("auth-create-student-account unexpected error:", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Unexpected error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
