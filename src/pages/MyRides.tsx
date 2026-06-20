import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";
import { DashboardLayout } from "@/components/DashboardLayout";
import SEO from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { EmptyState } from "@/components/EmptyState";
import { Card, CardContent } from "@/components/ui/card";
import { Car, History, Info, LinkIcon, RefreshCw, Trash2, Sparkles, Calendar, TrendingUp, Clock } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { UnifiedRideCard, UnifiedRideCardSkeleton, type UnifiedRide, type CancelAction } from "@/components/UnifiedRideCard";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { fetchUnifiedRides, isRidePast } from "@/lib/fetchUnifiedRides";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AcceptDirectRideDialog } from "@/components/AcceptDirectRideDialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { addDays, addWeeks, startOfToday } from "date-fns";
import { useScrollReveal, useCountUp, useStaggeredAnimation } from "@/lib/animations";

const MyRides = () => {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const initialTab = (() => {
    const t = searchParams.get("tab");
    return t === "pending" || t === "past" || t === "active" ? t : "active";
  })();
  const [activeTab, setActiveTab] = useState(initialTab);

  // Sync tab when URL ?tab= changes (e.g. coming from a notification deep link)
  useEffect(() => {
    const t = searchParams.get("tab");
    if ((t === "pending" || t === "past" || t === "active") && t !== activeTab) {
      setActiveTab(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const handleTabChange = (val: string) => {
    setActiveTab(val);
    const next = new URLSearchParams(searchParams);
    if (val === "active") next.delete("tab");
    else next.set("tab", val);
    setSearchParams(next, { replace: true });
  };
  const [hasLinkedParent, setHasLinkedParent] = useState<boolean | null>(null);
  const [acceptDeclineLoading, setAcceptDeclineLoading] = useState<string | null>(null);
  const [acceptingDirectRide, setAcceptingDirectRide] = useState<UnifiedRide | null>(null);

  const isStudent = profile?.account_type === "student";

  useEffect(() => {
    if (!loading && !user) {
      navigate("/login");
    }
  }, [user, loading, navigate]);

  const [clearingPast, setClearingPast] = useState(false);

  // Parent rides via React Query with caching
  const { data: parentRideData, isLoading: loadingParentRides } = useQuery({
    queryKey: ['my-rides', user?.id],
    queryFn: () => fetchUnifiedRides(user!.id),
    enabled: !!user && !!profile && !isStudent,
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
  });

  const [refreshing, setRefreshing] = useState(false);

  // Animation hooks must be called before any early returns
  const { ref: headerRef, isVisible: headerVisible } = useScrollReveal<HTMLDivElement>();
  const { ref: statsRef, isVisible: statsVisible } = useScrollReveal<HTMLDivElement>();
  // Using refs to store target values for count-up animation
  const activeRidesTargetRef = useRef(0);
  const pastRidesTargetRef = useRef(0);
  const activeCount = useCountUp(activeRidesTargetRef.current, 1000);
  const pastCount = useCountUp(pastRidesTargetRef.current, 1000);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: isStudent ? ['student-rides'] : ['my-rides'] });
    setRefreshing(false);
    toast.success('Rides updated', { duration: 2000 });
  }, [queryClient, isStudent]);

  const invalidateRides = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['my-rides'] });
    queryClient.invalidateQueries({ queryKey: ['student-rides'] });
  }, [queryClient]);

  // Student rides fetcher for React Query
  const fetchStudentRides = useCallback(async (): Promise<{ active: UnifiedRide[]; past: UnifiedRide[]; hasLinked: boolean }> => {
    if (!user || !profile) return { active: [], past: [], hasLinked: false };

    const { data: links } = await supabase
      .from('account_links')
      .select('parent_id')
      .eq('student_id', user.id)
      .eq('status', 'approved');

    if (!links || links.length === 0) {
      return { active: [], past: [], hasLinked: false };
    }

    const { data: scheduleData } = await supabase
      .rpc('get_family_schedule', { student_user_id: user.id });

    if (!scheduleData) {
      return { active: [], past: [], hasLinked: true };
    }

    const allParentIds = [...new Set(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      scheduleData.flatMap((r: any) => {
        const ids = [r.parent_id, r.user_id];
        if (r.connected_parent_id) ids.push(r.connected_parent_id);
        return ids;
      }).filter(Boolean)
    )] as string[];

    const childrenByParent: Record<string, { id: string; name: string; grade: string }[]> = {};
    const vehicleByParent: Record<string, { carMake: string | null; carModel: string | null; carColor: string | null; licensePlate: string | null }> = {};
    const phoneByParent: Record<string, string | null> = {};

    const childFetches = allParentIds.map(async (parentId) => {
      try {
        const { data } = await supabase.functions.invoke('get-parent-profile', {
          body: { parentId },
        });
        if (data?.profile) {
          if (data.profile.linked_students) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            childrenByParent[parentId] = data.profile.linked_students.map((s: any) => ({
              id: s.id,
              name: [s.first_name, s.last_name].filter(Boolean).join(' ') || 'Unknown',
              grade: s.grade_level || 'N/A',
            }));
          }

           vehicleByParent[parentId] = {
              carMake: data.profile.car_make || null,
              carModel: data.profile.car_model || null,
              carColor: data.profile.car_color || null,
              licensePlate: data.profile.license_plate || null,
            };
            phoneByParent[parentId] = data.profile.phone_number || null;
            logger.log(`[Student MyRides] Phone for ${parentId}:`, data.profile.phone_number);
        }
      } catch (err) {
        logger.warn(`Failed to fetch children for parent ${parentId}:`, err);
      }
    });
    await Promise.all(childFetches);

    const today = new Date().toISOString().split('T')[0];
    const studentDisplayName = `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim() || profile?.username || 'You';
    

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    logger.log('[Student MyRides] Schedule data:', scheduleData);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rides: UnifiedRide[] = scheduleData.map((r: any) => {
      const isParentDriving = r.type === 'offer';
      const hasConnection = Boolean(r.connected_parent_id);
      const connectedParentName = r.connected_parent_first_name
        ? `${r.connected_parent_first_name} ${r.connected_parent_last_name || ''}`.trim()
        : null;

      // The linked parent in this row is r.parent_id. They could be the ride
      // owner (r.user_id === r.parent_id) or the joiner.
      const linkedIsRideOwner = r.user_id === r.parent_id;
      const rideOwnerSelected: string[] | null = Array.isArray(r.ride_selected_children) ? r.ride_selected_children : null;
      const joinerSelected: string[] | null = Array.isArray(r.joiner_selected_children) ? r.joiner_selected_children : null;

      const filterKids = (kids: { name: string; grade: string; id?: string }[], selected: string[] | null) => {
        if (!selected || selected.length === 0) return kids.map(({ name, grade }) => ({ name, grade }));
        const matched = kids
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .filter((k: any) => k.id && selected.includes(k.id))
          .map(({ name, grade }) => ({ name, grade }));
        // Fallback: stale/deleted child ids in selected — show all kids of that parent
        // so the passenger list still reflects who is actually riding.
        if (matched.length === 0) return kids.map(({ name, grade }) => ({ name, grade }));
        return matched;
      };


      const rideOwnerAllKids = (childrenByParent[r.user_id] || []) as { id?: string; name: string; grade: string }[];
      const connectedAllKids = r.connected_parent_id
        ? ((childrenByParent[r.connected_parent_id] || []) as { id?: string; name: string; grade: string }[])
        : [];

      // Use selected_children when present; else fall back to all kids on that parent.
      const rideOwnerKids = filterKids(rideOwnerAllKids, rideOwnerSelected);
      const connectedKids = filterKids(connectedAllKids, joinerSelected);

      const myKids = linkedIsRideOwner ? rideOwnerKids : connectedKids;
      const otherKids = linkedIsRideOwner ? connectedKids : rideOwnerKids;

      // Combined for fallback display when nothing else available
      const allKidsMap = new Map<string, { name: string; grade: string }>();
      [...myKids, ...otherKids].forEach(k => {
        const key = `${k.name}-${k.grade}`.toLowerCase();
        if (!allKidsMap.has(key)) allKidsMap.set(key, k);
      });
      const fallbackKids = Array.from(allKidsMap.values());

      let status: UnifiedRide['status'];
      if (hasConnection) {
        // Fully confirmed between both parties → Active tab
        status = isParentDriving ? 'joined-ride' : 'helping-out';
      } else {
        status = isParentDriving ? 'posted-offering' : 'posted-looking';
      }

      const driverId = isParentDriving ? r.parent_id : (r.connected_parent_id || null);
      const driverVehicle = driverId ? vehicleByParent[driverId] : undefined;
      const otherParentId = r.connected_parent_id || r.parent_id;
      const otherParentVehicle = vehicleByParent[otherParentId];

      return {
        id: r.id,
        source: 'posted' as const,
        rideType: r.type as 'request' | 'offer',
        status,
        rideStatus: isRidePast(r.ride_date, r.ride_time) ? 'completed' : 'active',
        pickupLocation: r.pickup_location,
        dropoffLocation: r.dropoff_location,
        rideDate: r.ride_date,
        rideTime: r.ride_time,
        seatsAvailable: r.seats_available,
        seatsNeeded: r.seats_needed,
        isDriver: false,
        otherParent: hasConnection ? {
          id: r.connected_parent_id || r.parent_id,
          firstName: r.connected_parent_first_name || r.parent_first_name,
          lastName: r.connected_parent_last_name || r.parent_last_name,
          username: '',
          email: null,
          phone: phoneByParent[r.connected_parent_id || r.parent_id] || null,
          children: otherKids,
          carMake: otherParentVehicle?.carMake || null,
          carModel: otherParentVehicle?.carModel || null,
          carColor: otherParentVehicle?.carColor || null,
          licensePlate: otherParentVehicle?.licensePlate || null,
        } : null,
        myChildren: myKids.length > 0 ? myKids : (hasConnection ? [] : fallbackKids),
        myCarInfo: driverVehicle || undefined,
        originalData: r,
        _studentView: true,
        _driverName: isParentDriving
          ? `${r.parent_first_name || ''} ${r.parent_last_name || ''}`.trim()
          : connectedParentName || 'Waiting for driver',
        _studentPassengerName: studentDisplayName,
      } as UnifiedRide & { _studentView?: boolean; _driverName?: string; _studentPassengerName?: string };
    });


    // ── Fetch series rides for student ──
    const DAY_MAP: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
    const { data: seriesData } = await supabase.rpc('get_student_series_rides', { student_user_id: user.id });
    
    logger.log('[Student MyRides] Series data:', seriesData);

    if (seriesData && seriesData.length > 0) {
      // Build cancelled set
      const cancelledSet = new Set(
        seriesData
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .filter((r: any) => r.cancelled_date)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .map((r: any) => `${r.cancelled_schedule_id}-${r.cancelled_date}-${r.cancelled_day}`)
      );

      // Get unique schedules
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const scheduleMap = new Map<string, any>();
      for (const row of seriesData) {
        if (!scheduleMap.has(row.schedule_id)) {
          scheduleMap.set(row.schedule_id, row);
        }
      }

      // Get all parent IDs for profiles, vehicles, children
      const seriesParentIds = new Set<string>();
      for (const s of scheduleMap.values()) {
        seriesParentIds.add(s.parent_a_id);
        seriesParentIds.add(s.parent_b_id);
      }

      // Fetch profiles, vehicles, and confirmed child selections for series parents
      const seriesParentIdArr = [...seriesParentIds];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const seriesSpaceIds = [...new Set(Array.from(scheduleMap.values()).map((s: any) => s.space_id))];
      const [{ data: seriesVehicles }, { data: seriesChildSels }] = await Promise.all([
        supabase
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .from('vehicles' as any)
          .select('user_id, car_make, car_model, car_color, license_plate, is_primary')
          .in('user_id', seriesParentIdArr)
          .then(r => r),
        supabase.rpc('get_student_series_child_selections', { student_user_id: user.id }),
      ]);

      // Fetch all series parent profiles via edge function
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const profileMap: Record<string, any> = {};
      await Promise.all(seriesParentIdArr.map(async (pid) => {
        try {
          const { data } = await supabase.functions.invoke('get-parent-profile', { body: { parentId: pid } });
          if (data?.profile) profileMap[pid] = data.profile;
        } catch {
          // Edge function failed, continue without profile
        }
      }));

      // Build vehicles map
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const vMap: Record<string, any[]> = {};
      if (seriesVehicles) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        for (const v of seriesVehicles as any[]) {
          if (!vMap[v.user_id]) vMap[v.user_id] = [];
          vMap[v.user_id].push(v);
        }
      }

      // Build child selection map from the same confirmed source used for parent logic
      const selMap: Record<string, Record<string, string[]>> = {};
      if (seriesChildSels) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        for (const sel of seriesChildSels as any[]) {
          if (!selMap[sel.space_id]) selMap[sel.space_id] = {};
          if (!selMap[sel.space_id][sel.parent_id]) selMap[sel.space_id][sel.parent_id] = [];
          selMap[sel.space_id][sel.parent_id].push(sel.child_id);
        }
      }

      // Build children map from parent profile edge function data (service-role backed)
      const seriesChildrenByParent: Record<string, { id: string; name: string; grade: string }[]> = {};
      for (const pid of seriesParentIdArr) {
        const prof = profileMap[pid];
        if (prof?.linked_students?.length) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          seriesChildrenByParent[pid] = prof.linked_students.map((s: any) => ({
            id: s.id,
            name: [s.first_name, s.last_name].filter(Boolean).join(' ') || 'Unknown',
            grade: s.grade_level || 'N/A',
          }));
        }
      }

      // Generate series ride occurrences
      for (const [schedId, sched] of scheduleMap) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const assignments = (sched.day_assignments as any[]) || [];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const days = assignments.map((a: any) => a.day);
        const parentAId = sched.parent_a_id;
        const parentBId = sched.parent_b_id;
        const spaceSelections = selMap[sched.space_id] || {};

        // Generate 4 weeks of occurrences
        const todayDate = startOfToday();
        for (let w = 0; w < 4; w++) {
          for (const day of days) {
            const dayIndex = DAY_MAP[day];
            if (dayIndex === undefined) continue;
            const todayIndex = todayDate.getDay();
            const daysUntil = dayIndex - todayIndex;
            if (w === 0 && daysUntil < 0) continue;
            const date = addDays(addWeeks(todayDate, w), daysUntil);
            if (date < todayDate) continue;
            const dateStr = format(date, 'yyyy-MM-dd');

            const cancelKey = `${schedId}-${dateStr}-${day}`;
            if (cancelledSet.has(cancelKey)) continue;

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const assignment = assignments.find((a: any) => a.day === day);
            if (!assignment) continue;

            const driverId = assignment.driver_id;
            const passengerId = driverId === parentAId ? parentBId : parentAId;
            const isWed = day === 'Wed';

            let pickupTime: string | null = null;
            // Pickup time is set by the PASSENGER (non-driver)
            if (driverId === sched.proposer_id) {
              // Recipient is the passenger → recipient's time
              pickupTime = isWed ? sched.recipient_wednesday_time : sched.recipient_regular_time;
            } else {
              // Proposer is the passenger → proposer's time
              pickupTime = isWed ? sched.proposer_wednesday_time : sched.proposer_regular_time;
            }
            if (!pickupTime) pickupTime = '08:00';

            // Pickup = passenger parent's home address
            const passengerProfile = profileMap[passengerId];
            const pickupAddress = passengerProfile?.home_address || 'Passenger home address';

            // Build children list from confirmed series child selections (mirror parent My Rides)
            const parentAChildIds = spaceSelections[parentAId] || [];
            const parentBChildIds = spaceSelections[parentBId] || [];
            const parentAHasSubmitted = parentAChildIds.length > 0;
            const parentBHasSubmitted = parentBChildIds.length > 0;

            const parentAKids = parentAHasSubmitted
              ? (seriesChildrenByParent[parentAId] || [])
                  .filter(c => parentAChildIds.includes(c.id))
                  .map(c => ({ name: c.name, grade: c.grade }))
              : [];
            const parentBKids = parentBHasSubmitted
              ? (seriesChildrenByParent[parentBId] || [])
                  .filter(c => parentBChildIds.includes(c.id))
                  .map(c => ({ name: c.name, grade: c.grade }))
              : [];
            const allSeriesKids = [...parentAKids, ...parentBKids].filter(
              (k, i, arr) => i === arr.findIndex(x => `${x.name}-${x.grade}` === `${k.name}-${k.grade}`)
            );

            const parentAName = profileMap[parentAId] ? [profileMap[parentAId].first_name, profileMap[parentAId].last_name].filter(Boolean).join(' ') : 'Parent';
            const parentBName = profileMap[parentBId] ? [profileMap[parentBId].first_name, profileMap[parentBId].last_name].filter(Boolean).join(' ') : 'Parent';
            let pendingChildrenMessage: string | null = null;
            if (allSeriesKids.length === 0) {
              if (!parentAHasSubmitted && !parentBHasSubmitted) {
                pendingChildrenMessage = `Pending — awaiting children confirmation from both parents`;
              } else if (!parentAHasSubmitted) {
                pendingChildrenMessage = `Pending — awaiting children confirmation from ${parentAName}`;
              } else if (!parentBHasSubmitted) {
                pendingChildrenMessage = `Pending — awaiting children confirmation from ${parentBName}`;
              }
            }

            // Driver info
            const driverProfile = profileMap[driverId];
            const driverName = driverProfile
              ? [driverProfile.first_name, driverProfile.last_name].filter(Boolean).join(' ')
              : 'Driver';
            const driverVehicles = vMap[driverId] || [];
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const primaryVehicle = driverVehicles.find((v: any) => v.is_primary) || driverVehicles[0];

            // Other parent (the one not linked to student — show contact for)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const linkedParentIds = links.map((l: any) => l.parent_id);
            const otherSeriesParentId = linkedParentIds.includes(parentAId) ? parentBId : parentAId;
            const otherSeriesProfile = profileMap[otherSeriesParentId];

            rides.push({
              id: `series-${schedId}-${dateStr}-${day}`,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              source: 'series' as any,
              rideType: 'offer',
              status: 'confirmed',
              rideStatus: 'active',
              pickupLocation: pickupAddress,
              dropoffLocation: 'Chadwick School — 26800 S Academy Dr, Palos Verdes Peninsula, CA 90274',
              rideDate: dateStr,
              rideTime: pickupTime,
              seatsAvailable: null,
              seatsNeeded: null,
              isDriver: false,
              otherParent: otherSeriesProfile ? {
                id: otherSeriesParentId,
                firstName: otherSeriesProfile.first_name || null,
                lastName: otherSeriesProfile.last_name || null,
                username: otherSeriesProfile.username || '',
                email: null,
                phone: otherSeriesProfile.phone_number || null,
                children: [],
                carMake: null,
                carModel: null,
                carColor: null,
                licensePlate: null,
              } : null,
              myChildren: allSeriesKids,
              myCarInfo: primaryVehicle ? {
                carMake: primaryVehicle.car_make,
                carModel: primaryVehicle.car_model,
                carColor: primaryVehicle.car_color,
                licensePlate: primaryVehicle.license_plate,
              } : undefined,
              originalData: {
                _seriesRide: true,
                scheduleId: schedId,
                spaceId: sched.space_id,
                day,
                date: dateStr,
                driverId,
                otherParentId: otherSeriesParentId,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                driverVehicles: driverVehicles.map((v: any) => ({
                  car_make: v.car_make,
                  car_model: v.car_model,
                  car_color: v.car_color,
                  license_plate: v.license_plate,
                  is_primary: v.is_primary,
                })),
                pendingChildrenMessage,
              },
              _studentView: true,
              _driverName: driverName,
              _studentPassengerName: studentDisplayName,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
            } as any);
          }
        }
      }
    }

    rides.sort((a, b) => {
      const dateA = new Date(`${a.rideDate}T${a.rideTime}:00`);
      const dateB = new Date(`${b.rideDate}T${b.rideTime}:00`);
      return dateA.getTime() - dateB.getTime();
    });

    return {
      active: rides.filter(r => r.rideStatus === 'active' && !isRidePast(r.rideDate, r.rideTime)),
      past: rides.filter(r => r.rideStatus !== 'active' || isRidePast(r.rideDate, r.rideTime)).reverse(),
      hasLinked: true,
    };
  }, [user, profile]);

  const { data: studentRideData, isLoading: loadingStudentRides } = useQuery({
    queryKey: ['student-rides', user?.id],
    queryFn: fetchStudentRides,
    enabled: !!user && !!profile && isStudent,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  // Update hasLinkedParent from student query result
  useEffect(() => {
    if (studentRideData) {
      setHasLinkedParent(studentRideData.hasLinked);
    }
  }, [studentRideData]);

  // ── Real-time 1-minute tick to re-evaluate active/past split ──
  const [, setTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 60_000); // every 60s
    return () => clearInterval(interval);
  }, []);

  // Derive active/past rides from query data, re-evaluated every tick
  const allParentRides = parentRideData ? [...parentRideData.active, ...parentRideData.past] : [];
  const allStudentRides = studentRideData ? [...studentRideData.active, ...studentRideData.past] : [];
  const allRides = isStudent ? allStudentRides : allParentRides;

  // A ride is Pending until the original poster has explicitly accepted one party.
  // Posted rides (posted-looking / posted-offering) stay Pending — they only graduate
  // to 'helping-out' / 'joined-ride' (Active) once the poster accepts a join request.
  const PENDING_STATUSES = [
    'pending-approval',
    'pending-direct-sent',
    'pending-direct-received',
    'posted-looking',
    'posted-offering',
  ];
  const isPending = (r: typeof allRides[number]) => PENDING_STATUSES.includes(r.status as string);

  // Students see the same Active/Pending split as parents (read-only view of their parent's rides)
  const activeRides = allRides.filter(r => r.rideStatus === 'active' && !isRidePast(r.rideDate, r.rideTime) && !isPending(r));
  const pendingRides = allRides.filter(r => r.rideStatus === 'active' && !isRidePast(r.rideDate, r.rideTime) && isPending(r));
  const pastRides = allRides.filter(r => r.rideStatus !== 'active' || isRidePast(r.rideDate, r.rideTime))
    .sort((a, b) => new Date(`${b.rideDate}T${b.rideTime}:00`).getTime() - new Date(`${a.rideDate}T${a.rideTime}:00`).getTime());
  
  // Update refs for count-up animation
  useEffect(() => {
    activeRidesTargetRef.current = activeRides.length;
  }, [activeRides.length]);
  
  useEffect(() => {
    pastRidesTargetRef.current = pastRides.length;
  }, [pastRides.length]);
  
  const loadingData = isStudent ? loadingStudentRides : loadingParentRides;

  const getMyName = () => {
    return profile?.first_name
      ? `${profile.first_name} ${profile.last_name || ''}`.trim()
      : 'A parent';
  };

  const sendNotification = async (userId: string, type: string, message: string) => {
    try {
      await supabase.functions.invoke('create-notification', {
        body: { userId, type, message },
      });
    } catch (err) {
      logger.warn('Failed to send notification:', err);
    }
  };

  const handleCancelAction = useCallback(async (ride: UnifiedRide, action: CancelAction) => {
    if (!user) return;

    try {
      switch (action) {
        case 'cancel-offer': {
          // Driver cancels their ride offer - permanently delete
          // First notify confirmed passenger if one exists
          if (ride.otherParent) {
            await sendNotification(
              ride.otherParent.id,
              'ride_cancelled',
              `❌ ${getMyName()} has cancelled the ride offer you were part of. Please find an alternative ride in Family Carpools.`
            );
          }
          // Also notify all pending requesters
          const { data: pendingConvs } = await supabase
            .from('ride_conversations')
            .select('sender_id')
            .eq('ride_id', ride.id)
            .eq('status', 'pending');
          if (pendingConvs) {
            for (const conv of pendingConvs) {
              if (conv.sender_id !== ride.otherParent?.id) {
                await sendNotification(
                  conv.sender_id,
                  'ride_cancelled',
                  `❌ ${getMyName()} has cancelled the ride offer you requested to join.`
                );
              }
            }
          }
          // Delete all chat messages for this ride
          await supabase
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .from('ride_messages' as any)
            .delete()
            .eq('ride_ref_id', ride.id)
            .eq('ride_source', 'public');
          // Delete all conversations for this ride
          await supabase
            .from('ride_conversations')
            .delete()
            .eq('ride_id', ride.id);
          // Permanently delete the ride
          const { error } = await supabase
            .from('rides')
            .delete()
            .eq('id', ride.id)
            .eq('user_id', user.id);
          if (error) throw error;
          toast.success('Ride offer cancelled and removed');
          break;
        }

        case 'leave-offer': {
          const conv = ride.originalData?.conversation;
          if (!conv) break;
          const rideId = conv.ride_id;
          await supabase.rpc('reset_ride_fulfillment', { p_ride_id: rideId });
          // Delete chat messages
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await supabase.from('ride_messages' as any).delete().eq('ride_ref_id', rideId).eq('ride_source', 'public');
          const { error } = await supabase
            .from('ride_conversations')
            .delete()
            .eq('id', conv.id);
          if (error) throw error;
          // Notify the ride owner
          const rideOwnerId = ride.otherParent?.id;
          if (rideOwnerId) {
            await sendNotification(
              rideOwnerId,
              'ride_left',
              `🔄 ${getMyName()} has left your ride. Your ride has been reset and is now open in Family Carpools for others to join.`
            );
          }
          toast.success('You have left the ride');
          break;
        }

        case 'cancel-request': {
          // Owner cancels their ride request - permanently delete
          // Notify confirmed helper if one exists
          if (ride.otherParent) {
            await sendNotification(
              ride.otherParent.id,
              'ride_cancelled',
              `❌ ${getMyName()} has cancelled their ride request that you were fulfilling.`
            );
          }
          // Delete chat messages and conversations for this ride
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await supabase.from('ride_messages' as any).delete().eq('ride_ref_id', ride.id).eq('ride_source', 'public');
          await supabase
            .from('ride_conversations')
            .delete()
            .eq('ride_id', ride.id);
          const { error } = await supabase
            .from('rides')
            .delete()
            .eq('id', ride.id)
            .eq('user_id', user.id);
          if (error) throw error;
          toast.success('Ride request cancelled and removed');
          break;
        }

        case 'leave-request': {
          const conv = ride.originalData?.conversation;
          if (!conv) break;
          const rideId = conv.ride_id;
          await supabase.rpc('reset_ride_fulfillment', { p_ride_id: rideId });
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await supabase.from('ride_messages' as any).delete().eq('ride_ref_id', rideId).eq('ride_source', 'public');
          const { error } = await supabase
            .from('ride_conversations')
            .delete()
            .eq('id', conv.id);
          if (error) throw error;
          // Notify the requester
          const requesterId = ride.otherParent?.id;
          if (requesterId) {
            await sendNotification(
              requesterId,
              'ride_left',
              `🔄 ${getMyName()} is no longer able to fulfill your request. Your request has been reset and is now open in Family Carpools for others to help.`
            );
          }
          toast.success('You have left the ride');
          break;
        }
        case 'cancel-pending': {
          // Cancel a pending join request / offer to help
          const conv = ride.originalData?.conversation;
          if (!conv) break;
          const { error } = await supabase
            .from('ride_conversations')
            .delete()
            .eq('id', conv.id);
          if (error) throw error;
          // Notify ride owner
          const ownerId = conv.recipient_id;
          if (ownerId) {
            await sendNotification(
              ownerId,
              'ride_request_cancelled',
              `🔄 ${getMyName()} has cancelled their pending request to join your ride`
            );
          }
          toast.success('Pending request cancelled');
          break;
        }
        case 'cancel-direct': {
          await handleCancelDirect(ride);
          return;
        }
        case 'cancel-series': {
          // Driver cancels a single series occurrence
          const seriesData = ride.originalData;
          if (!seriesData?._seriesRide) break;
          
          const dateObj = new Date(seriesData.date + 'T00:00:00');
          const dayName = seriesData.day;
          const dateStr = seriesData.date;
          
          const { error } = await supabase.from('schedule_cancellations').insert({
            schedule_id: seriesData.scheduleId,
            cancelled_date: dateStr,
            cancelled_day: dayName,
            cancelled_by: user.id,
          });
          
          if (error) {
            toast.error('Already cancelled for that date');
            break;
          }
          
          const otherId = seriesData.otherParentId;
          const formattedDate = format(dateObj, 'MMMM d, yyyy');
          await sendNotification(
            otherId,
            'schedule_cancel_one',
            `📅 ${getMyName()} has cancelled the ${dayName} ride on ${formattedDate}. The rest of your carpool series continues as scheduled.`
          );
          
          toast.success(`Cancelled ride on ${formattedDate}`);
          break;
        }
        case 'leave-series': {
          // Passenger leaves a single series occurrence
          const seriesData = ride.originalData;
          if (!seriesData?._seriesRide) break;
          
          const dateObj = new Date(seriesData.date + 'T00:00:00');
          const dayName = seriesData.day;
          const dateStr = seriesData.date;
          
          const { error } = await supabase.from('schedule_cancellations').insert({
            schedule_id: seriesData.scheduleId,
            cancelled_date: dateStr,
            cancelled_day: dayName,
            cancelled_by: user.id,
          });
          
          if (error) {
            toast.error('Already left for that date');
            break;
          }
          
          const otherId = seriesData.otherParentId;
          const formattedDate = format(dateObj, 'MMMM d, yyyy');
          await sendNotification(
            otherId,
            'schedule_leave_one',
            `📅 ${getMyName()} has left the ${dayName} ride on ${formattedDate}. The rest of your carpool series continues as scheduled.`
          );
          
          toast.success(`Left ride on ${formattedDate}`);
          break;
        }
      }

      invalidateRides();
    } catch (error) {
      toast.error('Failed: ' + (error as Error).message);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, profile]);

  const handleAcceptRequest = useCallback(async (conversationId: string) => {
    setAcceptDeclineLoading(conversationId);
    try {
      const { error } = await supabase
        .from('ride_conversations')
        .update({ status: 'accepted' })
        .eq('id', conversationId);
      if (error) throw error;

      const { data: conv } = await supabase
        .from('ride_conversations')
        .select('sender_id, ride_id, rides(ride_date, ride_time, type)')
        .eq('id', conversationId)
        .single();

      // If sender of the conversation is the driver (i.e. this is a ride REQUEST being fulfilled),
      // copy their selected vehicle onto the ride so the confirmed card shows the right car.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const convRide = (conv as any)?.rides;
      if (convRide?.type === 'request') {
        const { data: convVehicle } = await supabase
          .from('ride_conversations')
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .select('vehicle_info' as any)
          .eq('id', conversationId)
          .single();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const vInfo = (convVehicle as any)?.vehicle_info;
        if (vInfo && conv?.ride_id) {
          await supabase
            .from('rides')
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .update({ vehicle_info: vInfo } as any)
            .eq('id', conv.ride_id);
        }
      }

      if (conv) {
        const { data: otherPending } = await supabase
          .from('ride_conversations')
          .select('id, sender_id')
          .eq('ride_id', conv.ride_id)
          .eq('status', 'pending')
          .neq('id', conversationId);

        if (otherPending && otherPending.length > 0) {
          await supabase
            .from('ride_conversations')
            .update({ status: 'declined' })
            .eq('ride_id', conv.ride_id)
            .eq('status', 'pending')
            .neq('id', conversationId);

          const senderName = getMyName();
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const rideData = conv.rides as any;

          for (const pending of otherPending) {
            await sendNotification(
              pending.sender_id,
              'ride_join_declined',
              `❌ ${senderName} has filled the ride on ${rideData?.ride_date || 'upcoming'} — your request was automatically declined.`
            );
          }
        }

        const senderName = getMyName();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const rideData = conv.rides as any;
        await sendNotification(
          conv.sender_id,
          'ride_join_accepted',
          `✅ ${senderName} accepted your request to join the ride on ${rideData?.ride_date || 'upcoming'} at ${rideData?.ride_time || ''}`
        );
      }

      toast.success('Request accepted! The parent has been added to your ride.');
      invalidateRides();
    } catch (err) {
      toast.error('Failed to accept request: ' + (err as Error).message);
    }
    setAcceptDeclineLoading(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, profile]);

  const handleDeclineRequest = useCallback(async (conversationId: string) => {
    setAcceptDeclineLoading(conversationId);
    try {
      const { data: conv } = await supabase
        .from('ride_conversations')
        .select('sender_id, ride_id, rides(ride_date, ride_time)')
        .eq('id', conversationId)
        .single();

      const { error } = await supabase
        .from('ride_conversations')
        .update({ status: 'declined' })
        .eq('id', conversationId);
      if (error) throw error;

      if (conv) {
        const senderName = getMyName();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const rideData = conv.rides as any;
        await sendNotification(
          conv.sender_id,
          'ride_join_declined',
          `❌ ${senderName} declined your request to join the ride on ${rideData?.ride_date || 'upcoming'}`
        );
      }

      toast.success('Request declined.');
      invalidateRides();
    } catch (err) {
      toast.error('Failed to decline request: ' + err.message);
    }
    setAcceptDeclineLoading(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, profile]);

  const handleAcceptDirect = useCallback(async (requestId: string) => {
    // Find the ride to show children selector
    const ride = activeRides.find(r => r.id === requestId);
    if (ride) {
      setAcceptingDirectRide(ride);
    }
  }, [activeRides]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const confirmAcceptDirect = useCallback(async (selectedChildIds: string[], vehicleInfo?: any) => {
    if (!acceptingDirectRide) return;
    const requestId = acceptingDirectRide.id;
    setAcceptDeclineLoading(requestId);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const updateData: any = { 
        status: 'accepted', 
        responded_at: new Date().toISOString(),
        recipient_selected_children: selectedChildIds,
      };
      // If the acceptor is the driver (accepting a ride request), save their vehicle
      if (vehicleInfo) {
        updateData.vehicle_info = {
          car_make: vehicleInfo.car_make,
          car_model: vehicleInfo.car_model,
          car_color: vehicleInfo.car_color,
          license_plate: vehicleInfo.license_plate,
          vehicle_id: vehicleInfo.vehicle_id,
        };
      }
      const { error } = await supabase
        .from('private_ride_requests')
        .update(updateData)
        .eq('id', requestId);
      if (error) throw error;

      const { data: req } = await supabase
        .from('private_ride_requests')
        .select('sender_id, ride_date')
        .eq('id', requestId)
        .single();

      if (req) {
        const myName = getMyName();
        await sendNotification(
          req.sender_id,
          'direct_ride_accepted',
          `✅ ${myName} accepted your direct ride for ${req.ride_date}`
        );
      }

      toast.success('Direct ride accepted!');
      setAcceptingDirectRide(null);
      invalidateRides();
    } catch (err) {
      toast.error('Failed to accept: ' + (err as Error).message);
    }
    setAcceptDeclineLoading(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [acceptingDirectRide, user, profile]);

  const handleDeclineDirect = useCallback(async (requestId: string) => {
    setAcceptDeclineLoading(requestId);
    try {
      const { data: req } = await supabase
        .from('private_ride_requests')
        .select('sender_id, ride_date, request_type')
        .eq('id', requestId)
        .single();

      const { error } = await supabase
        .from('private_ride_requests')
        .update({ status: 'declined', responded_at: new Date().toISOString() })
        .eq('id', requestId);
      if (error) throw error;

      if (req) {
        const myName = getMyName();
        await sendNotification(
          req.sender_id,
          'direct_ride_declined',
          `❌ ${myName} has declined your direct ride ${req.request_type} for ${req.ride_date}`
        );
      }

      toast.success('Direct ride declined.');
      invalidateRides();
    } catch (err) {
      toast.error('Failed to decline: ' + (err as Error).message);
    }
    setAcceptDeclineLoading(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, profile]);

  const handleCancelDirect = useCallback(async (ride: UnifiedRide) => {
    try {
      const req = ride.originalData;
      const isSender = req.sender_id === user?.id;

      // Delete chat messages
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await supabase.from('ride_messages' as any).delete().eq('ride_ref_id', ride.id).eq('ride_source', 'private');

      const { error } = await supabase
        .from('private_ride_requests')
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .update({ status: 'cancelled' } as any)
        .eq('id', ride.id);
      if (error) throw error;

      const otherId = isSender ? req.recipient_id : req.sender_id;
      const myName = getMyName();
      const message = isSender
        ? `❌ ${myName} has cancelled the direct ride they sent you`
        : `❌ ${myName} has cancelled the direct ride you sent them`;

      await sendNotification(otherId, 'direct_ride_cancelled', message);

      toast.success('Direct ride cancelled');
      invalidateRides();
    } catch (err) {
      toast.error('Failed: ' + (err as Error).message);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, profile]);

  const handleClearPastRides = useCallback(async () => {
    if (!user) return;
    setClearingPast(true);
    try {
      const pastPublicIds = pastRides
        .filter(r => r.source === 'posted' && r.originalData?.user_id === user.id)
        .map(r => r.id);

      if (pastPublicIds.length > 0) {
        for (const rideId of pastPublicIds) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await supabase.from('ride_messages' as any).delete().eq('ride_ref_id', rideId).eq('ride_source', 'public');
          await supabase.from('ride_conversations').delete().eq('ride_id', rideId);
        }
        await supabase.from('rides').delete().in('id', pastPublicIds);
      }

      const pastDirectIds = pastRides
        .filter(r => r.source === 'private' && (r.originalData?.sender_id === user.id || r.originalData?.recipient_id === user.id))
        .filter(r => ['cancelled', 'completed', 'declined'].includes(r.originalData?.status))
        .map(r => r.id);

      if (pastDirectIds.length > 0) {
        for (const rideId of pastDirectIds) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await supabase.from('ride_messages' as any).delete().eq('ride_ref_id', rideId).eq('ride_source', 'private');
        }
        await supabase.from('private_ride_requests').delete().in('id', pastDirectIds);
      }

      toast.success('Past rides cleared');
      invalidateRides();
    } catch (err) {
      toast.error('Failed to clear past rides: ' + (err as Error).message);
    }
    setClearingPast(false);
  }, [user, pastRides, invalidateRides]);


  if (loading || !user || !profile) {
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

  if (isStudent && hasLinkedParent === false) {
    return (
      <DashboardLayout>
        <div className="container mx-auto px-4 max-w-4xl">
          <Breadcrumbs items={[{ label: "My Rides" }]} />
          <div className="mb-6">
            <h1 className="text-3xl font-bold mb-2">My Rides</h1>
          </div>
          <EmptyState
            icon={LinkIcon}
            title="No Parent Account Linked"
            description="Link to your parent's account to see rides they've scheduled for you."
            action={{
              label: "Link Parent Account",
              onClick: () => navigate('/profile')
            }}
          />
        </div>
      </DashboardLayout>
    );
  }

  const renderRideList = (rides: UnifiedRide[], isPast: boolean) => {
    if (loadingData) {
      return (
        <div className="space-y-4 pr-4">
          {[1, 2, 3].map(i => <UnifiedRideCardSkeleton key={i} />)}
        </div>
      );
    }

    if (rides.length === 0) {
      return (
        <EmptyState
          icon={isPast ? History : Car}
          title={isPast ? "No Past Rides" : "No Scheduled Rides"}
          description={
            isStudent
              ? isPast
                ? "Past rides will appear here"
                : "No rides scheduled yet. Ask your parent to schedule a ride for you."
              : isPast
                ? "Completed and cancelled rides will appear here"
                : "Post a ride or join someone else's to get started"
          }
          action={!isPast && !isStudent ? {
            label: "Find Rides",
            onClick: () => navigate('/family-carpools')
          } : undefined}
        />
      );
    }

    return (
      <ScrollArea className="h-[calc(100vh-340px)]">
        <div className="space-y-4 pr-4">
          {rides.map((ride) => (
            <UnifiedRideCard
              key={`${ride.source}-${ride.id}`}
              ride={ride}
              onCancel={!isStudent && !isPast ? handleCancelAction : undefined}
              isPast={isPast}
              onAcceptRequest={!isStudent ? handleAcceptRequest : undefined}
              onDeclineRequest={!isStudent ? handleDeclineRequest : undefined}
              onAcceptDirect={!isStudent ? handleAcceptDirect : undefined}
              onDeclineDirect={!isStudent ? handleDeclineDirect : undefined}
              acceptDeclineLoading={acceptDeclineLoading}
            />
          ))}
        </div>
      </ScrollArea>
    );
  };

  return (
    <DashboardLayout>
      <SEO
        title="My Rides — Dolphin Carpool"
        description="Track your upcoming, requested, and past school carpools in one place."
        path="/my-rides"
      />
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="min-h-screen bg-gradient-to-br from-gray-50/50 via-white to-blue-50/30"
      >
      <div className="container mx-auto px-4 max-w-4xl py-8">
        <Breadcrumbs items={[{ label: "My Rides" }]} />

        {/* Premium Header with Animation */}
        <motion.div
          ref={headerRef}
          initial={{ opacity: 0, y: 20 }}
          animate={headerVisible ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="mb-8"
        >
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
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
                  className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/25"
                >
                  <Car className="w-6 h-6 text-white" />
                </motion.div>
                <div>
                  <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 bg-clip-text text-transparent">
                    My Rides
                  </h1>
                </div>
              </motion.div>
              <motion.p 
                className="text-gray-500 ml-15 pl-15"
                initial={{ opacity: 0 }}
                animate={headerVisible ? { opacity: 1 } : {}}
                transition={{ delay: 0.3 }}
              >
                {isStudent
                  ? "Rides scheduled by your parent"
                  : "All your rides in one place"}
              </motion.p>
            </div>
            
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={headerVisible ? { opacity: 1, scale: 1 } : {}}
              transition={{ delay: 0.4 }}
            >
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 shrink-0 bg-white/80 backdrop-blur-sm hover:bg-white shadow-sm"
                disabled={refreshing || loadingData}
                onClick={handleRefresh}
              >
                <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </motion.div>
          </div>
        </motion.div>

        {/* Stats Cards */}
        <motion.div
          ref={statsRef}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={statsVisible ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Card className="bg-gradient-to-br from-blue-500/5 to-blue-600/5 border-blue-200/50 backdrop-blur-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-600" />
                <span className="text-sm text-gray-500">Active</span>
              </div>
              <p className="text-2xl font-bold text-gray-900 mt-1">{activeCount}</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-gray-500/5 to-gray-600/5 border-gray-200/50 backdrop-blur-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-gray-600" />
                <span className="text-sm text-gray-500">Past</span>
              </div>
              <p className="text-2xl font-bold text-gray-900 mt-1">{pastCount}</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-emerald-500/5 to-emerald-600/5 border-emerald-200/50 backdrop-blur-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
                <span className="text-sm text-gray-500">This Week</span>
              </div>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {activeRides.filter(r => {
                  const rideDate = new Date(r.rideDate);
                  const today = new Date();
                  const weekFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
                  return rideDate >= today && rideDate <= weekFromNow;
                }).length}
              </p>
            </CardContent>
          </Card>
        </motion.div>

        {isStudent && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mb-6"
          >
            <Alert className="rounded-2xl border-blue-200 bg-blue-50/80 backdrop-blur-sm dark:border-blue-800 dark:bg-blue-950/20">
              <Info className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-sm text-blue-700 dark:text-blue-300">
                These rides were arranged by your linked parent account. Contact your parent to make changes.
              </AlertDescription>
            </Alert>
          </motion.div>
        )}

        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList className="mb-4 bg-white/80 backdrop-blur-sm p-1 rounded-xl">
            <TabsTrigger value="active" className="gap-1.5 rounded-lg data-[state=active]:bg-blue-500 data-[state=active]:text-white">
              <Car className="h-4 w-4" />
              Active ({activeRides.length})
            </TabsTrigger>
            <TabsTrigger value="pending" className="gap-1.5 rounded-lg data-[state=active]:bg-amber-500 data-[state=active]:text-white">
              <Clock className="h-4 w-4" />
              Pending ({pendingRides.length})
            </TabsTrigger>
            <TabsTrigger value="past" className="gap-1.5 rounded-lg data-[state=active]:bg-gray-500 data-[state=active]:text-white">
              <History className="h-4 w-4" />
              Past ({pastRides.length})
            </TabsTrigger>
          </TabsList>

          <AnimatePresence mode="wait">
            <TabsContent value="active" className="mt-0">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
              >
                {renderRideList(activeRides, false)}
              </motion.div>
            </TabsContent>

            <TabsContent value="pending" className="mt-0">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
              >
                {renderRideList(pendingRides, false)}
              </motion.div>
            </TabsContent>


            <TabsContent value="past" className="mt-0">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
              >
                {!isStudent && pastRides.length > 0 && (
                  <div className="flex justify-end mb-4">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm" className="gap-1.5 text-destructive hover:text-destructive" disabled={clearingPast}>
                          <Trash2 className="h-3.5 w-3.5" />
                          Clear Past Rides
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Clear all past rides?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently remove all your past rides and their associated messages. This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={handleClearPastRides} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Clear All
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                )}
                {renderRideList(pastRides, true)}
              </motion.div>
            </TabsContent>
          </AnimatePresence>
        </Tabs>

        {/* Accept Direct Ride Dialog with Children Selector */}
        {acceptingDirectRide && (
          <AcceptDirectRideDialog
            open={!!acceptingDirectRide}
            onClose={() => setAcceptingDirectRide(null)}
            onConfirm={confirmAcceptDirect}
            senderName={acceptingDirectRide.otherParent ? `${acceptingDirectRide.otherParent.firstName || ''} ${acceptingDirectRide.otherParent.lastName || ''}`.trim() : 'Unknown'}
            rideType={acceptingDirectRide.rideType}
            maxSeats={acceptingDirectRide.seatsAvailable || acceptingDirectRide.seatsNeeded || null}
            loading={acceptDeclineLoading === acceptingDirectRide.id}
            isAcceptorDriver={acceptingDirectRide.rideType === 'request'}
          />
        )}
      </div>
      </motion.div>
    </DashboardLayout>
  );
};

export default MyRides;
