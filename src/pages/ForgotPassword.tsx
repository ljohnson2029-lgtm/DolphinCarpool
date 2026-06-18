import SEO from "@/components/SEO";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import Navigation from "@/components/Navigation";
import { KeyRound, ArrowLeft, CheckCircle2, Mail, Lock } from "lucide-react";

const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

type Step = "email" | "code" | "password" | "done";
type ResetFunctionResponse = { error?: string; message?: string; success?: boolean } | null;

const getFunctionErrorBody = async (data: ResetFunctionResponse, fnErr: unknown): Promise<ResetFunctionResponse> => {
  if (data?.error) return data;
  const context = (fnErr as { context?: unknown } | null)?.context;
  if (context instanceof Response) {
    try {
      return (await context.clone().json()) as ResetFunctionResponse;
    } catch {
      return null;
    }
  }
  return null;
};

const ForgotPassword = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [expired, setExpired] = useState(false);

  const sendCode = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setError("");
    setExpired(false);
    setLoading(true);
    try {
      const { error: fnErr } = await supabase.functions.invoke("password-reset-request", {
        body: { email: email.trim().toLowerCase() },
      });
      if (fnErr) throw fnErr;
      setStep("code");
      toast({
        title: "Code sent",
        description: `If an account exists for ${email}, a verification code has been sent.`,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send reset code");
    } finally {
      setLoading(false);
    }
  };

  const verifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setExpired(false);
    if (!/^\d{6}$/.test(code.trim())) {
      setError("Please enter the 6-digit code.");
      return;
    }
    setLoading(true);
    try {
      const { data, error: fnErr } = await supabase.functions.invoke("password-reset-confirm", {
        body: { email: email.trim().toLowerCase(), code: code.trim(), action: "verify" },
      });
      if (fnErr || (data as { error?: string })?.error) {
        const err = (data as { error?: string })?.error || "invalid_code";
        if (err === "expired_code") {
          setExpired(true);
          setError("This code has expired. Please request a new one.");
        } else {
          setError("Invalid code. Please check your email and try again.");
        }
        return;
      }
      setStep("password");
    } catch {
      setError("Invalid code. Please check your email and try again.");
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!passwordRegex.test(password)) {
      setError("Password must be 8+ characters with uppercase, lowercase, and a number.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      const { data, error: fnErr } = await supabase.functions.invoke("password-reset-confirm", {
        body: {
          email: email.trim().toLowerCase(),
          code: code.trim(),
          action: "reset",
          newPassword: password,
        },
      });
      if (fnErr || (data as ResetFunctionResponse)?.error) {
        const body = await getFunctionErrorBody(data as ResetFunctionResponse, fnErr);
        const errCode = body?.error;
        const errMsg = body?.message;
        console.error("password reset failed", { errCode, errMsg, fnErr });
        if (errCode === "expired_code") {
          setExpired(true);
          setStep("code");
          setError("This code has expired. Please request a new one.");
        } else if (errCode === "pwned_password") {
          setError(errMsg || "This password has appeared in known data breaches. Please choose a different, unique password.");
        } else if (errCode === "weak_password") {
          setError("Password must be 8+ characters with uppercase, lowercase, and a number.");
        } else {
          setError(errMsg || "Could not update password. Please try again.");
        }
        return;
      }
      navigate("/login", { replace: true, state: { resetSuccess: true } });
    } catch {
      setError("Could not update password. Please try again.");

    } finally {
      setLoading(false);
    }
  };

  const icon =
    step === "done" ? <CheckCircle2 className="w-7 h-7 text-white" /> :
    step === "password" ? <Lock className="w-7 h-7 text-white" /> :
    step === "code" ? <Mail className="w-7 h-7 text-white" /> :
    <KeyRound className="w-7 h-7 text-white" />;

  return (
    <>
      <SEO
        title="Forgot Password — Dolphin Carpool"
        description="Reset your Dolphin Carpool password using a verification code sent to your email."
        path="/forgot-password"
      />
      <Navigation />

      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50 flex items-start justify-center p-4 pt-24 pb-32">
        <Card className="w-full max-w-md shadow-xl">
          <CardHeader className="text-center space-y-2">
            <div className="mx-auto w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center shadow-lg shadow-primary/30">
              {icon}
            </div>
            <CardTitle className="text-2xl">
              {step === "email" && "Forgot password?"}
              {step === "code" && "Enter verification code"}
              {step === "password" && "Set a new password"}
              {step === "done" && "Password reset!"}
            </CardTitle>
            <CardDescription>
              {step === "email" && "Enter your email and we'll send you a 6-digit code."}
              {step === "code" && (
                <>A verification code has been sent to <span className="font-semibold text-foreground">{email}</span>. Please check your inbox.</>
              )}
              {step === "password" && "Choose a new password for your account."}
              {step === "done" && "Your password has been successfully reset! Redirecting to sign in…"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {step === "email" && (
              <form onSubmit={sendCode} className="space-y-4">
                <div>
                  <Label htmlFor="forgot-email">Email address</Label>
                  <Input
                    id="forgot-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="mt-1 h-11"
                  />
                </div>
                <LoadingButton type="submit" loading={loading} className="w-full h-11">
                  Send Reset Code
                </LoadingButton>
                <Button type="button" variant="ghost" className="w-full" onClick={() => navigate("/login")}>
                  <ArrowLeft className="w-4 h-4 mr-2" /> Back to sign in
                </Button>
              </form>
            )}

            {step === "code" && (
              <form onSubmit={verifyCode} className="space-y-4">
                <div>
                  <Label htmlFor="otp-code">6-digit verification code</Label>
                  <Input
                    id="otp-code"
                    inputMode="numeric"
                    pattern="[0-9]{6}"
                    maxLength={6}
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                    required
                    className="mt-1 h-11 tracking-[0.5em] text-center text-lg"
                    placeholder="••••••"
                  />
                </div>
                <LoadingButton type="submit" loading={loading} className="w-full h-11">
                  Verify Code
                </LoadingButton>
                {expired ? (
                  <Button type="button" variant="outline" className="w-full" onClick={() => sendCode()}>
                    Resend code
                  </Button>
                ) : (
                  <Button type="button" variant="ghost" className="w-full" onClick={() => sendCode()}>
                    Didn't get it? Resend
                  </Button>
                )}
                <Button type="button" variant="ghost" className="w-full" onClick={() => { setStep("email"); setCode(""); setError(""); }}>
                  <ArrowLeft className="w-4 h-4 mr-2" /> Use a different email
                </Button>
              </form>
            )}

            {step === "password" && (
              <form onSubmit={resetPassword} className="space-y-4">
                <div>
                  <Label htmlFor="new-pw">New password</Label>
                  <Input
                    id="new-pw"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="mt-1 h-11"
                  />
                </div>
                <div>
                  <Label htmlFor="confirm-pw">Confirm new password</Label>
                  <Input
                    id="confirm-pw"
                    type="password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    required
                    className="mt-1 h-11"
                  />
                </div>
                <LoadingButton type="submit" loading={loading} className="w-full h-11">
                  Reset Password
                </LoadingButton>
              </form>
            )}

            {step === "done" && (
              <Button variant="outline" className="w-full" onClick={() => navigate("/login")}>
                Go to sign in now
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
};

export default ForgotPassword;
