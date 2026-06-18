import SEO from "@/components/SEO";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import Navigation from "@/components/Navigation";
import HeroSection from "@/components/HeroSection";
import LandingHowItWorks from "@/components/LandingHowItWorks";
import LandingFeatures from "@/components/LandingFeatures";
import LandingTrust from "@/components/LandingTrust";
import Footer from "@/components/Footer";
import CreatorFooter from "@/components/CreatorFooter";
import PageTransition from "@/components/PageTransition";

const Index = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) {
      navigate("/dashboard");
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (user) {
    return null;
  }

  return (
    <PageTransition>
      <SEO
        title="Dolphin Carpool — Safe Family Carpools for Your School"
        description="Coordinate safe, reliable school carpools with verified parents in your community. Post rides, find matches, and manage recurring series."
        path="/"
      />
      <div className="min-h-screen">
        <Navigation />

        <HeroSection />
        <LandingHowItWorks />
        <LandingFeatures />
        <LandingTrust />
        <Footer showLegalAndContact={false} />
        <CreatorFooter />
      </div>
    </PageTransition>
  );
};

export default Index;
