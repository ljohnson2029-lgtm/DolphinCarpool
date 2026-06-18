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
    const { email, purpose } = await req.json();
    if (!email || typeof email !== "string" || !purpose || !["signup", "login"].includes(purpose)) {
      return new Response(JSON.stringify({ error: "Email and valid purpose required" }), {
        status: 400, headers: { ...cors, "Content-Type": "application/json" },
      });
    }
    const normalized = email.trim().toLowerCase();

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const codeHash = await hashCode(code, normalized);
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    await admin
      .from("two_factor_codes")
      .delete()
      .eq("email", normalized)
      .eq("purpose", purpose)
      .is("used_at", null);

    const { error: insertErr } = await admin.from("two_factor_codes").insert({
      email: normalized, purpose, code_hash: codeHash, expires_at: expiresAt,
    });
    if (insertErr) {
      console.error("2fa insert error", insertErr);
      return new Response(JSON.stringify({ error: "Failed to create code" }), {
        status: 500, headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    if (!RESEND_API_KEY) {
      console.error("RESEND_API_KEY missing");
      return new Response(JSON.stringify({ error: "Email service not configured" }), {
        status: 500, headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const subject = purpose === "signup"
      ? "Verify your Dolphin Carpool email"
      : "Your Dolphin Carpool login code";
    const heading = purpose === "signup" ? "Verify Your Email" : "Two-Factor Authentication";
    const body = purpose === "signup"
      ? "Use the 6-digit code below to activate your Dolphin Carpool account."
      : "Use the 6-digit code below to complete your login.";

    const html = `
      <div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;padding:24px;">
        <h2 style="color:#1a73e8;">${heading}</h2>
        <p>${body}</p>
        <div style="font-size:32px;letter-spacing:8px;font-weight:bold;background:#f5f8ff;border-radius:8px;padding:16px;text-align:center;color:#0b1f44;margin:20px 0;">
          ${code}
        </div>
        <p>This code expires in 15 minutes. If you didn't request this, you can safely ignore this email.</p>
        <p style="color:#888;font-size:12px;margin-top:32px;">— Dolphin Carpool</p>
      </div>`;

    const emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "Dolphin Carpool <noreply@dolphincarpool.org>",
        to: [normalized],
        subject,
        html,
      }),
    });
    if (!emailRes.ok) {
      const txt = await emailRes.text();
      console.error("resend error", txt);
      return new Response(JSON.stringify({ error: "Failed to send email" }), {
        status: 500, headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200, headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("send-2fa-code error", e);
    return new Response(JSON.stringify({ error: "Unable to process request" }), {
      status: 500, headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
