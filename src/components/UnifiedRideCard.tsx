import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { preloadRoute } from "@/lib/routePreload";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
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
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Users, 
  Phone,
  Mail,
  X,
  Car,
  HandHelping,
  Hand,
  CheckCircle,
  Star,
  GraduationCap,
  Loader2,
  UserCheck,
  UserX,
  LogOut,
  AlertTriangle,
  MessageCircle,
  Contact,
  Repeat,
} from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { ContactCardModal } from "@/components/ContactCardModal";
import { RideChatThread } from "@/components/RideChatThread";

export interface ParticipantInfo {
  id: string;
  firstName: string | null;
  lastName: string | null;
  username: string;
  email: string | null;
  phone: string | null;
  children: { name: string; grade: string }[];
  carMake?: string | null;
  carModel?: string | null;
  carColor?: string | null;
  licensePlate?: string | null;
}

export interface PendingJoinRequest {
  conversationId: string;
  requesterId: string;
  requesterName: string;
  requesterEmail: string | null;
  requesterPhone: string | null;
  children: { name: string; grade: string }[];
  message: string | null;
  requestedAt: string;
}

export interface UnifiedRide {
  id: string;
  source: 'posted' | 'conversation' | 'private' | 'series';
  rideType: 'request' | 'offer';
  status: 'posted-looking' | 'posted-offering' | 'joined-ride' | 'helping-out' | 'confirmed' | 'pending-approval' | 'pending-direct-sent' | 'pending-direct-received';
  rideStatus?: 'active' | 'completed' | 'cancelled' | 'expired';
  pickupLocation: string;
  dropoffLocation: string;
  rideDate: string;
  rideTime: string;
  seatsAvailable: number | null;
  seatsNeeded: number | null;
  isDriver: boolean;
  otherParent: ParticipantInfo | null;
  myChildren?: { name: string; grade: string }[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  originalData: any;
  _studentView?: boolean;
  _driverName?: string;
  _studentPassengerName?: string;
  pendingRequests?: PendingJoinRequest[];
  myCarInfo?: {
    carMake: string | null;
    carModel: string | null;
    carColor: string | null;
    licensePlate: string | null;
  };
}

export type CancelAction = 'cancel-offer' | 'leave-offer' | 'cancel-request' | 'leave-request' | 'cancel-direct' | 'cancel-series' | 'leave-series' | 'cancel-pending';

interface UnifiedRideCardProps {
  ride: UnifiedRide;
  onCancel?: (ride: UnifiedRide, action: CancelAction) => void;
  isPast?: boolean;
  topConnectionIds?: string[];
  onAcceptRequest?: (conversationId: string) => void;
  onDeclineRequest?: (conversationId: string) => void;
  onAcceptDirect?: (requestId: string) => void;
  onDeclineDirect?: (requestId: string) => void;
  acceptDeclineLoading?: string | null;
}

const getStatusConfig = (ride: UnifiedRide) => {
  // Series recurring ride
  if (ride.source === 'series') {
    return { label: 'Recurring Series Ride', className: 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950 dark:text-teal-300 dark:border-teal-800', icon: Repeat };
  }
  if (ride.status === 'pending-direct-sent') {
    return { label: 'Pending - Awaiting Response', className: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800', icon: Clock };
  }
  if (ride.status === 'pending-direct-received') {
    return { label: 'Direct Ride - Action Required', className: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800', icon: Clock };
  }
  if (ride.status === 'pending-approval') {
    return { label: 'Pending - Awaiting Approval', className: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800', icon: Clock };
  }
  if (ride.source === 'posted' && ride.otherParent) {
    return ride.isDriver
      ? { label: "You're Driving", className: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800', icon: Car }
      : { label: "You're a Passenger", className: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800', icon: CheckCircle };
  }
  switch (ride.status) {
    case 'posted-looking':
      return { label: 'Pending - Waiting for Help', className: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800', icon: Clock };
    case 'posted-offering':
      return { label: 'Pending - Waiting for Riders', className: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800', icon: Clock };
    case 'joined-ride':
      return { label: "You're a Passenger", className: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800', icon: Car };
    case 'helping-out':
      return { label: 'Helping Out', className: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-800', icon: HandHelping };
    case 'confirmed':
      return { label: 'Confirmed', className: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800', icon: CheckCircle };
    default:
      return { label: 'Unknown', className: 'bg-muted text-muted-foreground', icon: null };
  }
};

const getParentName = (p: ParticipantInfo | null) => {
  if (!p) return 'Unknown';
  if (p.firstName && p.lastName) return `${p.firstName} ${p.lastName}`;
  if (p.firstName) return p.firstName;
  if (p.username) return p.username;
  if (p.email) return p.email;
  return 'Unknown';
};

const formatGrade = (grade: string) => {
  if (!grade || grade === 'N/A') return '';
  if (grade === 'Parent/Adult') return '';
  return grade.replace(' Grade', '').replace('grade', '').trim();
};

function isWithin9Hours(rideDate: string, rideTime: string): boolean {
  const rideDateTime = new Date(`${rideDate}T${rideTime}:00`);
  const now = new Date();
  const diffMs = rideDateTime.getTime() - now.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);
  return diffHours <= 9;
}

function getCancelActionConfig(ride: UnifiedRide): {
  action: CancelAction;
  label: string;
  icon: typeof X;
  confirmTitle: string;
  confirmDescription: string;
  hasTimeRestriction: boolean;
  timeRestrictedMessage: string;
} | null {
  // Ride Offer posted by user → Cancel Ride (9-hour restriction)
  if (ride.source === 'posted' && ride.rideType === 'offer') {
    return {
      action: 'cancel-offer',
      label: 'Cancel Ride',
      icon: X,
      confirmTitle: 'Cancel Ride Offer',
      confirmDescription: 'Are you sure you want to cancel this ride? This will remove your ride offer entirely.',
      hasTimeRestriction: true,
      timeRestrictedMessage: 'Rides cannot be cancelled within 9 hours of departure',
    };
  }
  // Joined a Ride Offer → Leave Ride (no restriction)
  if (ride.source === 'conversation' && ride.status === 'joined-ride') {
    return {
      action: 'leave-offer',
      label: 'Leave Ride',
      icon: LogOut,
      confirmTitle: 'Leave Ride',
      confirmDescription: 'Are you sure you want to leave this ride? The ride will remain active for others to join.',
      hasTimeRestriction: false,
      timeRestrictedMessage: '',
    };
  }
  // Ride Request posted by user → Cancel Request (no restriction)
  if (ride.source === 'posted' && ride.rideType === 'request') {
    return {
      action: 'cancel-request',
      label: 'Cancel Request',
      icon: X,
      confirmTitle: 'Cancel Ride Request',
      confirmDescription: 'Are you sure you want to cancel your ride request? This will remove your request entirely.',
      hasTimeRestriction: false,
      timeRestrictedMessage: '',
    };
  }
  // Helping out with a Request → Leave Ride (9-hour restriction)
  if (ride.source === 'conversation' && ride.status === 'helping-out') {
    return {
      action: 'leave-request',
      label: 'Leave Ride',
      icon: LogOut,
      confirmTitle: 'Leave Ride',
      confirmDescription: 'Are you sure you want to stop helping with this ride request? The request will become open again for others.',
      hasTimeRestriction: true,
      timeRestrictedMessage: 'You cannot leave a ride within 9 hours of departure',
    };
  }
  // Pending approval (user requested to join or offered to help) → Cancel pending request
  if (ride.source === 'conversation' && ride.status === 'pending-approval') {
    return {
      action: 'cancel-pending' as CancelAction,
      label: 'Cancel Request',
      icon: X,
      confirmTitle: 'Cancel Pending Request',
      confirmDescription: 'Are you sure you want to cancel your pending request? This will remove your request entirely.',
      hasTimeRestriction: false,
      timeRestrictedMessage: '',
    };
  }
  // Pending direct ride sent by user → Cancel (no time restriction for pending)
  if (ride.source === 'private' && ride.status === 'pending-direct-sent') {
    return {
      action: 'cancel-direct',
      label: 'Cancel',
      icon: X,
      confirmTitle: 'Cancel Direct Ride',
      confirmDescription: 'Are you sure you want to cancel this direct ride? The other parent will be notified.',
      hasTimeRestriction: false,
      timeRestrictedMessage: '',
    };
  }
  // Accepted direct ride - both parties can cancel (9-hour restriction)
  if (ride.source === 'private' && (ride.status === 'joined-ride' || ride.status === 'helping-out' || ride.status === 'confirmed')) {
    return {
      action: 'cancel-direct',
      label: 'Cancel Ride',
      icon: X,
      confirmTitle: 'Cancel Direct Ride',
      confirmDescription: 'Are you sure? This will permanently remove this ride for both you and the other parent.',
      hasTimeRestriction: true,
      timeRestrictedMessage: 'This ride cannot be cancelled within 9 hours of departure',
    };
  }
  // Series ride - driver cancels (9-hour rule), passenger leaves (no restriction)
  if (ride.source === 'series') {
    if (ride.isDriver) {
      return {
        action: 'cancel-series' as CancelAction,
        label: 'Cancel This Ride',
        icon: X,
        confirmTitle: 'Cancel This Series Ride',
        confirmDescription: 'Are you sure you want to cancel this occurrence? The rest of the series continues as scheduled.',
        hasTimeRestriction: true,
        timeRestrictedMessage: 'This ride cannot be cancelled within 9 hours of departure',
      };
    } else {
      return {
        action: 'leave-series' as CancelAction,
        label: 'Leave This Ride',
        icon: LogOut,
        confirmTitle: 'Leave This Series Ride',
        confirmDescription: 'Are you sure you want to leave this ride? The rest of the series continues as scheduled.',
        hasTimeRestriction: false,
        timeRestrictedMessage: '',
      };
    }
  }
  return null;
}

export const UnifiedRideCardSkeleton = () => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.3 }}
  >
    <Card className="rounded-2xl shadow-sm border border-gray-100 bg-white/80 backdrop-blur-sm overflow-hidden">
      <CardContent className="p-5">
        {/* Status Badge Skeleton */}
        <div className="flex items-center justify-between mb-4">
          <Skeleton className="h-7 w-32 rounded-full" />
          <div className="flex gap-2">
            <Skeleton className="h-6 w-20 rounded-full" />
            <Skeleton className="h-6 w-16 rounded-full" />
          </div>
        </div>
        
        {/* Route Section Skeleton */}
        <div className="bg-gray-50 rounded-xl p-4 mb-4 space-y-3">
          <div className="flex items-center gap-3">
            <Skeleton className="w-4 h-4 rounded-full" />
            <Skeleton className="h-4 flex-1 rounded" />
          </div>
          <div className="flex items-center gap-3">
            <Skeleton className="w-4 h-4 rounded-full" />
            <Skeleton className="h-4 w-3/4 rounded" />
          </div>
        </div>
        
        {/* Date/Time Skeleton */}
        <div className="flex gap-4 mb-4">
          <Skeleton className="h-4 w-32 rounded" />
          <Skeleton className="h-4 w-24 rounded" />
        </div>
        
        {/* Info Sections Skeleton */}
        <div className="space-y-3">
          <Skeleton className="h-20 w-full rounded-xl" />
          <Skeleton className="h-16 w-full rounded-xl" />
        </div>
      </CardContent>
    </Card>
  </motion.div>
);

export const UnifiedRideCard = ({ ride, onCancel, isPast, topConnectionIds, onAcceptRequest, onDeclineRequest, onAcceptDirect, onDeclineDirect, acceptDeclineLoading }: UnifiedRideCardProps) => {
  const navigate = useNavigate();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [authUserId, setAuthUserId] = useState<string>('');
  const [currentUserFullName, setCurrentUserFullName] = useState<string>('A parent');
  const statusConfig = getStatusConfig(ride);
  const isFrequentPartner = topConnectionIds && ride.otherParent && topConnectionIds.includes(ride.otherParent.id);
  const StatusIcon = statusConfig.icon;

  // Determine if this is a confirmed ride with another parent
  const isSeriesRide = ride.source === 'series';
  const isConfirmed = !!(ride.otherParent && !isPast && (
    ride.status === 'joined-ride' as string ||
    ride.status === 'helping-out' as string ||
    ride.status === 'confirmed' as string ||
    (ride.source === 'posted' && ride.otherParent) ||
    (ride.source === 'private') ||
    isSeriesRide
  ));

  const rideSource = ride.source === 'private' ? 'private' : 'public';
  const chatRideRefId = rideSource === 'public'
    ? (ride.originalData?.ride?.id || ride.originalData?.conversation?.ride_id || ride.id)
    : ride.id;
  const currentUserId = ride.isDriver
    ? (ride.source === 'posted' ? ride.originalData?.user_id : ride.originalData?.conversation?.sender_id)
    : (ride.source === 'posted' ? ride.originalData?.user_id : ride.originalData?.conversation?.sender_id);

  // Fetch auth user ID and unread message count
  useEffect(() => {
    if (!isConfirmed || isPast || !ride.otherParent) return;
    
    const fetchUnread = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setAuthUserId(user.id);

      // Fetch current user's name for notifications
      const { data: profile } = await supabase
        .from('profiles')
        .select('first_name, last_name, username')
        .eq('id', user.id)
        .single();
      if (profile) {
        const name = [profile.first_name, profile.last_name].filter(Boolean).join(' ') || profile.username || 'A parent';
        setCurrentUserFullName(name);
      }
      
      const { count } = await supabase
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .from('ride_messages' as any)
        .select('*', { count: 'exact', head: true })
        .eq('ride_ref_id', chatRideRefId)
        .eq('ride_source', rideSource)
        .neq('sender_id', user.id)
        .eq('is_read', false);
      
      setUnreadCount(count || 0);
    };
    
    fetchUnread();

    // Subscribe to new messages for unread badge
    const channel = supabase
      .channel(`unread-${ride.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'ride_messages',
        filter: `ride_ref_id=eq.${chatRideRefId}`,
      }, () => {
        if (!chatOpen) {
          setUnreadCount(prev => prev + 1);
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatOpen, chatRideRefId, isConfirmed, isPast, ride.id, rideSource]);

  // Reset unread when chat opens
  useEffect(() => {
    if (chatOpen) setUnreadCount(0);
  }, [chatOpen]);

  const cancelConfig = !isPast && !ride._studentView && onCancel ? getCancelActionConfig(ride) : null;
  const isTimeRestricted = cancelConfig?.hasTimeRestriction ? isWithin9Hours(ride.rideDate, ride.rideTime) : false;

  const rideStatusBadge = isPast && ride.rideStatus && ride.rideStatus !== 'active' ? (
    <Badge variant="outline" className={
      ride.rideStatus === 'completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300' :
      ride.rideStatus === 'cancelled' ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300' :
      'bg-muted text-muted-foreground'
    }>
      {ride.rideStatus === 'completed' ? 'Completed' : ride.rideStatus === 'cancelled' ? 'Cancelled' : 'Expired'}
    </Badge>
  ) : null;

  const driverName = ride._driverName || (ride.isDriver ? 'You' : getParentName(ride.otherParent));
  const driverPhone = ride.isDriver ? null : ride.otherParent?.phone;
  const currentStudentPassenger = ride._studentPassengerName?.trim().toLowerCase();

  const allPassengerChildren: { name: string; grade: string }[] = [
    ...(ride.myChildren || []),
    ...(ride.otherParent?.children || []),
  ].filter((child, index, array) => {
    const key = `${child.name}-${child.grade}`.toLowerCase();
    return index === array.findIndex((item) => `${item.name}-${item.grade}`.toLowerCase() === key);
  });

  const CancelIcon = cancelConfig?.icon || X;

  return (
    <>
      <motion.div
        whileHover={!isPast ? { y: -4, scale: 1.01 } : {}}
        whileTap={!isPast ? { scale: 0.99 } : {}}
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
      >
      <Card className={`rounded-2xl shadow-sm hover:shadow-lg transition-all duration-300 border bg-white/90 backdrop-blur-sm overflow-hidden ${isPast ? 'opacity-70' : ''} ${
        ride.status === 'pending-approval' ||
        ride.status === 'pending-direct-sent' ||
        ride.status === 'pending-direct-received' ||
        ((ride.status === 'posted-looking' || ride.status === 'posted-offering') && !ride.otherParent)
          ? 'border-amber-300 ring-1 ring-amber-200'
          : 'border-gray-100'
      }`}>
        <CardContent className="p-5 space-y-4">
          {/* Pending status banner */}
          {(() => {
            const otherName = getParentName(ride.otherParent) || 'the other parent';
            const pendingCount = ride.pendingRequests?.length || 0;
            let bannerText: string | null = null;
            if (ride.status === 'pending-approval') {
              bannerText = `Pending ride — ${otherName} has to confirm first`;
            } else if (ride.status === 'pending-direct-sent') {
              bannerText = `Pending ride — waiting for ${otherName} to respond`;
            } else if (ride.status === 'pending-direct-received') {
              bannerText = `Pending ride — your response needed for ${otherName}`;
            } else if (ride.status === 'posted-looking' && !ride.otherParent) {
              bannerText = pendingCount > 0
                ? `Pending ride — ${pendingCount} parent${pendingCount > 1 ? 's' : ''} offered to help, awaiting your approval`
                : `Pending ride — waiting for a parent to offer help`;
            } else if (ride.status === 'posted-offering' && !ride.otherParent) {
              bannerText = pendingCount > 0
                ? `Pending ride — ${pendingCount} parent${pendingCount > 1 ? 's' : ''} requested to join, awaiting your approval`
                : `Pending ride — waiting for riders to request a seat`;
            }
            if (!bannerText) return null;
            return (
              <div className="flex items-center gap-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 dark:bg-amber-950/30 dark:border-amber-800">
                <Clock className="h-4 w-4 text-amber-600 flex-shrink-0" />
                <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">{bannerText}</p>
              </div>
            );
          })()}

          {/* Frequent Partner Badge Row (Status badge removed per request) */}
          {(isFrequentPartner || rideStatusBadge) && (
            <div className="flex items-center justify-end flex-wrap gap-2">
              {isFrequentPartner && (
                <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 gap-0.5">
                  <Star className="h-3 w-3 fill-current" />
                  Frequent
                </Badge>
              )}
              {rideStatusBadge}
            </div>
          )}

          {/* Route Section */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Route</p>
            <div className="flex items-start gap-3 bg-muted/50 rounded-lg p-3">
              <div className="flex flex-col items-center gap-0.5 pt-0.5">
                <MapPin className="h-4 w-4 text-emerald-600" />
                <div className="w-px h-5 bg-border" />
                <MapPin className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0 space-y-2">
                <div>
                  <p className="text-xs text-muted-foreground">Pickup</p>
                  <p className="text-sm font-medium text-foreground">{ride.pickupLocation}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Dropoff</p>
                  <p className="text-sm font-medium text-foreground">{ride.dropoffLocation}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Date & Time */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Date & Time</p>
            <div className="flex flex-wrap items-center gap-4 text-sm">
              <div className="flex items-center gap-1.5 text-foreground">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{format(new Date(ride.rideDate + 'T00:00:00'), 'EEEE, MMMM d, yyyy')}</span>
              </div>
              <div className="flex items-center gap-1.5 text-foreground">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{ride.rideTime}</span>
              </div>
            </div>
          </div>

          {/* Driver Section */}
          <div className="space-y-3">
            <div className="bg-emerald-50/50 dark:bg-emerald-950/20 rounded-lg p-3 space-y-1.5">
              <div className="flex items-center gap-2">
                <Car className="h-4 w-4 text-emerald-600" />
                <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 uppercase">Driver</span>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-semibold text-foreground">{driverName}</span>
                {driverPhone && (
                  <a href={`tel:${driverPhone}`} className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                    <Phone className="h-3 w-3" />
                    {driverPhone}
                  </a>
                )}
              </div>
              {(() => {
                // For series rides, show ALL driver vehicles in a row
                if (isSeriesRide && ride.originalData?.driverVehicles?.length > 0) {
                  const vehicles = ride.originalData.driverVehicles as { car_make: string; car_model: string; car_color: string; license_plate: string; is_primary: boolean }[];
                  return (
                    <div className="mt-1.5 space-y-1">
                      <p className="text-xs font-medium text-muted-foreground">Driver's Vehicles:</p>
                      <div className="flex flex-wrap gap-2">
                        {vehicles.map((v, i) => {
                          const parts = [v.car_color, v.car_make, v.car_model].filter(Boolean).join(' ');
                          return (
                            <span key={i} className="inline-flex items-center gap-1 text-xs text-muted-foreground bg-muted/60 rounded px-2 py-1">
                              {parts} — Plate: {v.license_plate || 'N/A'}
                              {v.is_primary && <span className="text-[10px] text-primary font-medium">(Primary)</span>}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  );
                }
                // For non-series rides, show single vehicle as before
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const carInfo = (ride as any)._studentView ? ride.myCarInfo : (ride.isDriver ? ride.myCarInfo : ride.otherParent);
                const hasVehicle = carInfo && (carInfo.carMake || carInfo.carModel || carInfo.carColor);
                if (!hasVehicle) return null;
                const vehicleParts = [carInfo.carColor, carInfo.carMake, carInfo.carModel].filter(Boolean).join(' ');
                return (
                  <div className="mt-1 space-y-0.5 text-xs text-muted-foreground">
                    {vehicleParts && <p>Vehicle: {vehicleParts}</p>}
                    {carInfo.licensePlate && <p>License Plate: {carInfo.licensePlate}</p>}
                  </div>
                );
              })()}
            </div>

            {/* Other Parent / Coordinating With section */}
            {ride.otherParent && (
              <div className="bg-indigo-50/50 dark:bg-indigo-950/20 rounded-lg p-3 space-y-1">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-indigo-600" />
                  <span className="text-xs font-semibold text-indigo-700 dark:text-indigo-400 uppercase">
                    {ride._studentView ? 'Other Parent' : 'Coordinating With'}
                  </span>
                </div>
                <span className="text-sm font-semibold text-foreground">{getParentName(ride.otherParent)}</span>
              </div>
            )}

            {allPassengerChildren.length > 0 ? (
              <div className="bg-blue-50/50 dark:bg-blue-950/20 rounded-lg p-3 space-y-1.5">
                <div className="flex items-center gap-2">
                  <GraduationCap className="h-4 w-4 text-blue-600" />
                  <span className="text-xs font-semibold text-blue-700 dark:text-blue-400 uppercase">Passengers</span>
                </div>
                <div className="space-y-1">
                  {allPassengerChildren.map((child, i) => {
                    const isCurrentStudent = currentStudentPassenger === child.name.trim().toLowerCase();
                    return (
                      <div key={i} className="flex items-center gap-1.5 text-sm text-foreground">
                        <span className="text-xs font-medium text-blue-600 dark:text-blue-400">Chadwick Student:</span>
                        <span className="font-medium">{child.name}</span>
                        {formatGrade(child.grade) && (
                          <span className="text-muted-foreground text-xs">, {formatGrade(child.grade)}</span>
                        )}
                        {isCurrentStudent && (
                          <span className="text-xs text-muted-foreground">(you)</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : ride.originalData?._seriesRide && ride.originalData?.pendingChildrenMessage ? (
              <div className="bg-amber-50/50 dark:bg-amber-950/20 rounded-lg p-3 border border-dashed border-amber-200 dark:border-amber-800">
                <p className="text-sm text-amber-700 dark:text-amber-300 italic text-center">
                  {ride.originalData.pendingChildrenMessage}
                </p>
              </div>
            ) : (
              !isPast && (ride.status === 'posted-looking' || ride.status === 'posted-offering') && (
                <div className="bg-muted/30 rounded-lg p-3 border border-dashed border-border">
                  <p className="text-sm text-muted-foreground italic text-center">
                    {ride.status === 'posted-looking'
                      ? 'Waiting for a driver to respond…'
                      : 'No passengers yet — available for others to join'}
                  </p>
                </div>
              )
            )}
          </div>

          {/* Pending Join Requests */}
          {!isPast && ride.pendingRequests && ride.pendingRequests.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 gap-1">
                  <Users className="h-3 w-3" />
                  {ride.pendingRequests.length} Pending Join Request{ride.pendingRequests.length > 1 ? 's' : ''}
                </Badge>
              </div>
              {ride.pendingRequests.map((req) => (
                <div key={req.conversationId} className="bg-amber-50/50 dark:bg-amber-950/20 rounded-lg p-3 space-y-2 border border-amber-200/50 dark:border-amber-800/50">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-foreground">{req.requesterName}</p>
                    {req.requesterEmail && (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Mail className="h-3 w-3" />
                        <span>{req.requesterEmail}</span>
                      </div>
                    )}
                    {req.requesterPhone && (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Phone className="h-3 w-3" />
                        <span>{req.requesterPhone}</span>
                      </div>
                    )}
                    <div className="mt-1 space-y-0.5">
                      {req.children.length > 0 ? (
                        <>
                          <p className="text-xs font-medium text-muted-foreground">Chadwick Children Joining This Ride:</p>
                          {req.children.map((child, i) => (
                            <div key={i} className="flex items-center gap-1.5 text-xs">
                              <GraduationCap className="h-3 w-3 text-blue-600" />
                              <span className="font-medium">{child.name}</span>
                              {formatGrade(child.grade) && (
                                <span className="text-muted-foreground">({formatGrade(child.grade)})</span>
                              )}
                            </div>
                          ))}
                        </>
                      ) : (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground italic">
                          <GraduationCap className="h-3 w-3" />
                          <span>No children listed</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <Button
                      size="sm"
                      className="flex-1 gap-1"
                      onClick={() => onAcceptRequest?.(req.conversationId)}
                      disabled={acceptDeclineLoading === req.conversationId}
                    >
                      {acceptDeclineLoading === req.conversationId ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <UserCheck className="h-3.5 w-3.5" />
                      )}
                      Accept
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 gap-1 text-destructive hover:bg-destructive/10"
                      onClick={() => onDeclineRequest?.(req.conversationId)}
                      disabled={acceptDeclineLoading === req.conversationId}
                    >
                      <UserX className="h-3.5 w-3.5" />
                      Decline
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Direct Ride Accept/Decline */}
          {!isPast && ride.status === 'pending-direct-received' && (
            <div className="bg-amber-50/50 dark:bg-amber-950/20 rounded-lg p-3 space-y-2 border border-amber-200/50 dark:border-amber-800/50">
              <p className="text-sm font-medium text-foreground">
                {getParentName(ride.otherParent)} sent you a direct ride {ride.rideType}
              </p>
              {ride.originalData?.message && (
                <p className="text-xs text-muted-foreground italic">"{ride.originalData.message}"</p>
              )}
              <div className="flex gap-2 pt-1">
                <Button
                  size="sm"
                  className="flex-1 gap-1"
                  onClick={() => onAcceptDirect?.(ride.id)}
                  disabled={acceptDeclineLoading === ride.id}
                >
                  {acceptDeclineLoading === ride.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <UserCheck className="h-3.5 w-3.5" />
                  )}
                  Accept
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 gap-1 text-destructive hover:bg-destructive/10"
                  onClick={() => onDeclineDirect?.(ride.id)}
                  disabled={acceptDeclineLoading === ride.id}
                >
                  <UserX className="h-3.5 w-3.5" />
                  Decline
                </Button>
              </div>
            </div>
          )}

          {/* Seats Info - hide for series rides */}
          {!isSeriesRide && (
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Users className="h-3.5 w-3.5" />
              <span>
                {ride.seatsAvailable
                  ? `${ride.seatsAvailable} seat${ride.seatsAvailable > 1 ? 's' : ''} available`
                  : ride.seatsNeeded
                    ? `${ride.seatsNeeded} seat${ride.seatsNeeded > 1 ? 's' : ''} needed`
                    : '—'}
              </span>
            </div>
          )}

          {/* Contact & Messages buttons for confirmed rides */}
          {isConfirmed && ride.otherParent && (
            <div className="pt-2 border-t border-border space-y-3">
              <div className="flex gap-2">
                {/* Contact Card - visible for both parents and students */}
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 gap-1.5 text-xs"
                  onClick={() => setContactOpen(true)}
                >
                  <Contact className="h-3.5 w-3.5" />
                  View Contact Info for the Other Parent on This Ride
                </Button>
                {/* Messages button - for series rides, link to Series tab */}
                {!ride._studentView && (
                  isSeriesRide ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 gap-1.5 text-xs"
                      onMouseEnter={() => preloadRoute('/series')}
                      onTouchStart={() => preloadRoute('/series')}
                      onClick={() => navigate('/series')}
                    >
                      <MessageCircle className="h-3.5 w-3.5" />
                      Messages (in Series)
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 gap-1.5 text-xs relative"
                      onClick={() => setChatOpen(!chatOpen)}
                    >
                      <MessageCircle className="h-3.5 w-3.5" />
                      Messages
                      {unreadCount > 0 && (
                        <span className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-destructive text-destructive-foreground text-[10px] flex items-center justify-center font-medium">
                          {unreadCount}
                        </span>
                      )}
                    </Button>
                  )
                )}
              </div>
            </div>
          )}

          {/* Expandable Chat Thread - hidden for students and series rides */}
          {chatOpen && !ride._studentView && !isSeriesRide && isConfirmed && ride.otherParent && authUserId && (
            <RideChatThread
              rideRefId={chatRideRefId}
              rideSource={rideSource}
              currentUserId={authUserId}
              currentUserName={currentUserFullName}
              otherParentId={ride.otherParent.id}
              otherParentName={getParentName(ride.otherParent)}
              isStudent={false}
              rideDate={ride.rideDate}
            />
          )}

          {/* Cancel/Leave button */}
          {cancelConfig && (
            <div className="pt-2 border-t border-border space-y-1.5">
              <Button
                variant="destructive"
                size="sm"
                className="w-full"
                onClick={() => setConfirmOpen(true)}
                disabled={isTimeRestricted}
              >
                <CancelIcon className="h-3.5 w-3.5 mr-1.5" />
                {cancelConfig.label}
              </Button>
              {cancelConfig.hasTimeRestriction && (
                <p className="text-xs text-muted-foreground text-center">
                  {isTimeRestricted
                    ? 'This action is no longer available within 9 hours of the scheduled ride time'
                    : cancelConfig.action === 'leave-request'
                      ? 'Must be left at least 9 hours before the scheduled ride time'
                      : 'Must be cancelled at least 9 hours before the scheduled ride time'}
                </p>
              )}
          </div>
        )}
        </CardContent>
      </Card>
      </motion.div>

      {/* Confirmation Dialog */}
      {cancelConfig && (
        <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{cancelConfig.confirmTitle}</AlertDialogTitle>
              <AlertDialogDescription>{cancelConfig.confirmDescription}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>No, go back</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={() => onCancel?.(ride, cancelConfig.action)}
              >
                Yes, {cancelConfig.label.toLowerCase()}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {/* Contact Card Modal */}
      {ride.otherParent && (
        <ContactCardModal
          open={contactOpen}
          onClose={() => setContactOpen(false)}
          parentName={getParentName(ride.otherParent)}
          phone={ride.otherParent.phone}
        />
      )}
    </>
  );
};
