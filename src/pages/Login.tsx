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
import { Eye, EyeOff, Mail, Lock, ArrowRight, Car } from "lucide-react";
import Navigation from "@/components/Navigation";
import AddressRequiredModal from "@/components/AddressRequiredModal";
import { useToast } from "@/hooks/use-toast";

const Login = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [usernameOrEmail, setUsernameOrEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [needsConfirm, setNeedsConfirm] = useState<string | null>(null);

  const [showAddressModal, setShowAddressModal] = useState(false);
  const [loggedInUserId, setLoggedInUserId] = useState<string | null>(null);

  useEffect(() => {
    if (user) navigate("/dashboard");
  }, [user, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setNeedsConfirm(null);

    try {
      // Resolve username → email via existing edge function
      const { data: loginData, error: loginError } = await supabase.functions.invoke("auth-login", {
        body: { usernameOrEmail: usernameOrEmail.toLowerCase().trim(), password },
      });
      if (loginError || !loginData?.success) {
        throw new Error("Invalid email/username or password");
      }
      const resolvedEmail: string = loginData.user.email;

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: resolvedEmail,
        password,
      });

      if (signInError) {
        const msg = signInError.message || "";
        if (/confirm/i.test(msg) || /not confirmed/i.test(msg)) {
          setNeedsConfirm(resolvedEmail);
          setError("Please confirm your email before signing in.");
          return;
        }
        throw signInError;
      }

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
    } catch (err) {
      setError((err as Error).message || "Invalid email/username or password");
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
              <Car className="w-7 h-7 text-white" />
            </div>
            <CardTitle className="text-2xl">Welcome back</CardTitle>
            <CardDescription>Sign in to your Dolphin Carpool account</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              {error && (
                <div className="p-3 rounded-md bg-destructive/10 border border-destructive/30 text-destructive text-sm">
                  {error}
                  {needsConfirm && (
                    <button
                      type="button"
                      onClick={handleResend}
                      className="block mt-2 underline font-medium"
                    >
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
                <button
                  type="button"
                  onClick={() => navigate("/forgot-password")}
                  className="text-primary hover:underline"
                >
                  Forgot password?
                </button>
                <div className="text-muted-foreground">
                  Don't have an account?{" "}
                  <button
                    type="button"
                    onClick={() => navigate("/register")}
                    className="text-primary font-medium hover:underline"
                  >
                    Sign up
                  </button>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </>
  );
};

export default Login;
