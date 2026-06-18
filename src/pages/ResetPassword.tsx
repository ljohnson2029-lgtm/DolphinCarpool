import SEO from "@/components/SEO";
import { useEffect, useState } from "react";
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
import { Lock, CheckCircle2 } from "lucide-react";

const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

const ResetPassword = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    // Supabase places a recovery token in the URL hash. Once detectSessionInUrl
    // fires, the user has a temporary session.
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") {
        setReady(true);
      }
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
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
      const { error: updErr } = await supabase.auth.updateUser({ password });
      if (updErr) throw updErr;
      setDone(true);
      toast({ title: "Password updated", description: "You can now sign in with your new password." });
      // Sign out the temporary recovery session
      await supabase.auth.signOut();
      setTimeout(() => navigate("/login"), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <SEO
        title="Reset Password — Dolphin Carpool"
        description="Choose a new password for your Dolphin Carpool account and get back to coordinating rides with your community."
        path="/reset-password"
      />
      <Navigation />

      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50 flex items-start justify-center p-4 pt-24 pb-32">
        <Card className="w-full max-w-md shadow-xl">
          <CardHeader className="text-center space-y-2">
            <div className="mx-auto w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center shadow-lg shadow-primary/30">
              {done ? <CheckCircle2 className="w-7 h-7 text-white" /> : <Lock className="w-7 h-7 text-white" />}
            </div>
            <CardTitle className="text-2xl">{done ? "Password updated" : "Set a new password"}</CardTitle>
            <CardDescription>
              {done
                ? "Redirecting you to sign in…"
                : ready
                ? "Choose a new password for your account."
                : "Waiting for your reset link to load…"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!ready || done ? null : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
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
                  <Label htmlFor="confirm-pw">Confirm password</Label>
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
                  Update password
                </LoadingButton>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
};

export default ResetPassword;
