import { Shield, Lock } from "lucide-react";

const LandingTrust = () => {
  return (
    <section className="py-16 lg:py-20 bg-primary">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <Shield className="w-10 h-10 text-secondary mx-auto mb-6" />
        <h2 className="text-2xl sm:text-3xl font-bold text-primary-foreground mb-4">
          Built Exclusively for Families in our Community
        </h2>
        <p className="text-primary-foreground/80 text-lg leading-relaxed mb-6">
          Only verified parents and students from our community can join. Your data stays private and is never shared outside.
        </p>
        <div className="flex items-center justify-center gap-2 text-primary-foreground/90">
          <Lock className="w-4 h-4" />
          <span className="text-sm font-medium">End-to-end privacy · No ads · No data selling</span>
        </div>
      </div>
    </section>
  );
};

export default LandingTrust;
