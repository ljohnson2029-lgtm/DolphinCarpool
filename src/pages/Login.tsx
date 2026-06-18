import SEO from "@/components/SEO";
import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Eye, EyeOff, Mail, Lock, ArrowRight, Car, ShieldCheck, ArrowLeft } from "lucide-react";
import Navigation from "@/components/Navigation";
import AddressRequiredModal from "@/components/AddressRequiredModal";
import { useToast } from "@/hooks/use-toast";

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    const state = location.state as { resetSuccess?: boolean } | null;
    if (state?.resetSuccess) {
      toast({
        title: "Password reset successful",
        description: "Your password has been reset successfully. Please log in with your new password.",
      });
      window.history.replaceState({}, document.title);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [usernameOrEmail, setUsernameOrEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [needsConfirm, setNeedsConfirm] = useState<string | null>(null);

  const [showAddressModal, setShowAddressModal] = useState(false);
  const [loggedInUserId, setLoggedInUserId] = useState<string | null>(null);

  // 2FA state
  const [step, setStep] = useState<"credentials" | "twofa">("credentials");
  const [twofaEmail, setTwofaEmail] = useState("");
  const [twofaCode, setTwofaCode] = useState("");
  const [twofaError, setTwofaError] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (user && step === "credentials") navigate("/dashboard");
  }, [user, navigate, step]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  const finalizeLogin = async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (authUser) {
      const { data: profileData } = await supabase
        .from("profiles")
        .select("home_address, account_type")
        .eq("id", authUser.id)
        .maybeSingle();

      setLoggedInUserId(authUser.id);
      const needsAddress = !profileData?.home_address;
      if (profileData?.account_type === "parent" && needsAddress) {
        setShowAddressModal(true);
        return;
      }
      if (profileData?.account_type === "student" && needsAddress) {
        navigate("/family-links");
        return;
      }
    }
    navigate("/dashboard");
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setNeedsConfirm(null);

    try {
      const input = usernameOrEmail.trim();

      let resolvedEmail = input.toLowerCase();
      if (!input.includes("@")) {
        const { data: loginData, error: loginError } = await supabase.functions.invoke("auth-login", {
          body: { usernameOrEmail: input },
        });
        if (loginError || !loginData?.success || !loginData?.user?.email) {
          console.error("Username lookup failed:", loginError, loginData);
          throw new Error("Invalid email/username or password");
        }
        resolvedEmail = String(loginData.user.email).toLowerCase().trim();
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: resolvedEmail,
        password,
      });

      if (signInError) {
        const msg = signInError.message || "";
        if (/confirm/i.test(msg) || /not confirmed/i.test(msg)) {
          setNeedsConfirm(resolvedEmail);
          setError("Please confirm your email before signing in. Check your inbox for a confirmation link.");
          return;
        }
        if (/invalid login credentials/i.test(msg)) {
          throw new Error("Invalid email/username or password");
        }
        throw signInError;
      }

      // Check 2FA preference
      const { data: { user: authUser } } = await supabase.auth.getUser();
      let twofaOn = true;
      if (authUser) {
        const { data: profileData } = await supabase
          .from("profiles")
          .select("two_factor_enabled")
          .eq("id", authUser.id)
          .maybeSingle();
        twofaOn = profileData?.two_factor_enabled !== false;
      }

      if (!twofaOn) {
        await finalizeLogin();
        return;
      }

      // 2FA required: sign out, send code, switch to twofa step
      await supabase.auth.signOut();
      const { error: sendErr } = await supabase.functions.invoke("send-2fa-code", {
        body: { email: resolvedEmail, purpose: "login" },
      });
      if (sendErr) {
        console.error("send-2fa-code error", sendErr);
        throw new Error("Could not send verification code. Please try again.");
      }
      setTwofaEmail(resolvedEmail);
      setTwofaCode("");
      setTwofaError("");
      setStep("twofa");
      setResendCooldown(30);
    } catch (err) {
      setError((err as Error).message || "Invalid email/username or password");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify2fa = async (e: React.FormEvent) => {
    e.preventDefault();
    setTwofaError("");
    if (!/^\d{6}$/.test(twofaCode.trim())) {
      setTwofaError("Please enter the 6-digit code.");
      return;
    }
    setLoading(true);
    try {
      const { data, error: verErr } = await supabase.functions.invoke("verify-2fa-code", {
        body: { email: twofaEmail, code: twofaCode.trim(), purpose: "login" },
      });
      if (verErr || !data?.success) {
        setTwofaError("Invalid code. Please try again.");
        return;
      }
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: twofaEmail,
        password,
      });
      if (signInError) {
        setTwofaError("Could not complete sign-in. Please try logging in again.");
        return;
      }
      await finalizeLogin();
    } catch (err) {
      console.error("verify 2fa error", err);
      setTwofaError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResend2fa = async () => {
    if (resendCooldown > 0) return;
    setTwofaError("");
    setLoading(true);
    try {
      const { error: sendErr } = await supabase.functions.invoke("send-2fa-code", {
        body: { email: twofaEmail, purpose: "login" },
      });
      if (sendErr) throw sendErr;
      toast({ title: "Code sent", description: `A new code was sent to ${twofaEmail}.` });
      setResendCooldown(30);
    } catch (err) {
      setTwofaError("Could not resend the code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!needsConfirm) return;
    setLoading(true);
    try {
      const { error: resendErr } = await supabase.auth.resend({
        type: "signup",
        email: needsConfirm,
        options: { emailRedirectTo: `${window.location.origin}/dashboard` },
      });
      if (resendErr) throw resendErr;
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

  return (
    <>
      <SEO
        title="Sign In — Dolphin Carpool"
        description="Sign in to Dolphin Carpool to coordinate school rides, manage carpool series, and chat with confirmed partners."
        path="/login"
      />
      <Navigation />

      {loggedInUserId && (
        <AddressRequiredModal
          open={showAddressModal}
          userId={loggedInUserId}
          onAddressAdded={() => { setShowAddressModal(false); navigate("/dashboard"); }}
        />
      )}
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50 flex items-start justify-center p-4 pt-24 pb-32">
        <Card className="w-full max-w-md shadow-xl">
          <CardHeader className="text-center space-y-2">
            <div className="mx-auto w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center shadow-lg shadow-primary/30">
              {step === "credentials" ? <Car className="w-7 h-7 text-white" /> : <ShieldCheck className="w-7 h-7 text-white" />}
            </div>
            <CardTitle className="text-2xl">
              {step === "credentials" ? "Welcome back" : "Two-Factor Authentication"}
            </CardTitle>
            <CardDescription>
              {step === "credentials"
                ? "Sign in to your Dolphin Carpool account"
                : <>We sent a 6-digit code to <span className="font-semibold text-foreground">{twofaEmail}</span>. Enter it to complete your login.</>}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {step === "credentials" && (
              <form onSubmit={handleLogin} className="space-y-4">
                {error && (
                  <div className="p-3 rounded-md bg-destructive/10 border border-destructive/30 text-destructive text-sm">
                    {error}
                    {needsConfirm && (
                      <button type="button" onClick={handleResend} className="block mt-2 underline font-medium">
                        Resend confirmation email
                      </button>
                    )}
                  </div>
                )}

                <div>
                  <Label htmlFor="login-id">Email or username</Label>
                  <div className="relative mt-1">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="login-id"
                      value={usernameOrEmail}
                      onChange={(e) => setUsernameOrEmail(e.target.value)}
                      className="pl-9 h-11"
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="login-pw">Password</Label>
                  <div className="relative mt-1">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="login-pw"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-9 pr-10 h-11"
                      required
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
                </div>

                <LoadingButton type="submit" loading={loading} className="w-full h-11">
                  Sign in <ArrowRight className="w-4 h-4 ml-2" />
                </LoadingButton>

                <div className="text-center text-sm space-y-2">
                  <button type="button" onClick={() => navigate("/forgot-password")} className="text-primary hover:underline">
                    Forgot password?
                  </button>
                  <div className="text-muted-foreground">
                    Don't have an account?{" "}
                    <button type="button" onClick={() => navigate("/register")} className="text-primary font-medium hover:underline">
                      Sign up
                    </button>
                  </div>
                </div>
              </form>
            )}

            {step === "twofa" && (
              <form onSubmit={handleVerify2fa} className="space-y-4">
                {twofaError && (
                  <div className="p-3 rounded-md bg-destructive/10 border border-destructive/30 text-destructive text-sm">
                    {twofaError}
                  </div>
                )}
                <div>
                  <Label htmlFor="twofa-code">Verification code</Label>
                  <Input
                    id="twofa-code"
                    value={twofaCode}
                    onChange={(e) => setTwofaCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    autoFocus
                    placeholder="123456"
                    className="mt-1 h-12 text-center text-2xl tracking-[0.5em] font-mono"
                    maxLength={6}
                  />
                </div>

                <LoadingButton type="submit" loading={loading} className="w-full h-11">
                  Verify and sign in <ArrowRight className="w-4 h-4 ml-2" />
                </LoadingButton>

                <div className="flex items-center justify-between text-sm">
                  <Button type="button" variant="ghost" size="sm" onClick={() => { setStep("credentials"); setPassword(""); }}>
                    <ArrowLeft className="w-4 h-4 mr-1" /> Back
                  </Button>
                  <button
                    type="button"
                    onClick={handleResend2fa}
                    disabled={resendCooldown > 0 || loading}
                    className="text-primary hover:underline disabled:opacity-50 disabled:no-underline"
                  >
                    {resendCooldown > 0 ? `Resend code (${resendCooldown}s)` : "Resend code"}
                  </button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
};

export default Login;
