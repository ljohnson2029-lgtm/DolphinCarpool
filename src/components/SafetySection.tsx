import { Shield, Lock, UserCheck, AlertTriangle, Car, Phone, Heart, FileCheck, CheckCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

const SafetySection = () => {
  return (
    <section id="safety" className="py-24 lg:py-32 bg-gradient-to-br from-secondary/5 via-background to-primary/5 relative overflow-hidden">
      {/* Background Decoration */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_80%,rgba(0,212,170,0.1),transparent_50%),radial-gradient(circle_at_80%_20%,rgba(0,150,255,0.1),transparent_50%)]" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <div className="inline-block mb-6 px-6 py-2 bg-primary/10 rounded-full">
            <span className="text-primary font-semibold text-sm uppercase tracking-wider">Safety First</span>
          </div>
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground mb-6 animate-fade-up">
            Your Family's Safety Comes First
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Comprehensive safety guidelines and protocols to protect your children during carpools
          </p>
          <div className="w-24 h-1 bg-gradient-to-r from-secondary to-primary mx-auto rounded-full mt-6" />
        </div>

        {/* Before Every Ride Section */}
        <div className="mb-12">
          <Card className="border-l-4 border-primary">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-2xl">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Car className="h-6 w-6 text-primary" />
                </div>
                Before Every Ride
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4">
                {[
                  "Ensure all passengers wear seatbelts at all times",
                  "Confirm pickup/dropoff times with all parents involved",
                  "Verify you have current contact information for all passengers' parents",
                  "Ensure your vehicle is in safe operating condition"
                ].map((item, index) => (
                  <div key={index} className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                    <CheckCircle className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                    <span className="text-sm">{item}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Insurance Reminder Section */}
        <div className="mb-12">
          <Card className="border-l-4 border-yellow-500">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-2xl">
                <div className="p-2 bg-yellow-500/10 rounded-lg">
                  <FileCheck className="h-6 w-6 text-yellow-600" />
                </div>
                Insurance Reminder
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 mb-6">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-yellow-800 dark:text-yellow-200">
                    <strong>Important:</strong> Dolphin CarPool does not provide insurance coverage. 
                    You are responsible for ensuring your personal auto insurance covers carpooling activities.
                  </p>
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                {[
                  "Check that your auto insurance covers carpooling with non-family members",
                  "Some policies may exclude commercial or regular ridesharing activities",
                  "Consider umbrella liability coverage for additional protection",
                  "Contact your insurance agent if you're unsure about your coverage"
                ].map((item, index) => (
                  <div key={index} className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                    <Shield className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                    <span className="text-sm">{item}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Emergency Protocol Section */}
        <div className="mb-12">
          <Card className="border-l-4 border-red-500">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-2xl">
                <div className="p-2 bg-red-500/10 rounded-lg">
                  <Phone className="h-6 w-6 text-red-600" />
                </div>
                Emergency Protocol
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4">
                {[
                  "Keep emergency contact information for all passengers readily accessible",
                  "Immediately notify all parents of any issues, delays, or incidents",
                  "In case of emergency, call 911 first, then notify parents"
                ].map((item, index) => (
                  <div key={index} className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                    <Heart className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <span className="text-sm">{item}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Driver Requirements Section */}
        <div className="mb-12">
          <Card className="border-l-4 border-secondary">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-2xl">
                <div className="p-2 bg-secondary/10 rounded-lg">
                  <UserCheck className="h-6 w-6 text-secondary" />
                </div>
                Driver Requirements
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-6">
                Before participating as a driver, please ensure you meet the following requirements:
              </p>
              <div className="grid md:grid-cols-2 gap-4">
                {[
                  { text: "Valid driver's license (minimum 1 year with licence)", required: true },
                  { text: "Current vehicle registration", required: true },
                  { text: "Active auto insurance policy", required: true },
                  { text: "Vehicle in safe operating condition", required: true },
                  { text: "Appropriate car seats/boosters for passenger ages", required: true }
                ].map((item, index) => (
                  <div key={index} className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                    <div className={`h-5 w-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                      item.required ? 'bg-primary text-primary-foreground' : 'bg-muted-foreground/20 text-muted-foreground'
                    }`}>
                      <CheckCircle className="h-3 w-3" />
                    </div>
                    <div>
                      <span className="text-sm">{item.text}</span>
                      {!item.required && (
                        <span className="text-xs text-muted-foreground ml-2">(Optional)</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Platform Security Section */}
        <div className="mb-12">
          <Card className="border-l-4 border-primary">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-2xl">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Lock className="h-6 w-6 text-primary" />
                </div>
                Platform Security
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4">
                {[
                  { icon: UserCheck, title: "CPA Verification Codes", desc: "All accounts protected with verification links only distributed through the CPA" },
                  { icon: Shield, title: "Admin Verification", desc: "Every account reviewed before activation" },
                  { icon: Lock, title: "Encrypted Communications", desc: "All messages are encrypted end-to-end" },
                  { icon: Shield, title: "Active Monitoring", desc: "Platform activity monitored for safety" }
                ].map((item, index) => (
                  <div key={index} className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg">
                    <item.icon className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-sm">{item.title}</p>
                      <p className="text-xs text-muted-foreground">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <Separator className="my-12" />

        {/* Legal Disclaimer */}
        <div className="bg-muted/50 rounded-2xl p-8 border">
          <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-600" />
            Important Legal Notice
          </h3>
          <div className="space-y-4 text-sm text-muted-foreground">
            <p>
              <strong>Liability Waiver:</strong> Dolphin CarPool is a platform that connects families for carpooling purposes only. 
              Dolphin CarPool does not provide transportation services, vehicle inspections, driver screenings, or insurance coverage.
            </p>
            <p>
              <strong>Insurance Responsibility:</strong> All participants are responsible for maintaining adequate auto insurance 
              that covers carpooling activities with non-family members. Some insurance policies may have exclusions for 
              regular carpooling arrangements.
            </p>
            <p>
              <strong>Assumption of Risk:</strong> By using Dolphin Carpool, you acknowledge that carpooling involves inherent risks 
              and you assume all responsibility for your participation in carpool arrangements.
            </p>
            <p>
              <strong>Parental Responsibility:</strong> Parents and guardians are solely responsible for the safety and 
              supervision of their children during carpool activities.
            </p>
          </div>
        </div>

        {/* Security Badge */}
        <div className="mt-12 text-center animate-fade-up">
          <div className="inline-flex items-center gap-3 bg-gradient-to-r from-primary/10 to-secondary/10 backdrop-blur-xl border border-border rounded-full px-8 py-4 shadow-lg">
            <Shield className="w-6 h-6 text-primary" />
            <span className="text-foreground font-semibold text-lg">
              Committed to Family Safety
            </span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default SafetySection;
