import { Lock, Users, MessageSquare, Calendar, Shield, Smartphone, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import React from "react";

type Feature = {
  icon: React.ElementType;
  title: string;
  description: string;
  className?: string;
  iconClass?: string;
  featured?: boolean;
};

const features: Feature[] = [
  {
    icon: Users,
    title: "Smart Matching",
    description:
      "Find families along your route with our intelligent matching algorithm that considers location and schedule.",
    className: "md:col-span-2 md:row-span-2",
    iconClass: "bg-primary text-primary-foreground",
    featured: true,
  },
  {
    icon: Shield,
    title: "Safety First",
    description: "Verified members-only platform with admin approval and secure data handling.",
    className: "md:row-span-2",
    iconClass: "bg-accent text-accent-foreground",
  },
  {
    icon: Lock,
    title: "CPA Verification Codes",
    description: "All accounts protected with verification links only distributed through the CPA",
    iconClass: "bg-slate-900 text-white",
  },
  {
    icon: MessageSquare,
    title: "Secure Messaging",
    description: "Encrypted communication built for privacy and trusted coordination.",
    iconClass: "bg-secondary text-secondary-foreground",
  },
  {
    icon: Calendar,
    title: "Easy Scheduling",
    description: "Coordinate pickups and drop-offs effortlessly with intuitive scheduling tools.",
    iconClass: "bg-orange-500 text-white",
  },
  {
    icon: Smartphone,
    title: "Mobile Friendly",
    description: "Access Dolphin CarPool anytime, anywhere on any device with a responsive design.",
    iconClass: "bg-emerald-500 text-white",
  },
];

const FeaturesSection = () => {
  return (
    <section id="features" className="relative py-24 lg:py-32 bg-background overflow-hidden">
      {/* Background Glow Effects */}
      <div className="pointer-events-none absolute -top-24 left-1/4 h-96 w-96 rounded-full bg-primary/5 blur-[120px]" />
      <div className="pointer-events-none absolute -bottom-24 right-1/4 h-96 w-96 rounded-full bg-accent/5 blur-[120px]" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 mb-16">
          <div className="max-w-2xl">
            <Badge className="mb-4 border-primary/20 text-primary bg-primary/5">Features</Badge>
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground">
              Carpooling, <span className="text-primary">reimagined</span> for families.
            </h2>
          </div>

          <p className="text-lg text-muted-foreground max-w-md">
            Powerful tools designed to make school commutes safer, simpler, and significantly more efficient.
          </p>
        </div>

        {/* Responsive Bento Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 auto-rows-[200px] gap-5">
          {features.map((feature, index) => {
            const Icon = feature.icon;

            return (
              <div
                key={feature.title}
                className={cn(
                  "group relative overflow-hidden rounded-3xl border bg-card p-8",
                  "transition-all duration-300 ease-out",
                  "hover:-translate-y-1 hover:shadow-2xl hover:border-primary/40",
                  "animate-fade-up",
                  feature.className,
                )}
                style={{ animationDelay: `${index * 80}ms` }}
              >
                {/* Hover Gradient Glow */}
                <div className="absolute -inset-px opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br from-primary/20 via-transparent to-transparent" />

                {/* Card Content */}
                <div className="relative flex h-full flex-col justify-between">
                  <div>
                    {/* Icon */}
                    <div
                      className={cn(
                        "mb-5 inline-flex h-12 w-12 items-center justify-center rounded-2xl shadow-sm",
                        "transition-all duration-500 group-hover:scale-110 group-hover:rotate-3",
                        feature.iconClass,
                      )}
                    >
                      <Icon className="h-6 w-6" aria-hidden="true" />
                    </div>

                    {/* Title */}
                    <h3
                      className={cn(
                        "text-xl font-bold text-foreground mb-2 transition-colors",
                        "group-hover:text-primary",
                      )}
                    >
                      {feature.title}
                    </h3>

                    {/* Description */}
                    <p className="text-sm leading-relaxed text-muted-foreground max-w-[260px]">{feature.description}</p>
                  </div>

                  {/* Footer CTA */}
                  <div className="mt-6 flex items-center text-xs font-semibold text-primary opacity-0 translate-y-2 transition-all duration-300 group-hover:opacity-100 group-hover:translate-y-0">
                    Explore carpooling features
                    <ArrowRight className="ml-1 h-3 w-3" />
                  </div>
                </div>

                {/* Subtle Featured Ring */}
                {feature.featured && (
                  <div className="pointer-events-none absolute inset-0 rounded-3xl ring-1 ring-primary/20" />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

/* Reusable Badge Component (typed + cleaner) */
type BadgeProps = React.HTMLAttributes<HTMLDivElement> & {
  children: React.ReactNode;
};

const Badge = ({ children, className, ...props }: BadgeProps) => (
  <div
    className={cn(
      "inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold",
      "transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
      className,
    )}
    {...props}
  >
    {children}
  </div>
);

export default FeaturesSection;
