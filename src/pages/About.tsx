import { DashboardLayout } from "@/components/DashboardLayout";
import MissionSection from "@/components/MissionSection";
import SEO from "@/components/SEO";
import JsonLd from "@/components/JsonLd";

const ABOUT_SCHEMA = {
  "@context": "https://schema.org",
  "@type": "AboutPage",
  name: "About Dolphin Carpool",
  url: "https://dolphincarpool.org/about",
  description:
    "Dolphin Carpool helps Chadwick School families coordinate safe, reliable carpools within a verified community.",
  about: {
    "@type": "Organization",
    name: "Dolphin Carpool",
    url: "https://dolphincarpool.org",
  },
};

const About = () => {
  return (
    <DashboardLayout>
      <SEO
        title="About Dolphin Carpool — Our Mission"
        description="Learn about Dolphin Carpool's mission to help families coordinate safe, reliable school carpools within their community."
        path="/about"
      />
      <JsonLd data={ABOUT_SCHEMA} />
      <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
        About Dolphin Carpool
      </h1>
      <MissionSection />
    </DashboardLayout>
  );
};

export default About;
