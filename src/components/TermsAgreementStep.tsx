import { useRef, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ArrowLeft, ArrowRight, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface TermsAgreementStepProps {
  onBack: () => void;
  onContinue: () => void;
}

const TERMS_TEXT = `DOLPHIN CARPOOL — TERMS AND CONDITIONS

Last Updated: June 17, 2026

PLEASE READ THESE TERMS AND CONDITIONS CAREFULLY BEFORE USING DOLPHIN CARPOOL. BY CHECKING THE BOX BELOW AND ACCESSING THIS PLATFORM, YOU AGREE TO BE LEGALLY BOUND BY THESE TERMS.

1. ABOUT DOLPHIN CARPOOL
Dolphin Carpool is an independent platform created and maintained by students Ethan Fang and Luke Johnson, communicated through the Chadwick Parents Association (CPA). Dolphin Carpool is not sponsored, operated, endorsed, or monitored by Chadwick School in any capacity. Chadwick School has no affiliation with, responsibility for, or oversight of this platform or any carpool arrangements made through it. The CPA's involvement is limited to communication and distribution of information about the platform and does not constitute endorsement of any specific carpool arrangement or participant.

2. INDEPENDENT PLATFORM — NO SCHOOL AFFILIATION
Dolphin Carpool operates entirely independently of Chadwick School. Nothing on this platform should be interpreted as an official school program, school-sponsored activity, or school-endorsed service. Chadwick School, its administration, faculty, staff, and board of trustees bear no responsibility for the operation of this platform or any outcomes arising from its use. The student creators of Dolphin Carpool act independently and not as agents, employees, or representatives of Chadwick School or the CPA.

3. VOLUNTARY PARTICIPATION AND ASSUMPTION OF RISK
Participation in any carpool arrangement through Dolphin Carpool is entirely voluntary and undertaken at each participant's own risk. By using this platform you acknowledge and agree that: carpooling involves inherent risks including but not limited to traffic accidents, personal injury, property damage, and other unforeseen events; you voluntarily assume all risks associated with participating in carpool arrangements made through this platform; no carpool arrangement is guaranteed, verified, or monitored by Dolphin Carpool, Chadwick School, or the CPA; you are solely responsible for evaluating the suitability, safety, and reliability of any carpool partner before agreeing to a carpool arrangement; you have the right to decline any carpool arrangement at any time for any reason.

4. NO LIABILITY — DOLPHIN CARPOOL
To the fullest extent permitted by applicable law, Dolphin Carpool, its student creators, Ethan Fang and Luke Johnson, shall not be liable for any direct, indirect, incidental, special, consequential, or punitive damages arising out of or related to your use of this platform or any carpool arrangement made through it, including but not limited to: personal injury or death arising from a carpool arrangement; property damage or loss occurring during a carpool arrangement; any act, omission, conduct, or negligence of any platform participant; any failure of a participant to show up, drive safely, or fulfill a carpool arrangement; any dispute between carpool participants; any technical errors, outages, or failures of the platform.

5. NO LIABILITY — CHADWICK SCHOOL AND CPA
Chadwick School, its administration, faculty, staff, board of trustees, and all associated entities assume no responsibility or liability whatsoever for the actions, conduct, safety, or reliability of any participant or transportation arrangement made through this platform. The CPA and its board members, officers, and volunteers assume no responsibility or liability for the actions, conduct, safety, or reliability of any participant or transportation arrangement made through this platform. Their involvement is limited solely to communication about the platform's existence.

6. NO BACKGROUND CHECKS OR VERIFICATION
Dolphin Carpool does not perform and expressly disclaims any responsibility for: background checks of any kind on any user; driving record checks or verification; insurance verification or confirmation; criminal history checks; identity verification beyond the community access code provided by the CPA; vehicle safety inspections or certifications. Parents and guardians are solely responsible for independently vetting, evaluating, and selecting carpool partners. Dolphin Carpool strongly encourages all participants to verify that any driver they carpool with holds a valid driver's license and maintains adequate automobile insurance prior to entering into any carpool arrangement.

7. INSURANCE RESPONSIBILITY
All participants are solely responsible for maintaining adequate automobile insurance coverage that covers carpooling activities with non-family members. You acknowledge that: some insurance policies may have exclusions or limitations for regular carpooling arrangements; Dolphin Carpool does not provide, verify, or guarantee any insurance coverage for any participant or carpool arrangement; you are responsible for confirming with your insurance provider that your policy covers carpooling activities before participating; in the event of an accident or incident during a carpool arrangement, your personal automobile insurance is the sole source of coverage — Dolphin Carpool bears no financial responsibility whatsoever.

8. PARENTAL RESPONSIBILITY
Parents and guardians are solely and entirely responsible for: the safety and supervision of their children during all carpool activities; selecting appropriate and trustworthy carpool partners for their children; ensuring their child's carpool driver is a licensed, insured, and responsible adult; communicating safety expectations to all carpool participants; making informed decisions about which carpool arrangements are appropriate for their family; supervising any carpool arrangements involving their minor children. Dolphin Carpool shall not be held responsible for any harm, injury, loss, or damage to any minor child arising from a carpool arrangement made through this platform.

9. CUP COMPLIANCE AND TRANSPORTATION OPTIONS
Chadwick School must adhere to its Conditional Use Permit (CUP). In support of the school community and in compliance with the CUP, Dolphin Carpool encourages all families to first consider: utilizing the official student buses to and from school; using the shuttle service to and from the South Coast Botanical Gardens; using Dolphin Carpool as a supplemental carpooling resource when the above options are not available or suitable. Dolphin Carpool is intended to complement, not replace, official school transportation options.

10. USER CONDUCT
By using Dolphin Carpool you agree to: provide accurate and truthful information on your profile; treat all other platform participants with respect and courtesy; honor carpool commitments to the best of your ability and provide adequate notice when cancellations are necessary; not use the platform for any purpose other than coordinating legitimate carpool arrangements; not share your verification access code with anyone outside the Chadwick community; immediately report any safety concerns or platform misuse to dolphincarpool@gmail.com; comply with all applicable traffic laws and safety regulations during any carpool arrangement.

11. PRIVACY
Dolphin Carpool collects basic profile information including name, contact information, home address, and vehicle details for the purpose of facilitating carpool arrangements. By using this platform you consent to your information being visible to other verified platform participants for the purpose of coordinating carpools. Dolphin Carpool does not sell your personal information to any third party. Your information is stored securely and used solely for the operation of the platform.

12. PLATFORM AVAILABILITY
Dolphin Carpool is provided on an "as is" and "as available" basis. The student creators make no warranties, express or implied, regarding the reliability, availability, or accuracy of the platform. Dolphin Carpool may be updated, modified, or discontinued at any time without notice. The student creators shall not be liable for any loss or inconvenience arising from platform downtime or discontinuation.

13. MODIFICATIONS TO TERMS
These Terms and Conditions may be updated at any time. Continued use of the platform following any update constitutes acceptance of the revised terms. It is your responsibility to review these terms periodically.

14. GOVERNING LAW
These Terms and Conditions shall be governed by and construed in accordance with the laws of the State of California. Any disputes arising from these terms or your use of the platform shall be subject to the exclusive jurisdiction of the courts of Los Angeles County, California.

15. CONTACT
For questions, concerns, or to report safety issues please contact us at: dolphincarpool@gmail.com

By checking the box below and proceeding to use Dolphin Carpool, you confirm that you have read, understood, and agree to be bound by these Terms and Conditions in their entirety.`;

const TermsAgreementStep = ({ onBack, onContinue }: TermsAgreementStepProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrolledToEnd, setScrolledToEnd] = useState(false);
  const [agreed, setAgreed] = useState(false);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 8) {
      setScrolledToEnd(true);
    }
  };

  useEffect(() => {
    // If content fits without scrolling, enable immediately
    const el = scrollRef.current;
    if (el && el.scrollHeight <= el.clientHeight + 8) {
      setScrolledToEnd(true);
    }
  }, []);

  const canContinue = scrolledToEnd && agreed;

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Please scroll through and read the full Terms and Conditions before proceeding.
      </p>

      <div className="relative">
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="h-72 overflow-y-auto rounded-md border bg-muted/30 p-4 text-sm leading-relaxed whitespace-pre-wrap"
        >
          {TERMS_TEXT}
        </div>
        {!scrolledToEnd && (
          <div className="pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1 rounded-full bg-primary text-primary-foreground text-xs px-3 py-1 shadow-md">
            <ChevronDown className="w-3 h-3 animate-bounce" />
            Scroll to continue
          </div>
        )}
      </div>

      <div
        className={cn(
          "flex items-start gap-3 p-3 rounded-md border",
          scrolledToEnd ? "bg-background" : "bg-muted/40 opacity-60",
        )}
      >
        <Checkbox
          id="terms-agree"
          checked={agreed}
          disabled={!scrolledToEnd}
          onCheckedChange={(c) => setAgreed(c as boolean)}
          className="mt-0.5"
        />
        <Label htmlFor="terms-agree" className="text-sm cursor-pointer leading-relaxed">
          I have read and agree to the Dolphin Carpool Terms and Conditions
        </Label>
      </div>

      <div className="flex gap-3 pt-2">
        <Button type="button" variant="outline" onClick={onBack} className="flex-1">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back
        </Button>
        <Button
          type="button"
          onClick={onContinue}
          disabled={!canContinue}
          className="flex-1"
        >
          Continue <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
};

export default TermsAgreementStep;
