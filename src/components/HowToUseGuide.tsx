import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  ChevronRight,
  BookOpen,
  RefreshCw,
  Car,
  Hand,
  CalendarCheck,
  Send,
  UserPlus,
  Link2,
  Map,
  Eye,
  X,
} from "lucide-react";

interface GuidePage {
  title: string;
  content: string;
  icon: React.ReactNode;
}

const parentPages: GuidePage[] = [
  {
    title: "Welcome to Dolphin Carpool",
    content:
      "Dolphin Carpool is a private carpool platform exclusively for families in our Dolphin Community. Here's a quick guide to help you get started.",
    icon: <BookOpen className="h-10 w-10" />,
  },
  {
    title: "Setting Up a Recurring Series",
    content:
      "The Series tab is for setting up ongoing weekly carpools with another parent. Search for a parent, chat to coordinate, and schedule a recurring ride that repeats every week automatically. Perfect for reliable weekly arrangements with trusted families.",
    icon: <RefreshCw className="h-10 w-10" />,
  },
  {
    title: "Family Carpools",
    content:
      "Browse all available ride offers and requests from other parents in our Dolphin Community. Switch between Map View to see rides on a map and List View to scroll through them. Post your own ride offer if you can drive or a ride request if you need help.",
    icon: <Map className="h-10 w-10" />,
  },
  {
    title: "Posting a Ride Offer or Request",
    content:
      "Tap Post Ride Offer if you have room in your car and want to drive others. Tap Post Ride Request if you need someone to help get your kids to school. Fill in the pickup location, dropoff, date, time, seats, and which children are riding.",
    icon: <Car className="h-10 w-10" />,
  },
  {
    title: "Joining or Helping a Ride",
    content:
      "See a ride that works for you? Tap Request to Join on a ride offer to ask to be added. Tap Offer to Help on a ride request to volunteer as the driver. The other parent will receive your request and must accept before the ride is confirmed.",
    icon: <Hand className="h-10 w-10" />,
  },
  {
    title: "My Rides",
    content:
      "My Rides is where all your confirmed and pending rides live. See upcoming rides, past rides, contact the other parent, and message them directly from each ride card. Drivers can cancel up to 9 hours before pickup. Passengers can leave anytime.",
    icon: <CalendarCheck className="h-10 w-10" />,
  },
  {
    title: "Sending a Direct Ride",
    content:
      "Want to coordinate privately with a specific parent? Search for them in Family Carpools and send them a direct ride offer or request. It goes only to them and never appears publicly. Great for parents you already know.",
    icon: <Send className="h-10 w-10" />,
  },
  {
    title: "Linking Your Child's Account",
    content:
      "Want your child to see their rides from their own account? Go to your Profile and link their email. They will be able to view all rides you schedule for them in their own My Rides tab.",
    icon: <Link2 className="h-10 w-10" />,
  },
];

const studentPages: GuidePage[] = [
  {
    title: "Welcome to Dolphin Carpool",
    content:
      "Dolphin Carpool is a private carpool platform for families in our Dolphin Community. Your parent manages your rides — here's what you can do from your account.",
    icon: <BookOpen className="h-10 w-10" />,
  },
  {
    title: "Your Scheduled Rides",
    content:
      "Check My Rides to see all the rides your parent has arranged for you. You can see the driver, pickup location, time, and who else is riding. You can also view the driver's contact information.",
    icon: <CalendarCheck className="h-10 w-10" />,
  },
  {
    title: "Browsing Carpools",
    content:
      "You can browse all available ride offers and requests in the Family Carpools tab. You can view details but your parent manages any joining or posting.",
    icon: <Eye className="h-10 w-10" />,
  },
  {
    title: "Linking to Your Parent",
    content:
      "Make sure your account is linked to your parent's account so your rides show up here. Go to your Profile and send a link request to your parent's email.",
    icon: <UserPlus className="h-10 w-10" />,
  },
];

const iconColors = [
  "text-primary",
  "text-emerald-500",
  "text-blue-500",
  "text-amber-500",
  "text-rose-500",
  "text-violet-500",
  "text-cyan-500",
  "text-orange-500",
];

interface HowToUseGuideProps {
  isStudent: boolean;
}

const HowToUseGuide = ({ isStudent }: HowToUseGuideProps) => {
  const [currentPage, setCurrentPage] = useState(0);
  const [direction, setDirection] = useState<"left" | "right">("right");
  const [animating, setAnimating] = useState(false);

  const pages = isStudent ? studentPages : parentPages;
  const totalPages = pages.length;
  const isLastPage = currentPage === totalPages - 1;
  const isFirstPage = currentPage === 0;

  const goToPage = (next: number, dir: "left" | "right") => {
    if (animating) return;
    setDirection(dir);
    setAnimating(true);
    setTimeout(() => {
      setCurrentPage(next);
      setAnimating(false);
    }, 200);
  };

  const goNext = () => {
    if (!isLastPage) goToPage(currentPage + 1, "right");
  };

  const goPrev = () => {
    if (!isFirstPage) goToPage(currentPage - 1, "left");
  };

  const page = pages[currentPage];
  const colorClass = iconColors[currentPage % iconColors.length];

  return (
    <Card className="rounded-lg shadow-sm overflow-hidden">
      <CardContent className="p-0">
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-4 pb-2 sm:px-6 sm:pt-5">
          <div>
            <h2 className="text-lg font-bold text-foreground">
              How to Use Dolphin Carpool
            </h2>
            <p className="text-xs text-muted-foreground">
              A quick guide to get you started
            </p>
          </div>
        </div>

        {/* Page content */}
        <div className="relative min-h-[220px] sm:min-h-[200px] flex items-center">
          {/* Left arrow */}
          <button
            onClick={goPrev}
            disabled={isFirstPage}
            className="absolute left-1 sm:left-2 z-10 p-1.5 rounded-full bg-background/80 backdrop-blur border border-border shadow-sm disabled:opacity-0 transition-opacity hover:bg-muted"
            aria-label="Previous page"
          >
            <ChevronLeft className="h-5 w-5 text-foreground" />
          </button>

          {/* Content */}
          <div
            className={`flex-1 px-12 sm:px-16 py-6 text-center transition-all duration-200 ease-in-out ${
              animating
                ? direction === "right"
                  ? "opacity-0 translate-x-4"
                  : "opacity-0 -translate-x-4"
                : "opacity-100 translate-x-0"
            }`}
          >
            <div
              className={`mx-auto mb-4 w-16 h-16 rounded-2xl bg-muted/60 flex items-center justify-center ${colorClass}`}
            >
              {page.icon}
            </div>
            <h3 className="text-base sm:text-lg font-semibold text-foreground mb-2">
              {page.title}
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-lg mx-auto">
              {page.content}
            </p>
          </div>

          {/* Right arrow */}
          <button
            onClick={goNext}
            disabled={isLastPage}
            className="absolute right-1 sm:right-2 z-10 p-1.5 rounded-full bg-background/80 backdrop-blur border border-border shadow-sm disabled:opacity-0 transition-opacity hover:bg-muted"
            aria-label="Next page"
          >
            <ChevronRight className="h-5 w-5 text-foreground" />
          </button>
        </div>

        {/* Footer: dots + close */}
        <div className="flex items-center justify-between px-4 pb-4 sm:px-6 sm:pb-5">
          <p className="text-xs text-muted-foreground">
            Page {currentPage + 1} of {totalPages}
          </p>

          {/* Dots */}
          <div className="flex items-center gap-1.5">
            {pages.map((_, i) => (
              <button
                key={i}
                onClick={() =>
                  goToPage(i, i > currentPage ? "right" : "left")
                }
                className={`h-2 rounded-full transition-all duration-200 ${
                  i === currentPage
                    ? "w-5 bg-primary"
                    : "w-2 bg-muted-foreground/30 hover:bg-muted-foreground/50"
                }`}
                aria-label={`Go to page ${i + 1}`}
              />
            ))}
          </div>

          <Button
            size="sm"
            variant="ghost"
            className="h-8 text-xs"
            onClick={goNext}
            disabled={isLastPage}
          >
            Next
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default HowToUseGuide;
