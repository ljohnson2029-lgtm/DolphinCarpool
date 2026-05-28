import { DashboardLayout } from "@/components/DashboardLayout";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Mail, MessageSquare } from "lucide-react";

const Feedback = () => {
  return (
    <DashboardLayout>
      <div className="container mx-auto px-4">
        <Breadcrumbs items={[{ label: "Feedback" }]} />
        
        {/* Header Section */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
            <MessageSquare className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-4xl font-bold mb-2">Send Us Feedback</h1>
          <p className="text-xl text-primary font-medium mb-3">
            Help us improve Dolphin Carpool
          </p>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Found a bug? Have a suggestion? We'd love to hear from you! Your feedback helps make carpooling easier for all our community families.
          </p>
        </div>

        {/* Embedded Form Section */}
        <div className="max-w-[800px] mx-auto">
          <div className="bg-card rounded-lg border shadow-sm overflow-hidden">
            <iframe 
              src="https://docs.google.com/forms/d/e/1FAIpQLScTZPv_5wLK0Qs2PbQdstHUoef1xVvLGprubfUDj2X10bgoLQ/viewform?embedded=true" 
              width="100%" 
              height="1400" 
              frameBorder="0" 
              marginHeight={0} 
              marginWidth={0}
              title="Feedback Form"
              className="w-full"
            >
              Loading feedback form...
            </iframe>
          </div>

          {/* Footer Text */}
          <div className="text-center mt-8 pb-8">
            <p className="text-muted-foreground flex items-center justify-center gap-2">
              <Mail className="w-4 h-4" />
              Prefer email? Contact us at:{" "}
              <a 
                href="mailto:chadwickschoolpool@gmail.com" 
                className="text-primary hover:underline font-medium"
              >
                chadwickschoolpool@gmail.com
              </a>
            </p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Feedback;
