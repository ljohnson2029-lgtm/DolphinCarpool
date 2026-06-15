import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type Status = "processing" | "success" | "expired" | "error";

const AuthCallback = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [status, setStatus] = useState<Status>("processing");
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [resendEmail, setResendEmail] = useState<string>("");
  const [resending, setResending] = useState(false);

  useEffect(() => {
    const run = async () => {
      try {
        const url = new URL(window.location.href);
        const hash = new URLSearchParams(url.hash.replace(/^#/, ""));
        const query = url.searchParams;

        // Capture email for resend fallback
        const emailParam = query.get("email") || hash.get("email") || "";
        if (emailParam) setResendEmail(emailParam);

        // Error in URL?
        const errCode =
          query.get("error_code") ||
          hash.get("error_code") ||
          query.get("error") ||
          hash.get("error");
        const errDesc =
          query.get("error_description") ||
          hash.get("error_description") ||
          "";

        if (errCode) {
          if (
            errCode.includes("expired") ||
            errDesc.toLowerCase().includes("expired") ||
            errCode === "otp_expired"
          ) {
            setStatus("expired");
          } else {
            setErrorMsg(decodeURIComponent(errDesc) || errCode);
            setStatus("error");
          }
          return;
        }

        // PKCE flow: ?code=...
        const code = query.get("code");
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
        } else {
          // Implicit flow: tokens already in hash; the supabase client picks them up.
          // Give it a tick to hydrate.
          await new Promise((r) => setTimeout(r, 150));
        }

        const { data: sessionData } = await supabase.auth.getSession();
        if (!sessionData.session) {
          // No code/no session — likely an invalid link
          setErrorMsg("This verification link is invalid or has already been used.");
          setStatus("error");
          return;
        }

        const userId = sessionData.session.user.id;
        const { data: profile } = await supabase
          .from("profiles")
          .select("profile_complete")
          .eq("id", userId)
          .maybeSingle();

        setStatus("success");
        toast({ title: "Email verified", description: "You're all set!" });

        setTimeout(() => {
          if (profile?.profile_complete) navigate("/dashboard", { replace: true });
          else navigate("/profile/setup", { replace: true });
        }, 700);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Verification failed";
        if (msg.toLowerCase().includes("expired")) {
          setStatus("expired");
        } else {
          setErrorMsg(msg);
          setStatus("error");
        }
      }
    };
    run();
  }, [navigate, toast]);

  const handleResend = async () => {
    if (!resendEmail) {
      toast({
        title: "Email needed",
        description: "Please sign up or sign in again to request a new link.",
        variant: "destructive",
      });
      navigate("/register");
      return;
    }
    setResending(true);
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: resendEmail,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) throw error;
      toast({ title: "Verification email sent", description: "Check your inbox." });
    } catch (err) {
      toast({
        title: "Couldn't resend",
        description: err instanceof Error ? err.message : "Try again later.",
        variant: "destructive",
      });
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-gray-50 via-white to-blue-50">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center space-y-3">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center shadow-lg shadow-primary/30">
            {status === "processing" && <Loader2 className="w-7 h-7 text-white animate-spin" />}
            {status === "success" && <CheckCircle2 className="w-7 h-7 text-white" />}
            {(status === "expired" || status === "error") && (
              <AlertCircle className="w-7 h-7 text-white" />
            )}
          </div>
          <CardTitle className="text-2xl">
            {status === "processing" && "Verifying your email…"}
            {status === "success" && "Email verified!"}
            {status === "expired" && "Link expired"}
            {status === "error" && "Verification failed"}
          </CardTitle>
          <CardDescription>
            {status === "processing" && "Hang tight while we confirm your account."}
            {status === "success" && "Redirecting you into Dolphin Carpool…"}
            {status === "expired" &&
              "This verification link has expired. Please request a new one."}
            {status === "error" && (errorMsg || "Something went wrong.")}
          </CardDescription>
        </CardHeader>
        {(status === "expired" || status === "error") && (
          <CardContent className="space-y-3">
            <Button onClick={handleResend} disabled={resending} className="w-full">
              {resending ? "Sending…" : "Resend verification email"}
            </Button>
            <Button variant="outline" onClick={() => navigate("/login")} className="w-full">
              Back to sign in
            </Button>
          </CardContent>
        )}
      </Card>
    </div>
  );
};

export default AuthCallback;
