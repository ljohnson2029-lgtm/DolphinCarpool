import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { logger } from "@/lib/logger";
import { ArrowLeft, ArrowRight, Mail, ShieldCheck, Eye, EyeOff, CheckCircle2 } from "lucide-react";
import PhoneNumberInput from "@/components/PhoneNumberInput";
import { isValidPhoneNumber } from "@/lib/phone-validation";
import Navigation from "@/components/Navigation";
import CreatorFooter from "@/components/CreatorFooter";
import SignupWaiverCheckboxes from "@/components/SignupWaiverCheckboxes";
import { cn } from "@/lib/utils";

type Step = "code" | "form" | "checkEmail";

const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

const Register = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();

  const [step, setStep] = useState<Step>("code");
  const [loading, setLoading] = useState(false);

  // Step 1
  const [signupCode, setSignupCode] = useState("");
  const [codeError, setCodeError] = useState("");

  // Step 2
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [insuranceAgreed, setInsuranceAgreed] = useState(false);
  const [safetyAgreed, setSafetyAgreed] = useState(false);
  const [liabilityAgreed, setLiabilityAgreed] = useState(false);

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (user) navigate("/dashboard");
  }, [user, navigate]);

  const clearError = (k: string) =>
    setFieldErrors((prev) => {
      if (!prev[k]) return prev;
      const next = { ...prev };
      delete next[k];
      return next;
    });

  // ────────────── Step 1: verify community code
  const submitCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setCodeError("");
    if (!signupCode.trim()) {
      setCodeError("Please enter your verification code.");
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("verify-signup-code", {
        body: { code: signupCode.trim() },
      });
      if (error) throw error;
      if (!data?.valid) {
        setCodeError("Invalid verification code. Please check your code and try again.");
        setLoading(false);
        return;
      }
      setStep("form");
    } catch (err) {
      logger.error("verify-signup-code error:", err);
      setCodeError("We couldn't verify that code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // ────────────── Step 2: create account
  const submitForm = async (e: React.FormEvent) => {
    e.preventDefault();

    const errs: Record<string, string> = {};
    if (!firstName.trim()) errs.firstName = "Required";
    if (!lastName.trim()) errs.lastName = "Required";
    if (!username.trim()) errs.username = "Required";
    if (!email.trim()) errs.email = "Required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) errs.email = "Enter a valid email";
    if (!password) errs.password = "Required";
    if (!confirmPassword) errs.confirmPassword = "Required";
    else if (password && password !== confirmPassword)
      errs.confirmPassword = "Passwords do not match";
    if (!phoneNumber.trim()) errs.phone = "Required";
    else if (!isValidPhoneNumber(phoneNumber)) errs.phone = "Enter a complete phone number";
    if (!insuranceAgreed) errs.insurance = "Required";
    if (!safetyAgreed) errs.safety = "Required";
    if (!liabilityAgreed) errs.liability = "Required";

    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs);
      toast({
        title: "Please complete all required fields",
        description: "Highlighted fields need your attention.",
        variant: "destructive",
      });
      return;
    }
    setFieldErrors({});
    setLoading(true);

    try {
      const normalizedEmail = email.toLowerCase().trim();
      const { data, error } = await supabase.functions.invoke("auth-create-account", {
        body: {
          email: normalizedEmail,
          username: username.trim(),
          password,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          phoneNumber: phoneNumber.trim(),
          signupCode: signupCode.trim(),
        },
      });

      if (error || (data && !data.success)) {
        let msg = "Registration failed";
        // supabase-js returns error.context as a Response on non-2xx — parse it
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const ctx: any = (error as any)?.context;
        if (ctx && typeof ctx.json === "function") {
          try {
            const body = await ctx.clone().json();
            if (body?.error) msg = body.error;
          } catch {
            try {
              const text = await ctx.clone().text();
              if (text) msg = text;
            } catch { /* ignore */ }
          }
        } else if (ctx?.error) {
          msg = ctx.error;
        } else if (data?.error) {
          msg = data.error;
        } else if (error instanceof Error) {
          msg = error.message;
        }
        toast({ title: "Registration failed", description: msg, variant: "destructive" });
        setLoading(false);
        return;
      }

      setStep("checkEmail");
    } catch (err) {
      logger.error("auth-create-account exception:", err);
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Unexpected error",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // ────────────── Step 3: resend email
  const handleResend = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: email.toLowerCase().trim(),
        options: { emailRedirectTo: "https://dolphincarpool.org/auth/callback" },
      });
      if (error) throw error;
      toast({ title: "Email sent", description: "Check your inbox for the confirmation link." });
    } catch (err) {
      toast({
        title: "Couldn't resend",
        description: err instanceof Error ? err.message : "Try again later.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const inputErr = (k: string) =>
    fieldErrors[k] ? "border-destructive ring-2 ring-destructive/40" : "";

  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50 flex items-start justify-center p-4 pt-24 pb-32">
        <Card className="w-full max-w-xl shadow-xl">
          <CardHeader className="text-center space-y-2">
            <div className="mx-auto w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center shadow-lg shadow-primary/30">
              {step === "code" && <ShieldCheck className="w-7 h-7 text-white" />}
              {step === "form" && <ArrowRight className="w-7 h-7 text-white" />}
              {step === "checkEmail" && <Mail className="w-7 h-7 text-white" />}
            </div>
            <CardTitle className="text-2xl">
              {step === "code" && "Enter Your Verification Code"}
              {step === "form" && "Create Your Account"}
              {step === "checkEmail" && "Check your email!"}
            </CardTitle>
            <CardDescription>
              {step === "code" &&
                "Your verification code was provided by the Dolphin Carpool community. Contact us at dolphincarpool@gmail.com if you need help."}
              {step === "form" && "All fields are required to create your parent account."}
              {step === "checkEmail" && (
                <>We sent a verification link to <span className="font-semibold text-foreground">{email}</span>. Click the link to confirm your account.</>
              )}
            </CardDescription>
          </CardHeader>

          <CardContent>
            <AnimatePresence mode="wait">
              {step === "code" && (
                <motion.form
                  key="code"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  onSubmit={submitCode}
                  className="space-y-4"
                >
                  <div>
                    <Label htmlFor="signup-code">
                      Verification code <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="signup-code"
                      value={signupCode}
                      onChange={(e) => {
                        setSignupCode(e.target.value);
                        if (codeError) setCodeError("");
                      }}
                      placeholder="Enter your code"
                      autoFocus
                      className={cn("mt-1 h-12 text-base", codeError && "border-destructive ring-2 ring-destructive/40")}
                    />
                    {codeError && <p className="text-sm text-destructive mt-1">{codeError}</p>}
                  </div>

                  <LoadingButton type="submit" loading={loading} className="w-full h-12">
                    Continue <ArrowRight className="w-4 h-4 ml-2" />
                  </LoadingButton>

                  <p className="text-sm text-center text-muted-foreground">
                    Already have an account?{" "}
                    <button type="button" onClick={() => navigate("/login")} className="text-primary font-medium hover:underline">
                      Sign in
                    </button>
                  </p>
                </motion.form>
              )}

              {step === "form" && (
                <motion.form
                  key="form"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  onSubmit={submitForm}
                  className="space-y-4"
                >
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="firstName">First name <span className="text-destructive">*</span></Label>
                      <Input
                        id="firstName"
                        value={firstName}
                        onChange={(e) => { setFirstName(e.target.value); clearError("firstName"); }}
                        className={cn("mt-1", inputErr("firstName"))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="lastName">Last name <span className="text-destructive">*</span></Label>
                      <Input
                        id="lastName"
                        value={lastName}
                        onChange={(e) => { setLastName(e.target.value); clearError("lastName"); }}
                        className={cn("mt-1", inputErr("lastName"))}
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="username">Username <span className="text-destructive">*</span></Label>
                    <Input
                      id="username"
                      value={username}
                      onChange={(e) => { setUsername(e.target.value); clearError("username"); }}
                      className={cn("mt-1", inputErr("username"))}
                    />
                  </div>

                  <div>
                    <Label htmlFor="email">Email <span className="text-destructive">*</span></Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => { setEmail(e.target.value); clearError("email"); }}
                      className={cn("mt-1", inputErr("email"))}
                    />
                    {fieldErrors.email && <p className="text-xs text-destructive mt-1">{fieldErrors.email}</p>}
                  </div>

                  <div>
                    <Label htmlFor="password">Password <span className="text-destructive">*</span></Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => { setPassword(e.target.value); clearError("password"); }}
                        className={cn("mt-1 pr-10", inputErr("password"))}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                        tabIndex={-1}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {fieldErrors.password && (
                      <p className="text-xs text-destructive mt-1">{fieldErrors.password}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="confirmPassword">Confirm password <span className="text-destructive">*</span></Label>
                    <Input
                      id="confirmPassword"
                      type={showPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => { setConfirmPassword(e.target.value); clearError("confirmPassword"); }}
                      className={cn("mt-1", inputErr("confirmPassword"))}
                    />
                    {fieldErrors.confirmPassword && (
                      <p className="text-xs text-destructive mt-1">{fieldErrors.confirmPassword}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="phone">Phone number <span className="text-destructive">*</span></Label>
                    <div className={cn("mt-1 rounded-md", fieldErrors.phone && "ring-2 ring-destructive/40")}>
                      <PhoneNumberInput
                        value={phoneNumber}
                        onChange={(v) => { setPhoneNumber(v); clearError("phone"); }}
                      />
                    </div>
                  </div>

                  <SignupWaiverCheckboxes
                    insuranceAgreed={insuranceAgreed}
                    safetyAgreed={safetyAgreed}
                    liabilityAgreed={liabilityAgreed}
                    onInsuranceChange={(v) => { setInsuranceAgreed(v); clearError("insurance"); }}
                    onSafetyChange={(v) => { setSafetyAgreed(v); clearError("safety"); }}
                    onLiabilityChange={(v) => { setLiabilityAgreed(v); clearError("liability"); }}
                    insuranceError={!!fieldErrors.insurance}
                    safetyError={!!fieldErrors.safety}
                    liabilityError={!!fieldErrors.liability}
                  />

                  <div className="flex gap-3 pt-2">
                    <Button type="button" variant="outline" onClick={() => setStep("code")} className="flex-1">
                      <ArrowLeft className="w-4 h-4 mr-2" /> Back
                    </Button>
                    <LoadingButton type="submit" loading={loading} className="flex-1">
                      Create account <ArrowRight className="w-4 h-4 ml-2" />
                    </LoadingButton>
                  </div>
                </motion.form>
              )}

              {step === "checkEmail" && (
                <motion.div
                  key="checkEmail"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  className="space-y-5 text-center"
                >
                  <div className="mx-auto w-20 h-20 rounded-full bg-green-50 flex items-center justify-center">
                    <CheckCircle2 className="w-10 h-10 text-green-600" />
                  </div>
                  <p className="text-muted-foreground">
                    You'll be able to sign in once your email is confirmed.
                  </p>

                  <LoadingButton onClick={handleResend} loading={loading} variant="outline" className="w-full">
                    Resend verification email
                  </LoadingButton>

                  <Button variant="ghost" onClick={() => navigate("/login")} className="w-full">
                    Go to sign in
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>
      </div>
      <CreatorFooter />
    </>
  );
};

export default Register;
