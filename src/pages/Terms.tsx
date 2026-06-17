import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import PageTransition from "@/components/PageTransition";
import { Card, CardContent } from "@/components/ui/card";
import { TERMS_TEXT } from "@/constants/terms";

const Terms = () => {
  return (
    <PageTransition>
      <div className="min-h-screen bg-background flex flex-col">
        <Navigation />
        <div className="flex-1 pt-24 pb-16 px-4">
          <div className="max-w-3xl mx-auto">
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
        </div>
        <Footer />
      </div>
    </PageTransition>
  );
};

export default Terms;
