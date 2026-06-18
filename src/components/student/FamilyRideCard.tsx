import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, MapPin, Car, Hand, Users, ArrowRight, GraduationCap, Home } from "lucide-react";
import { format, isToday, isTomorrow, isYesterday, formatDistanceToNow, isPast } from "date-fns";
import type { FamilyRide } from "@/hooks/useLinkedParentRides";

/* ─── Helpers ───────────────────────────────────────────────────── */

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

const getRelativeDay = (dateStr: string): string | null => {
  const date = new Date(dateStr);
  if (isToday(date)) return "Today";
  if (isTomorrow(date)) return "Tomorrow";
  if (isYesterday(date)) return "Yesterday";
  return null;
};

const getTimeUntil = (dateStr: string, timeStr: string): string | null => {
  try {
    const rideDate = new Date(`${dateStr}T${timeStr}:00`);
    if (isPast(rideDate)) return null;
    return formatDistanceToNow(rideDate, { addSuffix: true });
  } catch {
    return null;
  }
};

const getRideDirection = (pickup?: string, dropoff?: string): { label: string; icon: typeof Home } | null => {
  if (!pickup || !dropoff) return null;
  const lower = (s: string) => s.toLowerCase();
  if (lower(dropoff).includes("chadwick") || lower(dropoff).includes("school")) {
    return { label: "To School", icon: GraduationCap };
  }
  if (lower(pickup).includes("chadwick") || lower(pickup).includes("school")) {
    return { label: "From School", icon: Home };
  }
  return null;
};

/* ─── Seat Dots ─────────────────────────────────────────────────── */

interface SeatDotsProps {
  total: number;
  filled?: number;
  label: string;
}

const SeatDots = ({ total, filled = 0, label }: SeatDotsProps) => (
  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
    <div className="flex gap-0.5" aria-hidden="true">
      {Array.from({ length: total }, (_, i) => (
        <div key={i} className={`h-2 w-2 rounded-full ${i < filled ? "bg-primary" : "bg-muted-foreground/30"}`} />
      ))}
    </div>
    <span>{label}</span>
  </div>
);

/* ─── Main Component ────────────────────────────────────────────── */

interface FamilyRideCardProps {
  ride: FamilyRide;
}

export function FamilyRideCard({ ride }: FamilyRideCardProps) {
  const isOffer = ride.type === "offer";
  const isConnected = Boolean(ride.connected_parent_name);

  const relativeDay = useMemo(() => getRelativeDay(ride.ride_date), [ride.ride_date]);

  const timeUntil = useMemo(() => getTimeUntil(ride.ride_date, ride.ride_time), [ride.ride_date, ride.ride_time]);

  const direction = useMemo(
    () => getRideDirection(ride.pickup_location, ride.dropoff_location),
    [ride.pickup_location, ride.dropoff_location],
  );

  const rideDateTime = useMemo(() => {
    try {
      return isPast(new Date(`${ride.ride_date}T${ride.ride_time}:00`));
    } catch {
      return false;
    }
  }, [ride.ride_date, ride.ride_time]);

  // Border color: green if connected, blue for offers, amber for requests
  const borderColor = isConnected ? "border-l-emerald-500" : isOffer ? "border-l-blue-500" : "border-l-amber-500";

  const ariaLabel = `${isOffer ? "Ride offer" : "Ride request"} by ${ride.parent_name} on ${format(new Date(ride.ride_date), "EEEE, MMMM d")} at ${formatTime(ride.ride_time)}`;

  return (
    <Card
      className={`hover:shadow-md transition-shadow border-l-4 ${borderColor} ${
        isConnected ? "bg-emerald-500/5" : ""
      } ${rideDateTime ? "opacity-60" : ""}`}
      aria-label={ariaLabel}
    >
      <CardContent className="py-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-2.5">
            {/* ── Type, direction, and connection badges ──── */}
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant={isOffer ? "default" : "secondary"} className="gap-1">
                {isOffer ? (
                  <>
                    <Car className="h-3 w-3" />
                    Ride Offer
                  </>
                ) : (
                  <>
                    <Hand className="h-3 w-3" />
                    Ride Request
                  </>
                )}
              </Badge>

              {direction && (
                <Badge variant="outline" className="gap-1 text-xs">
                  <direction.icon className="h-3 w-3" />
                  {direction.label}
                </Badge>
              )}

              <Badge variant="outline" className="text-xs">
                By {ride.parent_name}
              </Badge>

              {isConnected && (
                <Badge
                  variant="secondary"
                  className="text-xs gap-1 bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                >
                  <Users className="h-3 w-3" />
                  With {ride.connected_parent_name}
                </Badge>
              )}
            </div>

            {/* ── Date, time, and countdown ───────────────── */}
            <div className="flex items-center gap-4 text-sm flex-wrap">
              <div className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>
                  {relativeDay && <span className="font-medium">{relativeDay} &middot; </span>}
                  {format(new Date(ride.ride_date), "EEE, MMM d")}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span>{formatTime(ride.ride_time)}</span>
              </div>
              {timeUntil && !rideDateTime && (
                <Badge variant="outline" className="text-xs font-normal text-muted-foreground">
                  {timeUntil}
                </Badge>
              )}
              {rideDateTime && (
                <Badge variant="outline" className="text-xs font-normal">
                  Completed
                </Badge>
              )}
            </div>

            {/* ── Locations ──────────────────────────────── */}
            <div className="text-sm text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <MapPin className="h-4 w-4 flex-shrink-0" />
                <span className="truncate">{ride.pickup_location}</span>
                <ArrowRight className="h-3 w-3 flex-shrink-0 text-muted-foreground" />
                <span className="truncate">{ride.dropoff_location}</span>
              </div>
            </div>

            {/* ── Seat info ──────────────────────────────── */}
            {ride.type === "request" && ride.seats_needed && (
              <SeatDots
                total={ride.seats_needed}
                filled={ride.seats_needed}
                label={`${ride.seats_needed} seat${ride.seats_needed > 1 ? "s" : ""} needed`}
              />
            )}
            {ride.type === "offer" && ride.seats_available && (
              <SeatDots
                total={ride.seats_available}
                filled={0}
                label={`${ride.seats_available} seat${ride.seats_available > 1 ? "s" : ""} available`}
              />
            )}
          </div>

          {/* ── Status column ────────────────────────────── */}
          <div className="flex flex-col items-end gap-2 shrink-0">
            <Badge variant="outline" className="text-xs text-muted-foreground">
              View only
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default FamilyRideCard;
