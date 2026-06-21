import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import { CalendarIcon, Hand, Car, MapPin, Send } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { isFutureDateAndTime, PAST_DATETIME_ERROR } from "@/lib/rideValidation";
import { cn } from "@/lib/utils";
import { AddressAutocompleteInput } from "@/components/AddressAutocompleteInput";
import { useAuth } from "@/contexts/AuthContext";
import ChildrenRidingSelector from "@/components/ChildrenRidingSelector";
import VehicleSelector from "@/components/VehicleSelector";
import { type VehicleInfo } from "@/hooks/useVehicles";

const CHADWICK_SCHOOL = {
  name: "Chadwick School",
  address: "26800 S Academy Dr, Palos Verdes Peninsula, CA 90274",
  latitude: 33.77667,
  longitude: -118.36111,
};


const formSchema = z.object({
  ride_date: z.date({ required_error: "Please select a date" })
    .refine((d) => d >= new Date(new Date().setHours(0, 0, 0, 0)), { message: "Date cannot be in the past" })
    .refine((d) => { const m = new Date(); m.setDate(m.getDate() + 30); return d <= m; }, { message: "Max 30 days ahead" }),
  pickup_time: z.string().min(1, "Select a time"),
  seats: z.number().min(1).max(7),
  message: z.string().max(500).optional(),
  pickup_address: z.string().min(1, "Select pickup location"),
  pickup_latitude: z.number(),
  pickup_longitude: z.number(),
  dropoff_address: z.string().min(1, "Select dropoff location"),
  dropoff_latitude: z.number(),
  dropoff_longitude: z.number(),
});

type FormValues = z.infer<typeof formSchema>;

interface DirectRideModalProps {
  open: boolean;
  onClose: () => void;
  recipientId: string;
  recipientName: string;
  type: "request" | "offer";
  onSuccess?: () => void;
}

const DirectRideModal = ({ open, onClose, recipientId, recipientName, type, onSuccess }: DirectRideModalProps) => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [selectedChildIds, setSelectedChildIds] = useState<string[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [selectedVehicleInfo, setSelectedVehicleInfo] = useState<VehicleInfo | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      ride_date: new Date(new Date().setDate(new Date().getDate() + 1)),
      pickup_time: "07:30",
      seats: type === "offer" ? 2 : 1,
      message: "",
      pickup_address: "",
      pickup_latitude: 0,
      pickup_longitude: 0,
      dropoff_address: CHADWICK_SCHOOL.address,
      dropoff_latitude: CHADWICK_SCHOOL.latitude,
      dropoff_longitude: CHADWICK_SCHOOL.longitude,
    },
  });

  const isRequest = type === "request";

  // Use a key to force remount AddressAutocompleteInput on quick-fill
  const [pickupKey, setPickupKey] = useState(0);
  const [dropoffKey, setDropoffKey] = useState(0);

  const handlePickupSelect = (address: string, lat: number, lng: number) => {
    form.setValue("pickup_address", address, { shouldValidate: true });
    form.setValue("pickup_latitude", lat);
    form.setValue("pickup_longitude", lng);
  };

  const handleDropoffSelect = (address: string, lat: number, lng: number) => {
    form.setValue("dropoff_address", address, { shouldValidate: true });
    form.setValue("dropoff_latitude", lat);
    form.setValue("dropoff_longitude", lng);
  };

  const setQuickPickup = (locType: "home" | "school") => {
    if (locType === "school") {
      form.setValue("pickup_address", CHADWICK_SCHOOL.address, { shouldValidate: true });
      form.setValue("pickup_latitude", CHADWICK_SCHOOL.latitude);
      form.setValue("pickup_longitude", CHADWICK_SCHOOL.longitude);
    } else if (profile?.home_address && profile?.home_latitude && profile?.home_longitude) {
      form.setValue("pickup_address", profile.home_address, { shouldValidate: true });
      form.setValue("pickup_latitude", profile.home_latitude);
      form.setValue("pickup_longitude", profile.home_longitude);
    }
    setPickupKey(k => k + 1);
  };

  const setQuickDropoff = (locType: "home" | "school") => {
    if (locType === "school") {
      form.setValue("dropoff_address", CHADWICK_SCHOOL.address, { shouldValidate: true });
      form.setValue("dropoff_latitude", CHADWICK_SCHOOL.latitude);
      form.setValue("dropoff_longitude", CHADWICK_SCHOOL.longitude);
    } else if (profile?.home_address && profile?.home_latitude && profile?.home_longitude) {
      form.setValue("dropoff_address", profile.home_address, { shouldValidate: true });
      form.setValue("dropoff_latitude", profile.home_latitude);
      form.setValue("dropoff_longitude", profile.home_longitude);
    }
    setDropoffKey(k => k + 1);
  };

  const onSubmit = async (values: FormValues) => {
    if (!profile) return;
    if (!isFutureDateAndTime(values.ride_date, values.pickup_time)) {
      toast({ title: "Invalid Date/Time", description: PAST_DATETIME_ERROR, variant: "destructive" });
      return;
    }
    setSubmitting(true);

    try {
      // Check for duplicate
      const { data: existing } = await supabase
        .from("private_ride_requests")
        .select("id")
        .eq("sender_id", profile.id)
        .eq("recipient_id", recipientId)
        .eq("ride_date", format(values.ride_date, "yyyy-MM-dd"))
        .eq("pickup_time", values.pickup_time)
        .in("status", ["pending", "accepted"]);

      if (existing && existing.length > 0) {
        toast({ title: "Already Sent", description: "You already have a pending ride offer with this parent. Check your My Rides tab.", variant: "destructive" });
        setSubmitting(false);
        return;
      }

      if (selectedChildIds.length === 0) {
        toast({ title: "Select Children", description: "Please select at least one child for this ride.", variant: "destructive" });
        setSubmitting(false);
        return;
      }

      const { error: insertError } = await supabase.from("private_ride_requests").insert({
        request_type: type,
        sender_id: profile.id,
        recipient_id: recipientId,
        ride_date: format(values.ride_date, "yyyy-MM-dd"),
        pickup_time: values.pickup_time,
        is_round_trip: false,
        pickup_address: values.pickup_address,
        pickup_latitude: values.pickup_latitude,
        pickup_longitude: values.pickup_longitude,
        dropoff_address: values.dropoff_address,
        dropoff_latitude: values.dropoff_latitude,
        dropoff_longitude: values.dropoff_longitude,
        seats_needed: isRequest ? values.seats : null,
        seats_offered: isRequest ? null : values.seats,
        message: values.message || null,
        status: "pending",
        selected_children: selectedChildIds,
        vehicle_info: !isRequest && selectedVehicleInfo ? {
          car_make: selectedVehicleInfo.car_make,
          car_model: selectedVehicleInfo.car_model,
          car_color: selectedVehicleInfo.car_color,
          license_plate: selectedVehicleInfo.license_plate,
          vehicle_id: selectedVehicleInfo.vehicle_id,
        } : null,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

      if (insertError) throw insertError;

      // Send notification
      const senderName = [profile.first_name, profile.last_name].filter(Boolean).join(" ") || profile.username;
      await supabase.functions.invoke("create-notification", {
        body: {
          userId: recipientId,
          type: isRequest ? "direct_ride_request" : "direct_ride_offer",
          message: isRequest
            ? `🔗 ${senderName} has sent you a direct ride request for ${format(values.ride_date, "MMM d, yyyy")}`
            : `🚗 ${senderName} has sent you a direct ride offer for ${format(values.ride_date, "MMM d, yyyy")}`,
        },
      });

      toast({ title: "Sent!", description: `Your direct ride ${type} has been sent to ${recipientName}. They will be notified.` });
      form.reset();
      onClose();
      onSuccess?.();
    } catch (err) {
      console.error("Error sending direct ride:", err);
      const msg = err.message || "";
      if (msg.includes("unique") || msg.includes("duplicate")) {
        toast({ title: "Already Sent", description: "You already have a pending ride offer with this parent. Check your My Rides tab.", variant: "destructive" });
      } else {
        toast({ title: "Error", description: msg || "Failed to send. Please try again.", variant: "destructive" });
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isRequest ? <Hand className="h-5 w-5" /> : <Car className="h-5 w-5" />}
            {isRequest ? `Request Ride from ${recipientName}` : `Offer Ride to ${recipientName}`}
          </DialogTitle>
          <DialogDescription>
            This will be sent privately to {recipientName} only. It will not appear publicly.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Pickup */}
            <FormField control={form.control} name="pickup_address" render={() => (
              <FormItem>
                <FormLabel className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5 text-emerald-600" /> Pickup Location *</FormLabel>
                <div className="flex gap-1.5 mb-1.5">
                  <Button type="button" variant="outline" size="sm" className="text-xs h-7" onClick={() => setQuickPickup("school")}>Chadwick School</Button>
                  {profile?.home_address && (
                    <Button type="button" variant="outline" size="sm" className="text-xs h-7" onClick={() => setQuickPickup("home")}>My Home</Button>
                  )}
                </div>
                <FormControl>
                  <AddressAutocompleteInput
                    key={`pickup-${pickupKey}`}
                    value={form.watch("pickup_address")}
                    onAddressSelect={handlePickupSelect}
                    placeholder="Enter pickup address"
                    required
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            {/* Dropoff */}
            <FormField control={form.control} name="dropoff_address" render={() => (
              <FormItem>
                <FormLabel className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5 text-primary" /> Dropoff Location *</FormLabel>
                <div className="flex gap-1.5 mb-1.5">
                  <Button type="button" variant="outline" size="sm" className="text-xs h-7" onClick={() => setQuickDropoff("school")}>Chadwick School</Button>
                  {profile?.home_address && (
                    <Button type="button" variant="outline" size="sm" className="text-xs h-7" onClick={() => setQuickDropoff("home")}>My Home</Button>
                  )}
                </div>
                <FormControl>
                  <AddressAutocompleteInput
                    key={`dropoff-${dropoffKey}`}
                    value={form.watch("dropoff_address")}
                    onAddressSelect={handleDropoffSelect}
                    placeholder="Enter dropoff address"
                    required
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            {/* Date & Time */}
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="ride_date" render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Date *</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button variant="outline" className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                          {field.value ? format(field.value, "MMM d, yyyy") : "Pick a date"}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 pointer-events-auto" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={(date) => {
                          if (date) {
                            field.onChange(date);
                          }
                        }}
                        disabled={(d) => d < new Date(new Date().setHours(0, 0, 0, 0)) || d > new Date(new Date().setDate(new Date().getDate() + 30))}
                        initialFocus
                        className="p-3 pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="pickup_time" render={({ field }) => (
                <FormItem>
                  <FormLabel>Time *</FormLabel>
                  <FormControl>
                    <Input type="time" value={field.value} onChange={(e) => field.onChange(e.target.value)} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            {/* Seats — only for offers; requests auto-derive from selected children */}
            {!isRequest && (
              <FormField control={form.control} name="seats" render={({ field }) => (
                <FormItem>
                  <FormLabel>Seats Available *</FormLabel>
                  <Select onValueChange={(v) => field.onChange(parseInt(v))} defaultValue={field.value.toString()}>
                    <FormControl>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                        <SelectItem key={n} value={n.toString()}>{n} seat{n > 1 ? "s" : ""}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            )}

            {/* Children Riding */}
            <ChildrenRidingSelector
              selectedChildIds={selectedChildIds}
              onSelectionChange={(ids) => {
                setSelectedChildIds(ids);
                if (isRequest) form.setValue("seats", Math.max(1, ids.length));
              }}
            />


            {/* Vehicle Selection - only for offers */}
            {!isRequest && (
              <VehicleSelector
                selectedVehicleId={selectedVehicleId}
                onSelect={(id, info) => { setSelectedVehicleId(id); setSelectedVehicleInfo(info); }}
              />
            )}

            {/* Note */}
            <FormField control={form.control} name="message" render={({ field }) => (
              <FormItem>
                <FormLabel>Note (optional)</FormLabel>
                <FormControl>
                  <Textarea {...field} placeholder={`Add a message for ${recipientName}...`} className="resize-none" rows={3} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <Button type="submit" className="w-full gap-2" disabled={submitting || !isFutureDateAndTime(form.watch("ride_date"), form.watch("pickup_time"))}>
              <Send className="h-4 w-4" />
              {submitting ? "Sending..." : `Send Direct Ride ${isRequest ? "Request" : "Offer"}`}
            </Button>
            {!isFutureDateAndTime(form.watch("ride_date"), form.watch("pickup_time")) && (
              <p className="text-sm text-destructive text-center">{PAST_DATETIME_ERROR}</p>
            )}
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default DirectRideModal;
