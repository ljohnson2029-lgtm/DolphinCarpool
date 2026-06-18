import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Users, 
  Hand,
  Car,
  Search,
  Map as MapIcon,
  List,
  AlertCircle,
  Phone,
  Mail,
  CheckCircle,
  ArrowRight,
  Sparkles,
  Filter
} from "lucide-react";

import { EmptyState } from "@/components/EmptyState";
import { LoadMoreButton } from "@/components/LoadMoreButton";
import { useDebounce } from "@/hooks/useDebounce";
import { useInfiniteScroll } from "@/hooks/usePagination";
import { format } from "date-fns";
import RideRequestForm from "@/components/RideRequestForm";
import RideOfferForm from "@/components/RideOfferForm";
import FindRidesMap from "@/components/FindRidesMap";
import RideUserBadge from "@/components/RideUserBadge";
import { isParent as checkIsParent, isStudent as checkIsStudent, getStudentPermissionError } from "@/lib/permissions";

interface BroadcastRide {
  id: string;
  user_id: string;
  type: 'request' | 'offer';
  pickup_location: string;
  dropoff_location: string;
  ride_date: string;
  ride_time: string;
  seats_needed: number | null;
  seats_available: number | null;
  route_details: string | null;
  profiles: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    username: string;
    phone_number?: string | null;
    share_phone?: boolean | null;
    share_email?: boolean | null;
  } | null;
  userEmail?: string;
  hasAcceptedConnection?: boolean;
}

const FindRides = () => {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const [broadcasts, setBroadcasts] = useState<BroadcastRide[]>([]);
  const [loadingRides, setLoadingRides] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map');
  const [showRequests, setShowRequests] = useState(true);
  const [showOffers, setShowOffers] = useState(true);
  const [userEmail, setUserEmail] = useState<string>("");
  const [isUserParent, setIsUserParent] = useState(false);
  const [isUserStudent, setIsUserStudent] = useState(false);
  const [acceptedRideIds, setAcceptedRideIds] = useState<Set<string>>(new Set());
  
  const debouncedSearch = useDebounce(searchQuery, 300);

  // Determine role from profile account_type
  useEffect(() => {
    if (profile) {
      setIsUserParent(checkIsParent(profile.account_type));
      setIsUserStudent(checkIsStudent(profile.account_type));
    }
  }, [profile]);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/login");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    fetchBroadcastRides();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const fetchBroadcastRides = async () => {
    if (!user) return;

    setLoadingRides(true);
    
    const { data: ridesData, error: ridesError } = await supabase
      .from('rides')
      .select('*')
      .eq('status', 'active')
      .gte('ride_date', new Date().toISOString().split('T')[0])
      .order('ride_date', { ascending: true })
      .order('ride_time', { ascending: true });

    if (ridesError) {
      console.error('Error fetching broadcast rides:', ridesError);
      setLoadingRides(false);
      return;
    }

    const userIds = [...new Set(ridesData?.map(r => r.user_id) || [])];
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let profilesMap: Record<string, any> = {};
    let emailsMap: Record<string, string> = {};
    
    if (userIds.length > 0) {
      const { data: profilesData } = await supabase
        .from('profiles_public')
        .select('id, first_name, last_name, username, phone_number, share_phone, share_email')
        .in('id', userIds);
      
      if (profilesData) {
        profilesMap = profilesData.reduce((acc, p) => {
          acc[p.id] = p;
          return acc;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        }, {} as Record<string, any>);
      }

      const { data: usersData } = await supabase
        .from('users_safe')
        .select('user_id, email')
        .in('user_id', userIds);
      
      if (usersData) {
        emailsMap = usersData.reduce((acc, u) => {
          acc[u.user_id] = u.email;
          return acc;
        }, {} as Record<string, string>);
      }
    }

    const combinedData = (ridesData || []).map(ride => ({
      ...ride,
      profiles: profilesMap[ride.user_id] || null,
      userEmail: emailsMap[ride.user_id] || null
    }));

   // Fetch accepted conversations to mark rides as "full"
   // Use is_fulfilled column from rides table for "Ride Full" status
    const ridesWithConnectionStatus = combinedData.map(ride => ({
      ...ride,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      hasAcceptedConnection: (ride as any).is_fulfilled === true
    }));
   
   // Keep this for backwards compatibility but it's now derived from is_fulfilled
   const acceptedIds = new Set(
     ridesWithConnectionStatus.filter(r => r.hasAcceptedConnection).map(r => r.id)
   );
    setAcceptedRideIds(acceptedIds);
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setBroadcasts(ridesWithConnectionStatus as any);
    setLoadingRides(false);
  };

  const handleRespondToRide = async (ride: BroadcastRide) => {
    if (!isUserParent) return;
    
    try {
      const { error } = await supabase
        .from('ride_conversations')
        .insert({
          ride_id: ride.id,
          sender_id: user?.id,
          recipient_id: ride.user_id,
          status: 'pending',
          message: ride.type === 'request' 
            ? `I can help with your ride request!`
            : `I'd like to join your offered ride!`
        });

      if (error) {
        console.error('Error creating conversation:', error);
        return;
      }
      
      navigate('/conversations');
    } catch (err) {
      console.error('Error responding to ride:', err);
    }
  };

  const getInitials = (firstName: string | null, lastName: string | null, username: string) => {
    if (firstName && lastName) {
      return `${firstName[0]}${lastName[0]}`.toUpperCase();
    }
    return username.substring(0, 2).toUpperCase();
  };

  const filteredRides = broadcasts.filter(r => {
    if (!showRequests && r.type === 'request') return false;
    if (!showOffers && r.type === 'offer') return false;
    if (debouncedSearch && 
        !r.pickup_location.toLowerCase().includes(debouncedSearch.toLowerCase()) &&
        !r.dropoff_location.toLowerCase().includes(debouncedSearch.toLowerCase())) return false;
    return true;
  });

  const {
    visibleItems,
    hasMore,
    loadMore,
    loadedCount,
    totalCount,
  } = useInfiniteScroll({ items: filteredRides, pageSize: 12 });

  if (loading || !user || !profile) {
    return (
      <DashboardLayout>
        <div className="min-h-screen bg-gradient-to-br from-gray-50/50 via-white to-blue-50/30 p-8">
          <div className="max-w-7xl mx-auto space-y-8">
            <Skeleton className="h-8 w-48" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-48 rounded-2xl" />
              ))}
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const RideCard = ({ ride }: { ride: BroadcastRide }) => {
    const initials = ride.profiles?.first_name && ride.profiles?.last_name
      ? `${ride.profiles.first_name[0]}${ride.profiles.last_name[0]}`.toUpperCase()
      : ride.profiles?.username?.substring(0, 2).toUpperCase() || '??';
    
    const displayName = ride.profiles?.first_name && ride.profiles?.last_name
      ? `${ride.profiles.first_name} ${ride.profiles.last_name}`
      : ride.profiles?.username || 'Unknown';

    return (
      <motion.div
        whileHover={{ y: -4, scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        transition={{ duration: 0.2 }}
      >
      <Card className="rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 bg-white/80 backdrop-blur-sm overflow-hidden group">
        <CardContent className="p-6 space-y-4">
          {/* Header: Avatar + Name + Type Badge */}
          <div className="flex items-start gap-3">
            <Avatar className="h-10 w-10 border border-border flex-shrink-0">
              <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <RideUserBadge
                userId={ride.user_id}
                firstName={ride.profiles?.first_name || null}
                lastName={ride.profiles?.last_name || null}
                username={ride.profiles?.username || 'Unknown'}
                accountType="parent"
                email={ride.userEmail}
                phoneNumber={ride.profiles?.phone_number}
                shareEmail={ride.profiles?.share_email ?? false}
                sharePhone={ride.profiles?.share_phone ?? false}
                isCurrentUser={ride.user_id === user?.id}
                viewerIsStudent={isUserStudent}
                variant="full"
                showViewButton={true}
              />
            </div>
            <Badge variant="outline" className={`gap-1 flex-shrink-0 ${
              ride.type === 'request' 
                ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-800' 
                : 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800'
            }`}>
              {ride.type === 'request' ? <Hand className="h-3 w-3" /> : <Car className="h-3 w-3" />}
              {ride.type === 'request' ? 'Request' : 'Offer'}
            </Badge>
          </div>

          {/* Route with visual connector */}
          <div className="flex items-center gap-3 bg-muted/50 rounded-lg p-3">
            <div className="flex flex-col items-center gap-0.5">
              <div className="w-2.5 h-2.5 rounded-full bg-primary border-2 border-background shadow-sm" />
              <div className="w-px h-6 bg-border" />
              <div className="w-2.5 h-2.5 rounded-full bg-secondary border-2 border-background shadow-sm" />
            </div>
            <div className="flex-1 min-w-0 space-y-2">
              <p className="text-sm font-medium text-foreground truncate">{ride.pickup_location}</p>
              <p className="text-sm text-muted-foreground truncate">{ride.dropoff_location}</p>
            </div>
          </div>

          {/* Date, Time, Seats */}
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
              <span>{format(new Date(ride.ride_date), 'EEE, MMM d')}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              <span>{ride.ride_time}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5" />
              {ride.hasAcceptedConnection ? (
                <span className="text-secondary font-medium">
                  {ride.user_id === user?.id ? 'Connected' : 'Ride Full'}
                </span>
              ) : ride.type === 'offer'
                ? <span>{ride.seats_available} seat{(ride.seats_available || 0) > 1 ? 's' : ''} available</span>
                : <span>{ride.seats_needed} seat{(ride.seats_needed || 0) > 1 ? 's' : ''} needed</span>}
            </div>
          </div>

          {ride.route_details && (
            <p className="text-sm text-muted-foreground pt-2 border-t border-border">
              {ride.route_details}
            </p>
          )}

          {/* Action Button */}
          {ride.hasAcceptedConnection && ride.user_id !== user?.id ? (
            <Button className="w-full gap-2" disabled variant="secondary">
              <Users className="h-4 w-4" />
              Ride Full
            </Button>
          ) : isUserParent ? (
            <Button 
              className="w-full gap-2"
              onClick={() => handleRespondToRide(ride)}
              disabled={ride.user_id === user?.id || ride.hasAcceptedConnection}
            >
              {ride.user_id === user?.id && ride.hasAcceptedConnection ? (
                <><CheckCircle className="h-4 w-4" /> Connected</>
              ) : ride.type === 'request' ? (
                <><Car className="h-4 w-4" /> I Can Help!</>
              ) : (
                <><Hand className="h-4 w-4" /> I Need This!</>
              )}
            </Button>
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button className="w-full gap-2" disabled variant="secondary">
                  {ride.type === 'request' ? (
                    <><Car className="h-4 w-4" /> I Can Help!</>
                  ) : (
                    <><Hand className="h-4 w-4" /> I Need This!</>
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Only parents can manage rides. Ask your parent for help.</p>
              </TooltipContent>
            </Tooltip>
          )}
        </CardContent>
      </Card>
      </motion.div>
    );
  };

  return (
    <DashboardLayout>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="min-h-screen bg-gradient-to-br from-gray-50/50 via-white to-blue-50/30"
      >
      <div className="container mx-auto px-4 max-w-7xl py-8">
        <Breadcrumbs items={[{ label: "Find Rides" }]} />

        <div className="mb-8">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-3">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 200 }}
                  className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/25"
                >
                  <Car className="w-6 h-6 text-white" />
                </motion.div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">Find Rides</h1>
                  <p className="text-gray-500 mt-1">
                    Browse available carpools on the map or list view
                  </p>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button
                  variant={viewMode === 'map' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('map')}
                  className={viewMode === 'map' ? 'bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/25' : ''}
                >
                  <MapIcon className="h-4 w-4 mr-2" />
                  Map View
                </Button>
              </motion.div>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                  className={viewMode === 'list' ? 'bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/25' : ''}
                >
                  <List className="h-4 w-4 mr-2" />
                  List View
                </Button>
              </motion.div>
            </div>
          </div>

          {isUserStudent && (
            <Alert className="mt-4 bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
              <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <AlertDescription className="text-blue-900 dark:text-blue-100">
                <span className="font-medium">Student Account - View Only</span>
                <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                  You can browse all rides, but ask your parent to manage ride requests and offers.
                </p>
              </AlertDescription>
            </Alert>
          )}
        </div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
        <Card className="mb-6 rounded-2xl shadow-sm border border-gray-100 bg-white/80 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
              {viewMode === 'list' && (
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by location..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
              )}
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center space-x-2">
                  <Switch 
                    id="show-requests" 
                    checked={showRequests} 
                    onCheckedChange={setShowRequests}
                  />
                  <Label htmlFor="show-requests" className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500" />
                    Ride Requests
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch 
                    id="show-offers" 
                    checked={showOffers} 
                    onCheckedChange={setShowOffers}
                  />
                  <Label htmlFor="show-offers" className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-green-500" />
                    Ride Offers
                  </Label>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        </motion.div>

        <Tabs defaultValue="browse" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="browse" className="gap-2">
              <MapIcon className="h-4 w-4" />
              Browse Rides
            </TabsTrigger>
            <TabsTrigger value="post" className="gap-2" disabled={isUserStudent}>
              <Hand className="h-4 w-4" />
              Post a Ride
              {isUserStudent && <span className="text-xs">(Parents Only)</span>}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="browse" className="space-y-6">
            {viewMode === 'map' ? (
              <FindRidesMap 
                height="500px"
                showRequests={showRequests}
                showOffers={showOffers}
                onToggleRequests={setShowRequests}
                onToggleOffers={setShowOffers}
              />
            ) : (
              <>
                {loadingRides ? (
                  <div className="text-center py-12">Loading rides...</div>
                ) : filteredRides.length === 0 ? (
                  <EmptyState
                    icon={Car}
                    title="No Rides Found"
                    description={!showRequests && !showOffers 
                      ? "Enable ride requests or offers to see results"
                      : "No rides match your current filters"}
                  />
                ) : (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {visibleItems.map((ride) => (
                        <RideCard key={ride.id} ride={ride} />
                      ))}
                    </div>
                    <LoadMoreButton
                      onLoadMore={loadMore}
                      hasMore={hasMore}
                      loadedCount={loadedCount}
                      totalCount={totalCount}
                    />
                  </>
                )}
              </>
            )}
          </TabsContent>

          <TabsContent value="post" className="space-y-6">
            {isUserStudent ? (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {getStudentPermissionError("post rides")}
                </AlertDescription>
              </Alert>
            ) : (
              <Tabs defaultValue="request" className="space-y-6">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="request" className="gap-2">
                    <Hand className="h-4 w-4" />
                    Request a Ride
                  </TabsTrigger>
                  <TabsTrigger value="offer" className="gap-2">
                    <Car className="h-4 w-4" />
                    Offer a Ride
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="request">
                  <Card className="p-6">
                    <div className="mb-6">
                      <h2 className="text-2xl font-semibold mb-2">I need a ride</h2>
                      <p className="text-muted-foreground">
                        Post a ride request that all parents can see
                      </p>
                    </div>
                    <RideRequestForm 
                      onSuccess={() => fetchBroadcastRides()}
                      isBroadcast={true}
                    />
                  </Card>
                </TabsContent>

                <TabsContent value="offer">
                  <Card className="p-6">
                    <div className="mb-6">
                      <h2 className="text-2xl font-semibold mb-2">I can offer a ride</h2>
                      <p className="text-muted-foreground">
                        Post a ride offer that all parents can see
                      </p>
                    </div>
                    <RideOfferForm 
                      onSuccess={() => fetchBroadcastRides()}
                      isBroadcast={true}
                    />
                  </Card>
                </TabsContent>
              </Tabs>
            )}
          </TabsContent>
        </Tabs>
      </div>
      </motion.div>
    </DashboardLayout>
  );
};

export default FindRides;
