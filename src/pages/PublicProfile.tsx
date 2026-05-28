import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  User, 
  Mail, 
  Phone, 
  Calendar, 
  GraduationCap, 
  Users, 
  Car as CarIcon,
  MapPin,
  ShieldCheck,
  Hand,
  ArrowLeft,
  Lock
} from "lucide-react";
import { format } from "date-fns";
import { isParent as checkIsParent, isStudent as checkIsStudent } from "@/lib/permissions";
// Note: permissions functions now accept account_type, not email
import PrivateRideRequestModal from "@/components/PrivateRideRequestModal";
import PrivateRideOfferModal from "@/components/PrivateRideOfferModal";

interface PublicProfileData {
  id: string;
  username: string;
  first_name: string | null;
  last_name: string | null;
  phone_number: string | null;
  home_address: string | null;
  car_make: string | null;
  car_model: string | null;
  car_seats: number | null;
  account_type: 'parent' | 'student';
  share_email: boolean;
  share_phone: boolean;
  created_at: string;
  email?: string;
  linked_students_count?: number;
  active_rides_count?: number;
}

const PublicProfile = () => {
  const { userId } = useParams<{ userId: string }>();
  const { user, loading: authLoading, profile: authProfile } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<PublicProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewerIsStudent, setViewerIsStudent] = useState(false);
  const [viewerIsParent, setViewerIsParent] = useState(false);
  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const [offerModalOpen, setOfferModalOpen] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/login");
    }
  }, [user, authLoading, navigate]);

  // Check viewer's role using profile account_type
  useEffect(() => {
    if (!authProfile) return;
    setViewerIsStudent(checkIsStudent(authProfile.account_type));
    setViewerIsParent(checkIsParent(authProfile.account_type));
  }, [authProfile]);

  useEffect(() => {
    if (userId) {
      fetchProfile();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const fetchProfile = async () => {
    if (!userId) return;

    setLoading(true);
    setError(null);

    try {
      // Use edge function to fetch profile (bypasses RLS)
      const { data, error: fetchError } = await supabase.functions.invoke('get-parent-profile', {
        body: { parentId: userId },
      });

      if (fetchError) throw fetchError;
      if (!data?.profile) throw new Error('Profile not found');

      // Get active rides count
      const { count: ridesCount } = await supabase
        .from('rides')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('status', 'active');

      setProfile({
        id: data.profile.id,
        username: data.profile.username,
        first_name: data.profile.first_name,
        last_name: data.profile.last_name,
        phone_number: data.profile.phone_number,
        home_address: data.profile.home_address,
        car_make: data.profile.car_make,
        car_model: data.profile.car_model,
        car_seats: data.profile.car_seats,
        account_type: data.profile.account_type || 'parent',
        share_email: data.profile.share_email ?? true,
        share_phone: data.profile.share_phone ?? false,
        created_at: data.profile.created_at,
        email: data.profile.email,
        linked_students_count: data.profile.linked_students_count || 0,
        active_rides_count: ridesCount || 0,
      });
    } catch (err) {
      console.error('Error fetching profile:', err);
      setError('Unable to load this profile. They may have privacy settings enabled.');
    } finally {
      setLoading(false);
    }
  };

  const getInitials = () => {
    if (profile?.first_name && profile?.last_name) {
      return `${profile.first_name[0]}${profile.last_name[0]}`.toUpperCase();
    }
    return profile?.username?.substring(0, 2).toUpperCase() || '??';
  };

  const getDisplayName = () => {
    if (profile?.first_name && profile?.last_name) {
      return `${profile.first_name} ${profile.last_name}`;
    }
    return profile?.username || 'Unknown';
  };

  const isOwnProfile = userId === user?.id;
  const isParentProfile = profile?.account_type === 'parent';
  const canSeeContactInfo = !viewerIsStudent && isParentProfile;
  const canSendRequest = viewerIsParent && isParentProfile && !isOwnProfile;

  if (authLoading || !user) {
    return (
      <DashboardLayout>
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-muted-foreground">Loading...</div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="container mx-auto px-4 max-w-3xl">
        <Breadcrumbs items={[
          { label: "Find Rides", href: "/find-rides" },
          { label: loading ? "Profile" : getDisplayName() }
        ]} />
        
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(-1)}
          className="mb-4 gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>

        {loading ? (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-4">
                <Skeleton className="h-20 w-20 rounded-full" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-6 w-48" />
                  <Skeleton className="h-4 w-32" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            </CardContent>
          </Card>
        ) : error ? (
          <Alert variant="destructive">
            <Lock className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : profile ? (
          <div className="space-y-6">
            {/* Profile Header */}
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
                  <Avatar className="h-24 w-24 border-4 border-background shadow-lg">
                    <AvatarFallback 
                      className={`text-2xl ${
                        isParentProfile 
                          ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                          : 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                      }`}
                    >
                      {getInitials()}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 text-center sm:text-left">
                    <div className="flex flex-col sm:flex-row items-center gap-2">
                      <h1 className="text-2xl font-bold">{getDisplayName()}</h1>
                      <Badge 
                        className={`gap-1 ${
                          isParentProfile
                            ? 'bg-green-500/10 text-green-600'
                            : 'bg-blue-500/10 text-blue-600'
                        }`}
                      >
                        {isParentProfile ? (
                          <>
                            <Users className="h-3 w-3" />
                            Parent
                          </>
                        ) : (
                          <>
                            <GraduationCap className="h-3 w-3" />
                            Student
                          </>
                        )}
                      </Badge>
                      {isOwnProfile && (
                        <Badge variant="outline">Your Profile</Badge>
                      )}
                    </div>
                    <p className="text-muted-foreground">@{profile.username}</p>
                    
                    <div className="flex flex-wrap justify-center sm:justify-start gap-4 mt-3 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        Joined {format(new Date(profile.created_at), 'MMM yyyy')}
                      </div>
                      {isParentProfile && (
                        <>
                          <div className="flex items-center gap-1">
                            <Users className="h-4 w-4" />
                            {profile.linked_students_count} student{profile.linked_students_count !== 1 ? 's' : ''}
                          </div>
                          <div className="flex items-center gap-1">
                            <CarIcon className="h-4 w-4" />
                            {profile.active_rides_count} active ride{profile.active_rides_count !== 1 ? 's' : ''}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </CardHeader>
              
              {canSendRequest && (
                <CardContent className="pt-0">
                  <div className="flex flex-wrap gap-2">
                    <Button 
                      onClick={() => setRequestModalOpen(true)}
                      className="gap-2"
                    >
                      <Hand className="h-4 w-4" />
                      Request Ride
                    </Button>
                    <Button 
                      variant="outline"
                      onClick={() => setOfferModalOpen(true)}
                      className="gap-2"
                    >
                      <CarIcon className="h-4 w-4" />
                      Offer Ride
                    </Button>
                  </div>
                </CardContent>
              )}
            </Card>

            {/* Contact Information - Only for parents viewing other parents */}
            {canSeeContactInfo && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Mail className="h-5 w-5" />
                    Contact Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {profile.share_email && profile.email ? (
                    <a 
                      href={`mailto:${profile.email}?subject=Dolphin CarPool`}
                      className="flex items-center gap-3 text-muted-foreground hover:text-primary transition-colors"
                    >
                      <Mail className="h-5 w-5" />
                      <span>{profile.email}</span>
                    </a>
                  ) : (
                    <div className="flex items-center gap-3 text-muted-foreground">
                      <Mail className="h-5 w-5" />
                      <span className="italic">Email not shared</span>
                    </div>
                  )}
                  
                  {profile.share_phone && profile.phone_number ? (
                    <a 
                      href={`tel:${profile.phone_number}`}
                      className="flex items-center gap-3 text-muted-foreground hover:text-primary transition-colors"
                    >
                      <Phone className="h-5 w-5" />
                      <span>{profile.phone_number}</span>
                    </a>
                  ) : (
                    <div className="flex items-center gap-3 text-muted-foreground">
                      <Phone className="h-5 w-5" />
                      <span className="italic">Phone not shared</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Privacy notice for students */}
            {viewerIsStudent && (
              <Alert>
                <ShieldCheck className="h-4 w-4" />
                <AlertDescription>
                  Contact information is hidden for student accounts. Ask your parent for help connecting with this family.
                </AlertDescription>
              </Alert>
            )}

            {/* Vehicle Information - Only for parent profiles */}
            {isParentProfile && (profile.car_make || profile.car_model) && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <CarIcon className="h-5 w-5" />
                    Vehicle Information
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <p className="font-medium">
                      {profile.car_make} {profile.car_model}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* General Area - Hide specific address for privacy */}
            {profile.home_address && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    General Area
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    {/* Only show city/area, not full address for privacy */}
                    {profile.home_address.split(',').slice(-2).join(',').trim() || 'Location available on map'}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        ) : null}
      </div>

      {/* Private ride modals */}
      {profile && canSendRequest && user && (
        <>
          <PrivateRideRequestModal
            open={requestModalOpen}
            onClose={() => setRequestModalOpen(false)}
            recipientId={profile.id}
            recipientName={getDisplayName()}
            distance={0}
            userProfile={{
              id: user.id,
              home_address: null,
              home_latitude: null,
              home_longitude: null,
            }}
            onSuccess={() => navigate('/my-rides')}
          />
          <PrivateRideOfferModal
            open={offerModalOpen}
            onClose={() => setOfferModalOpen(false)}
            recipientId={profile.id}
            recipientName={getDisplayName()}
            distance={0}
            userProfile={{
              id: user.id,
              home_address: null,
              home_latitude: null,
              home_longitude: null,
            }}
            onSuccess={() => navigate('/my-rides')}
          />
        </>
      )}
    </DashboardLayout>
  );
};

export default PublicProfile;
