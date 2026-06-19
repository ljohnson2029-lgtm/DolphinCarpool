import { ReactNode, useEffect } from "react";
import { useLocation } from "react-router-dom";
import TabNavigation from "./TabNavigation";
import MobileBottomNav from "./MobileBottomNav";
import FloatingFeedbackButton from "./FloatingFeedbackButton";
import CreatorFooter from "./CreatorFooter";
import { cn } from "@/lib/utils";

/* ─── Types ─────────────────────────────────────────────────────── */

interface DashboardLayoutProps {
  children: ReactNode;
  /**
   * Optional: Hide the mobile bottom navigation (e.g. for detail views)
   */
  hideBottomNav?: boolean;
  /**
   * Optional: Add a global warning/info banner at the top of the page
   */
  banner?: ReactNode;
  /**
   * Optional: Remove the max-width constraint for full-width maps/tables
   */
  fullWidth?: boolean;
  /**
   * Optional: Additional classes for the main wrapper
   */
  className?: string;
}

/* ─── Sub-Components ───────────────────────────────────────────── */

/**
 * A hidden link that becomes visible on focus.
 * Essential for keyboard users to skip repetitive navigation.
 */
const SkipToContent = () => (
  <a
    href="#main-content"
    className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-background focus:text-primary focus:ring-2 focus:ring-primary focus:rounded-md shadow-lg"
  >
    Skip to main content
  </a>
);

/* ─── Main Component ───────────────────────────────────────────── */

export const DashboardLayout = ({
  children,
  hideBottomNav = false,
  banner,
  fullWidth = false,
  className,
}: DashboardLayoutProps) => {
  const location = useLocation();

  // Scroll to top whenever the route changes (UX Best Practice)
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-background font-sans antialiased flex flex-col relative selection:bg-primary/20">
      {/* 1. Accessibility Aid */}
      <SkipToContent />

      {/* 2. Global Banner Slot (e.g. "Email not verified") */}
      {banner && <div className="w-full bg-muted/50 border-b">{banner}</div>}

      {/* 3. Top Navigation */}
      <div className="sticky top-0 z-40 w-full bg-background/80 backdrop-blur-md border-b">
        <TabNavigation />
      </div>

      {/* 4. Main Content Area */}
      {/* 'flex-1' ensures this takes up all available space, pushing footer down */}
      <main
        id="main-content"
        className={cn(
          "flex-1 w-full relative outline-none",
          // Padding for top nav + safe breathing room
          "pt-4 md:pt-8",
          // Padding for bottom nav (mobile) or footer (desktop)
          hideBottomNav ? "pb-12" : "pb-32 md:pb-16",
          // iOS Safe Area support
          "pb-safe",
          className,
        )}
      >
        <div
          className={cn(
            "mx-auto px-4 sm:px-6 lg:px-8 h-full",
            // Constraint width unless fullWidth is requested
            !fullWidth && "max-w-7xl",
          )}
        >
          {children}
        </div>
      </main>

      {/* 5. Creator Footer */}
      <CreatorFooter />

      {/* 6. Mobile Bottom Navigation */}
      {!hideBottomNav && (
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-t pb-safe">
          <MobileBottomNav />
        </div>
      )}

      {/* 7. Feedback Button (Z-Index high to float over everything) */}
      <div className="z-50">
        <FloatingFeedbackButton />
      </div>
    </div>
  );
};
