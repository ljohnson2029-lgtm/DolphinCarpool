import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { getCorsHeaders, handleCorsPreflightIfNeeded } from "../_shared/cors.ts";

async function hashCode(code: string, salt: string): Promise<string> {
  const data = new TextEncoder().encode(`${salt}:${code}`);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}

async function authUserExistsByEmail(admin: ReturnType<typeof createClient>, email: string): Promise<boolean> {
  const { data: userRows, error: userLookupError } = await admin
    .from("users")
    .select("user_id, email")
    .ilike("email", email)
    .limit(5);

  if (userLookupError) console.error("password reset request users lookup error", userLookupError);

  const matchingUserRow = userRows?.find((user) => String(user.email).trim().toLowerCase() === email);
  if (matchingUserRow?.user_id) {
    const { data: authUser, error: authLookupError } = await admin.auth.admin.getUserById(matchingUserRow.user_id);
    return !authLookupError && authUser?.user?.email?.trim().toLowerCase() === email;
  }

  for (let page = 1; page <= 10; page += 1) {
    const { data: authUsers, error: listError } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (listError) {
      console.error("password reset request auth list fallback error", listError);
      return false;
    }
    if (authUsers.users.some((user) => user.email?.trim().toLowerCase() === email)) return true;
    if (authUsers.users.length < 1000) break;
  }

  return false;
}

serve(async (req) => {
  const pre = handleCorsPreflightIfNeeded(req);
  if (pre) return pre;
  const cors = getCorsHeaders(req);

  try {
    const { email } = await req.json();
    if (!email || typeof email !== "string") {
      return new Response(JSON.stringify({ error: "Email is required" }), {
        status: 400, headers: { ...cors, "Content-Type": "application/json" },
      });
    }
    const normalized = email.trim().toLowerCase();

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    // Check if user exists (don't reveal to client either way)
    const lookup = await fetch(
      `${SUPABASE_URL}/auth/v1/admin/users?email=${encodeURIComponent(normalized)}`,
      { headers: { apikey: SERVICE_ROLE, Authorization: `Bearer ${SERVICE_ROLE}` } }
    );
    const lookupJson = await lookup.json();
    const userExists = Array.isArray(lookupJson?.users) && lookupJson.users.length > 0;

    if (userExists && RESEND_API_KEY) {
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const codeHash = await hashCode(code, normalized);
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

      // Invalidate any existing unused codes for this email
      await admin
        .from("password_reset_codes")
        .delete()
        .eq("email", normalized)
        .is("used_at", null);

      const { error: insertErr } = await admin
        .from("password_reset_codes")
        .insert({ email: normalized, code_hash: codeHash, expires_at: expiresAt });

      if (insertErr) {
        console.error("insert error", insertErr);
        throw new Error("Failed to create code");
      }

      const html = `
        <div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;padding:24px;">
          <h2 style="color:#1a73e8;">Password Reset Code</h2>
          <p>Use the verification code below to reset your Dolphin Carpool password.</p>
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
          subject: "Your Dolphin Carpool password reset code",
          html,
        }),
      });
      if (!emailRes.ok) {
        console.error("resend error", await emailRes.text());
      }
    }

    // Always return success to avoid email enumeration
    return new Response(JSON.stringify({ success: true }), {
      status: 200, headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: "Unable to process request" }), {
      status: 500, headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
