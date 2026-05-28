import { Lock, Shield, Eye, Settings } from "lucide-react";
import { Link } from "react-router-dom";

interface PrivacyInfoBoxProps {
  className?: string;
}

const PrivacyInfoBox = ({ className = "" }: PrivacyInfoBoxProps) => {
  return (
    <div className={`bg-card border border-border rounded-lg p-4 ${className}`}>
      <div className="flex items-center gap-2 mb-3">
        <Lock className="w-5 h-5 text-primary" />
        <h3 className="font-semibold">Your Privacy</h3>
      </div>
      
      <ul className="space-y-2 text-sm text-muted-foreground">
        <li className="flex items-start gap-2">
          <Shield className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
          <span>Only verified Dolphin Carpool parents can see you</span>
        </li>
        <li className="flex items-start gap-2">
          <Eye className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
          <span>Your exact address is never shown</span>
        </li>
        <li className="flex items-start gap-2">
          <Settings className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
          <span>You control what contact info is visible</span>
        </li>
        <li className="flex items-start gap-2">
          <Lock className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
          <span>You can opt out of the map anytime</span>
        </li>
      </ul>

      <Link 
        to="/settings" 
        className="inline-flex items-center gap-1 text-sm text-primary hover:underline mt-3"
      >
        <Settings className="w-3 h-3" />
        Manage privacy settings
      </Link>
    </div>
  );
};

export default PrivacyInfoBox;
