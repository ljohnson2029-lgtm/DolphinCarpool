import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import { CalendarIcon, Clock, MapPin, Users, Home as HomeIcon, School, Lock, Send, X, CheckCircle, Mail, Phone, Copy } from "lucide-react";
import { HelpTooltip } from "./HelpTooltip";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { isFutureDateAndTime, PAST_DATETIME_ERROR } from "@/lib/rideValidation";
import { cn } from "@/lib/utils";
import ChildrenRidingSelector from "@/components/ChildrenRidingSelector";

const CHADWICK_SCHOOL = {
  name: "Chadwick School",
  address: "26800 S Academy Dr, Palos Verdes Peninsula, CA 90274",
  latitude: 33.77667,
  longitude: -118.36111,
};

const timeSlots = Array.from({ length: 13 }, (_, i) => {
  const hour = Math.floor(i / 4) + 6;
  const minute = (i % 4) * 15;
  const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
  return time;
});

const afternoonSlots = Array.from({ length: 17 }, (_, i) => {
  const hour = Math.floor(i / 4) + 14;
  const minute = (i % 4) * 15;
  const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
  return time;
});

const requestFormSchema = z.object({
  ride_date: z.date({
    required_error: "Please select a date",
  }).refine((date) => date >= new Date(new Date().setHours(0, 0, 0, 0)), {
    message: "Date cannot be in the past",
  }).refine((date) => {
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + 30);
    return date <= maxDate;
  }, {
    message: "Date cannot be more than 30 days in the future",
  }),
  pickup_time: z.string().min(1, "Please select a pickup time"),
  is_round_trip: z.boolean().default(false),
  return_time: z.string().optional(),
  seats_needed: z.number().min(1, "Must request at least 1 seat").max(5, "Maximum 5 seats"),
  message: z.string().max(500, "Message must be less than 500 characters").optional(),
}).refine((data) => {
  if (data.is_round_trip && !data.return_time) {
    return false;
  }
  return true;
}, {
  message: "Return time is required for round trips",
  path: ["return_time"],
});

type RequestFormValues = z.infer<typeof requestFormSchema>;

interface PrivateRideRequestModalProps {
  open: boolean;
  onClose: () => void;
  recipientId: string;
  recipientName: string;
  distance: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  userProfile: Record<string, any>;
  onSuccess?: () => void;
}

const PrivateRideRequestModal = ({
  open,
  onClose,
  recipientId,
  recipientName,
  distance,
  userProfile,
  onSuccess,
}: PrivateRideRequestModalProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [showDiscardDialog, setShowDiscardDialog] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [recipientProfile, setRecipientProfile] = useState<Record<string, any> | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [recipientContact, setRecipientContact] = useState<{
    firstName: string;
    lastName: string;
    email: string | null;
    phone: string | null;
  } | null>(null);

  const form = useForm<RequestFormValues>({
    resolver: zodResolver(requestFormSchema),
    defaultValues: {
      ride_date: new Date(new Date().setDate(new Date().getDate() + 1)),
      pickup_time: "07:30",
      is_round_trip: false,
      return_time: "15:00",
      seats_needed: 1,
      message: "",
    },
  });

  const isDirty = form.formState.isDirty;

  useEffect(() => {
    if (open && recipientId) {
      fetchRecipientProfile();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, recipientId]);

  const fetchRecipientProfile = async () => {
    setLoadingProfile(true);
    try {
      const { data, error } = await supabase
        .from('profiles_public')
        .select('id, username, first_name, last_name, phone_number, share_email, share_phone')
        .eq('id', recipientId)
        .single();

      if (error) throw error;
      setRecipientProfile(data);
    } catch (err) {
      console.error('Error fetching recipient profile:', err);
    } finally {
      setLoadingProfile(false);
    }
  };

  const getInitials = (firstName: string | null, lastName: string | null, username: string) => {
    if (firstName && lastName) {
      return `${firstName[0]}${lastName[0]}`.toUpperCase();
    }
    return username.substring(0, 2).toUpperCase();
  };

  const handleClose = () => {
    if (isDirty) {
      setShowDiscardDialog(true);
    } else {
      onClose();
      form.reset();
    }
  };

  const handleDiscard = () => {
    setShowDiscardDialog(false);
    onClose();
    form.reset();
  };

  const onSubmit = async (values: RequestFormValues) => {
    // Block past date/time
    if (!isFutureDateAndTime(values.ride_date, values.pickup_time)) {
      toast({
        title: "Invalid Date/Time",
        description: PAST_DATETIME_ERROR,
        variant: "destructive",
      });
      return;
    }
    setSubmitting(true);

    try {
      // Check for duplicate request
      const { data: existingRequests, error: checkError } = await supabase
        .from('private_ride_requests')
        .select('id')
        .eq('sender_id', userProfile.id)
        .eq('recipient_id', recipientId)
        .eq('ride_date', format(values.ride_date, 'yyyy-MM-dd'))
        .eq('pickup_time', values.pickup_time)
        .in('status', ['pending', 'accepted']);

      if (checkError) throw checkError;

      if (existingRequests && existingRequests.length > 0) {
        toast({
          title: "Duplicate Request",
          description: `You already have a pending request with ${recipientName} for this date and time.`,
          variant: "destructive",
        });
        setSubmitting(false);
        return;
      }

      // Fetch recipient's email for contact info
      const { data: recipientUser } = await supabase
        .from('users_safe')
        .select('email')
        .eq('user_id', recipientId)
        .single();

      // Insert private ride request with ACCEPTED status (instant connection)
      const { data: requestData, error: insertError } = await supabase
        .from('private_ride_requests')
        .insert({
          request_type: 'request',
          sender_id: userProfile.id,
          recipient_id: recipientId,
          ride_date: format(values.ride_date, 'yyyy-MM-dd'),
          pickup_time: values.pickup_time,
          is_round_trip: values.is_round_trip,
          return_time: values.is_round_trip ? values.return_time : null,
          pickup_address: userProfile.home_address,
          pickup_latitude: userProfile.home_latitude,
          pickup_longitude: userProfile.home_longitude,
          dropoff_address: CHADWICK_SCHOOL.address,
          dropoff_latitude: CHADWICK_SCHOOL.latitude,
          dropoff_longitude: CHADWICK_SCHOOL.longitude,
          seats_needed: values.seats_needed,
          seats_offered: null,
          message: values.message || null,
          distance_from_route: distance,
          status: 'accepted',
          responded_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Create notification for recipient about the instant connection
      const { error: notifError } = await supabase
        .from('notifications')
        .insert({
          user_id: recipientId,
          type: 'ride_connected',
          message: `${userProfile.first_name || userProfile.username} needs a ride on ${format(values.ride_date, 'MMM d, yyyy')} at ${values.pickup_time}! Contact them to coordinate.`,
          is_read: false,
        });

      if (notifError) console.error('Notification error:', notifError);

      // Set contact info for success display
      setRecipientContact({
        firstName: recipientProfile?.first_name || recipientName,
        lastName: recipientProfile?.last_name || '',
        email: recipientProfile?.share_email !== false ? recipientUser?.email || null : null,
        phone: recipientProfile?.share_phone ? recipientProfile?.phone_number : null,
      });
      setShowSuccessModal(true);

      toast({
        title: "You're connected! 🎉",
        description: `Contact ${recipientName} to coordinate pickup details.`,
      });

      form.reset();
    } catch (err) {
      console.error('Error sending request:', err);
      toast({
        title: "Error",
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        description: (err as any).message || "Unable to send request. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSuccessClose = () => {
    setShowSuccessModal(false);
    setRecipientContact(null);
    onClose();
    onSuccess?.();
    navigate('/my-rides');
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied!", description: "Contact info copied to clipboard" });
  };

  const messageLength = form.watch('message')?.length || 0;

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-[500px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl flex items-center gap-2 pr-8">
              Request Ride from {recipientName}
              <HelpTooltip content="This request is sent only to this specific parent. They will be notified and can accept or decline." />
            </DialogTitle>
            <DialogDescription>
              Fill in the details for your ride request
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Recipient Info */}
              <Card className="bg-muted/50">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {loadingProfile ? (
                        <div className="h-10 w-10 rounded-full bg-muted animate-pulse" />
                      ) : (
                        <Avatar className="h-10 w-10">
                          <AvatarFallback className="bg-primary/10 text-primary">
                            {recipientProfile && getInitials(
                              recipientProfile.first_name,
                              recipientProfile.last_name,
                              recipientProfile.username
                            )}
                          </AvatarFallback>
                        </Avatar>
                      )}
                      <div>
                        <p className="font-semibold">{recipientName}</p>
                        <Badge variant="secondary" className="gap-1 text-xs">
                          <MapPin className="h-3 w-3" />
                          {distance.toFixed(1)} miles from your route
                        </Badge>
                      </div>
                    </div>
                    <Lock className="h-4 w-4 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>

              {/* Route Details */}
              <Card className="bg-muted/50">
                <CardContent className="p-4 space-y-2">
                  <Label className="text-xs text-muted-foreground flex items-center gap-1">
                    <Lock className="h-3 w-3" />
                    Your Route
                  </Label>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <HomeIcon className="h-4 w-4 text-blue-500" />
                      <span className="font-medium">From:</span>
                      <span className="text-muted-foreground truncate">{userProfile?.home_address}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <School className="h-4 w-4 text-orange-500" />
                      <span className="font-medium">To:</span>
                      <span className="text-muted-foreground">Chadwick School</span>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    This request is for pickup along your normal route to school
                  </p>
                </CardContent>
              </Card>

              {/* Date & Time */}
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="ride_date"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>When do you need a ride? *</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "MMM d, yyyy")
                              ) : (
                                <span>Pick a date</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) =>
                              date < new Date(new Date().setHours(0, 0, 0, 0)) ||
                              date > new Date(new Date().setDate(new Date().getDate() + 30))
                            }
                            initialFocus
                            className="pointer-events-auto"
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="pickup_time"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Pickup time *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select time" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {timeSlots.map((time) => (
                            <SelectItem key={time} value={time}>
                              {format(new Date(`2000-01-01T${time}`), 'h:mm a')}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Round Trip Toggle */}
              <FormField
                control={form.control}
                name="is_round_trip"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Round trip?</FormLabel>
                      <FormDescription>
                        Need a ride both to and from school?
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              {/* Return Time (conditional) */}
              {form.watch('is_round_trip') && (
                <FormField
                  control={form.control}
                  name="return_time"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Return pickup time *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select return time" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {afternoonSlots.map((time) => (
                            <SelectItem key={time} value={time}>
                              {format(new Date(`2000-01-01T${time}`), 'h:mm a')}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {/* Seats Needed */}
              <FormField
                control={form.control}
                name="seats_needed"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>How many seats do you need? *</FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(parseInt(value))}
                      defaultValue={field.value.toString()}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {[1, 2, 3, 4, 5].map((num) => (
                          <SelectItem key={num} value={num.toString()}>
                            {num} {num === 1 ? 'seat' : 'seats'}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Message */}
              <FormField
                control={form.control}
                name="message"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Add a message (optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder={`Tell ${recipientName} any additional details... e.g., car seat needed, pickup location specifics, flexible timing, etc.`}
                        className="resize-none min-h-[100px]"
                        maxLength={500}
                        {...field}
                      />
                    </FormControl>
                    <FormDescription className="flex justify-between">
                      <span>Add any relevant details for {recipientName}</span>
                      <span className={cn(
                        "text-xs",
                        messageLength > 450 && "text-destructive"
                      )}>
                        {messageLength}/500 characters
                      </span>
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Action Buttons */}
              <div className="flex flex-col-reverse sm:flex-row gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  disabled={submitting}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={submitting || !form.formState.isValid || !isFutureDateAndTime(form.watch("ride_date"), form.watch("pickup_time"))}
                  className="flex-1 gap-2"
                >
                  {submitting ? (
                    <>
                      <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      Send Request
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Success Modal with Contact Info */}
      <AlertDialog open={showSuccessModal} onOpenChange={handleSuccessClose}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-green-600">
              <CheckCircle className="w-5 h-5" />
              Ride Confirmed!
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4">
                <p>
                  You're now connected with <strong>{recipientContact?.firstName} {recipientContact?.lastName}</strong>.
                  Contact them to coordinate pickup details.
                </p>
                <div className="bg-muted rounded-lg p-4 space-y-3">
                  <p className="font-medium text-foreground">Contact Information:</p>
                  {recipientContact?.email && (
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 text-foreground">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{recipientContact.email}</span>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => copyToClipboard(recipientContact.email!)}
                        className="h-8 px-2"
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                  {recipientContact?.phone && (
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 text-foreground">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{recipientContact.phone}</span>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => copyToClipboard(recipientContact.phone!)}
                        className="h-8 px-2"
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                  {!recipientContact?.email && !recipientContact?.phone && (
                    <p className="text-sm text-muted-foreground">
                      Contact info not shared. Check the My Rides page for updates.
                    </p>
                  )}
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={handleSuccessClose}>
              Done
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Discard Confirmation Dialog */}
      <AlertDialog open={showDiscardDialog} onOpenChange={setShowDiscardDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard request?</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes. Are you sure you want to close?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Editing</AlertDialogCancel>
            <AlertDialogAction onClick={handleDiscard} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Discard
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default PrivateRideRequestModal;
