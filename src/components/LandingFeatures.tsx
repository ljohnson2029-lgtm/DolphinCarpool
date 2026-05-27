import { MapPin, MessageSquare, Users, Heart } from "lucide-react";

const features = [
  {
    icon: MapPin,
    title: "Interactive Map",
    description: "See nearby families on a real-time map and find the best carpool matches along your route.",
  },
  {
    icon: MessageSquare,
    title: "Built-in Messaging",
    description: "Coordinate rides securely with direct messaging between verified families.",
  },
  {
    icon: Users,
    title: "Family Profiles",
    description: "Create detailed profiles linking parents and students for safe, transparent carpooling.",
  },
  {
    icon: Heart,
    title: "100% Free",
    description: "​Dolphin is completely free for all ​Car Pool families. No fees, no subscriptions.",
  },
];

const LandingFeatures = () => {
  return (
    <section id="features" className="py-20 lg:py-28 bg-background">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            Everything You Need
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Powerful features designed for school families
          </p>
        </div>

        {/* Feature Cards */}
        <div className="grid sm:grid-cols-2 gap-6">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div
                key={index}
                className="bg-card rounded-2xl p-8 border border-border hover:border-secondary/50 hover:shadow-lg transition-all duration-300"
              >
                <div className="w-12 h-12 mb-5 bg-secondary/10 rounded-xl flex items-center justify-center">
                  <Icon className="w-6 h-6 text-secondary" />
                </div>
                <h3 className="text-lg font-bold text-foreground mb-2">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default LandingFeatures;
