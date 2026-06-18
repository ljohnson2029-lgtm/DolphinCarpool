import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Users, UserPlus, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { SkeletonListItem } from "@/components/ui/skeleton-card";
import type { LinkedParent } from "@/hooks/useLinkedParentRides";

/* ─── Helpers ───────────────────────────────────────────────────── */

const getInitials = (parent: LinkedParent): string => {
  const first = parent.parent_first_name?.[0] ?? "";
  const last = parent.parent_last_name?.[0] ?? "";
  return (first + last).toUpperCase() || "??";
};

const getFullName = (parent: LinkedParent): string =>
  [parent.parent_first_name, parent.parent_last_name].filter(Boolean).join(" ") || "Unknown Parent";

/* ─── Parent Card ───────────────────────────────────────────────── */

interface ParentCardProps {
  parent: LinkedParent;
}

const ParentCard = ({ parent }: ParentCardProps) => {
  const fullName = getFullName(parent);

  return (
    <Card className="hover:shadow-md transition-shadow" aria-label={`Linked parent: ${fullName}`}>
      <CardContent className="py-4">
        <div className="flex items-center gap-4">
          <Avatar className="h-12 w-12">
            <AvatarFallback className="bg-emerald-500/10 text-emerald-600 font-semibold">
              {getInitials(parent)}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">{fullName}</p>
            <p className="text-sm text-muted-foreground truncate">{parent.parent_email}</p>
          </div>

          <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 shrink-0">
            Linked
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
};

/* ─── Main Component ────────────────────────────────────────────── */

interface LinkedParentsListProps {
  parents: LinkedParent[];
  loading: boolean;
}

export function LinkedParentsList({ parents, loading }: LinkedParentsListProps) {
  const navigate = useNavigate();

  /* ── Loading state ──────────────────────────────────────── */
  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        <SkeletonListItem />
        <SkeletonListItem />
      </div>
    );
  }

  /* ── Empty state ────────────────────────────────────────── */
  if (parents.length === 0) {
    return (
      <Card className="border-dashed border-2">
        <CardContent className="py-12 text-center">
          <Users className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">No Parents Linked Yet</h3>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            Link to your parent's account to see their carpool schedules and stay connected with family ride plans.
          </p>
          <Button onClick={() => navigate("/family-links")} size="lg" className="gap-2">
            <UserPlus className="h-5 w-5" />
            Link to Parent Account
          </Button>
        </CardContent>
      </Card>
    );
  }

  /* ── Populated state ────────────────────────────────────── */
  return (
    <div className="space-y-4">
      {/* Count header */}
      <p className="text-sm text-muted-foreground">
        {parents.length} parent{parents.length !== 1 ? "s" : ""} linked
      </p>

      {/* Parent cards grid */}
      <div className="grid gap-4 sm:grid-cols-2" role="list">
        {parents.map((parent) => (
          <div key={parent.parent_id} role="listitem">
            <ParentCard parent={parent} />
          </div>
        ))}
      </div>

      {/* Add another */}
      <Button variant="outline" onClick={() => navigate("/family-links")} className="gap-2">
        <UserPlus className="h-4 w-4" />
        Add Another Parent
      </Button>
    </div>
  );
}

export default LinkedParentsList;
