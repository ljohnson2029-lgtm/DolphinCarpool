import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import PageTransition from "@/components/PageTransition";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Link } from "react-router-dom";
import { AlertTriangle, Shield, Scale, FileText, Users, Car } from "lucide-react";

const Terms = () => {
  return (
    <PageTransition>
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="pt-24 pb-16 px-4">
          <div className="max-w-4xl mx-auto">
            {/* Header */}
            <div className="text-center mb-12">
              <div className="inline-block mb-4 px-6 py-2 bg-primary/10 rounded-full">
                <span className="text-primary font-semibold text-sm uppercase tracking-wider">Legal</span>
              </div>
              <h1 className="text-4xl font-bold text-foreground mb-4">Terms of Service</h1>
              <p className="text-muted-foreground">Last updated: January 2026</p>
            </div>

            <div className="space-y-8">
              {/* Introduction */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    Introduction
                  </CardTitle>
                </CardHeader>
                <CardContent className="prose prose-sm dark:prose-invert max-w-none">
                  <p>
                    Welcome to ​Dolphin ("Service," "Platform," "we," "our," or "us"). By creating an account or using 
                    our platform, you agree to be bound by these Terms of Service ("Terms"). Please read them carefully.
                  </p>
                  <p>
                    ​Dolphin is a community platform that connects families for the purpose of arranging carpools to 
                    ​Car Pool. We do not provide transportation services ourselves.
                  </p>
                </CardContent>
              </Card>

              {/* Service Description */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Car className="h-5 w-5 text-primary" />
                    Service Description
                  </CardTitle>
                </CardHeader>
                <CardContent className="prose prose-sm dark:prose-invert max-w-none">
                  <p>SchoolPool provides a platform for:</p>
                  <ul>
                    <li>Connecting Chadwick School families for carpooling purposes</li>
                    <li>Posting and responding to ride requests and offers</li>
                    <li>Communicating with other verified parents/guardians</li>
                    <li>Managing carpool schedules and arrangements</li>
                  </ul>
                  <p className="font-semibold text-destructive">
                    Important: SchoolPool is NOT a transportation company. We do not employ drivers, own vehicles, 
                    or provide transportation services. All carpool arrangements are made directly between families.
                  </p>
                </CardContent>
              </Card>

              {/* Liability Disclaimer */}
              <Card className="border-yellow-500/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-yellow-600">
                    <AlertTriangle className="h-5 w-5" />
                    Liability Disclaimer
                  </CardTitle>
                </CardHeader>
                <CardContent className="prose prose-sm dark:prose-invert max-w-none">
                  <div className="bg-yellow-500/10 p-4 rounded-lg border border-yellow-500/20 mb-4">
                    <p className="font-semibold text-yellow-800 dark:text-yellow-200 mb-2">
                      BY USING SCHOOLPOOL, YOU ACKNOWLEDGE AND AGREE:
                    </p>
                  </div>
                  <ul>
                    <li>
                      <strong>No Insurance Coverage:</strong> SchoolPool does NOT provide any insurance coverage for 
                      carpool activities. You are solely responsible for ensuring your personal auto insurance covers 
                      carpooling with non-family members.
                    </li>
                    <li>
                      <strong>Assumption of Risk:</strong> By using Dolphin Carpool, you acknowledge that carpooling involves inherent risks and you assume all responsibility for your participation in carpool arrangements.
                    </li>
                    <li>
                      <strong>Release of Liability:</strong> You release SchoolPool, its officers, directors, employees, 
                      and affiliates from any and all claims, damages, losses, or injuries arising from carpool activities 
                      arranged through our platform.
                    </li>
                    <li>
                      <strong>No Warranty:</strong> SchoolPool makes no representations or warranties about the safety, 
                      reliability, or suitability of any driver or parent using our platform.
                    </li>
                    <li>
                      <strong>Parental Responsibility:</strong> Parents and guardians are solely responsible for the 
                      safety and supervision of their children during all carpool activities.
                    </li>
                  </ul>
                </CardContent>
              </Card>

              {/* User Responsibilities */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" />
                    User Responsibilities
                  </CardTitle>
                </CardHeader>
                <CardContent className="prose prose-sm dark:prose-invert max-w-none">
                  <p>As a user of SchoolPool, you agree to:</p>
                  <ul>
                    <li>Provide accurate and truthful information during registration</li>
                    <li>Maintain a valid driver's license, vehicle registration, and auto insurance (for drivers)</li>
                    <li>Comply with all applicable traffic laws and regulations</li>
                    <li>Ensure your vehicle is in safe operating condition</li>
                    <li>Use appropriate child safety seats and seatbelts for all passengers</li>
                    <li>
                      Follow the{" "}
                      <Link to="/safety" className="text-primary hover:underline">
                        Safety Guidelines
                      </Link>
                    </li>
                    <li>Not engage in any illegal, harmful, or inappropriate behavior</li>
                    <li>Report any safety concerns to SchoolPool immediately</li>
                  </ul>
                </CardContent>
              </Card>

              {/* Insurance Requirements */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-primary" />
                    Insurance Requirements
                  </CardTitle>
                </CardHeader>
                <CardContent className="prose prose-sm dark:prose-invert max-w-none">
                  <p>
                    <strong>You are required to:</strong>
                  </p>
                  <ul>
                    <li>Maintain active auto insurance that covers carpooling activities</li>
                    <li>Verify that your insurance policy does not exclude regular carpooling arrangements</li>
                    <li>Consider additional umbrella liability coverage for added protection</li>
                    <li>Contact your insurance agent if you have any questions about coverage</li>
                  </ul>
                  <p>
                    Some insurance policies may have exclusions for commercial ridesharing or regular carpooling. 
                    It is YOUR responsibility to confirm coverage before participating in carpools.
                  </p>
                </CardContent>
              </Card>

              {/* Indemnification */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Scale className="h-5 w-5 text-primary" />
                    Indemnification
                  </CardTitle>
                </CardHeader>
                <CardContent className="prose prose-sm dark:prose-invert max-w-none">
                  <p>
                    You agree to indemnify, defend, and hold harmless SchoolPool and its officers, directors, 
                    employees, agents, and affiliates from and against any and all claims, damages, obligations, 
                    losses, liabilities, costs, or debt arising from:
                  </p>
                  <ul>
                    <li>Your use of and access to the Service</li>
                    <li>Your violation of these Terms</li>
                    <li>Your violation of any third-party rights</li>
                    <li>Any carpool arrangements or activities facilitated through the platform</li>
                    <li>Any damage caused during carpool activities</li>
                  </ul>
                </CardContent>
              </Card>

              {/* Account Termination */}
              <Card>
                <CardHeader>
                  <CardTitle>Account Termination</CardTitle>
                </CardHeader>
                <CardContent className="prose prose-sm dark:prose-invert max-w-none">
                  <p>
                    SchoolPool reserves the right to suspend or terminate your account at any time, with or 
                    without cause, including but not limited to:
                  </p>
                  <ul>
                    <li>Violation of these Terms of Service</li>
                    <li>Unsafe or inappropriate behavior</li>
                    <li>Complaints from other users</li>
                    <li>Fraudulent or suspicious activity</li>
                  </ul>
                </CardContent>
              </Card>

              {/* Modifications */}
              <Card>
                <CardHeader>
                  <CardTitle>Modifications to Terms</CardTitle>
                </CardHeader>
                <CardContent className="prose prose-sm dark:prose-invert max-w-none">
                  <p>
                    We reserve the right to modify these Terms at any time. We will notify users of any material 
                    changes by posting the updated Terms on the platform. Your continued use of SchoolPool after 
                    such modifications constitutes your acceptance of the revised Terms.
                  </p>
                </CardContent>
              </Card>

              {/* Contact */}
              <Card>
                <CardHeader>
                  <CardTitle>Contact Us</CardTitle>
                </CardHeader>
                <CardContent className="prose prose-sm dark:prose-invert max-w-none">
                  <p>
                    If you have any questions about these Terms of Service, please contact us at{" "}
                    <a href="mailto:chadwickschoolpool@gmail.com" className="text-primary hover:underline">
                      chadwickschoolpool@gmail.com
                    </a>
                  </p>
                </CardContent>
              </Card>

              <Separator className="my-8" />

              {/* Final Acknowledgment */}
              <div className="bg-muted/50 rounded-lg p-6 border text-center">
                <p className="text-sm text-muted-foreground">
                  By using SchoolPool, you acknowledge that you have read, understood, and agree to be bound 
                  by these Terms of Service and our{" "}
                  <Link to="/privacy" className="text-primary hover:underline">
                    Privacy Policy
                  </Link>
                  .
                </p>
              </div>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    </PageTransition>
  );
};

export default Terms;
