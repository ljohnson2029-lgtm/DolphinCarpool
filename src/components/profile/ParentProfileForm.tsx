import { useCallback, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Users, Home, CheckCircle2 } from "lucide-react";
import VehicleManager from "@/components/VehicleManager";
import { GRADE_LEVELS } from "@/constants/gradeLevels";
import AddressAutocompleteInput from "@/components/AddressAutocompleteInput";

/* ─── Types ─────────────────────────────────────────────────────── */

interface Child {
  id?: string;
  first_name: string;
  last_name: string;
  age: string;
  grade_level: string;
  email?: string;
  special_notes?: string;
  emergency_contact?: string;
}

interface ParentProfileFormProps {
  homeAddress: string;
  onAddressSelect: (address: string, lat: number, lng: number) => void;
  children: Child[];
  onAddChild: () => void;
  onRemoveChild: (index: number) => void;
  onUpdateChild: (index: number, field: keyof Child, value: string) => void;
  // Legacy vehicle props (ignored - VehicleManager handles this now)
  carMake?: string;
  setCarMake?: (value: string) => void;
  carModel?: string;
  setCarModel?: (value: string) => void;
  carColor?: string;
  setCarColor?: (value: string) => void;
  licensePlate?: string;
  setLicensePlate?: (value: string) => void;
}

/* ─── Profile Completeness ──────────────────────────────────────── */

interface CompletenessBarProps {
  homeAddress: string;
  children: Child[];
}

const useCompleteness = ({ homeAddress, children }: CompletenessBarProps) => {
  return useMemo(() => {
    const checks = [
      homeAddress.length > 0,
      children.length > 0,
      children.length > 0 && children.every((c) => c.first_name.length > 0),
      children.length > 0 && children.every((c) => c.grade_level.length > 0),
    ];
    const filled = checks.filter(Boolean).length;
    return Math.round((filled / checks.length) * 100);
  }, [homeAddress, children]);
};

const CompletenessBar = (props: CompletenessBarProps) => {
  const percent = useCompleteness(props);

  const color = percent < 40 ? "bg-red-500" : percent < 75 ? "bg-amber-500" : "bg-emerald-500";

  const label =
    percent === 100
      ? "Profile complete!"
      : percent >= 75
        ? "Almost there…"
        : "Complete your profile to start carpooling";

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium flex items-center gap-1">
          {percent === 100 && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
          {percent}%
        </span>
      </div>
      <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${percent}%` }}
          role="progressbar"
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Profile completeness"
        />
      </div>
    </div>
  );
};

/* ─── Child Card ────────────────────────────────────────────────── */

interface ChildCardProps {
  child: Child;
  index: number;
  onUpdate: (index: number, field: keyof Child, value: string) => void;
}

const ChildCard = ({ child, index, onUpdate }: ChildCardProps) => {
  const prefix = `child-${index}`;
  const displayName = [child.first_name, child.last_name].filter(Boolean).join(" ");

  return (
    <fieldset
      className="p-4 border rounded-lg space-y-4"
      aria-label={displayName ? `${displayName}'s details` : `Child ${index + 1} details`}
    >
      <div className="flex items-center justify-between">
        <legend className="font-medium text-sm">{displayName || `Child ${index + 1}`}</legend>
      </div>

      {/* Name row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor={`${prefix}-first`}>First Name</Label>
          <Input
            id={`${prefix}-first`}
            value={child.first_name}
            onChange={(e) => onUpdate(index, "first_name", e.target.value)}
            placeholder="First name"
            autoComplete="given-name"
          />
        </div>
        <div>
          <Label htmlFor={`${prefix}-last`}>Last Name</Label>
          <Input
            id={`${prefix}-last`}
            value={child.last_name}
            onChange={(e) => onUpdate(index, "last_name", e.target.value)}
            placeholder="Last name"
            autoComplete="family-name"
          />
        </div>
      </div>

      {/* Grade & Age row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor={`${prefix}-grade`}>Grade Level</Label>
          <Select value={child.grade_level} onValueChange={(value) => onUpdate(index, "grade_level", value)}>
            <SelectTrigger id={`${prefix}-grade`}>
              <SelectValue placeholder="Select grade" />
            </SelectTrigger>
            <SelectContent>
              {GRADE_LEVELS.map((grade) => (
                <SelectItem key={grade} value={grade}>
                  {grade}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor={`${prefix}-age`}>Age</Label>
          <Input
            id={`${prefix}-age`}
            type="number"
            inputMode="numeric"
            min="3"
            max="18"
            value={child.age}
            onChange={(e) => onUpdate(index, "age", e.target.value)}
            placeholder="Age"
          />
        </div>
      </div>

      {/* Attach child's email (optional) */}
      <div>
        <Label htmlFor={`${prefix}-email`}>Attach Your Child's Email</Label>
        <Input
          id={`${prefix}-email`}
          type="email"
          inputMode="email"
          autoComplete="email"
          value={child.email ?? ""}
          onChange={(e) => onUpdate(index, "email", e.target.value)}
          placeholder="child@example.com"
        />
        <p className="text-xs text-muted-foreground mt-1">
          Attach your child's email so they can create a student account and view the rides you schedule for them. Once saved, your child just needs to go to the signup page, click "Sign Up as a Student" and use this email to create their account.
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          You can add this later in your profile settings.
        </p>
      </div>

      {/* Emergency contact & notes row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor={`${prefix}-emergency`}>Emergency Contact Phone</Label>
          <Input
            id={`${prefix}-emergency`}
            type="tel"
            inputMode="tel"
            value={child.emergency_contact ?? ""}
            onChange={(e) => onUpdate(index, "emergency_contact", e.target.value)}
            placeholder="(310) 555-1234"
            autoComplete="tel"
          />
          <p className="text-xs text-muted-foreground mt-1">Shared with carpool drivers for safety</p>
        </div>
        <div>
          <Label htmlFor={`${prefix}-notes`}>Special Notes</Label>
          <Textarea
            id={`${prefix}-notes`}
            value={child.special_notes ?? ""}
            onChange={(e) => onUpdate(index, "special_notes", e.target.value)}
            placeholder="Allergies, booster seat, pickup instructions…"
            rows={2}
            className="resize-none"
          />
        </div>
      </div>
    </fieldset>
  );
};

/* ─── Main Form ─────────────────────────────────────────────────── */

const ParentProfileForm = ({
  homeAddress,
  onAddressSelect,
  children,
  onAddChild,
  onUpdateChild,
}: ParentProfileFormProps) => {
  return (
    <>
      {/* ── Completeness ──────────────────────────────────────── */}
      <CompletenessBar
        homeAddress={homeAddress}
        children={children}
      />

      {/* ── Home Address ──────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Home className="h-5 w-5" />
            Home Address
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div>
            <Label htmlFor="homeAddress">
              Address <span className="text-destructive">*</span>
            </Label>
            <AddressAutocompleteInput
              value={homeAddress}
              onAddressSelect={onAddressSelect}
              placeholder="Start typing your address…"
              required
            />
            <p className="text-xs text-muted-foreground mt-1">
              Your address is used to match you with nearby carpool families
            </p>
          </div>
        </CardContent>
      </Card>

      {/* ── Children ──────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Your Children
            </span>
            <Button type="button" onClick={onAddChild} size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Add Child
            </Button>
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Children records cannot be deleted. Contact support if a change is needed.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {children.length === 0 ? (
            <div className="text-center py-6 space-y-2">
              <Users className="h-8 w-8 mx-auto text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">
                No children added yet. Add your children to start finding carpool matches.
              </p>
            </div>
          ) : (
            children.map((child, index) => (
              <ChildCard
                key={child.id ?? index}
                child={child}
                index={index}
                onUpdate={onUpdateChild}
              />
            ))
          )}
        </CardContent>
      </Card>

      {/* ── Vehicle Information ────────────────────────────────── */}
      <VehicleManager />
    </>
  );
};

export default ParentProfileForm;
