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
      <SafetySection />
    </DashboardLayout>
  );
};

export default Safety;
