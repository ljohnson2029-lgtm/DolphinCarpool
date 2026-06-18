import { DashboardLayout } from "@/components/DashboardLayout";
import FeaturesSection from "@/components/FeaturesSection";
import SEO from "@/components/SEO";

const Features = () => {
  return (
    <DashboardLayout>
      <SEO
        title="Features — Dolphin Carpool"
        description="Discover Dolphin Carpool features: post rides, find matches, manage recurring series, and chat with confirmed carpool partners."
        path="/features"
      />
      <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
        Dolphin Carpool Features
      </h1>
      <FeaturesSection />
    </DashboardLayout>
  );
};

export default Features;
