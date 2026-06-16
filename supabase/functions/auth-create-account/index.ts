import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import * as bcrypt from "https://deno.land/x/bcrypt@v0.4.1/mod.ts";

import { getCorsHeaders, handleCorsPreflightIfNeeded } from "../_shared/cors.ts";

serve(async (req) => {
  const preflight = handleCorsPreflightIfNeeded(req);
  if (preflight) return preflight;
  const corsHeaders = getCorsHeaders(req);

  try {
    const { email, username, password, firstName, lastName, phoneNumber, signupCode } = await req.json();

    if (!email || !username || !password || !firstName || !lastName || !phoneNumber || !signupCode) {
      return new Response(JSON.stringify({ error: "All required fields must be provided" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (username.length < 3 || username.length > 30 || !/^[a-zA-Z0-9\s_-]+$/.test(username)) {
      return new Response(JSON.stringify({ error: "Invalid username" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (password.length < 8 || !/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password)) {
      return new Response(JSON.stringify({ error: "Password must be at least 8 characters with uppercase, lowercase, and a number" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );
    const authClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    // Re-validate community signup code server-side (case-insensitive via citext)
    const trimmedCode = String(signupCode).trim();
    const { data: codeRow, error: codeErr } = await supabase
      .from("signup_verification_codes")
      .select("id")
      .eq("code", trimmedCode)
      .eq("active", true)
      .maybeSingle();

    if (codeErr) {
      console.error("Signup code lookup error:", codeErr);
      return new Response(JSON.stringify({ error: "Unable to validate verification code" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!codeRow) {
      return new Response(JSON.stringify({ error: "Invalid verification code. Please check your code and try again." }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Username uniqueness
    const { data: existingUsername } = await supabase
      .from("users")
      .select("username")
      .ilike("username", username)
      .maybeSingle();
    if (existingUsername) {
      return new Response(JSON.stringify({ error: "Username already taken" }), {
        status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Email uniqueness (clean orphans the same way as before)
    const { data: existingEmail } = await supabase
      .from("users")
      .select("user_id, email")
      .eq("email", normalizedEmail)
      .maybeSingle();

    if (existingEmail) {
      const { data: authUsers } = await supabase.auth.admin.listUsers();
      const authUserExists = authUsers?.users?.some((u) => u.id === existingEmail.user_id);
      if (!authUserExists) {
        await supabase.from("users").delete().eq("user_id", existingEmail.user_id);
        await supabase.from("profiles").delete().eq("id", existingEmail.user_id);
        await supabase.from("user_roles").delete().eq("user_id", existingEmail.user_id);
      } else {
        return new Response(JSON.stringify({ error: "Email already registered. Please log in instead." }), {
          status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Any leftover auth user with same email?
    const { data: allAuth } = await supabase.auth.admin.listUsers();
    const orphan = allAuth?.users?.find((u) => u.email?.toLowerCase() === normalizedEmail);
    if (orphan) {
      await supabase.auth.admin.deleteUser(orphan.id);
    }

    const passwordHash = bcrypt.hashSync(password);

    // Create the auth user through the public signup flow so the confirmation
    // email is sent immediately by the auth email system.
    const { data: authData, error: authError } = await authClient.auth.signUp({
      email: normalizedEmail,
      password,
      options: {
        emailRedirectTo: "https://dolphincarpool.org/auth/callback",
        data: { username, first_name: firstName, last_name: lastName },
      },
    });

    if (authError || !authData?.user) {
      console.error("auth.signUp error:", authError);
      return new Response(JSON.stringify({ error: `Failed to create account: ${authError?.message ?? "Unknown error"}` }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = authData.user.id;

    const { error: insertUserErr } = await supabase.from("users").insert({
      user_id: userId,
      email: normalizedEmail,
      username,
      password_hash: passwordHash,
      first_name: firstName,
      last_name: lastName,
      phone_number: phoneNumber,
      is_verified: false,
    });

    if (insertUserErr) {
      console.error("users insert error:", insertUserErr);
      await supabase.auth.admin.deleteUser(userId);
      return new Response(JSON.stringify({ error: `Failed to create user record: ${insertUserErr.message}` }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { error: profileErr } = await supabase.from("profiles").insert({
      id: userId,
      username,
      first_name: firstName,
      last_name: lastName,
      phone_number: phoneNumber,
      account_type: "parent",
    });
    if (profileErr) console.error("profiles insert error:", profileErr);

    const { error: roleErr } = await supabase.from("user_roles").insert({
      user_id: userId,
      role: "parent",
    });
    if (roleErr) console.error("user_roles insert error:", roleErr);

    return new Response(JSON.stringify({
      success: true,
      userId,
      email: normalizedEmail,
    }), {
      status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("auth-create-account unexpected error:", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Unexpected error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
