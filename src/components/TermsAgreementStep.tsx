import { useRef, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ArrowLeft, ArrowRight, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { TERMS_TEXT } from "@/constants/terms";

interface TermsAgreementStepProps {
  onBack: () => void;
  onContinue: () => void;
}

const TermsAgreementStep = ({ onBack, onContinue }: TermsAgreementStepProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrolledToEnd, setScrolledToEnd] = useState(false);
  const [agreed, setAgreed] = useState(false);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 8) {
      setScrolledToEnd(true);
    }
  };

  useEffect(() => {
    // If content fits without scrolling, enable immediately
    const el = scrollRef.current;
    if (el && el.scrollHeight <= el.clientHeight + 8) {
      setScrolledToEnd(true);
    }
  }, []);

  const canContinue = scrolledToEnd && agreed;

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Please scroll through and read the full Terms and Conditions before proceeding.
      </p>

      <div className="relative">
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="h-72 overflow-y-auto rounded-md border bg-muted/30 p-4 text-sm leading-relaxed whitespace-pre-wrap"
        >
          {TERMS_TEXT}
        </div>
        {!scrolledToEnd && (
          <div className="pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1 rounded-full bg-primary text-primary-foreground text-xs px-3 py-1 shadow-md">
            <ChevronDown className="w-3 h-3 animate-bounce" />
            Scroll to continue
          </div>
        )}
      </div>

      <div
        className={cn(
          "flex items-start gap-3 p-3 rounded-md border",
          scrolledToEnd ? "bg-background" : "bg-muted/40 opacity-60",
        )}
      >
        <Checkbox
          id="terms-agree"
          checked={agreed}
          disabled={!scrolledToEnd}
          onCheckedChange={(c) => setAgreed(c as boolean)}
          className="mt-0.5"
        />
        <Label htmlFor="terms-agree" className="text-sm cursor-pointer leading-relaxed">
          I have read and agree to the Dolphin Carpool Terms and Conditions
        </Label>
      </div>

      <div className="flex gap-3 pt-2">
        <Button type="button" variant="outline" onClick={onBack} className="flex-1">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back
        </Button>
        <Button
          type="button"
          onClick={onContinue}
          disabled={!canContinue}
          className="flex-1"
        >
          Continue <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
};

export default TermsAgreementStep;
