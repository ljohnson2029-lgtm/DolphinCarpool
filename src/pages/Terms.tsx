import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { TERMS_TEXT } from "@/constants/terms";
import SEO from "@/components/SEO";

const Terms = () => {
  return (
    <DashboardLayout>
      <SEO
        title="Terms and Conditions — Dolphin Carpool"
        description="Read the Dolphin Carpool Terms and Conditions covering account use, ride coordination, and parent and student responsibilities."
        path="/terms"
      />
      <div className="max-w-3xl mx-auto py-8 md:py-12">
        <div className="text-center mb-8">

          <div className="inline-block mb-4 px-6 py-2 bg-primary/10 rounded-full">
            <span className="text-primary font-semibold text-sm uppercase tracking-wider">Legal</span>
          </div>
          <h1 className="text-4xl font-bold text-foreground mb-2">Terms and Conditions</h1>
          <p className="text-muted-foreground text-sm">Last updated: June 17, 2026</p>
        </div>

        <Card>
          <CardContent className="p-6 sm:p-8">
            <div className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
              {TERMS_TEXT}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Terms;
