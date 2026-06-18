import { DashboardLayout } from "@/components/DashboardLayout";
import SafetySection from "@/components/SafetySection";
import SEO from "@/components/SEO";
import JsonLd from "@/components/JsonLd";

const SAFETY_FAQ = [
  {
    q: "Who can join Dolphin Carpool?",
    a: "Only verified Chadwick School families. Parents register through a community invite and students are linked by their parents, so every account belongs to a known community member.",
  },
  {
    q: "How is my contact information protected?",
    a: "Phone numbers and emails are private by default. Contact details are only shared after a carpool is confirmed by both parents.",
  },
  {
    q: "What happens if a driver needs to cancel a ride?",
    a: "Drivers may cancel up to 9 hours before pickup. Cancellations remove the ride from everyone's schedule and notify the other parent so plans can be adjusted in time.",
  },
  {
    q: "Does Dolphin Carpool track ride locations?",
    a: "No. The map is only used to discover nearby carpool offers — Dolphin Carpool does not track live ride locations or routes.",
  },
];

const SAFETY_SCHEMA = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: SAFETY_FAQ.map(({ q, a }) => ({
    "@type": "Question",
    name: q,
    acceptedAnswer: { "@type": "Answer", text: a },
  })),
};

const Safety = () => {
  return (
    <DashboardLayout>
      <SEO
        title="Safety — Dolphin Carpool"
        description="How Dolphin Carpool keeps families safe: verified school community, private contact sharing, and clear cancellation policies."
        path="/safety"
      />
      <JsonLd data={SAFETY_SCHEMA} />
      <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
        Safety
      </h1>
      <SafetySection />
    </DashboardLayout>
  );
};

export default Safety;
