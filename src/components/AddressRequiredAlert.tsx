import { useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { MapPin, Settings, Map, Users, Navigation } from "lucide-react";
import { useNavigate } from "react-router-dom";

/* ─── Types ─────────────────────────────────────────────────────── */

interface AddressRequiredAlertProps {
  open: boolean;
  onClose: () => void;
  showDontAskAgain?: boolean;
  onDontAskAgain?: (checked: boolean) => void;
}

/* ─── Step Indicator ────────────────────────────────────────────── */

const steps = [
  { icon: MapPin, label: "Add Address" },
  { icon: Users, label: "Find Matches" },
  { icon: Navigation, label: "Start Carpooling" },
];

const StepIndicator = () => (
  <div className="flex items-center justify-center gap-2 py-3">
    {steps.map((step, index) => (
      <div key={step.label} className="flex items-center gap-2">
        <div className="flex flex-col items-center gap-1">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-xs ${
              index === 0 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
            }`}
          >
            <step.icon className="h-4 w-4" />
          </div>
          <span className="text-[10px] text-muted-foreground font-medium">{step.label}</span>
        </div>
        {index < steps.length - 1 && <div className="w-6 h-px bg-border mb-4" />}
      </div>
    ))}
  </div>
);

/* ─── Benefits ──────────────────────────────────────────────────── */

const benefits = [
  { icon: Map, text: "See your location on the carpool map" },
  { icon: Users, text: "Get matched with nearby families" },
  { icon: Navigation, text: "Find the most efficient routes" },
];

const BenefitsList = () => (
  <ul className="space-y-2 py-2">
    {benefits.map((benefit) => (
      <li key={benefit.text} className="flex items-center gap-2.5 text-sm text-muted-foreground">
        <benefit.icon className="h-4 w-4 text-primary/60 shrink-0" />
        <span>{benefit.text}</span>
      </li>
    ))}
  </ul>
);

/* ─── Main Component ────────────────────────────────────────────── */

export const AddressRequiredAlert = ({
  open,
  onClose,
  showDontAskAgain = false,
  onDontAskAgain,
}: AddressRequiredAlertProps) => {
  const navigate = useNavigate();
  const ctaRef = useRef<HTMLButtonElement>(null);

  /* Auto-focus the CTA when dialog opens */
  useEffect(() => {
    if (open) {
      const timer = setTimeout(() => ctaRef.current?.focus(), 100);
      return () => clearTimeout(timer);
    }
  }, [open]);

  const handleGoToSettings = () => {
    onClose();
    navigate("/profile/setup");
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-amber-500/10 rounded-full flex items-center justify-center animate-bounce [animation-duration:2s]">
              <MapPin className="w-5 h-5 text-amber-600" />
            </div>
            <DialogTitle>Home Address Required</DialogTitle>
          </div>
          <DialogDescription>
            Your home address helps ​Dolphin match you with nearby carpool families and show your location on the map.
          </DialogDescription>
        </DialogHeader>

        {/* Steps */}
        <StepIndicator />

        {/* Benefits */}
        <BenefitsList />

        {/* Don't ask again */}
        {showDontAskAgain && onDontAskAgain && (
          <div className="flex items-center space-x-2 pt-1">
            <Checkbox
              id="dontAskAgain"
              onCheckedChange={(checked) => onDontAskAgain(checked === true)}
              aria-label="Don't show this reminder again"
            />
            <Label htmlFor="dontAskAgain" className="text-xs text-muted-foreground font-normal cursor-pointer">
              Don't remind me again
            </Label>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-3">
          <Button variant="outline" onClick={onClose} className="flex-1" aria-label="Dismiss address reminder">
            Later
          </Button>
          <Button
            ref={ctaRef}
            onClick={handleGoToSettings}
            className="flex-1"
            aria-label="Go to profile settings to add address"
          >
            <Settings className="w-4 h-4 mr-2" />
            Add Address
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddressRequiredAlert;
