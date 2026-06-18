import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { getCorsHeaders, handleCorsPreflightIfNeeded } from "../_shared/cors.ts";

serve(async (req) => {
  const preflight = handleCorsPreflightIfNeeded(req);
  if (preflight) return preflight;
  const corsHeaders = getCorsHeaders(req);

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const deleted: string[] = [];
    const failed: { email: string; error: string }[] = [];
    let page = 1;

    while (true) {
      const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
      if (error) throw error;
      if (!data?.users?.length) break;

      for (const u of data.users) {
        const { error: delErr } = await supabase.auth.admin.deleteUser(u.id);
        if (delErr) {
          failed.push({ email: u.email ?? u.id, error: delErr.message });
        } else {
          deleted.push(u.email ?? u.id);
        }
      }

      if (data.users.length < 200) break;
    }

    // Clean up orphaned rows in public tables (FKs should cascade, but be thorough)
    await supabase.from("two_factor_codes").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await supabase.from("password_reset_codes").delete().neq("id", "00000000-0000-0000-0000-000000000000");

    return new Response(JSON.stringify({ success: true, deletedCount: deleted.length, deleted, failed }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Unexpected error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
