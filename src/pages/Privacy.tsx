import { Shield, Lock, Eye, Users, Database, Mail, Trash2, Download } from "lucide-react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import SEO from "@/components/SEO";

const Privacy = () => {
  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Privacy Policy — Dolphin Carpool"
        description="How Dolphin Carpool collects, uses, and protects personal information for parents and students coordinating school carpools."
        path="/privacy"
      />
      <Navigation />
      

      
      <main className="pt-24 pb-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-6">
              <Shield className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold mb-4">Privacy Policy</h1>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Your privacy is our priority. This policy explains how we collect, use, and protect your personal information.
            </p>
            <p className="text-sm text-muted-foreground mt-4">
              Last updated: January 2025
            </p>
          </div>

          <div className="space-y-8">
            {/* What We Collect */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <Database className="w-5 h-5 text-primary" />
                  What Data We Collect
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">
                  We collect only the information necessary to provide our carpooling service:
                </p>
                <ul className="space-y-3">
                  <li className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-primary mt-2 shrink-0" />
                    <div>
                      <strong>Account Information:</strong> Email address, name, and username for account creation and communication.
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-primary mt-2 shrink-0" />
                    <div>
                      <strong>Location Data:</strong> Home address for matching with nearby carpool partners.
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-primary mt-2 shrink-0" />
                    <div>
                      <strong>Contact Information:</strong> Phone number (optional) for carpool coordination between matched families.
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-primary mt-2 shrink-0" />
                    <div>
                      <strong>Vehicle Information:</strong> Car make, model, and seat capacity for ride offers.
                    </div>
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* How We Use It */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <Eye className="w-5 h-5 text-primary" />
                  How We Use Your Data
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">
                  Your data is used exclusively for the following purposes:
                </p>
                <ul className="space-y-3">
                  <li className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-primary mt-2 shrink-0" />
                    <div>
                      <strong>Carpool Matching:</strong> Finding compatible carpool partners based on location and routes.
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-primary mt-2 shrink-0" />
                    <div>
                      <strong>Notifications:</strong> Sending alerts about ride requests, confirmations, and schedule changes.
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-primary mt-2 shrink-0" />
                    <div>
                      <strong>Communication:</strong> Facilitating contact between matched carpool partners.
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-primary mt-2 shrink-0" />
                    <div>
                      <strong>Service Improvement:</strong> Analyzing usage patterns to improve our platform (anonymized data only).
                    </div>
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* Who Can See */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <Users className="w-5 h-5 text-primary" />
                  Who Can See Your Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                  <p className="text-green-700 dark:text-green-400 font-medium mb-2">
                    ✓ Verified ​carpool Families Only
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Only parents with verified ​carpool email addresses can access the platform and view other users.
                  </p>
                </div>
                
              </CardContent>
            </Card>

            {/* Security Measures */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <Lock className="w-5 h-5 text-primary" />
                  Data Security Measures
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-3">
                  <li className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-primary mt-2 shrink-0" />
                    <div>
                      <strong>Encryption:</strong> All data is encrypted in transit (TLS/SSL) and at rest.
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-primary mt-2 shrink-0" />
                    <div>
                      <strong>Email Verification:</strong> All accounts protected with verification links only distributed through the CPA.
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-primary mt-2 shrink-0" />
                    <div>
                      <strong>Access Control:</strong> Row-level security ensures users can only access their own data.
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-primary mt-2 shrink-0" />
                    <div>
                      <strong>Secure Infrastructure:</strong> Hosted on enterprise-grade cloud infrastructure with regular security audits.
                    </div>
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* User Rights */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <Shield className="w-5 h-5 text-primary" />
                  Your Rights
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">
                  You have full control over your data:
                </p>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Eye className="w-4 h-4 text-primary" />
                      <strong>Access</strong>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      View all data we have about you in your profile settings.
                    </p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Download className="w-4 h-4 text-primary" />
                      <strong>Export</strong>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Request a copy of your data at any time.
                    </p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Lock className="w-4 h-4 text-primary" />
                      <strong>Control</strong>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Manage visibility settings and who can contact you.
                    </p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Trash2 className="w-4 h-4 text-destructive" />
                      <strong>Delete</strong>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Permanently delete your account and all associated data.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Contact */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <Mail className="w-5 h-5 text-primary" />
                  Contact Us
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  If you have any questions about this privacy policy or our data practices, please contact us:
                </p>
                <a 
                  href="mailto:dolphincarpool@gmail.com"
                  className="inline-flex items-center gap-2 text-primary hover:underline"
                >
                  <Mail className="w-4 h-4" />
                  dolphincarpool@gmail.com
                </a>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default Privacy;
