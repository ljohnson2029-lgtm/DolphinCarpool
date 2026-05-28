import { UserPlus, CheckCircle, Users, Car, ArrowRight, PlayCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { cn } from "@/lib/utils";

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

interface Step {
  number: number;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  estimatedTime?: string;
  tips?: string[];
}

interface StepCardProps {
  step: Step;
  index: number;
  isLast: boolean;
  isActive: boolean;
  onHover: (index: number | null) => void;
}

interface NumberBadgeProps {
  number: number;
  size?: "sm" | "lg";
  isActive?: boolean;
}

interface ProgressBarProps {
  currentStep: number;
  totalSteps: number;
}

// ============================================================================
// DATA
// ============================================================================

const steps: Step[] = [
  {
    number: 1,
    icon: UserPlus,
    title: "Create Account",
    description: "Register with your email and set up CPA Verification Codes for enhanced security.",
    estimatedTime: "2 minutes",
    tips: ["Use your community email for faster approval", "Enable CPA Verification Codes for extra security"],
  },
  {
    number: 2,
    icon: CheckCircle,
    title: "Get Approved",
    description: "Quick verification process ensures all members are legitimate Chadwick families.",
    estimatedTime: "1-2 hours",
    tips: ["Verification usually completes within a few hours", "Check your email for approval notification"],
  },
  {
    number: 3,
    icon: Users,
    title: "Find Matches",
    description: "Discover nearby families with matching schedules and routes using our smart algorithm.",
    estimatedTime: "5 minutes",
    tips: ["Set your home address for accurate matching", "Filter by grade level and departure times"],
  },
  {
    number: 4,
    icon: Car,
    title: "Start Carpooling",
    description: "Schedule rides, coordinate pickups, and enjoy stress-free daily commutes together.",
    estimatedTime: "Ongoing",
    tips: ["Communicate with carpool partners via in-app messaging", "Set recurring rides to save time"],
  },
];

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

/**
 * NumberBadge - Displays step number in a circular badge
 */
const NumberBadge = ({ number, size = "lg", isActive = false }: NumberBadgeProps) => {
  const sizeClasses = {
    sm: "w-16 h-16 text-2xl",
    lg: "w-32 h-32 text-5xl",
  };

  return (
    <div className="relative flex-shrink-0" role="presentation">
      <div className={cn("relative transition-all duration-500", sizeClasses[size])} aria-hidden="true">
        {/* Glow effect */}
        <div
          className={cn(
            "absolute inset-0 bg-gradient-to-br from-primary to-secondary rounded-full blur-xl transition-opacity duration-500",
            isActive ? "opacity-40" : "opacity-20",
          )}
        />

        {/* Badge circle */}
        <div
          className={cn(
            "relative w-full h-full bg-gradient-to-br from-primary to-secondary rounded-full flex items-center justify-center text-white font-bold shadow-2xl transition-transform duration-300",
            isActive && "scale-110",
          )}
        >
          {number}
        </div>
      </div>
    </div>
  );
};

/**
 * StepCard - Desktop version of step card with hover effects
 */
const StepCardDesktop = ({ step, index, isLast, isActive, onHover }: StepCardProps) => {
  const Icon = step.icon;
  const [showTips, setShowTips] = useState(false);

  return (
    <div
      className="relative flex gap-8 items-center mb-12 last:mb-0 animate-fade-up"
      style={{ animationDelay: `${index * 150}ms` }}
      onMouseEnter={() => onHover(index)}
      onMouseLeave={() => onHover(null)}
      onFocus={() => onHover(index)}
      onBlur={() => onHover(null)}
      role="article"
      aria-labelledby={`step-${step.number}-title`}
      tabIndex={0}
    >
      {/* Connecting Line */}
      {!isLast && (
        <div
          className={cn(
            "absolute left-16 top-32 bottom-0 w-1 bg-gradient-to-b from-primary to-secondary ml-0.5 transition-all duration-500",
            isActive && "w-2 shadow-lg shadow-primary/50",
          )}
          aria-hidden="true"
        />
      )}

      {/* Number Badge */}
      <NumberBadge number={step.number} size="lg" isActive={isActive} />

      {/* Content Card */}
      <div
        className={cn(
          "flex-1 bg-white rounded-3xl p-8 border-2 transition-all duration-300 group",
          isActive
            ? "border-primary shadow-2xl shadow-primary/20 scale-[1.02]"
            : "border-border hover:border-primary/50 hover:shadow-2xl",
        )}
      >
        <div className="flex items-start gap-6">
          {/* Icon */}
          <div
            className={cn(
              "flex-shrink-0 w-20 h-20 bg-gradient-to-br from-primary/10 to-secondary/10 rounded-2xl flex items-center justify-center transition-all duration-300",
              isActive ? "scale-110 bg-gradient-to-br from-primary/20 to-secondary/20" : "group-hover:scale-110",
            )}
            aria-hidden="true"
          >
            <Icon className="w-10 h-10 text-primary" />
          </div>

          {/* Text Content */}
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-3">
              <h3
                id={`step-${step.number}-title`}
                className={cn(
                  "text-2xl font-bold transition-colors",
                  isActive ? "text-primary" : "text-foreground group-hover:text-primary",
                )}
              >
                {step.title}
              </h3>
              {step.estimatedTime && (
                <span className="text-sm text-muted-foreground bg-secondary/10 px-3 py-1 rounded-full">
                  {step.estimatedTime}
                </span>
              )}
            </div>

            <p className="text-muted-foreground leading-relaxed text-lg mb-4">{step.description}</p>

            {/* Tips Toggle */}
            {step.tips && step.tips.length > 0 && (
              <div>
                <button
                  onClick={() => setShowTips(!showTips)}
                  className="text-sm text-primary hover:text-primary/80 transition-colors flex items-center gap-2 font-medium"
                  aria-expanded={showTips}
                  aria-controls={`step-${step.number}-tips`}
                >
                  {showTips ? "Hide" : "Show"} helpful tips
                  <ArrowRight className={cn("w-4 h-4 transition-transform duration-300", showTips && "rotate-90")} />
                </button>

                {showTips && (
                  <ul id={`step-${step.number}-tips`} className="mt-3 space-y-2 animate-fade-up" role="list">
                    {step.tips.map((tip, tipIndex) => (
                      <li key={tipIndex} className="text-sm text-muted-foreground flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" aria-hidden="true" />
                        <span>{tip}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * StepCard - Mobile version with simplified layout
 */
const StepCardMobile = ({ step, index, isLast }: Omit<StepCardProps, "isActive" | "onHover">) => {
  const Icon = step.icon;

  return (
    <div
      className="relative flex gap-6 items-start animate-fade-up"
      style={{ animationDelay: `${index * 100}ms` }}
      role="article"
      aria-labelledby={`step-mobile-${step.number}-title`}
    >
      {/* Vertical Line */}
      {!isLast && <div className="absolute left-8 top-20 bottom-0 w-0.5 bg-primary/30" aria-hidden="true" />}

      {/* Number Badge */}
      <NumberBadge number={step.number} size="sm" />

      {/* Content */}
      <div className="flex-1 bg-card p-6 rounded-2xl shadow-lg hover:shadow-xl transition-all hover:-translate-y-1">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 bg-primary/10 p-3 rounded-xl" aria-hidden="true">
            <Icon className="w-6 h-6 text-primary" />
          </div>

          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <h3 id={`step-mobile-${step.number}-title`} className="text-lg font-bold text-foreground">
                {step.title}
              </h3>
              {step.estimatedTime && (
                <span className="text-xs text-muted-foreground bg-secondary/10 px-2 py-1 rounded-full">
                  {step.estimatedTime}
                </span>
              )}
            </div>

            <p className="text-muted-foreground text-sm leading-relaxed">{step.description}</p>

            {/* Tips for mobile - always visible but compact */}
            {step.tips && step.tips.length > 0 && (
              <div className="mt-3 pt-3 border-t border-border/50">
                <p className="text-xs font-medium text-primary mb-2">Quick tips:</p>
                <ul className="space-y-1" role="list">
                  {step.tips.map((tip, tipIndex) => (
                    <li key={tipIndex} className="text-xs text-muted-foreground flex items-start gap-1.5">
                      <CheckCircle className="w-3 h-3 text-primary flex-shrink-0 mt-0.5" aria-hidden="true" />
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * ProgressBar - Visual progress indicator
 */
const ProgressBar = ({ currentStep, totalSteps }: ProgressBarProps) => {
  const progress = ((currentStep + 1) / totalSteps) * 100;

  return (
    <div
      className="w-full max-w-md mx-auto mb-12"
      role="progressbar"
      aria-valuenow={currentStep + 1}
      aria-valuemin={1}
      aria-valuemax={totalSteps}
      aria-label="Getting started progress"
    >
      <div className="flex justify-between mb-2 text-sm text-muted-foreground">
        <span>
          Step {currentStep + 1} of {totalSteps}
        </span>
        <span className="font-medium text-primary">{Math.round(progress)}% complete</span>
      </div>
      <div className="h-2 bg-secondary/20 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-primary to-secondary transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
};

/**
 * VideoTutorialButton - Optional video walkthrough
 */
const VideoTutorialButton = ({ onClick }: { onClick: () => void }) => {
  return (
    <Button
      variant="outline"
      size="lg"
      onClick={onClick}
      className="gap-2 rounded-full border-2 hover:border-primary hover:bg-primary/5 transition-all duration-300"
      aria-label="Watch video tutorial"
    >
      <PlayCircle className="w-5 h-5" aria-hidden="true" />
      Watch Video Tutorial
    </Button>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

interface HowItWorksSectionProps {
  /** Show video tutorial button */
  showVideoButton?: boolean;
  /** Callback when video button is clicked */
  onVideoClick?: () => void;
  /** Show progress bar on desktop */
  showProgress?: boolean;
  /** Custom CTA text */
  ctaText?: string;
  /** Custom CTA action */
  onCtaClick?: () => void;
}

const HowItWorksSection = ({
  showVideoButton = false,
  onVideoClick,
  showProgress = true,
  ctaText = "Get Started Today",
  onCtaClick,
}: HowItWorksSectionProps) => {
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState<number | null>(null);

  const handleCtaClick = () => {
    if (onCtaClick) {
      onCtaClick();
    } else {
      navigate("/register");
    }
  };

  const handleVideoClick = () => {
    if (onVideoClick) {
      onVideoClick();
    } else {
      // Default behavior - could open a modal or external link
      // Placeholder for video tutorial functionality
    }
  };

  return (
    <section
      id="how-it-works"
      className="py-24 lg:py-32 bg-gradient-to-br from-primary/5 via-white to-secondary/5 relative overflow-hidden"
      aria-labelledby="how-it-works-heading"
    >
      {/* Background Decoration */}
      <div
        className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(0,212,170,0.08),transparent_50%),radial-gradient(circle_at_70%_80%,rgba(212,100,250,0.08),transparent_50%)]"
        aria-hidden="true"
      />

      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <header className="text-center mb-20">
          <h2
            id="how-it-works-heading"
            className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground mb-6 animate-fade-up"
          >
            Getting Started is Simple
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Join our community's carpooling platform in four easy steps
          </p>
          <div
            className="w-24 h-1 bg-gradient-to-r from-primary to-secondary mx-auto rounded-full mt-6"
            aria-hidden="true"
          />

          {/* Optional Video Button */}
          {showVideoButton && (
            <div className="mt-8">
              <VideoTutorialButton onClick={handleVideoClick} />
            </div>
          )}
        </header>

        {/* Desktop - Vertical Stepper Layout */}
        <div className="hidden lg:block max-w-3xl mx-auto">
          {/* Optional Progress Bar */}
          {showProgress && activeStep !== null && <ProgressBar currentStep={activeStep} totalSteps={steps.length} />}

          <div role="list" aria-label="Getting started steps">
            {steps.map((step, index) => (
              <StepCardDesktop
                key={step.number}
                step={step}
                index={index}
                isLast={index === steps.length - 1}
                isActive={activeStep === index}
                onHover={setActiveStep}
              />
            ))}
          </div>
        </div>

        {/* Mobile/Tablet Layout */}
        <div className="lg:hidden space-y-8" role="list" aria-label="Getting started steps">
          {steps.map((step, index) => (
            <StepCardMobile
              key={step.number}
              step={step}
              index={index}
              isLast={index === steps.length - 1}
            />
          ))}
        </div>

        {/* CTA */}
        <div className="mt-20 text-center animate-fade-up" style={{ animationDelay: "600ms" }}>
          <Button
            onClick={handleCtaClick}
            size="lg"
            className="text-lg px-12 py-6 rounded-full bg-gradient-to-r from-primary to-secondary text-white hover:scale-105 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 shadow-xl"
            aria-label={ctaText}
          >
            {ctaText}
            <ArrowRight className="w-5 h-5 ml-2" aria-hidden="true" />
          </Button>

          {/* Additional context for screen readers */}
          <p className="sr-only">
            Complete these {steps.length} steps to start carpooling with other families in our community
          </p>
        </div>
      </div>
    </section>
  );
};

// ============================================================================
// EXPORTS
// ============================================================================

export default HowItWorksSection;
export { HowItWorksSection };

// Export sub-components for potential reuse
export { NumberBadge, ProgressBar, VideoTutorialButton };
export type { Step, HowItWorksSectionProps };
