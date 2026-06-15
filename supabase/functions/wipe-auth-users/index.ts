import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import { getCorsHeaders, handleCorsPreflightIfNeeded } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  const pre = handleCorsPreflightIfNeeded(req);
  if (pre) return pre;
  const corsHeaders = getCorsHeaders(req);

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Wipe all user-related public data first
    const tables = [
      'ride_messages',
      'ride_conversations',
      'private_ride_requests',
      'schedule_cancellations',
      'recurring_ride_cancellations',
      'series_child_selections',
      'series_messages',
      'recurring_schedules',
      'series_spaces',
      'recurring_rides',
      'rides',
      'notifications',
      'vehicles',
      'children',
      'co_parent_links',
      'account_links',
      'student_parent_links',
      'user_roles',
      'profiles',
      'users',
    ];
    const tableResults: Record<string, string> = {};
    for (const t of tables) {
      const { error } = await supabase.from(t).delete().not('id', 'is', null).gte('created_at', '1900-01-01').or('id.not.is.null');
      // simpler: just delete all rows via a broad filter that always matches
      const { error: e2 } = await supabase.rpc('noop_does_not_exist').then(() => ({ error: null })).catch(() => ({ error: null }));
      // Re-do reliably:
      const { error: delErr } = await supabase.from(t).delete().gte('created_at', '1900-01-01');
      if (delErr && delErr.code !== '42703') {
        // fall back if no created_at column
        const { error: delErr2 } = await supabase.from(t).delete().not('user_id', 'is', null);
        tableResults[t] = delErr2 ? `error: ${delErr2.message}` : 'cleared';
      } else {
        tableResults[t] = delErr ? `error: ${delErr.message}` : 'cleared';
      }
    }

    // Delete all auth users
    const deleted: string[] = [];
    const errors: Array<{ id: string; email: string | null; error: string }> = [];
    let page = 1;
    const perPage = 1000;
    while (true) {
      const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
      if (error) throw error;
      if (!data.users.length) break;
      for (const u of data.users) {
        const { error: dErr } = await supabase.auth.admin.deleteUser(u.id);
        if (dErr) errors.push({ id: u.id, email: u.email ?? null, error: dErr.message });
        else deleted.push(u.email ?? u.id);
      }
      if (data.users.length < perPage) break;
      // don't increment page — we just deleted, so re-query page 1
    }

    return new Response(JSON.stringify({
      success: true,
      auth_users_deleted: deleted.length,
      auth_users_errors: errors,
      tables: tableResults,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : String(e) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
