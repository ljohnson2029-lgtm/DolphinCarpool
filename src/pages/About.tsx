import { DashboardLayout } from "@/components/DashboardLayout";
import MissionSection from "@/components/MissionSection";
import SEO from "@/components/SEO";

const About = () => {
  return (
    <DashboardLayout>
      <SEO
        title="About Dolphin Carpool — Our Mission"
        description="Learn about Dolphin Carpool's mission to help families coordinate safe, reliable school carpools within their community."
        path="/about"
      />
      <MissionSection />
    </DashboardLayout>
  );
};

export default About;
