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
      <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
        About Dolphin Carpool
      </h1>
      <MissionSection />
    </DashboardLayout>
  );
};

export default About;
