import React, { useEffect, useState, useRef, useCallback, useMemo } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import type { GeoJSON } from "geojson";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import RideUserBadge from "@/components/RideUserBadge";
import { useToast } from "@/hooks/use-toast";
import { Calendar, Clock, MapPin, Users, Car, Hand, X, Loader2, CheckCircle, GraduationCap, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";
import { isParent as checkIsParent, isStudent as checkIsStudent } from "@/lib/permissions";
import { JoinRideDialog, OfferRideDialog } from "./ConfirmDialogs";
import MapFilterPanel from "./MapFilterPanel";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

/* ═══════════════════════════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════════════════════════ */

interface RideProfile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  username: string;
  phone_number?: string | null;
  share_phone?: boolean | null;
  share_email?: boolean | null;
}

interface RideChild {
  id: string;
  name: string;
  first_name: string;
  last_name: string;
  grade_level: string | null;
}

interface Ride {
  id: string;
  type: "request" | "offer";
  pickup_location: string;
  dropoff_location: string;
  pickup_latitude: number | null;
  pickup_longitude: number | null;
  dropoff_latitude: number | null;
  dropoff_longitude: number | null;
  ride_date: string;
  ride_time: string;
  seats_needed: number | null;
  seats_available: number | null;
  route_details: string | null;
  user_id: string;
  selected_children?: string[] | null;
  profile?: RideProfile;
  userEmail?: string;
  hasAcceptedConnection?: boolean;
  children?: RideChild[];
}

interface RideResponse {
  ride_id: string;
  status: string;
}

interface FindRidesMapProps {
  height?: string;
  showRequests: boolean;
  showOffers: boolean;
  onToggleRequests: (value: boolean) => void;
  onToggleOffers: (value: boolean) => void;
  showHome?: boolean;
  showSchool?: boolean;
  onToggleHome?: (value: boolean) => void;
  onToggleSchool?: (value: boolean) => void;
  focusRide?: {
    id: string;
    pickup_latitude: number | null;
    pickup_longitude: number | null;
    pickup_location: string;
  } | null;
  onFocusRideHandled?: () => void;
  radiusMiles?: number | null;
  homeCoords?: { lat: number; lng: number } | null;
}

/* ═══════════════════════════════════════════════════════════════════
   CONSTANTS
   ═══════════════════════════════════════════════════════════════════ */

const CHADWICK_SCHOOL = {
  name: "Chadwick School",
  address: "26800 S Academy Dr, Palos Verdes Peninsula, CA 90274",
  lat: 33.77667,
  lng: -118.36111,
};

const DEFAULT_CENTER: [number, number] = [-118.3964, 33.7447];
const DEFAULT_ZOOM = 11;
const CLUSTER_MAX_ZOOM = 14;
const CLUSTER_RADIUS = 50;
const FIT_BOUNDS_PADDING = { top: 80, bottom: 80, left: 100, right: 100 };

const MAPBOX_TOKEN =
  "pk.eyJ1IjoibHVrZWpvaG5zb24xMSIsImEiOiJjbWk5NXYzMWcwa2d5MmxvajBpc3Q1dWh1In0.MNg4LdPq3iaNHA3ojJ1VPg";

/* ═══════════════════════════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════════════════════════ */

const geocodeAddress = async (address: string): Promise<[number, number] | null> => {
  try {
    const { data, error } = await supabase.functions.invoke("geocode-address", { body: { address } });
    if (error || !data?.coordinates) return null;
    return [data.coordinates.longitude, data.coordinates.latitude];
  } catch {
    return null;
  }
};

const getDisplayName = (ride: Ride): string => {
  if (ride.profile?.first_name && ride.profile?.last_name) {
    return `${ride.profile.first_name} ${ride.profile.last_name}`;
  }
  if (ride.profile?.first_name) return ride.profile.first_name;
  if (ride.profile?.username?.trim()) return ride.profile.username;
  if (ride.userEmail) return ride.userEmail.split("@")[0];
  return "Parent";
};

const getOwnerName = (ride: Ride | null): string => {
  if (!ride) return "the ride owner";
  if (ride.profile?.first_name) {
    return `${ride.profile.first_name} ${ride.profile.last_name || ""}`.trim();
  }
  return ride.profile?.username || "the ride owner";
};

/* ═══════════════════════════════════════════════════════════════════
   MARKER DOM BUILDERS
   ═══════════════════════════════════════════════════════════════════ */

const createHomeMarkerElement = (): HTMLDivElement => {
  const el = document.createElement("div");
  el.className =
    "flex items-center justify-center w-8 h-8 bg-blue-500 rounded-full shadow-lg border-2 border-white cursor-pointer";
  el.style.zIndex = "1";
  el.innerHTML =
    '<svg class="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20"><path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z"></path></svg>';
  el.setAttribute("aria-label", "Your home location");
  return el;
};

const createSchoolMarkerElement = (): HTMLDivElement => {
  const el = document.createElement("div");
  el.className =
    "flex items-center justify-center w-9 h-9 bg-orange-500 rounded-full shadow-lg border-2 border-white cursor-pointer";
  el.style.zIndex = "1";
  el.innerHTML =
    '<svg class="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M12 3L1 9l4 2.18v6L12 21l7-3.82v-6l2-1.09V17h2V9L12 3zm6.82 6L12 12.72 5.18 9 12 5.28 18.82 9zM17 15.99l-5 2.73-5-2.73v-3.72L12 15l5-2.73v3.72z"/></svg>';
  el.setAttribute("aria-label", "Chadwick School");
  return el;
};

const createMarkerPopup = (title: string, titleColor: string, address: string): mapboxgl.Popup => {
  const container = document.createElement("div");
  container.className = "p-2";

  const titleEl = document.createElement("p");
  titleEl.className = `font-semibold ${titleColor}`;
  titleEl.textContent = title;

  const addressEl = document.createElement("p");
  addressEl.className = "text-sm text-gray-600";
  addressEl.textContent = address;

  container.appendChild(titleEl);
  container.appendChild(addressEl);

  return new mapboxgl.Popup({ offset: 25 }).setDOMContent(container);
};

/* ═══════════════════════════════════════════════════════════════════
   HOOK: useUserInfo
   ═══════════════════════════════════════════════════════════════════ */

const useUserInfo = (userId: string | undefined, accountType?: string) => {
  const [userEmail, setUserEmail] = useState("");
  const isUserParent = checkIsParent(accountType);
  const isUserStudent = checkIsStudent(accountType);

  useEffect(() => {
    if (!userId) return;

    const fetchUserEmail = async () => {
      const { data } = await supabase.from("users_safe").select("email").eq("user_id", userId).single();
      if (data?.email) {
        setUserEmail(data.email);
      }
    };

    fetchUserEmail();
  }, [userId]);

  return { userEmail, isUserParent, isUserStudent };
};

/* ═══════════════════════════════════════════════════════════════════
   HOOK: useRideResponses
   ═══════════════════════════════════════════════════════════════════ */

const useRideResponses = (userId: string | undefined) => {
  const [userResponses, setUserResponses] = useState<RideResponse[]>([]);

  const fetchUserResponses = useCallback(async () => {
    if (!userId) return;

    const { data, error } = await supabase.from("ride_conversations").select("ride_id, status").eq("sender_id", userId);

    if (!error) {
      setUserResponses(data || []);
    }
  }, [userId]);

  useEffect(() => {
    fetchUserResponses();
  }, [fetchUserResponses]);

  const getResponseStatus = useCallback(
    (rideId: string): string | null => {
      return userResponses.find((r) => r.ride_id === rideId)?.status || null;
    },
    [userResponses],
  );

  return { userResponses, fetchUserResponses, getResponseStatus };
};

/* ═══════════════════════════════════════════════════════════════════
   HOOK: useMapRides
   ═══════════════════════════════════════════════════════════════════ */

const useMapRides = (userId: string | undefined) => {
  const [rides, setRides] = useState<Ride[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;

    const fetchRides = async () => {
      setLoading(true);

      const today = new Date().toISOString().split("T")[0];
      const { data: ridesData, error } = await supabase
        .from("rides")
        .select("*")
        .eq("status", "active")
        .eq("is_fulfilled", false)
        .gte("ride_date", today);

      if (error || !ridesData) {
        setLoading(false);
        return;
      }

      // Geocode rides missing coordinates (parallel)
      const geocodePromises = ridesData.map(async (ride) => {
        if (!ride.pickup_latitude && !ride.pickup_longitude && ride.pickup_location) {
          const coords = await geocodeAddress(ride.pickup_location);
          if (coords) {
            ride.pickup_longitude = coords[0];
            ride.pickup_latitude = coords[1];
          }
        }
        return ride;
      });

      const geocodedRides = await Promise.allSettled(geocodePromises);
      const allRides = geocodedRides
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .filter((r): r is PromiseFulfilledResult<any> => r.status === "fulfilled")
        .map((r) => r.value);

      // Filter to rides with valid coordinates
      const ridesWithLocation = allRides.filter(
        (ride) => ride.pickup_latitude != null && ride.pickup_longitude != null,
      );

      // Fetch profiles and emails
      const userIds = [...new Set(ridesWithLocation.map((r) => r.user_id))];

      let profilesMap: Record<string, RideProfile> = {};
      let emailsMap: Record<string, string> = {};
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const childrenMap: Record<string, any> = {};

      if (userIds.length > 0) {
        const [profilesResult, usersResult, childrenResult] = await Promise.all([
          supabase
            .from("profiles_public")
            .select("id, first_name, last_name, username, phone_number, share_phone, share_email")
            .in("id", userIds),
          supabase.from("users").select("user_id, email").in("user_id", userIds),
          supabase.from("children").select("id, user_id, name, first_name, last_name, grade_level").in("user_id", userIds),
        ]);

        if (profilesResult.data) {
          profilesMap = profilesResult.data.reduce(
            (acc, p) => {
              acc[p.id] = p;
              return acc;
            },
            {} as Record<string, RideProfile>,
          );
        }

        if (usersResult.data) {
          emailsMap = usersResult.data.reduce(
            (acc, u) => {
              acc[u.user_id] = u.email;
              return acc;
            },
            {} as Record<string, string>,
          );
        }

        if (childrenResult.data) {
          childrenResult.data.forEach((c) => {
            if (!childrenMap[c.user_id]) childrenMap[c.user_id] = [];
            childrenMap[c.user_id].push(c);
          });
        }
      }

      const combinedRides: Ride[] = ridesWithLocation.map((ride) => {
        const allChildren = childrenMap[ride.user_id] || [];
        const selectedIds: string[] | null = ride.selected_children;
        const filteredChildren = selectedIds && selectedIds.length > 0
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ? allChildren.filter((c: any) => selectedIds.includes(c.id))
          : allChildren;
        return {
          ...ride,
          profile: profilesMap[ride.user_id] || null,
          userEmail: emailsMap[ride.user_id] || null,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          hasAcceptedConnection: (ride as any).is_fulfilled === true,
          children: filteredChildren,
        };
      });

      setRides(combinedRides);
      setLoading(false);
    };

    fetchRides();
  }, [userId]);

  return { rides, setRides, loading };
};

/* ═══════════════════════════════════════════════════════════════════
   SUB-COMPONENT: RideActionButton
   ═══════════════════════════════════════════════════════════════════ */

interface RideActionButtonProps {
  ride: Ride;
  currentUserId: string | undefined;
  isParent: boolean;
  responseStatus: string | null;
  onRespond: (ride: Ride) => void;
}

const RideActionButton: React.FC<RideActionButtonProps> = ({
  ride,
  currentUserId,
  isParent,
  responseStatus,
  onRespond,
}) => {
  const isOwnRide = ride.user_id === currentUserId;
  const rideIsFull = ride.hasAcceptedConnection && !isOwnRide && responseStatus !== "accepted";

  // Own ride
  if (isOwnRide) {
    return ride.hasAcceptedConnection ? (
      <Button className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700" disabled>
        <CheckCircle className="h-4 w-4" />
        Connected with another parent
      </Button>
    ) : (
      <Button className="w-full gap-2" disabled variant="secondary">
        <CheckCircle className="h-4 w-4" />
        This is your ride
      </Button>
    );
  }

  // Ride full
  if (rideIsFull) {
    return (
      <Button className="w-full gap-2" disabled variant="secondary">
        <Users className="h-4 w-4" />
        Ride Full
      </Button>
    );
  }

  // Not a parent
  if (!isParent) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button className="w-full gap-2" disabled variant="secondary">
            {ride.type === "request" ? (
              <>
                <Car className="h-4 w-4" />I Can Help!
              </>
            ) : (
              <>
                <Hand className="h-4 w-4" />I Need This!
              </>
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Only parents can manage rides. Ask your parent for help.</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  // Pending response
  if (responseStatus === "pending") {
    return (
      <Button className="w-full gap-2" disabled variant="outline">
        <Loader2 className="h-4 w-4 animate-spin" />
        {ride.type === "request" ? "Offer Sent - Pending" : "Request Pending"}
      </Button>
    );
  }

  // Accepted
  if (responseStatus === "accepted") {
    return (
      <Button className="w-full gap-2 bg-green-600 hover:bg-green-700" disabled>
        <CheckCircle className="h-4 w-4" />
        {ride.type === "request" ? "Offer Accepted!" : "Request Approved!"}
      </Button>
    );
  }

  // Declined
  if (responseStatus === "declined") {
    return (
      <Button className="w-full gap-2" disabled variant="secondary">
        <X className="h-4 w-4" />
        {ride.type === "request" ? "Offer Declined" : "Request Declined"}
      </Button>
    );
  }

  // Default: action button
  return (
    <Button className="w-full gap-2" onClick={() => onRespond(ride)}>
      {ride.type === "request" ? (
        <>
          <Car className="h-4 w-4" />
          Offer Your Ride
        </>
      ) : (
        <>
          <Hand className="h-4 w-4" />
          Request to Join
        </>
      )}
    </Button>
  );
};

/* ═══════════════════════════════════════════════════════════════════
   SUB-COMPONENT: SelectedRidePanel
   ═══════════════════════════════════════════════════════════════════ */

interface SelectedRidePanelProps {
  ride: Ride;
  currentUserId: string | undefined;
  isParent: boolean;
  isStudent: boolean;
  responseStatus: string | null;
  onClose: () => void;
  onRespond: (ride: Ride) => void;
  onDeleteRide?: (rideId: string) => void;
}

const SelectedRidePanel: React.FC<SelectedRidePanelProps> = ({
  ride,
  currentUserId,
  isParent,
  isStudent,
  responseStatus,
  onClose,
  onRespond,
  onDeleteRide,
}) => {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const isOwnRide = ride.user_id === currentUserId;

  const displayChildren = ride.children || [];

  const formatTime = (timeStr: string): string => {
    try {
      return new Date(`2000-01-01T${timeStr}`).toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
      });
    } catch {
      return timeStr;
    }
  };

  const seatsCount = ride.type === "offer" ? ride.seats_available : ride.seats_needed;

  return (
    <Card className="absolute bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-background/95 backdrop-blur-sm shadow-xl z-50">
      <CardHeader className="pb-2 pt-4 px-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            {/* Parent Name */}
            <h3 className="text-base font-bold truncate">{getDisplayName(ride)}</h3>
            <p className="text-xs text-muted-foreground">Parent/Adult</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge className={ride.type === "request" ? "bg-destructive text-destructive-foreground" : "bg-primary text-primary-foreground"}>
                  {ride.type === "request" ? (
                    <><Hand className="h-3 w-3 mr-1" /> Ride Request</>
                  ) : (
                    <><Car className="h-3 w-3 mr-1" /> Ride Offer</>
                  )}
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <p>{ride.type === "request" ? "This parent is requesting help from someone to fulfill this route" : "This parent is offering to drive others this route"}</p>
              </TooltipContent>
            </Tooltip>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={onClose}
              aria-label="Close ride details"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3 px-4 pb-4 pt-0">
        {/* Route */}
        <div className="text-sm space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Route</p>
          <div>
            <p className="text-xs font-semibold text-muted-foreground">Pickup</p>
            <p className="font-medium">{ride.pickup_location}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground">Dropoff</p>
            <p className="font-medium">{ride.dropoff_location}</p>
          </div>
        </div>

        {/* Date */}
        <div className="flex items-center gap-2 text-sm">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span>{format(new Date(ride.ride_date + 'T00:00:00'), "EEEE, MMMM d, yyyy")}</span>
        </div>

        {/* Time */}
        <div className="flex items-center gap-2 text-sm">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span>{formatTime(ride.ride_time)}</span>
        </div>

        {/* Seats */}
        {seatsCount != null && (
          <div className="text-sm">
            <span className="font-medium">{ride.type === "request" ? "Seats Needed" : "Seats Available"}: {seatsCount}</span>
          </div>
        )}

        {/* Children */}
        {displayChildren && displayChildren.length > 0 && (
          <div className="border-t pt-2">
            <p className="text-xs font-medium text-muted-foreground mb-1">Children Joining This Ride:</p>
            {displayChildren.map((child, idx) => (
              <div key={idx} className="text-sm flex items-center gap-1.5">
                <GraduationCap className="h-3.5 w-3.5 text-muted-foreground" />
                <span>{child.first_name} {child.last_name}</span>
                {child.grade_level && (
                  <span className="text-muted-foreground">• {child.grade_level}</span>
                )}
              </div>
            ))}
          </div>
        )}

        {/* View Profile Button */}
        <div className="border-t pt-2">
          <RideUserBadge
            userId={ride.user_id}
            firstName={ride.profile?.first_name || null}
            lastName={ride.profile?.last_name || null}
            username={getDisplayName(ride)}
            accountType="parent"
            email={ride.userEmail}
            phoneNumber={ride.profile?.phone_number}
            shareEmail={ride.profile?.share_email ?? false}
            sharePhone={ride.profile?.share_phone ?? false}
            isCurrentUser={ride.user_id === currentUserId}
            viewerIsStudent={isStudent}
            variant="compact"
            showViewButton
            distance={0}
          />
        </div>

        {/* Action */}
        <RideActionButton
          ride={ride}
          currentUserId={currentUserId}
          isParent={isParent}
          responseStatus={responseStatus}
          onRespond={onRespond}
        />

        {/* Delete button for own rides */}
        {isOwnRide && onDeleteRide && (
          <Button
            variant="destructive"
            size="sm"
            className="w-full gap-2 mt-2"
            onClick={() => setShowDeleteDialog(true)}
          >
            <Trash2 className="h-4 w-4" />
            Delete Ride
          </Button>
        )}

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Ride</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this ride? This cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                disabled={deleting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={async (e) => {
                  e.preventDefault();
                  setDeleting(true);
                  try {
                    await onDeleteRide(ride.id);
                    setShowDeleteDialog(false);
                  } catch {
                    // handled by parent
                  } finally {
                    setDeleting(false);
                  }
                }}
              >
                {deleting ? "Deleting..." : "Delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
};

/* ═══════════════════════════════════════════════════════════════════
   SUB-COMPONENT: MapLoadingState
   ═══════════════════════════════════════════════════════════════════ */

const MapLoadingState: React.FC<{ height: string }> = ({ height }) => (
  <div
    className="w-full bg-muted rounded-lg flex flex-col items-center justify-center border border-border gap-3"
    style={{ height }}
    role="status"
    aria-label="Loading map"
  >
    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    <p className="text-muted-foreground text-sm">Loading map…</p>
  </div>
);

/* ═══════════════════════════════════════════════════════════════════
   MAPBOX LAYER HELPERS
   ═══════════════════════════════════════════════════════════════════ */

const LAYER_IDS = ["clusters", "cluster-count", "unclustered-point"] as const;

const SOURCE_ID = "rides-source";

const cleanupMapLayers = (mapInstance: mapboxgl.Map) => {
  LAYER_IDS.forEach((id) => {
    if (mapInstance.getLayer(id)) mapInstance.removeLayer(id);
  });
  if (mapInstance.getSource(SOURCE_ID)) {
    mapInstance.removeSource(SOURCE_ID);
  }
};

const addClusterLayers = (mapInstance: mapboxgl.Map) => {
  // Cluster circles
  mapInstance.addLayer({
    id: "clusters",
    type: "circle",
    source: SOURCE_ID,
    filter: ["has", "point_count"],
    paint: {
      "circle-color": [
        "case",
        [">", ["get", "sumOffers"], 0],
        [
          "case",
          [">", ["get", "sumRequests"], 0],
          "#f59e0b", // Amber — mixed
          "#22c55e", // Green — all offers
        ],
        "#ef4444", // Red — all requests
      ],
      "circle-radius": ["step", ["get", "point_count"], 18, 10, 24, 25, 30],
      "circle-stroke-width": 2,
      "circle-stroke-color": "#ffffff",
    },
  });

  // Cluster count text
  mapInstance.addLayer({
    id: "cluster-count",
    type: "symbol",
    source: SOURCE_ID,
    filter: ["has", "point_count"],
    layout: {
      "text-field": "{point_count_abbreviated}",
      "text-size": 13,
      "text-font": ["DIN Pro Medium", "Arial Unicode MS Bold"],
      "text-allow-overlap": true,
    },
    paint: {
      "text-color": "#ffffff",
    },
  });

  // Unclustered points
  mapInstance.addLayer({
    id: "unclustered-point",
    type: "circle",
    source: SOURCE_ID,
    filter: ["!", ["has", "point_count"]],
    paint: {
      "circle-color": ["case", ["==", ["get", "type"], "offer"], "#22c55e", "#ef4444"],
      "circle-radius": 12,
      "circle-stroke-width": 2,
      "circle-stroke-color": "#ffffff",
    },
  });
};

/* ═══════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════════ */

const FindRidesMap: React.FC<FindRidesMapProps> = ({
  height = "500px",
  showRequests,
  showOffers,
  onToggleRequests,
  onToggleOffers,
  showHome = false,
  showSchool = true,
  onToggleHome,
  onToggleSchool,
  focusRide,
  onFocusRideHandled,
  radiusMiles = null,
  homeCoords = null,
}) => {
  const { user, profile } = useAuth();
  const { toast } = useToast();

  /* ── Refs ───────────────────────────────────────────────── */
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const mapLoadedRef = useRef(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const eventHandlersRef = useRef<Array<{ type: string; layer: string; handler: any }>>([]);

  /* ── Custom hooks ───────────────────────────────────────── */
  const { isUserParent, isUserStudent } = useUserInfo(user?.id, profile?.account_type);
  const { fetchUserResponses, getResponseStatus } = useRideResponses(user?.id);
  const { rides, setRides, loading } = useMapRides(user?.id);

  /* ── Local state ────────────────────────────────────────── */
  const [selectedRide, setSelectedRide] = useState<Ride | null>(null);
  const [respondingToRide, setRespondingToRide] = useState<Ride | null>(null);
  const [showJoinDialog, setShowJoinDialog] = useState(false);
  const [showOfferDialog, setShowOfferDialog] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  /* ── Derived data ───────────────────────────────────────── */
  const filteredRides = useMemo(
    () =>
      rides.filter((r) => {
        if (!((showRequests && r.type === "request") || (showOffers && r.type === "offer"))) {
          return false;
        }
        if (radiusMiles != null && homeCoords) {
          if (r.pickup_latitude == null || r.pickup_longitude == null) return false;
          const R = 3958.8;
          const toRad = (d: number) => (d * Math.PI) / 180;
          const dLat = toRad(r.pickup_latitude - homeCoords.lat);
          const dLon = toRad(r.pickup_longitude - homeCoords.lng);
          const a =
            Math.sin(dLat / 2) ** 2 +
            Math.cos(toRad(homeCoords.lat)) *
              Math.cos(toRad(r.pickup_latitude)) *
              Math.sin(dLon / 2) ** 2;
          const dist = R * 2 * Math.asin(Math.sqrt(a));
          if (dist > radiusMiles) return false;
        }
        return true;
      }),
    [rides, showRequests, showOffers, radiusMiles, homeCoords],
  );

  const rideCounts = useMemo(
    () => ({
      requests: rides.filter((r) => r.type === "request").length,
      offers: rides.filter((r) => r.type === "offer").length,
    }),
    [rides],
  );

  /* ── Initialize map ─────────────────────────────────────── */
  useEffect(() => {
    if (!mapContainer.current || !profile) return;

    mapboxgl.accessToken = MAPBOX_TOKEN;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const userLat = (profile as any)?.home_latitude;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const userLng = (profile as any)?.home_longitude;
    const center: [number, number] = userLat && userLng ? [userLng, userLat] : DEFAULT_CENTER;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center,
      zoom: DEFAULT_ZOOM,
    });

    map.current.addControl(new mapboxgl.NavigationControl(), "top-right");
    map.current.addControl(new mapboxgl.ScaleControl({ unit: "imperial" }), "bottom-left");

    map.current.on("load", () => {
      mapLoadedRef.current = true;
      setRides((prev) => [...prev]);
    });

    return () => {
      mapLoadedRef.current = false;
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      // Clean up event handlers
      eventHandlersRef.current.forEach(({ type, layer, handler }) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        map.current?.off(type as any, layer, handler);
      });
      eventHandlersRef.current = [];
      map.current?.remove();
      map.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile]);

  /* ── Update markers and layers ──────────────────────────── */
  useEffect(() => {
    if (!map.current || !mapLoadedRef.current) return;

    // Clear HTML markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    // Clean up previous event handlers
    eventHandlersRef.current.forEach(({ type, layer, handler }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      map.current?.off(type as any, layer, handler);
    });
    eventHandlersRef.current = [];

    // Clean up previous layers/source
    cleanupMapLayers(map.current);

    const bounds = new mapboxgl.LngLatBounds();
    let hasValidMarkers = false;

    // ── Home marker ──
    if (showHome && profile?.home_address && profile?.home_latitude && profile?.home_longitude) {
      const popup = createMarkerPopup("Your Home", "text-blue-600", profile.home_address);
      const marker = new mapboxgl.Marker(createHomeMarkerElement())
        .setLngLat([profile.home_longitude, profile.home_latitude])
        .setPopup(popup)
        .addTo(map.current!);

      markersRef.current.push(marker);
      bounds.extend([profile.home_longitude, profile.home_latitude]);
      hasValidMarkers = true;
    }

    // ── School marker ──
    if (showSchool) {
      const popup = createMarkerPopup(CHADWICK_SCHOOL.name, "text-orange-600", CHADWICK_SCHOOL.address);
      const marker = new mapboxgl.Marker(createSchoolMarkerElement())
        .setLngLat([CHADWICK_SCHOOL.lng, CHADWICK_SCHOOL.lat])
        .setPopup(popup)
        .addTo(map.current!);

      markersRef.current.push(marker);
      bounds.extend([CHADWICK_SCHOOL.lng, CHADWICK_SCHOOL.lat]);
      hasValidMarkers = true;
    }

    // ── Build GeoJSON ──
    const features = filteredRides
      .filter((r) => r.pickup_latitude != null && r.pickup_longitude != null)
      .map((ride) => {
        bounds.extend([ride.pickup_longitude!, ride.pickup_latitude!]);
        hasValidMarkers = true;
        return {
          type: "Feature" as const,
          properties: {
            id: ride.id,
            type: ride.type,
            isOffer: ride.type === "offer" ? 1 : 0,
            isRequest: ride.type === "request" ? 1 : 0,
          },
          geometry: {
            type: "Point" as const,
            coordinates: [ride.pickup_longitude!, ride.pickup_latitude!],
          },
        };
      });

    const geojsonData: GeoJSON.FeatureCollection = {
      type: "FeatureCollection",
      features,
    };

    // ── Add source + layers ──
    map.current.addSource(SOURCE_ID, {
      type: "geojson",
      data: geojsonData,
      cluster: true,
      clusterMaxZoom: CLUSTER_MAX_ZOOM,
      clusterRadius: CLUSTER_RADIUS,
      clusterProperties: {
        sumOffers: ["+", ["get", "isOffer"]],
        sumRequests: ["+", ["get", "isRequest"]],
      },
    });

    addClusterLayers(map.current);

    // ── Event handlers (tracked for cleanup) ──
    const onClusterClick = (e: mapboxgl.MapMouseEvent) => {
      const feats = map.current!.queryRenderedFeatures(e.point, {
        layers: ["clusters"],
      });
      if (!feats.length) return;
      const clusterId = feats[0].properties?.cluster_id;
      const source = map.current!.getSource(SOURCE_ID) as mapboxgl.GeoJSONSource;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      source.getClusterExpansionZoom(clusterId, (err: any, zoom: number) => {
        if (err) return;
        const coords = (feats[0].geometry as GeoJSON.Point).coordinates as [number, number];
        map.current!.easeTo({ center: coords, zoom });
      });
    };

    const onPointClick = (e: mapboxgl.MapMouseEvent) => {
      const feats = map.current!.queryRenderedFeatures(e.point, {
        layers: ["unclustered-point"],
      });
      if (!feats.length) return;
      const rideId = feats[0].properties?.id;
      const ride = rides.find((r) => r.id === rideId);
      if (ride) setSelectedRide(ride);
    };

    const pointerCursor = () => {
      if (map.current) map.current.getCanvas().style.cursor = "pointer";
    };
    const defaultCursor = () => {
      if (map.current) map.current.getCanvas().style.cursor = "";
    };

    map.current.on("click", "clusters", onClusterClick);
    map.current.on("click", "unclustered-point", onPointClick);
    map.current.on("mouseenter", "clusters", pointerCursor);
    map.current.on("mouseleave", "clusters", defaultCursor);
    map.current.on("mouseenter", "unclustered-point", pointerCursor);
    map.current.on("mouseleave", "unclustered-point", defaultCursor);

    // Track for cleanup
    eventHandlersRef.current = [
      { type: "click", layer: "clusters", handler: onClusterClick },
      { type: "click", layer: "unclustered-point", handler: onPointClick },
      { type: "mouseenter", layer: "clusters", handler: pointerCursor },
      { type: "mouseleave", layer: "clusters", handler: defaultCursor },
      { type: "mouseenter", layer: "unclustered-point", handler: pointerCursor },
      { type: "mouseleave", layer: "unclustered-point", handler: defaultCursor },
    ];

    // ── Fit bounds ──
    if (hasValidMarkers && !bounds.isEmpty()) {
      map.current.fitBounds(bounds, {
        padding: FIT_BOUNDS_PADDING,
        maxZoom: 14,
        duration: 1000,
      });
    }
  }, [showHome, showSchool, filteredRides, profile, rides]);

  /* ── Focus on a specific ride ───────────────────────────── */
  useEffect(() => {
    if (!focusRide || !map.current) return;

    const focusOnRide = async () => {
      const ride = rides.find((r) => r.id === focusRide.id);
      if (ride) setSelectedRide(ride);

      let coords: [number, number] | null = null;
      if (focusRide.pickup_latitude && focusRide.pickup_longitude) {
        coords = [focusRide.pickup_longitude, focusRide.pickup_latitude];
      } else if (focusRide.pickup_location) {
        coords = await geocodeAddress(focusRide.pickup_location);
      }

      if (coords && map.current) {
        map.current.flyTo({
          center: coords,
          zoom: 14,
          duration: 1500,
        });
      }

      onFocusRideHandled?.();
    };

    focusOnRide();
  }, [focusRide, rides, onFocusRideHandled]);

  /* ── Ride response handler ──────────────────────────────── */
  const initiateRespondToRide = useCallback((ride: Ride) => {
    setRespondingToRide(ride);
    if (ride.type === "offer") {
      setShowJoinDialog(true);
    } else {
      setShowOfferDialog(true);
    }
  }, []);

  const handleConfirmResponse = useCallback(async () => {
    if (!user || !respondingToRide) return;
    setActionLoading(true);

    const ownerName = getOwnerName(respondingToRide);

    try {
      const { error } = await supabase.from("ride_conversations").insert({
        ride_id: respondingToRide.id,
        sender_id: user.id,
        recipient_id: respondingToRide.user_id,
        status: "pending",
        message:
          respondingToRide.type === "request"
            ? "I can help with your ride request!"
            : "I'd like to join your offered ride!",
      });

      if (error) {
        toast({
          title: "Error",
          description: "Failed to send your request. Please try again.",
          variant: "destructive",
        });
        return;
      }

      // Send notification (non-blocking)
      supabase.functions
        .invoke("create-notification", {
          body: {
            userId: respondingToRide.user_id,
            type: respondingToRide.type === "request" ? "ride_offer_received" : "ride_join_request",
            message:
              respondingToRide.type === "request"
                ? `${profile?.first_name || "Someone"} offered to help with your ride request`
                : `${profile?.first_name || "Someone"} wants to join your ride`,
          },
        })
        .catch((err) => console.error("Error sending notification:", err));

      toast({
        title: respondingToRide.type === "request" ? "Offer Sent!" : "Request Sent!",
        description:
          respondingToRide.type === "request"
            ? `Your ride offer was sent to ${ownerName}! They'll be notified and can accept or decline.`
            : `Your join request was sent to ${ownerName}! They'll be notified and can approve or decline.`,
      });

      await fetchUserResponses();
      setSelectedRide(null);
    } catch {
      toast({
        title: "Error",
        description: "An error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setActionLoading(false);
      setShowJoinDialog(false);
      setShowOfferDialog(false);
      setRespondingToRide(null);
    }
  }, [user, respondingToRide, profile, toast, fetchUserResponses]);

  /* ── Render ─────────────────────────────────────────────── */
  if (!MAPBOX_TOKEN) {
    return <MapLoadingState height={height} />;
  }

  return (
    <div className="relative" style={{ height }}>
      {/* Map */}
      <div ref={mapContainer} className="w-full h-full rounded-lg" role="application" aria-label="Carpool rides map" />

      {/* Loading overlay */}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/50 rounded-lg z-10">
          <div className="flex items-center gap-2 bg-background/90 px-4 py-2 rounded-full shadow">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">Loading rides…</span>
          </div>
        </div>
      )}

      {/* Filter Panel */}
      <div className="absolute top-4 left-4 z-10">
        <MapFilterPanel
          showHome={showHome}
          showSchool={showSchool}
          onToggleHome={onToggleHome || (() => {})}
          onToggleSchool={onToggleSchool || (() => {})}
        />
      </div>

      {/* No rides message */}
      {!loading && filteredRides.length === 0 && rides.length > 0 && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10">
          <Badge variant="secondary" className="bg-background/90 backdrop-blur-sm shadow px-4 py-2">
            No {showRequests && !showOffers ? "requests" : !showRequests && showOffers ? "offers" : "rides"} match your
            filters
          </Badge>
        </div>
      )}

      {/* Selected Ride Panel */}
      {selectedRide && (
        <SelectedRidePanel
          ride={selectedRide}
          currentUserId={user?.id}
          isParent={isUserParent}
          isStudent={isUserStudent}
          responseStatus={getResponseStatus(selectedRide.id)}
          onClose={() => setSelectedRide(null)}
          onRespond={initiateRespondToRide}
          onDeleteRide={async (rideId: string) => {
            // Delete pending conversations
            await supabase
              .from('ride_conversations')
              .update({ status: 'declined' })
              .eq('ride_id', rideId)
              .eq('status', 'pending');

            const { error } = await supabase
              .from('rides')
              .delete()
              .eq('id', rideId)
              .eq('user_id', user!.id);

            if (error) {
              toast({ title: "Error", description: "Failed to delete ride.", variant: "destructive" });
              throw error;
            }

            setRides(prev => prev.filter(r => r.id !== rideId));
            setSelectedRide(null);
            toast({ title: "Ride deleted", description: "Your ride has been removed." });
          }}
        />
      )}

      {/* Confirmation Dialogs */}
      <JoinRideDialog
        open={showJoinDialog}
        onOpenChange={setShowJoinDialog}
        onConfirm={handleConfirmResponse}
        ownerName={getOwnerName(respondingToRide)}
        loading={actionLoading}
      />

      <OfferRideDialog
        open={showOfferDialog}
        onOpenChange={setShowOfferDialog}
        onConfirm={handleConfirmResponse}
        requesterName={getOwnerName(respondingToRide)}
        loading={actionLoading}
      />
    </div>
  );
};

export default FindRidesMap;
