import { Car, Loader2 } from "lucide-react";

interface SplashScreenProps {
  message?: string;
}

const SplashScreen = ({ message = "Loading Dolphin CarPool..." }: SplashScreenProps) => {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background animate-fade-in">
      <div className="flex flex-col items-center gap-6">
        {/* Logo */}
        <div className="relative">
          <div className="flex items-center gap-2 text-4xl font-bold text-foreground">
            <div className="relative">
              <Car className="w-12 h-12" />
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-primary rounded-full animate-pulse" />
            </div>
            <span>Dolphin CarPool</span>
          </div>
        </div>

        {/* Loading indicator */}
        <div className="flex items-center gap-3 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm">{message}</span>
        </div>

        {/* Progress dots */}
        <div className="flex gap-1.5">
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse" style={{ animationDelay: '0ms' }} />
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse" style={{ animationDelay: '150ms' }} />
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </div>
  );
};

export default SplashScreen;
