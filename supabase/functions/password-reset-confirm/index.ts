import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { getCorsHeaders, handleCorsPreflightIfNeeded } from "../_shared/cors.ts";

async function hashCode(code: string, salt: string): Promise<string> {
  const data = new TextEncoder().encode(`${salt}:${code}`);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}

const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

async function findAuthUserIdByEmail(admin: ReturnType<typeof createClient>, email: string): Promise<string | null> {
  const { data: userRows, error: userLookupError } = await admin
    .from("users")
    .select("user_id, email")
    .ilike("email", email)
    .limit(5);

  if (userLookupError) {
    console.error("password reset users lookup error", userLookupError);
  }

  const matchingUserRow = userRows?.find((user) => String(user.email).trim().toLowerCase() === email);
  if (matchingUserRow?.user_id) {
    const { data: authUser, error: authLookupError } = await admin.auth.admin.getUserById(matchingUserRow.user_id);
    console.log("password reset auth lookup", {
      source: "users_table",
      foundUserRow: true,
      foundAuthUser: Boolean(authUser?.user),
      emailMatches: authUser?.user?.email?.trim().toLowerCase() === email,
    });

    if (!authLookupError && authUser?.user?.email?.trim().toLowerCase() === email) {
      return authUser.user.id;
    }

    console.error("password reset users/auth mismatch", {
      authLookupError,
      foundAuthUser: Boolean(authUser?.user),
      emailMatches: authUser?.user?.email?.trim().toLowerCase() === email,
    });
  }

  for (let page = 1; page <= 10; page += 1) {
    const { data: authUsers, error: listError } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (listError) {
      console.error("password reset auth list fallback error", listError);
      return null;
    }

    const matchingAuthUser = authUsers.users.find((user) => user.email?.trim().toLowerCase() === email);
    if (matchingAuthUser) {
      console.log("password reset auth lookup", { source: "auth_list_fallback", foundAuthUser: true });
      return matchingAuthUser.id;
    }

    if (authUsers.users.length < 1000) break;
  }

  console.log("password reset auth lookup", { foundAuthUser: false });
  return null;
}

serve(async (req) => {
  const pre = handleCorsPreflightIfNeeded(req);
  if (pre) return pre;
  const cors = getCorsHeaders(req);

  try {
    const { email, code, action, newPassword } = await req.json();
    if (!email || !code) {
      return new Response(JSON.stringify({ error: "Email and code required" }), {
        status: 400, headers: { ...cors, "Content-Type": "application/json" },
      });
    }
    const normalized = String(email).trim().toLowerCase();
    const codeStr = String(code).trim();

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    const codeHash = await hashCode(codeStr, normalized);

    const { data: row } = await admin
      .from("password_reset_codes")
      .select("*")
      .eq("email", normalized)
      .eq("code_hash", codeHash)
      .is("used_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!row) {
      return new Response(JSON.stringify({ error: "invalid_code" }), {
        status: 400, headers: { ...cors, "Content-Type": "application/json" },
      });
    }
    if (new Date(row.expires_at).getTime() < Date.now()) {
      return new Response(JSON.stringify({ error: "expired_code" }), {
        status: 400, headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    if (action === "verify") {
      return new Response(JSON.stringify({ success: true }), {
        status: 200, headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    // action === "reset"
    if (!newPassword || !passwordRegex.test(String(newPassword))) {
      return new Response(JSON.stringify({ error: "weak_password" }), {
        status: 400, headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const userId = await findAuthUserIdByEmail(admin, normalized);
    if (!userId) {
      return new Response(JSON.stringify({ error: "user_not_found" }), {
        status: 200, headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const updateResult = await admin.auth.admin.updateUserById(userId, {
      password: String(newPassword),
    });
    console.log("password reset update response", {
      userId,
      success: !updateResult.error,
      updatedUserId: updateResult.data?.user?.id ?? null,
      updatedEmail: updateResult.data?.user?.email ?? null,
      error: updateResult.error
        ? {
            name: updateResult.error.name,
            message: updateResult.error.message,
            status: updateResult.error.status,
            code: (updateResult.error as { code?: string }).code,
            reasons: (updateResult.error as { reasons?: string[] }).reasons,
          }
        : null,
    });
    const updErr = updateResult.error;
    if (updErr) {
      console.error("password update error", updErr);
      const errAny = updErr as { code?: string; message?: string; reasons?: string[] };
      const reasons = errAny.reasons || [];
      if (reasons.includes("pwned")) {
        return new Response(
          JSON.stringify({
            error: "pwned_password",
            message: "This password has appeared in known data breaches. Please choose a different, unique password.",
          }),
          { status: 200, headers: { ...cors, "Content-Type": "application/json" } }
        );
      }
      if (errAny.code === "weak_password") {
        return new Response(
          JSON.stringify({
            error: "weak_password",
            message: "Password must meet the security requirements. Please choose a stronger password.",
          }),
          { status: 200, headers: { ...cors, "Content-Type": "application/json" } }
        );
      }
      return new Response(
        JSON.stringify({ error: "update_failed", message: errAny.message || "Could not update password." }),
        { status: 500, headers: { ...cors, "Content-Type": "application/json" } }
      );
    }

    // Delete the code
    await admin.from("password_reset_codes").delete().eq("id", row.id);
    // Also clean up other codes for this email
    await admin.from("password_reset_codes").delete().eq("email", normalized);

    return new Response(JSON.stringify({ success: true, updatedUserId: userId }), {
      status: 200, headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: "server_error" }), {
      status: 500, headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
