import { DashboardLayout } from "@/components/DashboardLayout";
import SafetySection from "@/components/SafetySection";
import SEO from "@/components/SEO";

const Safety = () => {
  return (
    <DashboardLayout>
      <SEO
        title="Safety — Dolphin Carpool"
        description="How Dolphin Carpool keeps families safe: verified school community, private contact sharing, and clear cancellation policies."
        path="/safety"
      />
      <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
        Safety
      </h1>
      <SafetySection />
    </DashboardLayout>
  );
};

export default Safety;
