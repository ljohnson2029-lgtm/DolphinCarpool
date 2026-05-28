import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { X, Mail, Phone, Users, GraduationCap, Hand, Car } from "lucide-react";
import DirectRideModal from "@/components/DirectRideModal";
import { isParent as checkIsParent } from "@/lib/permissions";
// Note: permissions functions now accept account_type, not email

interface ParentProfilePopupProps {
  parentId: string;
  distance: number;
  onClose: () => void;
  onRequestRide: (parentId: string, parentName: string) => void;
  onOfferRide: (parentId: string, parentName: string) => void;
}

interface ParentProfile {
  id: string;
  username: string;
  first_name: string | null;
  last_name: string | null;
  phone_number: string | null;
  share_phone: boolean;
  share_email: boolean;
  email: string | null;
}

interface LinkedStudent {
  first_name: string;
  last_name: string;
  grade_level: string | null;
}

const ParentProfilePopup = ({
  parentId,
  onClose,
}: ParentProfilePopupProps) => {
  const { user, profile: myProfile } = useAuth();
  const [profile, setProfile] = useState<ParentProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [linkedStudents, setLinkedStudents] = useState<LinkedStudent[]>([]);
  const [directRide, setDirectRide] = useState<{ type: "request" | "offer" } | null>(null);
  const [isCurrentUserParent, setIsCurrentUserParent] = useState(false);

  useEffect(() => {
    if (myProfile) {
      setIsCurrentUserParent(checkIsParent(myProfile.account_type));
    }
  }, [myProfile]);

  useEffect(() => {
    fetchParentProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parentId]);

  const fetchParentProfile = async () => {
    setLoading(true);
    setError(false);

    try {
      const { data, error: fetchError } = await supabase.functions.invoke('get-parent-profile', {
        body: { parentId },
      });

      if (fetchError) throw fetchError;
      if (!data?.profile) throw new Error('Profile not found');

      setProfile({
        id: data.profile.id,
        username: data.profile.username,
        first_name: data.profile.first_name,
        last_name: data.profile.last_name,
        phone_number: data.profile.phone_number,
        share_phone: data.profile.share_phone ?? false,
        share_email: data.profile.share_email ?? false,
        email: data.profile.email ?? null,
      });

      setLinkedStudents(data.profile.linked_students || []);

    } catch (err) {
      console.error('Error fetching parent profile:', err);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  const getDisplayName = () => {
    if (!profile) return '';
    if (profile.first_name && profile.last_name) {
      return `${profile.first_name} ${profile.last_name}`;
    }
    return profile.username;
  };

  if (loading) {
    return (
      <Card className="w-full bg-background/95 backdrop-blur-sm shadow-xl animate-fade-in">
        <CardHeader className="relative pb-3 pt-4 px-4">
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2 h-7 w-7"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
          <div className="space-y-2 pr-6">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-3 w-36" />
            <Skeleton className="h-3 w-36" />
          </div>
        </CardHeader>
      </Card>
    );
  }

  if (error || !profile) {
    return (
      <Card className="w-full bg-background/95 backdrop-blur-sm shadow-xl animate-fade-in">
        <CardHeader className="relative pt-4 px-4 pb-4">
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2 h-7 w-7"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
          <div className="text-center py-2">
            <p className="text-destructive text-sm mb-3">Unable to load profile</p>
            <Button onClick={fetchParentProfile} variant="outline" size="sm">
              Retry
            </Button>
          </div>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="w-[320px] bg-background/95 backdrop-blur-sm shadow-xl animate-scale-in overflow-hidden">
      <CardHeader className="relative pb-0 pt-5 px-5">
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-2 right-2 h-7 w-7 z-10"
          onClick={onClose}
          aria-label="Close profile"
        >
          <X className="h-4 w-4" />
        </Button>

        <div className="pr-8">
          <h3 className="text-lg font-bold text-foreground truncate">{getDisplayName()}</h3>
          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
            <Users className="h-3 w-3" />
            Parent/Adult
          </p>
        </div>
      </CardHeader>

      <CardContent className="space-y-0 px-5 pb-5 pt-3">
        {/* Divider */}
        <div className="border-t mb-3" />

        {/* Contact Info */}
        <div className="space-y-2.5 text-sm">
          <div className="flex items-center gap-2.5">
            <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            {profile.email ? (
              <a
                href={`mailto:${profile.email}?subject=Dolphin CarPool`}
                className="text-foreground hover:text-primary transition-colors truncate"
              >
                {profile.email}
              </a>
            ) : (
              <span className="text-muted-foreground">No email on file</span>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            <Phone className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            {profile.phone_number ? (
              <a
                href={`tel:${profile.phone_number}`}
                className="text-foreground hover:text-primary transition-colors"
              >
                {profile.phone_number}
              </a>
            ) : (
              <span className="text-muted-foreground">No phone number on file</span>
            )}
          </div>
        </div>

        {/* Children */}
        {linkedStudents.length > 0 && (
          <>
            <div className="border-t my-3" />
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Community Children</p>
              {linkedStudents.map((child, idx) => (
                <div key={idx} className="flex items-center gap-2 text-sm">
                  <GraduationCap className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                  <span className="text-foreground">
                    {child.first_name} {child.last_name}
                    {child.grade_level && (
                      <span className="text-muted-foreground ml-1">• {child.grade_level}</span>
                    )}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Direct Ride Buttons */}
        {isCurrentUserParent && parentId !== user?.id && (
          <>
            <div className="border-t my-3" />
            <div className="flex flex-col gap-2.5">
              <Button
                variant="outline"
                className="w-full gap-2"
                onClick={() => setDirectRide({ type: "request" })}
              >
                <Hand className="h-4 w-4" />
                Send Direct Ride Request
              </Button>
              <Button
                className="w-full gap-2"
                onClick={() => setDirectRide({ type: "offer" })}
              >
                <Car className="h-4 w-4" />
                Send Direct Ride Offer
              </Button>
            </div>
          </>
        )}
      </CardContent>

      {directRide && (
        <DirectRideModal
          open
          onClose={() => setDirectRide(null)}
          recipientId={parentId}
          recipientName={getDisplayName()}
          type={directRide.type}
          onSuccess={() => { setDirectRide(null); onClose(); }}
        />
      )}
    </Card>
  );
};

export default ParentProfilePopup;
