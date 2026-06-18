import { useState, useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  Menu, 
  X, 
  Car, 
  Home, 
  ChevronDown,
  Bell,
  User,
  Settings,
  LogOut,
  MapPin,
  Calendar,
  Users,
  Shield,
  FileText,
  Sparkles
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { NotificationDropdown } from "./NotificationDropdown";
import { motion, AnimatePresence } from "framer-motion";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Premium navigation with glassmorphism and animations
const Navigation = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isParent, setIsParent] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);
  const [isAdmin, setIsAdmin] = useState(false);
  const [pendingAccessRequests, setPendingAccessRequests] = useState(0);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [profile, setProfile] = useState<Record<string, any> | null>(null);
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isHomePage = location.pathname === "/";

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const checkUserRole = async () => {
      if (!user) {
        setIsParent(false);
        setUserRole(null);
        setPendingRequestsCount(0);
        setIsAdmin(false);
        setPendingAccessRequests(0);
        setProfile(null);
        return;
      }
      
      // Fetch profile and role
      const { data: profileData } = await supabase
        .from('profiles')
        .select('account_type, first_name, last_name, username')
        .eq('id', user.id)
        .maybeSingle();
      
      if (profileData) {
        setProfile(profileData);
        setUserRole(profileData.account_type);
        setIsParent(profileData.account_type === 'parent');
        
        if (profileData.account_type === 'parent') {
          fetchPendingRequests();
        }
      }

      setIsAdmin(false);
    };
    
    checkUserRole();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const fetchPendingRequests = async () => {
    if (!user) return;
    
    const { count } = await supabase
      .from('account_links')
      .select('*', { count: 'exact', head: true })
      .eq('parent_id', user.id)
      .eq('status', 'pending');
    
    setPendingRequestsCount(count || 0);
  };

  // Real-time subscription
  useEffect(() => {
    if (!user || !isParent) return;

    const channel = supabase
      .channel('parent-link-requests')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'account_links',
          filter: `parent_id=eq.${user.id}`,
        },
        () => fetchPendingRequests()
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, isParent]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const navItems = [
    { label: "Find Rides", path: "/find-rides", icon: MapPin, auth: true },
    { label: "Dashboard", path: "/dashboard", icon: Home, auth: true },
    ...(isParent ? [{ label: "My Rides", path: "/my-rides", icon: Car, auth: true }] : []),
    ...(isParent ? [{ label: "Calendar", path: "/series", icon: Calendar, auth: true }] : []),
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <>
      <motion.nav
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          isScrolled
            ? "bg-white/80 backdrop-blur-2xl border-b border-gray-200/50 shadow-[0_8px_32px_rgba(0,0,0,0.04)]"
            : isHomePage
            ? "bg-transparent"
            : "bg-white/60 backdrop-blur-xl border-b border-gray-200/30"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 lg:h-18">
            {/* Logo */}
            <motion.div 
              className="flex items-center gap-2 cursor-pointer"
              onClick={() => navigate(user ? "/dashboard" : "/")}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="relative">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/25">
                  <Car className="w-5 h-5 text-white" />
                </div>
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-white" />
              </div>
              <div className="flex flex-col">
                <span className={`font-bold text-lg tracking-tight transition-colors ${
                  isScrolled || !isHomePage ? "text-gray-900" : "text-gray-900"
                }`}>
                  ​Dolphin
                </span>
                <span className={`text-[10px] -mt-1 font-medium tracking-wider uppercase ${
                  isScrolled || !isHomePage ? "text-gray-500" : "text-gray-500"
                }`}>
                  ​Car Pool
                </span>
              </div>
            </motion.div>

            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center gap-1">
              {navItems.map((item) => (
                (!item.auth || user) && (
                  <motion.button
                    key={item.path}
                    onClick={() => navigate(item.path)}
                    className={`relative px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 flex items-center gap-2 ${
                      isActive(item.path)
                        ? "text-blue-600 bg-blue-50/80"
                        : isScrolled || !isHomePage
                        ? "text-gray-600 hover:text-gray-900 hover:bg-gray-100/80"
                        : "text-gray-700 hover:text-gray-900 hover:bg-white/40"
                    }`}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <item.icon className="w-4 h-4" />
                    {item.label}
                    {isActive(item.path) && (
                      <motion.div
                        layoutId="navIndicator"
                        className="absolute bottom-0 left-2 right-2 h-0.5 bg-blue-500 rounded-full"
                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                      />
                    )}
                  </motion.button>
                )
              ))}
            </div>

            {/* Right Side Actions */}
            <div className="flex items-center gap-2">
              {user ? (
                <>
                  {/* Notifications */}
                  <NotificationDropdown />
                  
                  {/* Profile Dropdown */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <motion.button
                        className="flex items-center gap-2 p-1.5 rounded-full hover:bg-gray-100/80 transition-all"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <Avatar className="w-8 h-8 ring-2 ring-white shadow-md">
                          <AvatarFallback className="bg-gradient-to-br from-blue-500 to-blue-600 text-white text-sm font-semibold">
                            {profile?.first_name?.[0]}{profile?.last_name?.[0]}
                          </AvatarFallback>
                        </Avatar>
                        <ChevronDown className="w-4 h-4 text-gray-500 hidden sm:block" />
                      </motion.button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56 glass-card">
                      <div className="px-3 py-2 border-b border-gray-100">
                        <p className="font-semibold text-gray-900">{profile?.first_name} {profile?.last_name}</p>
                        <p className="text-xs text-gray-500">@{profile?.username}</p>
                      </div>
                      <DropdownMenuItem onClick={() => navigate("/profile")} className="gap-2">
                        <User className="w-4 h-4" /> Profile
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => navigate("/settings")} className="gap-2">
                        <Settings className="w-4 h-4" /> Settings
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => navigate("/terms")} className="gap-2">
                        <FileText className="w-4 h-4" /> Terms and Conditions
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={handleLogout} className="gap-2 text-red-600">
                        <LogOut className="w-4 h-4" /> Log out
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </>
              ) : (
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    className="hidden sm:flex bg-white hover:bg-gray-50 text-blue-700 font-semibold ring-2 ring-blue-500 hover:ring-blue-600 shadow-md"
                    onClick={() => navigate("/login")}
                  >
                    Log in
                  </Button>
                  <Button
                    className="bg-white hover:bg-gray-50 text-blue-700 font-semibold ring-2 ring-blue-500 hover:ring-blue-600 shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all"
                    onClick={() => navigate("/register")}
                  >
                    <Sparkles className="w-4 h-4 mr-1.5" />
                    Sign up
                  </Button>
                </div>
              )}

              {/* Mobile Menu Button */}
              <motion.button
                className="lg:hidden p-2 rounded-lg bg-white ring-2 ring-blue-500 hover:bg-gray-50 transition-colors"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                whileTap={{ scale: 0.95 }}
                aria-label="Toggle mobile menu"
              >
                {isMobileMenuOpen ? (
                  <X className="w-6 h-6 text-blue-700" />
                ) : (
                  <Menu className="w-6 h-6 text-blue-700" />
                )}
              </motion.button>
            </div>
          </div>
        </div>
      </motion.nav>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-x-0 top-16 z-40 lg:hidden"
          >
            <div className="mx-4 mt-2 bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-200/50 overflow-hidden">
              <div className="p-4 space-y-1">
                {navItems.map((item, index) => (
                  (!item.auth || user) && (
                    <motion.button
                      key={item.path}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      onClick={() => {
                        navigate(item.path);
                        setIsMobileMenuOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                        isActive(item.path)
                          ? "bg-blue-50 text-blue-600"
                          : "text-gray-700 hover:bg-gray-100"
                      }`}
                    >
                      <item.icon className="w-5 h-5" />
                      {item.label}
                    </motion.button>
                  )
                ))}
                
                {user && (
                  <>
                    <div className="h-px bg-gray-200 my-2" />
                    <motion.button
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 }}
                      onClick={() => {
                        navigate("/profile");
                        setIsMobileMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-100"
                    >
                      <User className="w-5 h-5" />
                      Profile
                    </motion.button>
                    <motion.button
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.35 }}
                      onClick={() => {
                        navigate("/settings");
                        setIsMobileMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-100"
                    >
                      <Settings className="w-5 h-5" />
                      Settings
                    </motion.button>
                    <motion.button
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.375 }}
                      onClick={() => {
                        navigate("/terms");
                        setIsMobileMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-100"
                    >
                      <FileText className="w-5 h-5" />
                      Terms and Conditions
                    </motion.button>
                    <motion.button
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.4 }}
                      onClick={() => {
                        handleLogout();
                        setIsMobileMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50"
                    >
                      <LogOut className="w-5 h-5" />
                      Log out
                    </motion.button>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default Navigation;
