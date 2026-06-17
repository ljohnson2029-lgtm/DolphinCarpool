import { Mail } from "lucide-react";
import { Link } from "react-router-dom";

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-primary text-primary-foreground">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-10 mb-10">
          {/* Brand */}
          <div className="sm:col-span-2 md:col-span-1">
            <h3 className="text-xl font-bold mb-3">​Dolphin</h3>
            <p className="text-primary-foreground/70 text-sm leading-relaxed">
              Safe carpooling for Families in our Community{"\n"}
            </p>
          </div>

          {/* About */}
          <div>
            <h4 className="font-semibold mb-3">About</h4>
            <div className="space-y-2 text-sm">
              <Link to="/about" className="block text-primary-foreground/70 hover:text-primary-foreground transition-colors">About Us</Link>
              <Link to="/safety" className="block text-primary-foreground/70 hover:text-primary-foreground transition-colors">Safety</Link>
            </div>
          </div>

          {/* Legal */}
          <div>
            <h4 className="font-semibold mb-3">Legal</h4>
            <div className="space-y-2 text-sm">
              <Link to="/privacy" className="block text-primary-foreground/70 hover:text-primary-foreground transition-colors">Privacy Policy</Link>
              <Link to="/terms" className="block text-primary-foreground/70 hover:text-primary-foreground transition-colors">Terms of Service</Link>
            </div>
          </div>

          {/* Support */}
          <div>
            <h4 className="font-semibold mb-3">Support</h4>
            <div className="space-y-2 text-sm">
              <Link to="/help" className="block text-primary-foreground/70 hover:text-primary-foreground transition-colors">FAQ / Help</Link>
              <Link to="/feedback" className="block text-primary-foreground/70 hover:text-primary-foreground transition-colors">Feedback</Link>
              <a
                href="mailto:dolphincarpool@gmail.com"
                className="flex items-center gap-1.5 text-primary-foreground/70 hover:text-primary-foreground transition-colors"
              >
                <Mail className="w-3.5 h-3.5" />
                Contact
              </a>
            </div>
          </div>
        </div>

        {/* Bottom */}
        <div className="pt-8 border-t border-primary-foreground/15">
          <p className="text-primary-foreground/50 text-xs text-center">
            © {currentYear} ​Car Pool ​Dolphin. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
