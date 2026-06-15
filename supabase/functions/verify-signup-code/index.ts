import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { getCorsHeaders, handleCorsPreflightIfNeeded } from "../_shared/cors.ts";

// Simple per-IP rate limit
const rateLimit = new Map<string, { count: number; resetAt: number }>();
const WINDOW_MS = 60_000;
const MAX = 20;
function limited(ip: string) {
  const now = Date.now();
  const rec = rateLimit.get(ip);
  if (!rec || now > rec.resetAt) {
    rateLimit.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  rec.count++;
  return rec.count > MAX;
}

serve(async (req) => {
  const preflight = handleCorsPreflightIfNeeded(req);
  if (preflight) return preflight;
  const corsHeaders = getCorsHeaders(req);

  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
      ?? req.headers.get("x-real-ip") ?? "unknown";
    if (limited(ip)) {
      return new Response(JSON.stringify({ valid: false, error: "Too many attempts. Try again shortly." }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { code } = await req.json();
    const trimmed = typeof code === "string" ? code.trim() : "";
    if (!trimmed || trimmed.length > 64) {
      return new Response(JSON.stringify({ valid: false, error: "Invalid code" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // citext column makes the equality check case-insensitive
    const { data, error } = await supabase
      .from("signup_verification_codes")
      .select("id")
      .eq("code", trimmed)
      .eq("active", true)
      .maybeSingle();

    if (error) {
      console.error("verify-signup-code db error", error);
      return new Response(JSON.stringify({ valid: false, error: "Lookup failed" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ valid: !!data }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("verify-signup-code error", err);
    return new Response(JSON.stringify({ valid: false, error: "Unexpected error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
