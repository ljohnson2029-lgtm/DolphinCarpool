import { useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Map as MapIcon, List, Hand, Car, Plus, RefreshCw, Sparkles, Users } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { DashboardLayout } from "@/components/DashboardLayout";
import SEO from "@/components/SEO";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import RideRequestForm from "@/components/RideRequestForm";
import RideOfferForm from "@/components/RideOfferForm";
import RidesList, { type Ride } from "@/components/RidesList";
import FindRidesMap from "@/components/FindRidesMap";
import ParentSearchBar from "@/components/ParentSearchBar";
import CarpoolFiltersBar, { type RadiusOption } from "@/components/CarpoolFiltersBar";
import { useScrollReveal } from "@/lib/animations";

const FamilyCarpools = () => {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [refreshKey, setRefreshKey] = useState(0);
  const [viewMode, setViewMode] = useState<'map' | 'list'>(searchParams.get('view') === 'map' ? 'map' : 'list');
  const [showRequests, setShowRequests] = useState(true);
  const [showOffers, setShowOffers] = useState(true);
  const [showHome, setShowHome] = useState(false);
  const [showSchool, setShowSchool] = useState(true);
  const [radius, setRadius] = useState<RadiusOption>("any");

  const handleClearFilters = () => {
    setShowRequests(true);
    setShowOffers(true);
    setRadius("any");
  };

  const hasHomeAddress = !!(profile?.home_latitude && profile?.home_longitude);
  const homeCoords = hasHomeAddress
    ? { lat: profile!.home_latitude as number, lng: profile!.home_longitude as number }
    : null;
  const [showRequestDialog, setShowRequestDialog] = useState(false);
  const [showOfferDialog, setShowOfferDialog] = useState(false);
  const [focusRide, setFocusRide] = useState<{
    id: string;
    pickup_latitude: number | null;
    pickup_longitude: number | null;
    pickup_location: string;
  } | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    setRefreshKey((prev) => prev + 1);
    // Brief delay so loading state is visible
    setTimeout(() => {
      setIsRefreshing(false);
      toast.success("Rides updated", { duration: 2000 });
    }, 800);
  }, []);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/login");
    }
  }, [user, loading, navigate]);

  const isUserParent = profile?.account_type === 'parent';
  const isUserStudent = profile?.account_type === 'student';

  const handleRideCreated = () => {
    setRefreshKey((prev) => prev + 1);
    setShowRequestDialog(false);
    setShowOfferDialog(false);
  };

  const handleViewOnMap = (ride: Ride) => {
    // Switch to map view and focus on the ride
    setViewMode('map');
    setFocusRide({
      id: ride.id,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      pickup_latitude: (ride as any).pickup_latitude || null,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      pickup_longitude: (ride as any).pickup_longitude || null,
      pickup_location: ride.pickup_location
    });
  };

  const { ref: headerRef, isVisible: headerVisible } = useScrollReveal<HTMLDivElement>();

  if (loading || !user || !profile) {
    return (
      <DashboardLayout>
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-center min-h-[60vh]">
            <motion.div 
              className="text-muted-foreground"
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              Loading...
            </motion.div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <SEO
        title="Family Carpools — Dolphin Carpool"
        description="Browse, request, and offer family carpools with parents in your Dolphin Carpool community."
        path="/carpools"
      />
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="min-h-screen bg-gradient-to-br from-gray-50/50 via-white to-blue-50/30"
      >
      <div className="container mx-auto px-4 max-w-7xl py-8">
        <Breadcrumbs items={[{ label: "Family Carpools" }]} />
        
        <div className="space-y-6">
          {/* Premium Header */}
          <motion.div
            ref={headerRef}
            initial={{ opacity: 0, y: 20 }}
            animate={headerVisible ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6 }}
            className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-4"
          >
            <div>
              <motion.div 
                className="flex items-center gap-3 mb-2"
                initial={{ opacity: 0, x: -20 }}
                animate={headerVisible ? { opacity: 1, x: 0 } : {}}
                transition={{ duration: 0.5, delay: 0.1 }}
              >
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={headerVisible ? { scale: 1, rotate: 0 } : {}}
                  transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
                  className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/25"
                >
                  <Users className="w-6 h-6 text-white" />
                </motion.div>
                <div>
                  <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 bg-clip-text text-transparent">
                    Family Carpools
                  </h1>
                </div>
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={headerVisible ? { opacity: 1, scale: 1 } : {}}
                  transition={{ delay: 0.3 }}
                >
                  <Badge 
                    variant={isUserStudent ? 'secondary' : 'default'}
                    className={isUserStudent 
                      ? 'bg-blue-500/10 text-blue-600 border-blue-200' 
                      : 'bg-emerald-500/10 text-emerald-600 border-emerald-200'
                    }
                  >
                    {isUserStudent ? 'Student Account' : 'Parent Account'}
                  </Badge>
                </motion.div>
              </motion.div>
              <motion.p 
                className="text-gray-500 ml-15"
                initial={{ opacity: 0 }}
                animate={headerVisible ? { opacity: 1 } : {}}
                transition={{ delay: 0.3 }}
              >
                Browse, request, and offer rides to families
              </motion.p>
            </div>
            
            {/* View Toggle & Refresh */}
            <motion.div 
              className="flex gap-2"
              initial={{ opacity: 0, x: 20 }}
              animate={headerVisible ? { opacity: 1, x: 0 } : {}}
              transition={{ delay: 0.4 }}
            >
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  className="bg-white/80 backdrop-blur-sm"
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                  {isRefreshing ? 'Refreshing...' : 'Refresh'}
                </Button>
              </motion.div>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                  className={viewMode === 'list' ? 'bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/25' : 'bg-white/80 backdrop-blur-sm'}
                >
                  <List className="h-4 w-4 mr-2" />
                  List View
                </Button>
              </motion.div>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button
                  variant={viewMode === 'map' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('map')}
                  className={viewMode === 'map' ? 'bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/25' : 'bg-white/80 backdrop-blur-sm'}
                >
                  <MapIcon className="h-4 w-4 mr-2" />
                  Map View
                </Button>
              </motion.div>
            </motion.div>
          </motion.div>

          {/* Student Alert */}
          <AnimatePresence>
            {isUserStudent && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
              >
                <Alert className="rounded-2xl border-blue-200 bg-blue-50/80 backdrop-blur-sm dark:border-blue-800 dark:bg-blue-950/50">
                  <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  <AlertDescription className="text-blue-900 dark:text-blue-100">
                    <span className="font-medium">Student Account - View Only</span>
                    <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                      You can browse all rides, but ask your parent to manage ride requests and offers.
                    </p>
                  </AlertDescription>
                </Alert>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Action Buttons - Always visible for both roles */}
          <motion.div 
            className="flex gap-3 flex-wrap"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            {isUserParent ? (
              <>
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button 
                    onClick={() => setShowRequestDialog(true)}
                    variant="outline"
                    className="gap-2 bg-white/80 backdrop-blur-sm hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-all"
                  >
                    <Hand className="h-4 w-4" />
                    Post Ride Request
                  </Button>
                </motion.div>
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button 
                    onClick={() => setShowOfferDialog(true)}
                    className="gap-2 bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-500/25"
                  >
                    <Car className="h-4 w-4" />
                    Post Ride Offer
                  </Button>
                </motion.div>
              </>
            ) : (
              <>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="outline"
                      className="gap-2 opacity-60"
                      disabled
                    >
                      <Hand className="h-4 w-4" />
                      Post Ride Request
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Only parents can post ride requests</p>
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      className="gap-2 opacity-60"
                      disabled
                    >
                      <Car className="h-4 w-4" />
                      Post Ride Offer
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Only parents can post ride offers</p>
                  </TooltipContent>
                </Tooltip>
              </>
            )}
          </motion.div>

          {/* Parent Search */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <ParentSearchBar />
          </motion.div>

          {/* Shared Filter Bar (applies to both map + list) */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
          >
            <CarpoolFiltersBar
              showRequests={showRequests}
              showOffers={showOffers}
              radius={radius}
              onToggleRequests={setShowRequests}
              onToggleOffers={setShowOffers}
              onRadiusChange={setRadius}
              onClear={handleClearFilters}
              hasHomeAddress={hasHomeAddress}
            />
          </motion.div>

          {/* View Content with AnimatePresence */}
          <AnimatePresence mode="wait">
            {viewMode === 'map' ? (
              <motion.div
                key="map"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                <FindRidesMap 
                  height="500px"
                  showRequests={showRequests}
                  showOffers={showOffers}
                  onToggleRequests={setShowRequests}
                  onToggleOffers={setShowOffers}
                  showHome={showHome}
                  showSchool={showSchool}
                  onToggleHome={setShowHome}
                  onToggleSchool={setShowSchool}
                  focusRide={focusRide}
                  onFocusRideHandled={() => setFocusRide(null)}
                  radiusMiles={radius === "any" ? null : parseInt(radius, 10)}
                  homeCoords={homeCoords}
                />
              </motion.div>
            ) : (
              <motion.div
                key="list"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                <RidesList
                  key={refreshKey}
                  onViewOnMap={handleViewOnMap}
                  showRequests={showRequests}
                  showOffers={showOffers}
                  radiusMiles={radius === "any" ? null : parseInt(radius, 10)}
                  homeCoords={homeCoords}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Post Ride Request Dialog */}
        <Dialog open={showRequestDialog} onOpenChange={setShowRequestDialog}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-red-100 flex items-center justify-center">
                  <Hand className="h-4 w-4 text-red-600" />
                </div>
                Post a Ride Request
              </DialogTitle>
            </DialogHeader>
            <RideRequestForm onSuccess={handleRideCreated} />
          </DialogContent>
        </Dialog>

        {/* Post Ride Offer Dialog */}
        <Dialog open={showOfferDialog} onOpenChange={setShowOfferDialog}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center">
                  <Car className="h-4 w-4 text-emerald-600" />
                </div>
                Post a Ride Offer
              </DialogTitle>
            </DialogHeader>
            <RideOfferForm onSuccess={handleRideCreated} />
          </DialogContent>
        </Dialog>
      </div>
      </motion.div>
    </DashboardLayout>
  );
};

export default FamilyCarpools;