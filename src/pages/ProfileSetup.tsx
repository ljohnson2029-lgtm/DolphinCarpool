import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { GRADE_LEVELS, PARENT_GRADE_LEVEL } from "@/constants/gradeLevels";
import AddressAutocompleteInput from "@/components/AddressAutocompleteInput";
import { User, GraduationCap, Home, Phone, Mail, ArrowRight, ArrowLeft, CheckCircle2, Plus, Trash2, Users, AlertCircle, Sparkles } from "lucide-react";
import VehicleManager, { type VehicleManagerHandle } from "@/components/VehicleManager";
import PhoneNumberInput from "@/components/PhoneNumberInput";
import { isValidPhoneNumber } from "@/lib/phone-validation";
import { useScrollReveal } from "@/lib/animations";
import { useVehicles } from "@/hooks/useVehicles";

interface Child {
  first_name: string;
  last_name: string;
  age: string;
  grade_level: string;
  email: string;
}

/* ── Validation helpers ──────────────────────────── */

const isValidPhone = (phone: string) => isValidPhoneNumber(phone);
const isMinLength = (val: string, min: number) => val.trim().length >= min;

interface FieldError {
  show: boolean;
  message: string;
}

const FieldErrorMessage = ({ error }: { error?: FieldError }) => {
  if (!error?.show) return null;
  return (
    <p className="text-sm text-destructive flex items-center gap-1 mt-1">
      <AlertCircle className="h-3.5 w-3.5 shrink-0" />
      {error.message}
    </p>
  );
};

const RequiredLabel = ({ children, icon, htmlFor }: { children: React.ReactNode; icon?: React.ReactNode; htmlFor?: string }) => (
  <Label htmlFor={htmlFor} className="flex items-center gap-1">
    {icon} {children} <span className="text-destructive">*</span>
  </Label>
);

const OptionalLabel = ({ children, icon, htmlFor }: { children: React.ReactNode; icon?: React.ReactNode; htmlFor?: string }) => (
  <Label htmlFor={htmlFor} className="flex items-center gap-1">
    {icon} {children}
  </Label>
);

const ProfileSetup = () => {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const formRef = useRef<HTMLDivElement>(null);
  const vehicleManagerRef = useRef<VehicleManagerHandle>(null);
  const { vehicles, loading: vehiclesLoading } = useVehicles();

  const isEditMode = !!profile?.profile_complete;
  const [step, setStep] = useState(1);
  const totalSteps = 2;

  // Start at step 2 for edit mode
  useEffect(() => {
    if (isEditMode && step === 1) setStep(2);
  }, [isEditMode, step]);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);
  const [vehicleDraftValid, setVehicleDraftValid] = useState(false);

  // Profile fields
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [homeAddress, setHomeAddress] = useState("");
  const [homeLatitude, setHomeLatitude] = useState<number | null>(null);
  const [homeLongitude, setHomeLongitude] = useState<number | null>(null);
  const [gradeLevel, setGradeLevel] = useState("");

  // Vehicle fields are now managed via VehicleManager component
  
  const [children, setChildren] = useState<Child[]>([{ first_name: "", last_name: "", age: "", grade_level: "", email: "" }]);
  const [childTouched, setChildTouched] = useState<Record<string, boolean>>({});

  // Student fields
  const [parentGuardianName, setParentGuardianName] = useState("");
  const [parentGuardianPhone, setParentGuardianPhone] = useState("");
  const [parentGuardianEmail, setParentGuardianEmail] = useState("");
  const [emergencyContactName, setEmergencyContactName] = useState("");
  const [emergencyContactPhone, setEmergencyContactPhone] = useState("");

  const [saving, setSaving] = useState(false);

  const isParent = profile?.account_type === "parent";

  useEffect(() => {
    if (!loading && !user) navigate("/login");
  }, [user, loading, navigate]);

  // No redirect for completed profiles - they may be editing

  useEffect(() => {
    if (profile) {
      setFirstName(profile.first_name || "");
      setLastName(profile.last_name || "");
      setPhoneNumber(profile.phone_number || "");
      setHomeAddress(profile.home_address || "");
      setHomeLatitude(profile.home_latitude || null);
      setHomeLongitude(profile.home_longitude || null);
      setGradeLevel(profile.grade_level || "");
      // Vehicle fields now managed via VehicleManager
      if (!isParent) {
        setParentGuardianName(profile.parent_guardian_name || "");
        setParentGuardianPhone(profile.parent_guardian_phone || "");
        setParentGuardianEmail(profile.parent_guardian_email || "");
        setEmergencyContactName(profile.emergency_contact_name || "");
        setEmergencyContactPhone(profile.emergency_contact_phone || "");
      }
    }
  }, [profile, isParent]);

  // Load existing children for parent accounts
  useEffect(() => {
    const loadChildren = async () => {
      if (!user || !isParent) return;
      const { data } = await supabase
        .from("children")
        .select("*")
        .eq("user_id", user.id);
      if (data && data.length > 0) {
        setChildren(data.map(c => ({
          first_name: c.first_name || "",
          last_name: c.last_name || "",
          age: String(c.age),
          grade_level: c.grade_level || "",
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          email: (c as any).email || "",
        })));
      }
    };
    loadChildren();
  }, [user, isParent]);

  const markTouched = (field: string) => setTouched(prev => ({ ...prev, [field]: true }));

  const handleAddressSelect = (address: string, lat: number, lng: number) => {
    setHomeAddress(address);
    setHomeLatitude(lat);
    setHomeLongitude(lng);
    markTouched("address");
  };

  /* ── Field-level validation ─────────────────────── */

  const hasSelectedAddress =
    homeAddress.trim().length > 0 && homeLatitude !== null && homeLongitude !== null;

  const getFieldError = (field: string): FieldError => {
    const show = touched[field] || attemptedSubmit;

    switch (field) {
      case "firstName":
        if (!firstName.trim()) return { show, message: "This field is required" };
        if (!isMinLength(firstName, 2)) return { show, message: "Must be at least 2 characters" };
        break;
      case "lastName":
        if (!lastName.trim()) return { show, message: "This field is required" };
        if (!isMinLength(lastName, 2)) return { show, message: "Must be at least 2 characters" };
        break;
      case "phone":
        if (isParent) {
          if (!phoneNumber.trim()) return { show, message: "This field is required" };
          if (!isValidPhone(phoneNumber)) return { show, message: "Please enter a complete phone number" };
        } else {
          // Optional for students, but validate format if entered
          if (phoneNumber.trim() && !isValidPhone(phoneNumber)) return { show, message: "Please enter a complete phone number" };
        }
        break;
      case "address":
        if (!homeAddress.trim()) return { show, message: "This field is required" };
        if (!hasSelectedAddress) return { show, message: "Please select an address from the dropdown" };
        break;
      case "gradeLevel":
        if (!isParent && !gradeLevel) return { show, message: "This field is required" };
        break;
      // Vehicle validation removed - handled by VehicleManager
    }

    return { show: false, message: "" };
  };

  const isChildEmpty = (c: Child) => !c.first_name.trim() && !c.last_name.trim() && !c.age.trim() && !c.grade_level;
  const isChildComplete = (c: Child) => c.first_name.trim().length > 0 && c.last_name.trim().length > 0 && c.age.trim().length > 0 && c.grade_level.length > 0;
  const isChildPartial = (c: Child) => !isChildEmpty(c) && !isChildComplete(c);

  const getChildFieldError = (childIndex: number, field: keyof Child): FieldError => {
    const key = `child-${childIndex}-${field}`;
    const show = childTouched[key] || attemptedSubmit;
    const child = children[childIndex];
    if (!child) return { show: false, message: "" };
    // First child is always required; additional children only validate if partially filled
    const isRequired = childIndex === 0;
    if (!isRequired && isChildEmpty(child)) return { show: false, message: "" };
    const val = child[field];
    if (!val || !val.toString().trim()) return { show, message: "This field is required" };
    if (field === 'age') {
      const ageNum = parseInt(val);
      if (isNaN(ageNum) || ageNum < 1 || ageNum > 100) return { show, message: "Please enter a valid age (1-100)" };
    }
    return { show: false, message: "" };
  };

  const childFieldHasError = (childIndex: number, field: keyof Child) => {
    const err = getChildFieldError(childIndex, field);
    return err.show && err.message.length > 0;
  };

  const childErrorInputClass = (childIndex: number, field: keyof Child) => 
    childFieldHasError(childIndex, field) ? "border-destructive focus-visible:ring-destructive" : "";

  const markChildTouched = (childIndex: number, field: keyof Child) => 
    setChildTouched(prev => ({ ...prev, [`child-${childIndex}-${field}`]: true }));


  const hasError = (field: string) => {
    const err = getFieldError(field);
    return err.show && err.message.length > 0;
  };

  const errorInputClass = (field: string) => hasError(field) ? "border-destructive focus-visible:ring-destructive" : "";

  const isVehicleComplete = (v: { car_make: string; car_model: string; car_color: string; license_plate: string }) =>
    v.car_make.trim().length > 0 && v.car_model.trim().length > 0 && v.car_color.trim().length > 0 && v.license_plate.trim().length > 0;

  const hasValidVehicle = vehicles.length > 0 && vehicles.some(isVehicleComplete);
  const vehicleRequirementMet = hasValidVehicle || vehicleDraftValid;

  /* ── Step 2 validation ─────────────────────────── */
  const isStep2Valid = () => {
    if (!isMinLength(firstName, 2) || !isMinLength(lastName, 2)) return false;
    if (isParent && (!phoneNumber.trim() || !isValidPhone(phoneNumber))) return false;
    if (!isParent && phoneNumber.trim() && !isValidPhone(phoneNumber)) return false;
    if (isParent && !hasSelectedAddress) return false;
    if (!isParent && !gradeLevel) return false;
    // Parents must have at least 1 complete vehicle (saved or currently drafted)
    if (isParent && !vehicleRequirementMet) return false;

    // First child must be fully complete; additional children must not be partial
    if (isParent && (!children.length || !isChildComplete(children[0]))) return false;
    if (isParent && children.slice(1).some(c => isChildPartial(c))) return false;
    return true;
  };

  const scrollToFirstError = () => {
    setTimeout(() => {
      const firstError = formRef.current?.querySelector(".text-destructive.text-sm");
      firstError?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 50);
  };

  const handleAttemptContinue = async () => {
    setAttemptedSubmit(true);

    // Auto-save the inline vehicle draft before validating (no "Add Vehicle" click needed)
    let vehicleCommitted = true;
    if (isParent && vehicles.length === 0 && vehicleManagerRef.current) {
      vehicleCommitted = await vehicleManagerRef.current.commitDraftIfNeeded();
    }

    if (!isStep2Valid()) {
      toast({
        title: "Please complete all required fields",
        description: "Fill every required field before continuing.",
        variant: "destructive",
      });
      scrollToFirstError();
      return;
    }

    // If the draft looked valid but the auto-save failed (e.g., network error), don't proceed.
    if (isParent && vehicles.length === 0 && !vehicleCommitted) return;

    handleSaveProfile();
  };

  /* ── Save profile (Step 2 completion) ──────────── */
  const handleSaveProfile = async () => {
    if (!isStep2Valid()) {
      setAttemptedSubmit(true);
      toast({
        title: "Please complete all required fields",
        description: "Fill every required field before continuing.",
        variant: "destructive",
      });
      scrollToFirstError();
      return;
    }

    if (!user || !profile) return;
    setSaving(true);

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const updateData: Record<string, any> = {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        phone_number: phoneNumber.trim(),
        updated_at: new Date().toISOString(),
        profile_complete: true,
      };

      if (isParent) {
        updateData.home_address = homeAddress;
        updateData.home_latitude = homeLatitude;
        updateData.home_longitude = homeLongitude;
        updateData.grade_level = PARENT_GRADE_LEVEL;
        // Vehicle info managed by VehicleManager
      } else {
        updateData.grade_level = gradeLevel;
      }

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
          phone_number: phoneNumber.trim() || null,
        })
        .eq("user_id", user.id);

      if (isParent) {
        await supabase.from("children").delete().eq("user_id", user.id);
        const validChildren = children.filter(c => isChildComplete(c));
        if (validChildren.length > 0) {
          await supabase.from("children").insert(
            validChildren.map(c => ({
              user_id: user.id,
              name: `${c.first_name} ${c.last_name}`.trim(),
              first_name: c.first_name,
              last_name: c.last_name,
              age: parseInt(c.age),
              school: c.grade_level || "",
              grade_level: c.grade_level || null,
              email: c.email && c.email.trim() ? c.email.trim().toLowerCase() : null,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
            })) as any
          );
        }
      }

      if (isEditMode) {
        toast({ title: "Profile updated!", description: "Your changes have been saved." });
        navigate("/profile");
      } else {
        toast({ title: "Welcome!", description: "Your profile is complete. Enjoy the app!" });
        navigate("/dashboard");
      }
    } catch (error) {
      toast({ title: "Error", description: (error as Error).message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };


  if (loading || !user || !profile) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <motion.div 
          className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        />
      </div>
    );
  }

  const progressPercent = (step / totalSteps) * 100;
  const step2Valid = isStep2Valid();

  return (
    <motion.div 
      className="min-h-screen bg-gradient-to-br from-gray-50/50 via-white to-blue-50/30"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        {/* Premium Header */}
        <motion.div 
          className="text-center mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
            className="mx-auto mb-4 h-16 w-16 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/25"
          >
            <Sparkles className="h-8 w-8 text-white" />
          </motion.div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 bg-clip-text text-transparent mb-2">
            {isEditMode ? "Edit Your Profile" : "Complete Your Profile"}
          </h1>
          <p className="text-gray-500">
            Step {step} of {totalSteps}:{" "}
            {step === 1 && "Welcome"}
            {step === 2 && "Your Information"}
          </p>
          <div className="mt-4 bg-white/80 backdrop-blur-sm rounded-full p-1 shadow-sm">
            <Progress value={progressPercent} className="h-2" />
          </div>
          {step === 2 && (
            <p className="text-xs text-muted-foreground mt-2">Required fields marked with <span className="text-destructive">*</span></p>
          )}
        </motion.div>

        {/* Steps with AnimatePresence */}
        <AnimatePresence mode="wait">
        {/* Step 1: Welcome */}
        {step === 1 && (
          <motion.div
            key="step1"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
          <Card className="rounded-2xl border-gray-100 bg-white/90 backdrop-blur-sm shadow-lg">
            <CardHeader className="text-center">
              <motion.div 
                className="mx-auto mb-4 h-16 w-16 rounded-2xl bg-gradient-to-br from-blue-100 to-blue-50 flex items-center justify-center"
                whileHover={{ scale: 1.05 }}
              >
                {isParent ? <User className="h-8 w-8 text-blue-600" /> : <GraduationCap className="h-8 w-8 text-blue-600" />}
              </motion.div>
              <CardTitle className="text-2xl">Welcome, {profile.username}!</CardTitle>
              <CardDescription className="text-base">
                Your {isParent ? "parent" : "student"} account has been created. Let's set up your profile so you can start using the app.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center">
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button size="lg" onClick={() => setStep(2)} className="gap-2 bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/25">
                  Get Started <ArrowRight className="h-4 w-4" />
                </Button>
              </motion.div>
            </CardContent>
          </Card>
          </motion.div>
        )}

        {/* Step 2: Profile Information */}
        {step === 2 && (
          <motion.div
            key="step2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
            ref={formRef}
          >
            {/* Personal Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" /> Personal Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <RequiredLabel htmlFor="firstName">First Name</RequiredLabel>
                    <Input
                      id="firstName"
                      value={firstName}
                      onChange={e => setFirstName(e.target.value)}
                      onBlur={() => markTouched("firstName")}
                      placeholder="First name"
                      className={errorInputClass("firstName")}
                    />
                    <FieldErrorMessage error={getFieldError("firstName")} />
                  </div>
                  <div>
                    <RequiredLabel htmlFor="lastName">Last Name</RequiredLabel>
                    <Input
                      id="lastName"
                      value={lastName}
                      onChange={e => setLastName(e.target.value)}
                      onBlur={() => markTouched("lastName")}
                      placeholder="Last name"
                      className={errorInputClass("lastName")}
                    />
                    <FieldErrorMessage error={getFieldError("lastName")} />
                  </div>
                </div>
                <div>
                  <OptionalLabel icon={<Mail className="h-3.5 w-3.5" />}>Email</OptionalLabel>
                  <Input value={user.email || ""} disabled className="bg-muted" />
                </div>
                <div>
                  {isParent ? (
                    <RequiredLabel htmlFor="phone" icon={<Phone className="h-3.5 w-3.5" />}>Phone Number</RequiredLabel>
                  ) : (
                    <OptionalLabel htmlFor="phone" icon={<Phone className="h-3.5 w-3.5" />}>Phone Number</OptionalLabel>
                  )}
                  <PhoneNumberInput
                    id="phone"
                    value={phoneNumber}
                    onChange={setPhoneNumber}
                    onBlur={() => markTouched("phone")}
                    className={errorInputClass("phone")}
                  />
                  <FieldErrorMessage error={getFieldError("phone")} />
                </div>
              </CardContent>
            </Card>

            {/* Address - Parents only */}
            {isParent && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Home className="h-5 w-5" /> Home Address <span className="text-destructive">*</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className={hasError("address") ? "[&_input]:border-destructive" : ""}>
                    <AddressAutocompleteInput
                      value={homeAddress}
                      onAddressSelect={handleAddressSelect}
                      placeholder="Enter your home address"
                      required
                    />
                  </div>
                  {hasSelectedAddress ? (
                    <p className="text-xs text-emerald-600 mt-2 flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" /> Address verified
                    </p>
                  ) : (
                    <FieldErrorMessage error={getFieldError("address")} />
                  )}
                </CardContent>
              </Card>
            )}

            {/* Student-only: Grade Level & contacts */}
            {!isParent && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <GraduationCap className="h-5 w-5" /> Grade Level <span className="text-destructive">*</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Select value={gradeLevel} onValueChange={v => { setGradeLevel(v); markTouched("gradeLevel"); }}>
                      <SelectTrigger className={hasError("gradeLevel") ? "border-destructive" : ""}>
                        <SelectValue placeholder="Select grade" />
                      </SelectTrigger>
                      <SelectContent>
                        {GRADE_LEVELS.map(g => (
                          <SelectItem key={g} value={g}>{g}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FieldErrorMessage error={getFieldError("gradeLevel")} />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Parent-only: Vehicle Information */}
            {isParent && (
              <div className="space-y-2">
                <VehicleManager ref={vehicleManagerRef} onValidityChange={setVehicleDraftValid} />
                {attemptedSubmit && !vehicleRequirementMet && !vehiclesLoading && (
                  <p className="text-sm text-destructive flex items-center gap-1">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                    At least one vehicle is required. Please add a vehicle with all 4 fields filled out.
                  </p>
                )}
              </div>
            )}

            {/* Parent-only: Children */}
            {isParent && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" /> Your Children <span className="text-destructive">*</span>
                  </CardTitle>
                  <p className="text-sm font-semibold text-foreground">
                    Add All Children That Attend Chadwick School
                  </p>
                  <p className="text-sm text-muted-foreground">
                    At least one child is required. Additional children are optional, but all 4 fields must be filled.
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  {children.map((child, i) => {
                    const isFirstChild = i === 0;
                    const partial = isFirstChild ? !isChildComplete(child) : isChildPartial(child);
                    return (
                      <div key={i} className={`border rounded-lg p-4 space-y-3 ${partial && attemptedSubmit ? "border-destructive" : ""}`}>
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium">
                            {child.first_name.trim() ? `${child.first_name} ${child.last_name}`.trim() : `Child ${i + 1}`}
                            {isFirstChild && <span className="text-xs text-muted-foreground ml-2">(required)</span>}
                          </span>
                          {!isFirstChild && (
                            <Button type="button" variant="ghost" size="sm" onClick={() => {
                              setChildren(children.filter((_, idx) => idx !== i));
                            }}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          )}
                        </div>
                        {partial && attemptedSubmit && (
                          <p className="text-sm text-destructive flex items-center gap-1">
                            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                            Please complete all fields or remove this child
                          </p>
                        )}
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label className="flex items-center gap-1">First Name <span className="text-destructive">*</span></Label>
                            <Input 
                              value={child.first_name} 
                              onChange={e => { const u = [...children]; u[i] = { ...u[i], first_name: e.target.value }; setChildren(u); }} 
                              onBlur={() => markChildTouched(i, "first_name")}
                              className={childErrorInputClass(i, "first_name")}
                              placeholder="First name"
                            />
                            <FieldErrorMessage error={getChildFieldError(i, "first_name")} />
                          </div>
                          <div>
                            <Label className="flex items-center gap-1">Last Name <span className="text-destructive">*</span></Label>
                            <Input 
                              value={child.last_name} 
                              onChange={e => { const u = [...children]; u[i] = { ...u[i], last_name: e.target.value }; setChildren(u); }} 
                              onBlur={() => markChildTouched(i, "last_name")}
                              className={childErrorInputClass(i, "last_name")}
                              placeholder="Last name"
                            />
                            <FieldErrorMessage error={getChildFieldError(i, "last_name")} />
                          </div>
                          <div>
                            <Label className="flex items-center gap-1">Age <span className="text-destructive">*</span></Label>
                            <Input 
                              type="number" min="1" max="100" 
                              value={child.age} 
                              onChange={e => { 
                                const val = e.target.value;
                                if (val && (parseInt(val) < 0 || parseInt(val) > 100)) return;
                                const u = [...children]; u[i] = { ...u[i], age: val }; setChildren(u); 
                              }} 
                              onBlur={() => markChildTouched(i, "age")}
                              className={childErrorInputClass(i, "age")}
                              placeholder="Age"
                            />
                            <FieldErrorMessage error={getChildFieldError(i, "age")} />
                          </div>
                          <div>
                            <Label className="flex items-center gap-1">Grade <span className="text-destructive">*</span></Label>
                            <Select value={child.grade_level} onValueChange={v => { const u = [...children]; u[i] = { ...u[i], grade_level: v }; setChildren(u); markChildTouched(i, "grade_level"); }}>
                              <SelectTrigger className={childFieldHasError(i, "grade_level") ? "border-destructive" : ""}>
                                <SelectValue placeholder="Grade" />
                              </SelectTrigger>
                              <SelectContent>
                                {GRADE_LEVELS.map(g => (
                                  <SelectItem key={g} value={g}>{g}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FieldErrorMessage error={getChildFieldError(i, "grade_level")} />
                          </div>
                        </div>
                        <div>
                          <Label className="flex items-center gap-1">
                            Attach Your Child's Email
                          </Label>
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
                  })}
                  <Button type="button" variant="outline" onClick={() => setChildren([...children, { first_name: "", last_name: "", age: "", grade_level: "", email: "" }])} className="gap-2">
                    <Plus className="h-4 w-4" /> Add Child
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Navigation */}
            <div className="flex gap-4">
              <Button variant="outline" onClick={() => setStep(1)} className="gap-2">
                <ArrowLeft className="h-4 w-4" /> Back
              </Button>
              <Button
                className="flex-1 gap-2"
                disabled={saving || !step2Valid}
                onClick={handleAttemptContinue}
              >
                {saving ? "Saving..." : step2Valid ? (isEditMode ? "Save Changes" : "Complete Profile") : "Complete required fields"} <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </motion.div>
        )}

        </AnimatePresence>
      </div>
    </motion.div>
  );
};

export default ProfileSetup;
