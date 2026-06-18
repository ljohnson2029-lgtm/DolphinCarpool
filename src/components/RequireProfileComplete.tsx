import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";

const RequireProfileComplete = ({ children }: { children: React.ReactNode }) => {
  const { user, profile, loading, profileError, logout } = useAuth();
  const location = useLocation();
  const isAuthRoute = ["/login", "/register", "/forgot-password", "/reset-password", "/auth/callback", "/verify"].some(
    (path) => location.pathname.startsWith(path)
  );

  if (loading && !isAuthRoute) return null;
  if (!user) return <>{children}</>;
  if (!profile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="w-full max-w-md rounded-lg border bg-card p-6 text-center shadow-sm">
          <h1 className="text-xl font-semibold text-foreground">Unable to load your account</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {profileError || "Your sign-in succeeded, but your profile did not load."}
          </p>
          <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Button onClick={() => window.location.reload()}>Refresh</Button>
            <Button variant="outline" onClick={logout}>Sign in again</Button>
          </div>
        </div>
      </div>
    );
  }

  const isSetupRoute = location.pathname.startsWith("/profile/setup");

  if (!profile.profile_complete && !isSetupRoute) {
    return <Navigate to="/profile/setup" replace state={{ from: location.pathname }} />;
  }

  if (profile.profile_complete && isSetupRoute) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

export default RequireProfileComplete;

