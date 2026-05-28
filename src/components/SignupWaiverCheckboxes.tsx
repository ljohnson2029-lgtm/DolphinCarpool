import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { AlertTriangle, Shield, Scale } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

interface SignupWaiverCheckboxesProps {
  insuranceAgreed: boolean;
  safetyAgreed: boolean;
  liabilityAgreed: boolean;
  onInsuranceChange: (checked: boolean) => void;
  onSafetyChange: (checked: boolean) => void;
  onLiabilityChange: (checked: boolean) => void;
  disabled?: boolean;
  insuranceError?: boolean;
  safetyError?: boolean;
  liabilityError?: boolean;
}

const SignupWaiverCheckboxes = ({
  insuranceAgreed,
  safetyAgreed,
  liabilityAgreed,
  onInsuranceChange,
  onSafetyChange,
  onLiabilityChange,
  disabled = false,
  insuranceError = false,
  safetyError = false,
  liabilityError = false,
}: SignupWaiverCheckboxesProps) => {
  const errorOutline = "border-destructive ring-2 ring-destructive/40";
  return (
    <div className="space-y-4 p-4 bg-muted/50 rounded-lg border">
      <div className="flex items-start gap-2 mb-3">
        <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-foreground">Required Agreements</p>
          <p className="text-xs text-muted-foreground">
            Please read and agree to the following before creating your account.{" "}
            <Link to="/safety" className="text-primary hover:underline" target="_blank">
              View Safety Guidelines
            </Link>
          </p>
        </div>
      </div>

      {/* Insurance Waiver */}
      <div className={cn("flex items-start gap-3 p-3 bg-background rounded-lg border", insuranceError && errorOutline)}>
        <Checkbox
          id="insurance-waiver"
          checked={insuranceAgreed}
          onCheckedChange={(checked) => onInsuranceChange(checked as boolean)}
          disabled={disabled}
          className={cn("mt-1", insuranceError && "border-destructive")}
        />
        <div className="flex-1">
          <Label
            htmlFor="insurance-waiver"
            className="text-sm cursor-pointer leading-relaxed flex items-start gap-2"
          >
            <Shield className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
            <span>
              I understand Dolphin CarPool does not provide insurance coverage. I am responsible 
               for ensuring my personal auto insurance covers carpooling activities. <span className="text-destructive">*</span>
            </span>
          </Label>
          {insuranceError && (
            <p className="text-xs text-destructive mt-1">This agreement is required</p>
          )}
        </div>
      </div>

      {/* Safety Guidelines Agreement */}
      <div className={cn("flex items-start gap-3 p-3 bg-background rounded-lg border", safetyError && errorOutline)}>
        <Checkbox
          id="safety-waiver"
          checked={safetyAgreed}
          onCheckedChange={(checked) => onSafetyChange(checked as boolean)}
          disabled={disabled}
          className={cn("mt-1", safetyError && "border-destructive")}
        />
        <div className="flex-1">
          <Label
            htmlFor="safety-waiver"
            className="text-sm cursor-pointer leading-relaxed flex items-start gap-2"
          >
            <AlertTriangle className="h-4 w-4 text-yellow-600 flex-shrink-0 mt-0.5" />
            <span>
              I agree to follow all traffic laws and{" "}
               <Link to="/safety" className="text-primary hover:underline" target="_blank">
                 safety guidelines
               </Link>{" "}
               when participating in carpools. <span className="text-destructive">*</span>
            </span>
          </Label>
          {safetyError && (
            <p className="text-xs text-destructive mt-1">This agreement is required</p>
          )}
        </div>
      </div>

      {/* Liability Release */}
      <div className={cn("flex items-start gap-3 p-3 bg-background rounded-lg border", liabilityError && errorOutline)}>
        <Checkbox
          id="liability-waiver"
          checked={liabilityAgreed}
          onCheckedChange={(checked) => onLiabilityChange(checked as boolean)}
          disabled={disabled}
          className={cn("mt-1", liabilityError && "border-destructive")}
        />
        <div className="flex-1">
          <Label
            htmlFor="liability-waiver"
            className="text-sm cursor-pointer leading-relaxed flex items-start gap-2"
          >
            <Scale className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
            <span>
              I release Dolphin CarPool from any liability related to carpool activities and 
               understand that I assume all risks associated with carpooling. <span className="text-destructive">*</span>
            </span>
          </Label>
          {liabilityError && (
            <p className="text-xs text-destructive mt-1">This agreement is required</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default SignupWaiverCheckboxes;
