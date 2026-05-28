import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Heart, CheckCircle, Clock, Leaf, Shield } from "lucide-react";

const MissionSection = () => {
  const parentBenefits = [
    { icon: Clock, text: "Reduce daily driving time and stress" },
    { icon: Users, text: "Connect with other families in your dolphin community" },
    { icon: Leaf, text: "Save money on gas and vehicle wear" },
    { icon: Leaf, text: "Contribute to a greener environment" },
    { icon: Heart, text: "Build lasting friendships for your children" },
    { icon: Shield, text: "Gain backup transportation options" },
  ];

  return (
    <section id="mission" className="py-24 lg:py-32 bg-gradient-to-br from-white via-primary/5 to-white relative overflow-hidden">
      {/* Background Decoration */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(0,150,255,0.08),transparent_60%)]" />
      
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-20">
          <div className="inline-block mb-6 px-6 py-2 bg-secondary/10 rounded-full">
            <span className="text-secondary font-semibold text-sm uppercase tracking-wider">Our Story</span>
          </div>
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground mb-6 animate-fade-up">Our Mission</h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Building a stronger, more connected community through collaborative transportation
          </p>
          <div className="w-24 h-1 bg-gradient-to-r from-secondary via-primary to-accent mx-auto rounded-full mt-6" />
        </div>

        <div className="grid lg:grid-cols-2 gap-8 mb-16">
          {/* Left Column - Two Cards */}
          <div className="space-y-8">
            {/* For Students */}
            <Card className="hover:shadow-2xl hover:-translate-y-1 border-2 border-border hover:border-primary/50 transition-all duration-300 animate-fade-up bg-gradient-to-br from-white to-primary/5">
              <CardHeader>
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-lg">
                    <Users className="w-8 h-8 text-white" />
                  </div>
                  <CardTitle className="text-2xl">Created by Students, For Students</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-relaxed text-lg">
                  We understand the challenges of CUP requirements firsthand. Dolphin CarPool was designed to make getting rides easier, more sustainable, and more enjoyable by connecting students and families who share the same journey.
                </p>
              </CardContent>
            </Card>

            {/* For Parents */}
            <Card className="hover:shadow-2xl hover:-translate-y-1 border-2 border-border hover:border-secondary/50 transition-all duration-300 animate-fade-up bg-gradient-to-br from-white to-secondary/5" style={{ animationDelay: "150ms" }}>
              <CardHeader>
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-secondary to-primary flex items-center justify-center shadow-lg">
                    <Heart className="w-8 h-8 text-white" />
                  </div>
                  <CardTitle className="text-2xl">For Parents</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-relaxed text-lg">
                  Give back to your community while freeing up valuable personal time. Dolphin CarPool helps you coordinate with other families, reduce your driving responsibilities, and contribute to a more sustainable future for our children.
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Large Card */}
          <Card className="hover:shadow-2xl hover:-translate-y-1 border-2 border-border hover:border-accent/50 transition-all duration-300 animate-fade-up bg-gradient-to-br from-white to-accent/5 lg:row-span-2" style={{ animationDelay: "300ms" }}>
            <CardHeader>
              <div className="flex items-center gap-4 mb-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-accent to-primary flex items-center justify-center shadow-lg">
                  <CheckCircle className="w-8 h-8 text-white" />
                </div>
                <CardTitle className="text-2xl">Why Parents Love Dolphin CarPool</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-4">
                {parentBenefits.map((benefit, index) => (
                  <li key={index} className="flex items-start gap-4 p-4 rounded-xl bg-white/50 hover:bg-white/80 transition-colors">
                    <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-accent/20 to-primary/20 rounded-lg flex items-center justify-center">
                      <benefit.icon className="w-5 h-5 text-primary" />
                    </div>
                    <span className="text-muted-foreground text-lg pt-1">{benefit.text}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* Stats Section */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mt-16">
          <div className="text-center">
            <div className="text-4xl font-bold text-primary mb-2">100%</div>
            <div className="text-muted-foreground">School Verified</div>
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold text-secondary mb-2">Safe</div>
            <div className="text-muted-foreground">Trusted Community</div>
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold text-accent mb-2">Easy</div>
            <div className="text-muted-foreground">Simple Setup</div>
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold text-primary mb-2">Free</div>
            <div className="text-muted-foreground">No Hidden Costs</div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default MissionSection;
