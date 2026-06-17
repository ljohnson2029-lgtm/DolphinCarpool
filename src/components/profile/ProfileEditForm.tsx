import { useState, useMemo, useEffect, memo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save, X, User, Phone, Home, GraduationCap, Users, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import PhoneNumberInput from "@/components/PhoneNumberInput";
import { isValidPhoneNumber } from "@/lib/phone-validation";
import { useToast } from "@/hooks/use-toast";
import { GRADE_LEVELS } from "@/constants/gradeLevels";
import AddressAutocompleteInput from "@/components/AddressAutocompleteInput";
import VehicleManager from "@/components/VehicleManager";

const RequiredStar = () => <span className="text-destructive">*</span>;
const FieldError = memo(({ show }: { show: boolean }) =>
  show ? <p className="text-xs text-destructive mt-1">This field is required</p> : null
);
FieldError.displayName = "FieldError";

interface EditChild {
  id?: string;
  first_name: string;
  last_name: string;
  age: string;
  grade_level: string;
  email: string;
}

interface ProfileEditFormProps {
  user: { id: string; email?: string };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  profile: any;
  isParent: boolean;
  onSave: () => void;
  onCancel: () => void;
}

const ProfileEditForm = ({ user, profile, isParent, onSave, onCancel }: ProfileEditFormProps) => {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [attempted, setAttempted] = useState(false);

  // Shared fields
  const [firstName, setFirstName] = useState(profile.first_name || "");
  const [lastName, setLastName] = useState(profile.last_name || "");
  const [phoneNumber, setPhoneNumber] = useState(profile.phone_number || "");
  const [homeAddress, setHomeAddress] = useState(profile.home_address || "");
  const [homeLatitude, setHomeLatitude] = useState<number | null>(profile.home_latitude || null);
  const [homeLongitude, setHomeLongitude] = useState<number | null>(profile.home_longitude || null);

  // Parent vehicle fields are now managed via VehicleManager component

  // Student fields
  const [gradeLevel, setGradeLevel] = useState(profile.grade_level || "");

  // Children (parent only)
  const [children, setChildren] = useState<EditChild[]>([]);

  // Load existing children
  useEffect(() => {
    if (!isParent) return;
    const load = async () => {
      const { data } = await supabase
        .from("children")
        .select("*")
        .eq("user_id", user.id);
      if (data && data.length > 0) {
        setChildren(data.map(c => ({
          id: c.id,
          first_name: c.first_name || "",
          last_name: c.last_name || "",
          age: String(c.age),
          grade_level: c.grade_level || "",
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          email: (c as any).email || "",
        })));
      }
    };
    load();
  }, [user.id, isParent]);

  const handleAddressSelect = (address: string, lat: number, lng: number) => {
    setHomeAddress(address);
    setHomeLatitude(lat);
    setHomeLongitude(lng);
  };

  const isChildComplete = (c: EditChild) =>
    c.first_name.trim().length > 0 && c.last_name.trim().length > 0 && c.age.trim().length > 0 && c.grade_level.length > 0;

  // Validation
  const isValid = useMemo(() => {
    if (!firstName.trim() || !lastName.trim()) return false;
    if (isParent) {
      if (!isValidPhoneNumber(phoneNumber)) return false;
      if (!homeAddress.trim() || !homeLatitude || !homeLongitude) return false;
      // Vehicle validation is handled by VehicleManager separately
      // All children must be complete
      if (children.length > 0 && !children.every(isChildComplete)) return false;
    }
    return true;
  }, [firstName, lastName, phoneNumber, homeAddress, homeLatitude, homeLongitude, gradeLevel, isParent, children]);

  const fieldError = (value: string) => attempted && !value.trim();
  const addressError = attempted && isParent && (!homeAddress.trim() || !homeLatitude || !homeLongitude);

  const errorBorder = "border-destructive focus-visible:ring-destructive";

  const handleSave = async () => {
    setAttempted(true);
    if (!isValid) {
      toast({ title: "Please fill in all required fields", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const updateData: Record<string, any> = {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        updated_at: new Date().toISOString(),
      };
      if (isParent) {
        updateData.phone_number = phoneNumber.trim() || null;
      }

      if (isParent) {
        updateData.home_address = homeAddress;
        updateData.home_latitude = homeLatitude;
        updateData.home_longitude = homeLongitude;
        // Vehicle info is managed via VehicleManager, not profile fields
      }
      // Students cannot edit grade_level — managed by their parent

      const { error: profileError } = await supabase
        .from("profiles")
        .update(updateData)
        .eq("id", user.id);

      if (profileError) throw profileError;

      await supabase
        .from("users")
        .update({
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          ...(isParent ? { phone_number: phoneNumber.trim() || null } : {}),
        })
        .eq("user_id", user.id);

      // Save children for parent accounts
      if (isParent) {
        await supabase.from("children").delete().eq("user_id", user.id);
        const validChildren = children.filter(isChildComplete);
        if (validChildren.length > 0) {
          await supabase.from("children").insert(
            validChildren.map(c => ({
              user_id: user.id,
              name: `${c.first_name} ${c.last_name}`.trim(),
              first_name: c.first_name.trim(),
              last_name: c.last_name.trim(),
              age: parseInt(c.age),
              school: c.grade_level || "",
              grade_level: c.grade_level || null,
              email: c.email.trim() ? c.email.trim().toLowerCase() : null,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
            })) as any
          );
        }
      }

      toast({ title: "Profile updated successfully" });
      onSave();
    } catch (error) {
      toast({ title: "Error saving profile", description: (error as Error).message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  // RequiredStar and FieldError moved outside component to prevent focus loss

  return (
    <div className="space-y-6">
      {/* Save/Cancel buttons at top */}
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel} disabled={saving}>
          <X className="mr-2 h-4 w-4" />
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={saving || (attempted && !isValid)}>
          <Save className="mr-2 h-4 w-4" />
          {saving ? "Saving..." : "Save Changes"}
        </Button>
      </div>

      {/* Personal Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Personal Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="firstName">First Name <RequiredStar /></Label>
              <Input id="firstName" value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="First name" className={fieldError(firstName) ? errorBorder : ""} />
              <FieldError show={fieldError(firstName)} />
            </div>
            <div>
              <Label htmlFor="lastName">Last Name <RequiredStar /></Label>
              <Input id="lastName" value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Last name" className={fieldError(lastName) ? errorBorder : ""} />
              <FieldError show={fieldError(lastName)} />
            </div>
          </div>
          {isParent && (
            <div>
              <Label htmlFor="phone">
                <Phone className="inline h-4 w-4 mr-1" />
                Phone Number <RequiredStar />
              </Label>
              <PhoneNumberInput id="phone" value={phoneNumber} onChange={setPhoneNumber} className={fieldError(phoneNumber) ? errorBorder : ""} />
              <FieldError show={fieldError(phoneNumber)} />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Address - Parents only */}
      {isParent && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Home className="h-5 w-5" />
              Home Address <RequiredStar />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <AddressAutocompleteInput
              value={homeAddress}
              onAddressSelect={handleAddressSelect}
              placeholder="Start typing your address..."
              required
              className={addressError ? errorBorder : ""}
            />
            {addressError ? (
              <p className="text-xs text-destructive mt-1">Please select an address from suggestions</p>
            ) : (
              <p className="text-xs text-muted-foreground mt-1">Select from suggestions to enable map features</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Parent-specific: Vehicles */}
      {isParent && <VehicleManager />}

      {/* Parent-specific: My Children */}
      {isParent && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                My Children
              </span>
              <Button
                type="button"
                size="sm"
                onClick={() => setChildren([...children, { first_name: "", last_name: "", age: "", grade_level: "", email: "" }])}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Child
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {children.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No children added. Click "Add Child" to add your children.
              </p>
            ) : (
              children.map((child, i) => {
                const incomplete = attempted && !isChildComplete(child);
                return (
                  <div key={child.id ?? i} className={`border rounded-lg p-4 space-y-3 ${incomplete ? "border-destructive" : ""}`}>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">
                        {child.first_name.trim() ? `${child.first_name} ${child.last_name}`.trim() : `Child ${i + 1}`}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={children.length <= 1}
                        title={children.length <= 1 ? "At least one child is required" : "Remove child"}
                        onClick={() => {
                          if (children.length <= 1) {
                            toast({ title: "At least one child is required", variant: "destructive" });
                            return;
                          }
                          setChildren(children.filter((_, idx) => idx !== i));
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                    {incomplete && (
                      <p className="text-xs text-destructive">All fields are required for each child</p>
                    )}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>First Name <RequiredStar /></Label>
                        <Input
                          value={child.first_name}
                          onChange={e => { const u = [...children]; u[i] = { ...u[i], first_name: e.target.value }; setChildren(u); }}
                          placeholder="First name"
                          className={incomplete && !child.first_name.trim() ? errorBorder : ""}
                        />
                      </div>
                      <div>
                        <Label>Last Name <RequiredStar /></Label>
                        <Input
                          value={child.last_name}
                          onChange={e => { const u = [...children]; u[i] = { ...u[i], last_name: e.target.value }; setChildren(u); }}
                          placeholder="Last name"
                          className={incomplete && !child.last_name.trim() ? errorBorder : ""}
                        />
                      </div>
                      <div>
                        <Label>Age <RequiredStar /></Label>
                        <Input
                          type="number" min="1" max="100"
                          value={child.age}
                          onChange={e => { 
                            const val = e.target.value;
                            if (val && (parseInt(val) < 0 || parseInt(val) > 100)) return;
                            const u = [...children]; u[i] = { ...u[i], age: val }; setChildren(u); 
                          }}
                          placeholder="Age"
                          className={incomplete && !child.age.trim() ? errorBorder : ""}
                        />
                      </div>
                      <div>
                        <Label>Grade <RequiredStar /></Label>
                        <Select value={child.grade_level} onValueChange={v => { const u = [...children]; u[i] = { ...u[i], grade_level: v }; setChildren(u); }}>
                          <SelectTrigger className={incomplete && !child.grade_level ? errorBorder : ""}>
                            <SelectValue placeholder="Grade" />
                          </SelectTrigger>
                          <SelectContent>
                            {GRADE_LEVELS.map(g => (
                              <SelectItem key={g} value={g}>{g}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div>
                      <Label>Attach Your Child's Email</Label>
                      <Input
                        type="email"
                        value={child.email}
                        onChange={e => { const u = [...children]; u[i] = { ...u[i], email: e.target.value }; setChildren(u); }}
                        placeholder="child@example.com"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Attach your child's email so they can create a student account and view the rides you schedule for them. Once saved, your child just needs to go to the signup page, click "Sign Up as a Student" and use this email to create their account.
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        You can add this later in your profile settings.
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      )}

      {/* Student-specific: Grade (read-only) */}
      {!isParent && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5" />
              Academic Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Label>Grade Level</Label>
            <p className="mt-2 font-semibold text-gray-900">{gradeLevel || "Not set"}</p>
            <p className="text-xs text-muted-foreground mt-1">
              To update your grade level, ask your parent to change it in their account settings.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Save/Cancel buttons at bottom too */}
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel} disabled={saving}>
          <X className="mr-2 h-4 w-4" />
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={saving || (attempted && !isValid)}>
          <Save className="mr-2 h-4 w-4" />
          {saving ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </div>
  );
};

export default ProfileEditForm;
