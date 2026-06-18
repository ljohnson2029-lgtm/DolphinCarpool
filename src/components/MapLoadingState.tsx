import { useState, useEffect } from "react";
import { Car, MapPin, Users, School, Heart } from "lucide-react";
import { SkeletonMapControls } from "@/components/ui/skeleton-card";

interface MapLoadingStateProps {
  showControls?: boolean;
}

const loadingMessages = [
  { text: "Finding carpool buddies...", icon: Users },
  { text: "Mapping the best routes...", icon: MapPin },
  { text: "Warming up the engines...", icon: Car },
  { text: "Getting kids to school...", icon: School },
  { text: "Building community...", icon: Heart },
];

const MapLoadingState = ({ showControls = true }: MapLoadingStateProps) => {
  const [messageIndex, setMessageIndex] = useState(0);
  const [dots, setDots] = useState("");

  // Cycle through messages
  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % loadingMessages.length);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  // Animate dots
  useEffect(() => {
    const interval = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? "" : prev + "."));
    }, 400);
    return () => clearInterval(interval);
  }, []);

  const CurrentIcon = loadingMessages[messageIndex].icon;

  return (
    <div className="h-full w-full flex">
      {/* Map area */}
      <div className="flex-1 bg-gradient-to-br from-emerald-50 via-sky-50 to-amber-50 dark:from-emerald-950/20 dark:via-sky-950/20 dark:to-amber-950/20 flex flex-col items-center justify-center overflow-hidden relative">
        
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden">
          {/* Floating clouds */}
          <div className="absolute top-10 left-10 w-24 h-12 bg-white/40 dark:bg-white/10 rounded-full blur-sm animate-[float_8s_ease-in-out_infinite]" />
          <div className="absolute top-20 right-20 w-32 h-16 bg-white/30 dark:bg-white/5 rounded-full blur-sm animate-[float_10s_ease-in-out_infinite_1s]" />
          <div className="absolute top-32 left-1/3 w-20 h-10 bg-white/50 dark:bg-white/10 rounded-full blur-sm animate-[float_7s_ease-in-out_infinite_2s]" />
          
          {/* Road */}
          <div className="absolute bottom-24 left-0 right-0 h-16 bg-gray-300 dark:bg-gray-700">
            {/* Road lines */}
            <div className="absolute top-1/2 left-0 right-0 h-1 flex gap-8 -translate-y-1/2 overflow-hidden">
              {Array.from({ length: 20 }).map((_, i) => (
                <div 
                  key={i} 
                  className="w-12 h-full bg-amber-400 dark:bg-amber-500 flex-shrink-0 animate-[roadLine_1s_linear_infinite]"
                  style={{ animationDelay: `${i * 0.05}s` }}
                />
              ))}
            </div>
          </div>

          {/* Animated cars */}
          <div className="absolute bottom-28 animate-[driveCar_4s_linear_infinite]">
            <div className="relative">
              <div className="w-14 h-8 bg-emerald-500 rounded-lg shadow-lg relative">
                <div className="absolute top-1 left-2 right-2 h-3 bg-sky-200 rounded-sm" />
                <div className="absolute -bottom-1 left-2 w-3 h-3 bg-gray-800 rounded-full" />
                <div className="absolute -bottom-1 right-2 w-3 h-3 bg-gray-800 rounded-full" />
              </div>
              <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                <Users className="w-4 h-4 text-emerald-600" />
              </div>
            </div>
          </div>

          <div className="absolute bottom-28 animate-[driveCar_5s_linear_infinite_2s]">
            <div className="relative">
              <div className="w-12 h-7 bg-sky-500 rounded-lg shadow-lg relative">
                <div className="absolute top-1 left-2 right-2 h-2.5 bg-sky-200 rounded-sm" />
                <div className="absolute -bottom-1 left-1.5 w-2.5 h-2.5 bg-gray-800 rounded-full" />
                <div className="absolute -bottom-1 right-1.5 w-2.5 h-2.5 bg-gray-800 rounded-full" />
              </div>
            </div>
          </div>

          <div className="absolute bottom-28 animate-[driveCar_6s_linear_infinite_4s]">
            <div className="relative">
              <div className="w-16 h-9 bg-amber-500 rounded-lg shadow-lg relative">
                <div className="absolute top-1 left-3 right-3 h-3 bg-amber-100 rounded-sm" />
                <div className="absolute -bottom-1 left-3 w-3 h-3 bg-gray-800 rounded-full" />
                <div className="absolute -bottom-1 right-3 w-3 h-3 bg-gray-800 rounded-full" />
              </div>
              <div className="absolute -top-5 left-1/2 -translate-x-1/2">
                <Heart className="w-4 h-4 text-rose-500 animate-pulse" />
              </div>
            </div>
          </div>

          {/* Houses on the side */}
          <div className="absolute bottom-40 left-20">
            <div className="w-12 h-10 bg-rose-300 dark:bg-rose-700 relative">
              <div className="absolute -top-4 left-0 right-0 h-0 border-l-[24px] border-r-[24px] border-b-[16px] border-transparent border-b-rose-500 dark:border-b-rose-600" />
              <div className="absolute bottom-0 left-3 w-4 h-5 bg-amber-700" />
            </div>
          </div>

          <div className="absolute bottom-40 right-32">
            <div className="w-14 h-12 bg-sky-300 dark:bg-sky-700 relative">
              <div className="absolute -top-5 left-0 right-0 h-0 border-l-[28px] border-r-[28px] border-b-[20px] border-transparent border-b-sky-500 dark:border-b-sky-600" />
              <div className="absolute bottom-0 left-4 w-5 h-6 bg-amber-700" />
              <div className="absolute top-2 right-2 w-3 h-3 bg-amber-200" />
            </div>
          </div>

          {/* School at the end */}
          <div className="absolute bottom-40 right-10">
            <div className="flex flex-col items-center">
              <School className="w-8 h-8 text-amber-600 dark:text-amber-400 mb-1" />
              <div className="w-16 h-14 bg-amber-100 dark:bg-amber-900 border-2 border-amber-300 dark:border-amber-700 rounded-t-lg relative">
                <div className="absolute top-2 left-2 w-3 h-3 bg-sky-300 dark:bg-sky-700" />
                <div className="absolute top-2 right-2 w-3 h-3 bg-sky-300 dark:bg-sky-700" />
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-5 bg-amber-700 rounded-t" />
              </div>
            </div>
          </div>

          {/* Trees */}
          <div className="absolute bottom-40 left-44">
            <div className="w-0 h-0 border-l-[12px] border-r-[12px] border-b-[24px] border-transparent border-b-emerald-600" />
            <div className="w-3 h-4 bg-amber-800 mx-auto" />
          </div>

          <div className="absolute bottom-40 left-60">
            <div className="w-0 h-0 border-l-[10px] border-r-[10px] border-b-[20px] border-transparent border-b-emerald-500" />
            <div className="w-2 h-3 bg-amber-800 mx-auto" />
          </div>
        </div>

        {/* Main loading content */}
        <div className="relative z-10 flex flex-col items-center gap-6 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm px-8 py-6 rounded-2xl shadow-xl border border-white/50 dark:border-gray-700/50">
          {/* Animated icon */}
          <div className="relative">
            <div className="absolute inset-0 bg-primary/20 rounded-full animate-ping" />
            <div className="relative w-16 h-16 bg-gradient-to-br from-primary to-primary/70 rounded-full flex items-center justify-center shadow-lg">
              <CurrentIcon className="w-8 h-8 text-white animate-[bounce_1s_ease-in-out_infinite]" />
            </div>
          </div>

          {/* Message */}
          <div className="text-center">
            <p className="text-lg font-semibold text-foreground min-w-[200px]">
              {loadingMessages[messageIndex].text}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Please wait{dots}
            </p>
          </div>

          {/* Progress dots */}
          <div className="flex gap-2">
            {loadingMessages.map((_, i) => (
              <div
                key={i}
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  i === messageIndex 
                    ? "bg-primary scale-125" 
                    : "bg-muted-foreground/30"
                }`}
              />
            ))}
          </div>
        </div>

        {/* Fun fact at bottom */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-center">
          <p className="text-xs text-muted-foreground italic">
            🚗 Did you know? Carpooling can save over 1,500 lbs of CO2 per year!
          </p>
        </div>
      </div>

      {/* Control panel skeleton */}
      {showControls && (
        <div className="w-80 border-l border-border bg-background">
          <SkeletonMapControls />
        </div>
      )}

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) translateX(0px); }
          25% { transform: translateY(-10px) translateX(5px); }
          50% { transform: translateY(-5px) translateX(-5px); }
          75% { transform: translateY(-15px) translateX(3px); }
        }
        
        @keyframes driveCar {
          0% { transform: translateX(-100px); }
          100% { transform: translateX(calc(100vw + 100px)); }
        }
        
        @keyframes roadLine {
          0% { transform: translateX(0); }
          100% { transform: translateX(-80px); }
        }
      `}</style>
    </div>
  );
};

export default MapLoadingState;
