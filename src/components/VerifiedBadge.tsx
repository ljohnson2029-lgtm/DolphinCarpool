import { Shield, CheckCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface VerifiedBadgeProps {
  size?: "sm" | "md" | "lg";
  showText?: boolean;
  className?: string;
}

const VerifiedBadge = ({ size = "md", showText = true, className = "" }: VerifiedBadgeProps) => {
  const iconSizes = {
    sm: "w-3 h-3",
    md: "w-4 h-4",
    lg: "w-5 h-5",
  };

  const textSizes = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base",
  };

  if (!showText) {
    return (
      <div className={`inline-flex items-center justify-center ${className}`} title="Verified Dolphin Carpool Account">
        <CheckCircle className={`${iconSizes[size]} text-green-500`} />
      </div>
    );
  }

  return (
    <Badge 
      variant="outline" 
      className={`bg-green-500/10 text-green-600 border-green-500/20 gap-1.5 ${className}`}
    >
      <CheckCircle className={iconSizes[size]} />
      <span className={textSizes[size]}>Verified Dolphin Carpool Account</span>
    </Badge>
  );
};

export const TrustIndicator = ({ className = "" }: { className?: string }) => {
  return (
    <div className={`flex items-center gap-2 text-sm text-muted-foreground ${className}`}>
      <Shield className="w-4 h-4 text-primary" />
      <span>Secure & Encrypted</span>
    </div>
  );
};

export default VerifiedBadge;
