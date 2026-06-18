import { useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { DashboardLayout } from "@/components/DashboardLayout";
import SEO from "@/components/SEO";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageSquare, Settings2, Sparkles, Trash2, Wrench } from "lucide-react";
import TestDataGenerator from "@/components/TestDataGenerator";
import DeleteAccountSection from "@/components/DeleteAccountSection";
import { useScrollReveal } from "@/lib/animations";

const Settings = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { ref: headerRef, isVisible: headerVisible } = useScrollReveal<HTMLDivElement>();

  useEffect(() => {
    if (!user) {
      navigate("/login");
    }
  }, [user, navigate]);

  const isDevelopment = import.meta.env.DEV || window.location.hostname === 'localhost';

  return (
    <DashboardLayout>
      <SEO
        title="Settings — Dolphin Carpool"
        description="Manage your Dolphin Carpool account settings, notifications, and account deletion."
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

          {/* Premium Header */}
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

            {/* Delete Account */}
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
    </DashboardLayout>
  );
};

export default Settings;
