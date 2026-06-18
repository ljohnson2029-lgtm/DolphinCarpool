import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { getCorsHeaders, handleCorsPreflightIfNeeded } from "../_shared/cors.ts";

serve(async (req) => {
  const preflightResponse = handleCorsPreflightIfNeeded(req);
  if (preflightResponse) return preflightResponse;
  const corsHeaders = getCorsHeaders(req);

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, serviceKey);

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { query, limit } = await req.json();
    const maxResults = Math.min(limit || 3, 10);
    if (!query || query.trim().length < 2) {
      return new Response(JSON.stringify({ results: [] }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const searchTerm = query.trim().toLowerCase();

    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, first_name, last_name, username, account_type")
      .eq("account_type", "parent")
      .neq("id", user.id);

    const parentIds = (profiles || []).map(p => p.id);

    // Determine which parents the caller is already connected to;
    // only those parents' children names/grades will be returned in results.
    const [{ data: alOut }, { data: alIn }, { data: coOut }, { data: coIn }, { data: ssRows }] = await Promise.all([
      supabase.from("account_links").select("student_id").eq("parent_id", user.id).eq("status", "approved"),
      supabase.from("account_links").select("parent_id").eq("student_id", user.id).eq("status", "approved"),
      supabase.from("co_parent_links").select("recipient_id").eq("requester_id", user.id).eq("status", "approved"),
      supabase.from("co_parent_links").select("requester_id").eq("recipient_id", user.id).eq("status", "approved"),
      supabase.from("series_spaces").select("parent_a_id, parent_b_id")
        .or(`parent_a_id.eq.${user.id},parent_b_id.eq.${user.id}`),
    ]);
    const connected = new Set<string>();
    for (const r of alOut ?? []) connected.add(r.student_id);
    for (const r of alIn ?? []) connected.add(r.parent_id);
    for (const r of coOut ?? []) connected.add(r.recipient_id);
    for (const r of coIn ?? []) connected.add(r.requester_id);
    for (const r of ssRows ?? []) connected.add(r.parent_a_id === user.id ? r.parent_b_id : r.parent_a_id);

    // Load children only for candidate parents (not the entire table)
    const { data: children } = await supabase
      .from("children")
      .select("user_id, first_name, last_name, grade_level")
      .in("user_id", parentIds.length ? parentIds : ["00000000-0000-0000-0000-000000000000"]);

    const childrenByParent: Record<string, Array<{ first_name: string; last_name: string; grade_level: string | null }>> = {};
    if (children) {
      for (const child of children) {
        if (!childrenByParent[child.user_id]) childrenByParent[child.user_id] = [];
        childrenByParent[child.user_id].push({
          first_name: child.first_name || "",
          last_name: child.last_name || "",
          grade_level: child.grade_level,
        });
      }
    }


    const scored: Array<{
      id: string;
      first_name: string;
      last_name: string;
      username: string;
      children: Array<{ first_name: string; last_name: string; grade_level: string | null }>;
      score: number;
    }> = [];

    if (profiles) {
      for (const p of profiles) {
        const firstName = (p.first_name || "").toLowerCase();
        const lastName = (p.last_name || "").toLowerCase();
        const fullName = `${firstName} ${lastName}`;
        const parentChildren = childrenByParent[p.id] || [];

        let score = 0;

        // Exact full name match
        if (fullName === searchTerm) score = 100;
        else if (firstName === searchTerm || lastName === searchTerm) score = 90;
        else if (fullName.startsWith(searchTerm)) score = 80;
        else if (firstName.startsWith(searchTerm) || lastName.startsWith(searchTerm)) score = 70;
        else if (fullName.includes(searchTerm)) score = 50;
        
        // Child name matching
        if (score === 0) {
          for (const c of parentChildren) {
            const childFull = `${c.first_name} ${c.last_name}`.toLowerCase();
            const childFirst = c.first_name.toLowerCase();
            const childLast = c.last_name.toLowerCase();
            if (childFull === searchTerm) { score = 85; break; }
            if (childFirst === searchTerm || childLast === searchTerm) { score = 75; break; }
            if (childFull.startsWith(searchTerm) || childFirst.startsWith(searchTerm)) { score = 65; break; }
            if (childFull.includes(searchTerm)) { score = 45; break; }
          }
        }

        if (score > 0) {
          scored.push({
            id: p.id,
            first_name: p.first_name || "",
            last_name: p.last_name || "",
            username: p.username,
            children: parentChildren,
            score,
          });
        }
      }
    }

    scored.sort((a, b) => b.score - a.score);
    const results = scored.slice(0, maxResults).map(({ score, ...rest }) => rest);

    return new Response(JSON.stringify({ results }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in search-parents:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
