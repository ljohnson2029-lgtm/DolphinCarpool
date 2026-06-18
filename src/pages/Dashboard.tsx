import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Car, 
  Hand, 
  Map as MapIcon, 
  Calendar, 
  Users, 
  TrendingUp,
  ArrowRight,
  Sparkles,
  Clock,
  MapPin,
  ChevronRight
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import StudentDashboard from "@/components/StudentDashboard";
import HowToUseGuide from "@/components/HowToUseGuide";
import SuggestedPartners from "@/components/SuggestedPartners";
import { useScrollReveal, useCountUp } from "@/lib/animations";

// Premium Dashboard with Apple/ESPN-quality design
const Dashboard = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [upcomingRides, setUpcomingRides] = useState(0);
  const [totalConnections, setTotalConnections] = useState(0);
  
  const shouldUseStudentDashboard = profile?.account_type === 'student';
  const { ref: heroRef, isVisible: heroVisible } = useScrollReveal<HTMLDivElement>();
  const { ref: statsRef, isVisible: statsVisible } = useScrollReveal<HTMLDivElement>();

  const ridesCount = useCountUp(upcomingRides, 1500);
  const connectionsCount = useCountUp(totalConnections, 1500);

  useEffect(() => {
    if (!user || shouldUseStudentDashboard) return;
    
    // Fetch quick stats
    const fetchStats = async () => {
      const today = new Date().toISOString().split('T')[0];
      
      // Count upcoming rides
      const { count: rides } = await supabase
        .from('rides')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('ride_date', today)
        .eq('status', 'active');
      
      setUpcomingRides(rides || 0);
      
      // Count connections
      const { count: connections } = await supabase
        .from('account_links')
        .select('*', { count: 'exact', head: true })
        .or(`parent_id.eq.${user.id},student_id.eq.${user.id}`)
        .eq('status', 'approved');
      
      setTotalConnections(connections || 0);
    };
    
    fetchStats();
  }, [user, shouldUseStudentDashboard]);

  const getInitials = (firstName: string | null, lastName: string | null, username: string) => {
    if (firstName && lastName) return `${firstName[0]}${lastName[0]}`.toUpperCase();
    return username.substring(0, 2).toUpperCase();
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  if (!user || !profile) {
    return (
      <DashboardLayout>
        <div className="container mx-auto px-4 py-8 max-w-6xl">
          <div className="mb-8 space-y-2">
            <Skeleton className="h-9 w-72" />
            <Skeleton className="h-5 w-48" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-32 rounded-xl" />)}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (shouldUseStudentDashboard) {
    return <StudentDashboard />;
  }

  const quickActions = [
    {
      title: "Offer a Ride",
      description: "Share your commute with another family",
      icon: Car,
      color: "from-emerald-500 to-emerald-600",
      bgColor: "bg-emerald-50",
      iconColor: "text-emerald-600",
      path: '/post-ride?type=offer',
      badge: null
    },
    {
      title: "Request a Ride",
      description: "Ask for help getting your kids to school",
      icon: Hand,
      color: "from-amber-500 to-amber-600",
      bgColor: "bg-amber-50",
      iconColor: "text-amber-600",
      path: '/post-ride?type=request',
      badge: null
    },
    {
      title: "Find Rides",
      description: "Browse available carpools near you",
      icon: MapIcon,
      color: "from-blue-500 to-blue-600",
      bgColor: "bg-blue-50",
      iconColor: "text-blue-600",
      path: '/family-carpools?view=map',
      badge: null
    }
  ];

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gradient-to-br from-gray-50/50 via-white to-blue-50/30">
        <div className="container mx-auto px-4 py-8 max-w-6xl">
          
          {/* Hero Section */}
          <motion.div
            ref={heroRef}
            initial={{ opacity: 0, y: 20 }}
            animate={heroVisible ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="mb-10"
          >
            <div className="flex flex-col md:flex-row md:items-center gap-6">
              <motion.div
                whileHover={{ scale: 1.05 }}
                className="relative"
              >
                <Avatar className="h-20 w-20 ring-4 ring-white shadow-xl">
                  <AvatarFallback className="bg-gradient-to-br from-blue-500 to-blue-600 text-white text-2xl font-bold">
                    {getInitials(profile.first_name, profile.last_name, profile.username)}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full border-4 border-white shadow-sm" />
              </motion.div>
              
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-1">
                  <motion.span
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.2 }}
                    className="text-sm font-medium text-blue-600 bg-blue-50 px-3 py-1 rounded-full"
                  >
                    {getGreeting()}
                  </motion.span>
                  {upcomingRides > 0 && (
                    <Badge variant="secondary" className="bg-amber-50 text-amber-700 border-amber-200">
                      <Clock className="w-3 h-3 mr-1" />
                      {upcomingRides} upcoming
                    </Badge>
                  )}
                </div>
                <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
                  {profile.first_name || profile.username}!
                </h1>
                <p className="text-gray-500 text-lg">
                  Manage your carpools and connect with ​Car Pool families
                </p>
              </div>

              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
                className="flex gap-3"
              >
                <Button
                  onClick={() => navigate('/post-ride')}
                  className="bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white shadow-lg shadow-blue-500/25"
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  New Ride
                </Button>
              </motion.div>
            </div>
          </motion.div>

          {/* Stats Overview */}
          <motion.div
            ref={statsRef}
            initial={{ opacity: 0, y: 20 }}
            animate={statsVisible ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10"
          >
            <Card className="bg-gradient-to-br from-blue-500 to-blue-600 border-0 text-white shadow-lg shadow-blue-500/20">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <Calendar className="w-5 h-5 text-blue-100" />
                  <TrendingUp className="w-4 h-4 text-blue-200" />
                </div>
                <div className="text-3xl font-bold">{ridesCount}</div>
                <div className="text-sm text-blue-100">Upcoming Rides</div>
              </CardContent>
            </Card>
            
            <Card className="bg-white border-gray-100 shadow-sm">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <MapPin className="w-5 h-5 text-muted-foreground" />
                </div>
                <div className="text-3xl font-bold text-gray-900">Palos Verdes</div>
                <div className="text-sm text-gray-500">Your Area</div>
              </CardContent>
            </Card>
            
            <Card className="bg-white border-gray-100 shadow-sm hover:shadow-md transition-shadow cursor-pointer group"
                  onClick={() => navigate('/profile')}>
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-500">Profile</span>
                  <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-blue-500 transition-colors" />
                </div>
                <div className="text-lg font-semibold text-gray-900">
                  {profile.profile_complete ? 'Complete' : 'Incomplete'}
                </div>
                <div className="text-sm text-gray-500">
                  {profile.profile_complete ? 'Ready to ride!' : 'Add more info'}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Quick Actions Grid */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="mb-10"
          >
            <h2 className="text-xl font-bold text-gray-900 mb-5 flex items-center gap-2">
              Quick Actions
              <div className="h-px flex-1 bg-gray-200 ml-4" />
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {quickActions.map((action, index) => (
                <motion.div
                  key={action.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 + index * 0.1 }}
                  whileHover={{ y: -4, scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => navigate(action.path)}
                  className="group cursor-pointer"
                >
                  <Card className="h-full border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden bg-white">
                    <CardContent className="p-6 relative">
                      {/* Gradient overlay on hover */}
                      <div className={`absolute inset-0 bg-gradient-to-br ${action.color} opacity-0 group-hover:opacity-5 transition-opacity duration-300`} />
                      
                      <div className={`w-14 h-14 rounded-2xl ${action.bgColor} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                        <action.icon className={`w-7 h-7 ${action.iconColor}`} />
                      </div>
                      
                      <h3 className="font-bold text-gray-900 text-lg mb-2 group-hover:text-blue-600 transition-colors">
                        {action.title}
                      </h3>
                      <p className="text-gray-500 text-sm mb-4">
                        {action.description}
                      </p>
                      
                      <div className="flex items-center text-sm font-medium text-muted-foreground group-hover:text-blue-600 transition-colors">
                        Get Started
                        <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Suggested Partners */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.6 }}
            className="mb-10"
          >
            <SuggestedPartners />
          </motion.div>

          {/* How to Use Guide */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.6 }}
          >
            <HowToUseGuide isStudent={false} />
          </motion.div>

        </div>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
