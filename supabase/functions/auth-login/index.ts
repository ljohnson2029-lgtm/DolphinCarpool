import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { getCorsHeaders, handleCorsPreflightIfNeeded } from "../_shared/cors.ts";

// This function ONLY resolves a username-or-email to the user's email.
// Actual password authentication is performed by Supabase Auth on the client
// via supabase.auth.signInWithPassword. This keeps a single source of truth
// for credentials (Supabase Auth) and avoids drift after password resets.
serve(async (req) => {
  const preflightResponse = handleCorsPreflightIfNeeded(req);
  if (preflightResponse) return preflightResponse;
  const corsHeaders = getCorsHeaders(req);

  try {
    const { usernameOrEmail } = await req.json();
    if (!usernameOrEmail) {
      return new Response(
        JSON.stringify({ error: "Username/email is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const sanitizedInput = String(usernameOrEmail).trim();
    const validInputPattern = /^[a-zA-Z0-9@._\-\s]+$/;
    if (!validInputPattern.test(sanitizedInput) || sanitizedInput.length > 255) {
      return new Response(
        JSON.stringify({ error: "Invalid username/email format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // If it already looks like an email, just return it
    if (sanitizedInput.includes("@")) {
      const email = sanitizedInput.toLowerCase();
      return new Response(
        JSON.stringify({ success: true, user: { email } }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Otherwise resolve username → email
    const { data: usernameUsers, error: usernameError } = await supabase
      .from("users")
      .select("email, username")
      .ilike("username", sanitizedInput)
      .limit(1);

    if (usernameError) {
      console.error("Database query error:", usernameError);
      return new Response(
        JSON.stringify({ error: "Database error occurred" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const user = usernameUsers && usernameUsers.length > 0 ? usernameUsers[0] : null;
    if (!user?.email) {
      return new Response(
        JSON.stringify({ error: "Invalid username/email or password" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, user: { email: String(user.email).toLowerCase() } }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
