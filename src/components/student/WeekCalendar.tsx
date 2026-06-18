import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Car,
  Hand,
  Clock,
  MapPin,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  GraduationCap,
  Home,
  Users,
} from "lucide-react";
import {
  format,
  startOfWeek,
  addDays,
  isToday,
  isSameDay,
  addWeeks,
} from "date-fns";
import type { FamilyRide } from "@/hooks/useLinkedParentRides";

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

const getDirection = (pickup?: string, dropoff?: string) => {
  if (!pickup || !dropoff) return null;
  const lower = (s: string) => s.toLowerCase();
  if (lower(dropoff).includes("chadwick") || lower(dropoff).includes("school"))
    return { label: "To School", icon: GraduationCap };
  if (lower(pickup).includes("chadwick") || lower(pickup).includes("school"))
    return { label: "From School", icon: Home };
  return null;
};

/* ─── Mini ride chip inside a day cell ──────────────────────── */

function RideChip({ ride }: { ride: FamilyRide }) {
  const isOffer = ride.type === "offer";
  const direction = getDirection(ride.pickup_location, ride.dropoff_location);

  return (
    <div
      className={`rounded-md px-2 py-1.5 text-xs space-y-0.5 border-l-[3px] ${
        ride.connected_parent_name
          ? "border-l-emerald-500 bg-emerald-500/5"
          : isOffer
          ? "border-l-primary bg-primary/5"
          : "border-l-amber-500 bg-amber-500/5"
      }`}
    >
      {/* Time + type */}
      <div className="flex items-center gap-1 font-medium">
        <Clock className="h-3 w-3 text-muted-foreground shrink-0" />
        <span>{formatTime(ride.ride_time)}</span>
        {isOffer ? (
          <Car className="h-3 w-3 text-primary ml-auto shrink-0" />
        ) : (
          <Hand className="h-3 w-3 text-amber-500 ml-auto shrink-0" />
        )}
      </div>

      {/* Direction or locations */}
      {direction ? (
        <div className="flex items-center gap-1 text-muted-foreground">
          <direction.icon className="h-3 w-3 shrink-0" />
          <span className="truncate">{direction.label}</span>
        </div>
      ) : (
        <div className="flex items-center gap-1 text-muted-foreground">
          <MapPin className="h-3 w-3 shrink-0" />
          <span className="truncate">{ride.pickup_location?.split(",")[0]}</span>
        </div>
      )}

      {/* Parent */}
      <div className="text-muted-foreground truncate">
        {ride.parent_name}
        {ride.connected_parent_name && (
          <span className="text-emerald-600"> + {ride.connected_parent_name}</span>
        )}
      </div>
    </div>
  );
}

/* ─── Week Calendar ─────────────────────────────────────────── */

interface WeekCalendarProps {
  rides: FamilyRide[];
  loading?: boolean;
}

export function WeekCalendar({ rides, loading }: WeekCalendarProps) {
  const [weekOffset, setWeekOffset] = useState(0);

  // Monday of the target week
  const weekStart = useMemo(() => {
    const base = startOfWeek(new Date(), { weekStartsOn: 1 }); // Monday
    return addWeeks(base, weekOffset);
  }, [weekOffset]);

  // Mon–Fri dates
  const weekDays = useMemo(
    () => Array.from({ length: 5 }, (_, i) => addDays(weekStart, i)),
    [weekStart],
  );

  // Group rides by date string
  const ridesByDate = useMemo(() => {
    const map = new Map<string, FamilyRide[]>();
    for (const ride of rides) {
      const dateStr = ride.ride_date; // "YYYY-MM-DD"
      if (!map.has(dateStr)) map.set(dateStr, []);
      map.get(dateStr)!.push(ride);
    }
    // Sort each day's rides by time
    for (const arr of map.values()) {
      arr.sort((a, b) => a.ride_time.localeCompare(b.ride_time));
    }
    return map;
  }, [rides]);

  const weekLabel = `${format(weekDays[0], "MMM d")} – ${format(weekDays[4], "MMM d, yyyy")}`;

  return (
    <div className="space-y-3">
      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setWeekOffset((w) => w - 1)}
          className="gap-1"
        >
          <ChevronLeft className="h-4 w-4" />
          Prev
        </Button>
        <span className="text-sm font-medium text-muted-foreground">{weekLabel}</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setWeekOffset((w) => w + 1)}
          className="gap-1"
        >
          Next
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-5 gap-2">
        {weekDays.map((day) => {
          const dateStr = format(day, "yyyy-MM-dd");
          const dayRides = ridesByDate.get(dateStr) || [];
          const today = isToday(day);

          return (
            <div
              key={dateStr}
              className={`rounded-lg border min-h-[140px] flex flex-col ${
                today
                  ? "border-primary/50 bg-primary/5 ring-1 ring-primary/20"
                  : "border-border bg-card"
              }`}
            >
              {/* Day header */}
              <div
                className={`text-center py-1.5 border-b text-xs font-medium ${
                  today ? "border-primary/20 text-primary" : "border-border text-muted-foreground"
                }`}
              >
                <div className="uppercase tracking-wide">{format(day, "EEE")}</div>
                <div
                  className={`text-lg font-bold leading-tight ${
                    today ? "text-primary" : "text-foreground"
                  }`}
                >
                  {format(day, "d")}
                </div>
              </div>

              {/* Rides */}
              <div className="flex-1 p-1.5 space-y-1 overflow-y-auto max-h-[200px]">
                {loading ? (
                  <div className="h-8 rounded bg-muted animate-pulse" />
                ) : dayRides.length > 0 ? (
                  dayRides.map((ride) => <RideChip key={ride.id} ride={ride} />)
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground text-xs">
                    —
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground justify-center flex-wrap">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-1 rounded bg-primary" />
          <span>Ride Offer</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-1 rounded bg-amber-500" />
          <span>Ride Request</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-1 rounded bg-emerald-500" />
          <span>Matched</span>
        </div>
      </div>
    </div>
  );
}

export default WeekCalendar;
