import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { getCorsHeaders, handleCorsPreflightIfNeeded } from "../_shared/cors.ts";

async function hashCode(code: string, salt: string): Promise<string> {
  const data = new TextEncoder().encode(`${salt}:${code}`);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

serve(async (req) => {
  const pre = handleCorsPreflightIfNeeded(req);
  if (pre) return pre;
  const cors = getCorsHeaders(req);

  try {
    const { email, code, purpose } = await req.json();
    if (!email || !code || !purpose || !["signup", "login"].includes(purpose)) {
      return new Response(JSON.stringify({ error: "Email, code, and purpose are required" }), {
        status: 400, headers: { ...cors, "Content-Type": "application/json" },
      });
    }
    const normalized = String(email).trim().toLowerCase();
    const codeStr = String(code).trim();
    if (!/^\d{6}$/.test(codeStr)) {
      return new Response(JSON.stringify({ error: "Invalid code", reason: "invalid" }), {
        status: 400, headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const codeHash = await hashCode(codeStr, normalized);

    const { data: row, error } = await admin
      .from("two_factor_codes")
      .select("id, expires_at, used_at")
      .eq("email", normalized)
      .eq("purpose", purpose)
      .eq("code_hash", codeHash)
      .is("used_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("2fa verify lookup error", error);
      return new Response(JSON.stringify({ error: "Verification failed" }), {
        status: 500, headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    if (!row) {
      return new Response(JSON.stringify({ error: "Invalid code", reason: "invalid" }), {
        status: 400, headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    if (new Date(row.expires_at).getTime() < Date.now()) {
      return new Response(JSON.stringify({ error: "Code expired", reason: "expired" }), {
        status: 400, headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    await admin.from("two_factor_codes").update({ used_at: new Date().toISOString() }).eq("id", row.id);

    return new Response(JSON.stringify({ success: true }), {
      status: 200, headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("verify-2fa-code error", e);
    return new Response(JSON.stringify({ error: "Unable to process request" }), {
      status: 500, headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
