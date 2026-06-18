import { useNavigate, useLocation } from "react-router-dom";
import { Home, Car, Calendar, User, Menu, MessageSquarePlus, Info, Shield, HelpCircle, Settings, Repeat } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { usePrefetchRoutes } from "@/hooks/usePrefetchRoutes";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useState } from "react";

const MobileBottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile } = useAuth();
  const [sheetOpen, setSheetOpen] = useState(false);
  const prefetch = usePrefetchRoutes();

  const isActive = (path: string) => location.pathname === path;
  const isStudent = profile?.account_type === "student";

  // 4 visible tabs + More menu
  const mainTabs = [
    { label: "Home", path: "/dashboard", icon: Home },
    { label: "Carpools", path: "/family-carpools", icon: Calendar },
    { label: "My Rides", path: "/my-rides", icon: Car },
    ...(!isStudent ? [{ label: "Series", path: "/series", icon: Repeat }] : []),
    { label: "Profile", path: "/profile", icon: User },
  ];

  // Hamburger/More menu items
  const menuItems = [
    { label: "Give Feedback", path: "/feedback", icon: MessageSquarePlus },
    { label: "About", path: "/about", icon: Info },
    { label: "Safety", path: "/safety", icon: Shield },
    { label: "Settings", path: "/settings", icon: Settings },
  ];

  if (!user) return null;

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border safe-area-bottom">
      <div className="flex items-center justify-around h-16 px-2">
        {mainTabs.map((tab) => {
          const Icon = tab.icon;
          const active = isActive(tab.path);
          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              onTouchStart={() => prefetch(tab.path)}
              onMouseEnter={() => prefetch(tab.path)}
              className={cn(
                "flex flex-col items-center justify-center flex-1 h-full min-w-[56px] min-h-[44px] transition-colors touch-manipulation",
                active
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className={cn("h-5 w-5", active && "scale-110")} />
              <span className="text-[10px] mt-1 font-medium">{tab.label}</span>
            </button>
          );
        })}
        
        {/* More menu button */}
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetTrigger asChild>
            <button className="flex flex-col items-center justify-center flex-1 h-full min-w-[56px] min-h-[44px] text-muted-foreground hover:text-foreground transition-colors touch-manipulation">
              <Menu className="h-5 w-5" />
              <span className="text-[10px] mt-1 font-medium">Menu</span>
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-auto max-h-[80vh] rounded-t-xl">
            <SheetHeader className="pb-4">
              <SheetTitle>Menu</SheetTitle>
            </SheetHeader>
            <div className="grid gap-2 pb-8">
              {menuItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Button
                    key={item.path}
                    variant="ghost"
                    className="w-full justify-start h-12 text-base gap-3"
                    onClick={() => {
                      navigate(item.path);
                      setSheetOpen(false);
                    }}
                  >
                    {Icon && <Icon className="h-5 w-5" />}
                    {item.label}
                  </Button>
                );
              })}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  );
};

export default MobileBottomNav;
