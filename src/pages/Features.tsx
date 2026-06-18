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
      <FeaturesSection />
    </DashboardLayout>
  );
};

export default Features;
