import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { DashboardLayout } from "@/components/DashboardLayout";
import SEO from "@/components/SEO";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { MessageSquare, Settings2, ShieldCheck, Wrench } from "lucide-react";
import TestDataGenerator from "@/components/TestDataGenerator";
import DeleteAccountSection from "@/components/DeleteAccountSection";
import { useScrollReveal } from "@/lib/animations";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const Settings = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { ref: headerRef, isVisible: headerVisible } = useScrollReveal<HTMLDivElement>();

  const [twofaEnabled, setTwofaEnabled] = useState<boolean | null>(null);
  const [twofaSaving, setTwofaSaving] = useState(false);
  const [confirmDisableOpen, setConfirmDisableOpen] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate("/login");
    }
  }, [user, navigate]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("two_factor_enabled")
        .eq("id", user.id)
        .maybeSingle();
      if (error) {
        console.error("Failed to load 2FA preference:", error);
        setTwofaEnabled(true);
        return;
      }
      setTwofaEnabled(data?.two_factor_enabled !== false);
    })();
  }, [user]);

  const updateTwofa = async (enabled: boolean) => {
    if (!user) return;
    setTwofaSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ two_factor_enabled: enabled })
      .eq("id", user.id);
    setTwofaSaving(false);
    if (error) {
      toast({
        title: "Couldn't update setting",
        description: error.message,
        variant: "destructive",
      });
      return;
    }
    setTwofaEnabled(enabled);
    toast({
      title: enabled
        ? "Two-Factor Authentication has been enabled."
        : "Two-Factor Authentication has been disabled.",
      description: enabled
        ? "Your account is now more secure."
        : "You can turn it back on anytime.",
    });
  };

  const handleTwofaToggle = (next: boolean) => {
    if (!next) {
      setConfirmDisableOpen(true);
    } else {
      updateTwofa(true);
    }
  };

  const isDevelopment = import.meta.env.DEV || window.location.hostname === 'localhost';

  return (
    <DashboardLayout>
      <SEO
        title="Settings — Dolphin Carpool"
        description="Manage your Dolphin Carpool account settings, security, notifications, and account deletion."
        path="/settings"
      />
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="min-h-screen bg-gradient-to-br from-gray-50/50 via-white to-blue-50/30"
      >
        <div className="container mx-auto px-4 max-w-4xl py-8">
          <Breadcrumbs items={[{ label: "Settings" }]} />

          <motion.div
            ref={headerRef}
            initial={{ opacity: 0, y: 20 }}
            animate={headerVisible ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6 }}
            className="flex items-center justify-between mb-8"
          >
            <div className="flex items-center gap-3">
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={headerVisible ? { scale: 1, rotate: 0 } : {}}
                transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
                className="w-12 h-12 rounded-2xl bg-gradient-to-br from-gray-600 to-gray-700 flex items-center justify-center shadow-lg shadow-gray-500/25"
              >
                <Settings2 className="w-6 h-6 text-white" />
              </motion.div>
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 bg-clip-text text-transparent">
                  Settings
                </h1>
              </div>
            </div>
          </motion.div>

          <div className="space-y-6">
            {/* Security */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              whileHover={{ y: -2 }}
            >
              <Card className="rounded-2xl border-gray-100 bg-white/90 backdrop-blur-sm shadow-sm hover:shadow-lg transition-all">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-blue-100 flex items-center justify-center">
                      <ShieldCheck className="w-4 h-4 text-primary" />
                    </div>
                    Security
                  </CardTitle>
                  <CardDescription>
                    Manage how you sign in to Dolphin Carpool.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <p className="font-medium">Two-Factor Authentication</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        When enabled, you will be asked to enter a verification code sent to your email each time you log in. Recommended for account security.
                      </p>
                    </div>
                    {twofaEnabled === null ? (
                      <Skeleton className="h-6 w-11 rounded-full" />
                    ) : (
                      <Switch
                        checked={twofaEnabled}
                        disabled={twofaSaving}
                        onCheckedChange={handleTwofaToggle}
                        aria-label="Two-Factor Authentication"
                      />
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Feedback */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              whileHover={{ y: -2 }}
            >
              <Card className="rounded-2xl border-gray-100 bg-white/90 backdrop-blur-sm shadow-sm hover:shadow-lg transition-all">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-violet-100 flex items-center justify-center">
                      <MessageSquare className="w-4 h-4 text-violet-600" />
                    </div>
                    Feedback
                  </CardTitle>
                  <CardDescription>
                    Help us improve Dolphin Carpool
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">
                    Found a bug or have a suggestion? We'd love to hear from you!
                  </p>
                  <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                    <Button asChild className="bg-violet-600 hover:bg-violet-700 shadow-lg shadow-violet-500/25">
                      <Link to="/feedback">Send Feedback</Link>
                    </Button>
                  </motion.div>
                </CardContent>
              </Card>
            </motion.div>

            {isDevelopment && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                whileHover={{ y: -2 }}
              >
                <Card className="rounded-2xl border-yellow-200 bg-yellow-50/80 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-yellow-700">
                      <div className="w-8 h-8 rounded-xl bg-yellow-100 flex items-center justify-center">
                        <Wrench className="w-4 h-4 text-yellow-600" />
                      </div>
                      Development Tools
                    </CardTitle>
                    <CardDescription>
                      These tools are only available in development mode
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <TestDataGenerator />
                  </CardContent>
                </Card>
              </motion.div>
            )}

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              whileHover={{ y: -2 }}
            >
              <DeleteAccountSection />
            </motion.div>
          </div>
        </div>
      </motion.div>

      <AlertDialog open={confirmDisableOpen} onOpenChange={setConfirmDisableOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disable Two-Factor Authentication?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to disable Two-Factor Authentication? This makes your account less secure.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep it on</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => updateTwofa(false)}
            >
              Yes, turn off
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
};

export default Settings;
