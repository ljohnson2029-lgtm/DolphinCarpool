import { lazy, Suspense } from "react";
import { motion } from "framer-motion";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import { AuthProvider, useAuth } from "./contexts/AuthContext";
import ParentOnlyRoute from "./components/ParentOnlyRoute";
import RequireProfileComplete from "./components/RequireProfileComplete";
import SplashScreen from "./components/SplashScreen";
import PageTransition from "./components/PageTransition";

// Eager load critical pages
import Index from "./pages/Index";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";

// Lazy load non-critical pages
const About = lazy(() => import("./pages/About"));
const Features = lazy(() => import("./pages/Features"));
const Safety = lazy(() => import("./pages/Safety"));
const HowItWorks = lazy(() => import("./pages/HowItWorks"));
const Profile = lazy(() => import("./pages/Profile"));
const ProfileSetup = lazy(() => import("./pages/ProfileSetup"));
const FamilyCarpools = lazy(() => import("./pages/FamilyCarpools"));
const NotFound = lazy(() => import("./pages/NotFound"));
const FamilyLinks = lazy(() => import("./pages/FamilyLinks"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const AuthCallback = lazy(() => import("./pages/AuthCallback"));

const MyPrivateRequests = lazy(() => import("./pages/MyPrivateRequests"));
const Settings = lazy(() => import("./pages/Settings"));
const FindRides = lazy(() => import("./pages/FindRides"));
const PostRide = lazy(() => import("./pages/PostRide"));
const Conversations = lazy(() => import("./pages/Conversations"));
const MyRides = lazy(() => import("./pages/MyRides"));
const Privacy = lazy(() => import("./pages/Privacy"));
const Terms = lazy(() => import("./pages/Terms"));
const Help = lazy(() => import("./pages/Help"));
const Feedback = lazy(() => import("./pages/Feedback"));
const PublicProfile = lazy(() => import("./pages/PublicProfile"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const Series = lazy(() => import("./pages/Series"));

// Loading component for lazy loaded pages
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-50/50 via-white to-blue-50/30">
    <div className="flex flex-col items-center gap-4">
      <motion.div
        className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full"
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
      />
      <motion.p 
        className="text-muted-foreground text-sm"
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 1.5, repeat: Infinity }}
      >
        Loading...
      </motion.p>
    </div>
  </div>
);

// Query client with optimized settings
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const AppRoutes = () => {
  const { loading } = useAuth();

  if (loading) {
    return <SplashScreen />;
  }

  return (
    <RequireProfileComplete>
      <Suspense fallback={<PageLoader />}>
        <PageTransition>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/about" element={<About />} />
          <Route path="/features" element={<Features />} />
          <Route path="/safety" element={<Safety />} />
          <Route path="/how-it-works" element={<HowItWorks />} />
          <Route path="/register" element={<Register />} />
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/verify" element={<AuthCallback />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/carpools" element={<FamilyCarpools />} />
          <Route path="/carpools/create" element={<FamilyCarpools />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/profile/setup" element={<ProfileSetup />} />
          <Route path="/family-carpools" element={<FamilyCarpools />} />
          <Route path="/family-links" element={<FamilyLinks />} />
          {/* Redirects from old routes */}
          <Route path="/linked-accounts" element={<FamilyLinks />} />
          <Route path="/student-linking" element={<FamilyLinks />} />
          <Route path="/parent-approvals" element={<FamilyLinks />} />
          
          <Route path="/settings" element={<Settings />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/help" element={<Help />} />
          <Route path="/feedback" element={<Feedback />} />
          
          {/* Rides - accessible to all but with permission differences */}
          <Route path="/find-rides" element={<FindRides />} />
          <Route path="/post-ride" element={
            <ParentOnlyRoute><PostRide /></ParentOnlyRoute>
          } />
          <Route path="/conversations" element={<Conversations />} />
          <Route path="/my-rides" element={<MyRides />} />
          <Route path="/series" element={
            <ParentOnlyRoute><Series /></ParentOnlyRoute>
          } />
          
          {/* Parent-only routes */}
          <Route path="/requests/private" element={
            <ParentOnlyRoute><MyPrivateRequests /></ParentOnlyRoute>
          } />
          
          {/* Public profile view */}
          <Route path="/profile/:userId" element={<PublicProfile />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
        </PageTransition>
      </Suspense>
    </RequireProfileComplete>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;