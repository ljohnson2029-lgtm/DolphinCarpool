import { useState } from "react";
import { Link } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useToast } from "@/hooks/use-toast";
import { 
  BookOpen, 
  Map, 
  Users, 
  Shield, 
  HelpCircle, 
  Mail, 
  Search,
  UserPlus,
  Link2,
  Car,
  Settings,
  Trash2
} from "lucide-react";

const helpSections = [
  {
    id: "getting-started",
    title: "Getting Started",
    icon: BookOpen,
    items: [
      {
        question: "How do I create an account?",
        answer: "Only families in our Dolphin Community can create an account. To create an account as a parent use the verification link and code sent through the PTA WhatsApp Group Chat. To obtain an account as a student, have your parent add your email to their family profile after creating their account."
      },
      {
        question: "What's the difference between Student and Parent accounts?",
        answer: "Student accounts are designed for Dolphin Carpool students to link with their parents and view family carpools. Parent accounts have full access to create carpools, find other parents on the map, and manage ride requests."
      },
      {
        question: "How do I give my child access to view their rides?",
        answer: "Go to your Profile and find the Children section. For each child you have added, there is an 'Attach Child's Email' field. Enter your child's email address and save it. Once saved, your child simply needs to go to the Dolphin Carpool signup page, click 'Sign Up as a Student' and sign up using that same email address. They will automatically be linked to your account and can view all rides you schedule for them."
      }
    ]
  },
  {
    id: "using-the-map",
    title: "Using the Map",
    icon: Map,
    items: [
      {
        question: "How do I find parents near my route?",
        answer: "Click on the map view in family carpools. Parents who are offering ride offers or requests will appear on the map. You can select a mile radius to see their distance to you."
      },
      {
        question: "How do I send a ride request to another parent?",
        answer: "Click on a parent's marker on the map to view their profile. From there, you can send them a private ride request or offer. Include details about the date, time, and any special needs."
      }
    ]
  },
  {
    id: "managing-carpools",
    title: "Managing Carpools",
    icon: Car,
    items: [
      {
        question: "How do I create a carpool?",
        answer: "Go to 'Post Ride' from your dashboard. Fill in the pickup location, drop-off location, date, time, and number of available seats. You can post a ride offer (you're driving) or a ride request (you need a ride)."
      },
      {
        question: "How do I respond to ride requests?",
        answer: "Check your Notifications page for incoming requests. You can accept or decline each request. Accepted requests will be added to your 'My Rides' page."
      },
      {
        question: "How do I cancel a ride?",
        answer: "Go to 'My Rides' and find the ride you want to cancel. Click the cancel button and confirm. The other party will be notified of the cancellation."
      }
    ]
  },
  {
    id: "account-privacy",
    title: "Account & Privacy",
    icon: Shield,
    items: [
      {
        question: "How do I update my information?",
        answer: "Go to 'Profile' to update your name, phone number, address, and vehicle information. Go to 'Settings' to manage your privacy preferences and notification settings."
      },
      {
        question: "How do I delete my account?",
        answer: "Go to Settings and scroll to the bottom. Click 'Delete My Account' and confirm. This will permanently delete all your data, including ride history and family links."
      }
    ]
  }
];

const faqs = [
  {
    question: "Why can't I create carpools?",
    answer: "Only parent accounts can create and manage carpools. Student accounts can view their linked parent's carpools but cannot create their own. This is for safety and to ensure all carpools are managed by verified adults."
  },
  {
    question: "How do I report a problem?",
    answer: "You can use the contact form below or email us directly at dolphincarpool@gmail.com. Please include as much detail as possible about the issue you're experiencing."
  },
];

export default function Help() {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSent, setIsSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast({
        title: "Invalid email",
        description: "Please enter a valid email address.",
        variant: "destructive",
      });
      setIsSubmitting(false);
      return;
    }

    try {
      const { error } = await supabase.functions.invoke("send-email", {
        body: { subject, message, senderName: name, senderEmail: email },
      });

      if (error) throw new Error(error.message || "Failed to send");

      setIsSent(true);
      setName("");
      setEmail("");
      setSubject("");
      setMessage("");
    } catch (error) {
      toast({
        title: "Failed to send",
        description: (error as Error).message || "Please try again later or email us directly.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredSections = helpSections.map(section => ({
    ...section,
    items: section.items.filter(
      item =>
        item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.answer.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })).filter(section => section.items.length > 0);

  const filteredFaqs = faqs.filter(
    faq =>
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="container max-w-4xl mx-auto px-4 pb-24">
        <Breadcrumbs items={[{ label: "Help Center" }]} />

        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Help Center</h1>
          <p className="text-muted-foreground">
            Find answers to common questions and get support
          </p>
        </div>

        {/* Search */}
        <div className="relative mb-8">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search for help..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Help Sections */}
        <div className="space-y-6 mb-12">
          {filteredSections.map((section) => (
            <Card key={section.id}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <section.icon className="h-5 w-5 text-primary" />
                  {section.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Accordion type="single" collapsible className="w-full">
                  {section.items.map((item, index) => (
                    <AccordionItem key={index} value={`${section.id}-${index}`}>
                      <AccordionTrigger className="text-left">
                        {item.question}
                      </AccordionTrigger>
                      <AccordionContent className="text-muted-foreground">
                        {item.answer}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* FAQs */}
        {filteredFaqs.length > 0 && (
          <Card className="mb-12">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <HelpCircle className="h-5 w-5 text-primary" />
                Frequently Asked Questions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                {filteredFaqs.map((faq, index) => (
                  <AccordionItem key={index} value={`faq-${index}`}>
                    <AccordionTrigger className="text-left">
                      {faq.question}
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground">
                      {faq.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
          </Card>
        )}

        {/* Quick Links */}
        <div className="grid sm:grid-cols-3 gap-4 mb-12">
          <Link to="/privacy" className="block">
            <Card className="h-full hover:bg-muted/50 transition-colors">
              <CardContent className="pt-6 flex flex-col items-center text-center">
                <Shield className="h-8 w-8 text-primary mb-2" />
                <h3 className="font-semibold">Privacy Policy</h3>
                <p className="text-sm text-muted-foreground">Learn how we protect your data</p>
              </CardContent>
            </Card>
          </Link>
          <Link to="/settings" className="block">
            <Card className="h-full hover:bg-muted/50 transition-colors">
              <CardContent className="pt-6 flex flex-col items-center text-center">
                <Settings className="h-8 w-8 text-primary mb-2" />
                <h3 className="font-semibold">Settings</h3>
                <p className="text-sm text-muted-foreground">Manage your preferences</p>
              </CardContent>
            </Card>
          </Link>
          <Link to="/family-links" className="block">
            <Card className="h-full hover:bg-muted/50 transition-colors">
              <CardContent className="pt-6 flex flex-col items-center text-center">
                <Users className="h-8 w-8 text-primary mb-2" />
                <h3 className="font-semibold">Family Links</h3>
                <p className="text-sm text-muted-foreground">Connect with family members</p>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Contact Support */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-primary" />
              Still have questions? We're here to help.
            </CardTitle>
            <CardDescription>
              Send us a message and we'll get back to you within 24-48 hours.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-6 p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground mb-2">
                You can also reach us directly at:
              </p>
              <a 
                href="mailto:dolphincarpool@gmail.com"
                className="text-primary hover:underline font-medium"
              >
                dolphincarpool@gmail.com
              </a>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {isSent && (
                <div className="p-4 bg-primary/10 text-primary rounded-lg border border-primary/20">
                  Message sent! We'll get back to you within 24-48 hours.
                </div>
              )}
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Your Name</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">
                    Your Email <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="subject">Subject</Label>
                <Input
                  id="subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="What is this about?"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="message">Message</Label>
                <Textarea
                  id="message"
                  placeholder="Describe your issue or question..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={5}
                  required
                />
              </div>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Sending..." : "Send Message"}
              </Button>
            </form>
          </CardContent>
        </Card>

      </div>
    </DashboardLayout>
  );
}