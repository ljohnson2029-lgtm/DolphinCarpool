import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle2, Pencil, Baby, Save } from "lucide-react";

interface ChildRow {
  id: string;
  first_name: string;
  last_name: string;
  age: number | null;
  grade_level: string | null;
  email: string | null;
}

const ChildEmailManager = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  const [children, setChildren] = useState<ChildRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [editing, setEditing] = useState<Record<string, boolean>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  const fetchChildren = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("children")
      .select("id, first_name, last_name, age, grade_level, email")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true });
    if (error) {
      console.error(error);
      toast({ title: "Error", description: "Failed to load children", variant: "destructive" });
    } else {
      setChildren((data as ChildRow[]) || []);
      const d: Record<string, string> = {};
      (data || []).forEach((c) => {
        d[c.id] = c.email ?? "";
      });
      setDrafts(d);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchChildren();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const handleSave = async (childId: string) => {
    const raw = (drafts[childId] ?? "").trim().toLowerCase();
    if (raw && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw)) {
      toast({ title: "Invalid email", description: "Please enter a valid email address", variant: "destructive" });
      return;
    }
    setSavingId(childId);
    const { error } = await supabase
      .from("children")
      .update({ email: raw || null })
      .eq("id", childId);
    setSavingId(null);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Saved", description: raw ? "Child's email attached" : "Email removed" });
    setEditing((prev) => ({ ...prev, [childId]: false }));
    fetchChildren();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (children.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          No children added yet. Add your children in the section above to attach a student email.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {children.map((child) => {
        const savedEmail = child.email?.trim() || "";
        const isEditing = editing[child.id] || !savedEmail;
        const draft = drafts[child.id] ?? "";
        return (
          <Card key={child.id}>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Baby className="h-5 w-5 text-primary" />
                {child.first_name} {child.last_name}
              </CardTitle>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                {child.grade_level && <span>Grade: {child.grade_level}</span>}
                {child.age != null && <span>Age: {child.age}</span>}
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <Label htmlFor={`child-email-${child.id}`}>Attach Child's Email</Label>
              {savedEmail && !isEditing ? (
                <div className="flex items-center justify-between gap-2 rounded-md border bg-emerald-50 px-3 py-2">
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <span className="font-medium">{savedEmail}</span>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditing((p) => ({ ...p, [child.id]: true }))}
                  >
                    <Pencil className="h-4 w-4 mr-1" /> Edit
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row gap-2">
                  <Input
                    id={`child-email-${child.id}`}
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    placeholder="child@example.com"
                    value={draft}
                    onChange={(e) =>
                      setDrafts((prev) => ({ ...prev, [child.id]: e.target.value }))
                    }
                  />
                  <Button
                    type="button"
                    onClick={() => handleSave(child.id)}
                    disabled={savingId === child.id}
                  >
                    {savingId === child.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-1" /> Save
                      </>
                    )}
                  </Button>
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                Attach your child's email so they can create a student account and view the
                rides you schedule for them. Once you save their email, all they need to do is
                go to the Dolphin Carpool signup page, click "Sign Up as a Student" and sign up
                using this email address.
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default ChildEmailManager;
