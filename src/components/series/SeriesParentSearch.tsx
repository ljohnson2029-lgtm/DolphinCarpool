import { useState, useEffect } from "react";
import { Search, Users, GraduationCap, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useDebounce } from "@/hooks/useDebounce";

interface SearchResult {
  id: string;
  first_name: string;
  last_name: string;
  username: string;
  children: { first_name: string; last_name: string; grade_level: string | null }[];
}

interface Props {
  onSpaceCreated: (spaceId: string, otherParentName: string) => void;
  existingSpaces: { parent_a_id: string; parent_b_id: string; id: string; other_parent_name: string }[];
}

const SeriesParentSearch = ({ onSpaceCreated, existingSpaces }: Props) => {
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [creating, setCreating] = useState(false);
  const debouncedQuery = useDebounce(query, 200);

  useEffect(() => {
    if (debouncedQuery.trim().length < 2) {
      setResults([]);
      setHasSearched(false);
      return;
    }
    let cancelled = false;
    const doSearch = async () => {
      setLoading(true);
      setHasSearched(true);
      try {
        const { data, error } = await supabase.functions.invoke("search-parents", {
          body: { query: debouncedQuery.trim(), limit: 3 },
        });
        if (error) throw error;
        if (!cancelled) setResults(data?.results || []);
      } catch {
        if (!cancelled) setResults([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    doSearch();
    return () => { cancelled = true; };
  }, [debouncedQuery]);

  const selectParent = async (parent: SearchResult) => {
    if (!user || creating) return;
    const name = [parent.first_name, parent.last_name].filter(Boolean).join(" ") || parent.username;

    // Check if space already exists
    const existing = existingSpaces.find(
      (s) =>
        (s.parent_a_id === user.id && s.parent_b_id === parent.id) ||
        (s.parent_b_id === user.id && s.parent_a_id === parent.id)
    );
    if (existing) {
      onSpaceCreated(existing.id, name);
      return;
    }

    setCreating(true);
    // Sort IDs to prevent duplicate spaces
    const [aId, bId] = [user.id, parent.id].sort();
    const { data, error } = await supabase
      .from("series_spaces")
      .insert({ parent_a_id: aId, parent_b_id: bId })
      .select("id")
      .single();

    if (error) {
      // May be duplicate, try to find existing
      const { data: found } = await supabase
        .from("series_spaces")
        .select("id")
        .or(`and(parent_a_id.eq.${aId},parent_b_id.eq.${bId}),and(parent_a_id.eq.${bId},parent_b_id.eq.${aId})`)
        .maybeSingle();
      if (found) {
        onSpaceCreated(found.id, name);
      }
    } else if (data) {
      onSpaceCreated(data.id, name);
    }
    setCreating(false);
  };

  return (
    <div className="space-y-3">
      <h3 className="text-lg font-semibold text-foreground">Start New Series</h3>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search for a parent or student by name"
          className="pl-9"
        />
        {loading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />}
      </div>
      <p className="text-xs text-muted-foreground">
        Note: Only parents who have created a Dolphin CarPool account will appear in search results
      </p>

      {hasSearched && !loading && results.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4">No parents found.</p>
      )}

      {results.map((r) => {
        const name = [r.first_name, r.last_name].filter(Boolean).join(" ") || r.username;
        return (
          <Card key={r.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => selectParent(r)}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Users className="h-4 w-4 text-muted-foreground" />
                <h4 className="font-semibold text-foreground">{name}</h4>
                <Badge variant="secondary" className="text-xs">Parent</Badge>
              </div>
              {r.children.length > 0 && (
                <div className="ml-6 space-y-0.5">
                  <p className="text-xs font-medium text-muted-foreground">Chadwick Children:</p>
                  {r.children.map((child, i) => (
                    <div key={i} className="flex items-center gap-1.5 text-sm">
                      <GraduationCap className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>{child.first_name} {child.last_name}</span>
                      {child.grade_level && <span className="text-muted-foreground text-xs">• {child.grade_level}</span>}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default SeriesParentSearch;
