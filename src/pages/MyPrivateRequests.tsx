import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import SEO from "@/components/SEO";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Hand, 
  Car, 
  Calendar, 
  Clock, 
  MapPin,
  X,
  Check,
  MessageSquare,
  Send
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { toast } from "sonner";
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
import { Textarea } from "@/components/ui/textarea";
import RideUserBadge from "@/components/RideUserBadge";

interface PrivateRequest {
  id: string;
  request_type: 'request' | 'offer';
  sender_id: string;
  recipient_id: string;
  status: 'pending' | 'accepted' | 'declined' | 'cancelled';
  ride_date: string;
  pickup_time: string;
  is_round_trip: boolean;
  return_time: string | null;
  pickup_address: string;
  dropoff_address: string;
  seats_needed: number | null;
  seats_offered: number | null;
  distance_from_route: number | null;
  message: string | null;
  created_at: string;
  responded_at: string | null;
  sender?: {
    first_name: string | null;
    last_name: string | null;
    username: string;
    phone_number: string | null;
  };
  recipient?: {
    first_name: string | null;
    last_name: string | null;
    username: string;
    phone_number: string | null;
  };
}

const MyPrivateRequests = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [sentRequests, setSentRequests] = useState<PrivateRequest[]>([]);
  const [receivedRequests, setReceivedRequests] = useState<PrivateRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [acceptDialogOpen, setAcceptDialogOpen] = useState(false);
  const [declineDialogOpen, setDeclineDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<PrivateRequest | null>(null);
  const [declineReason, setDeclineReason] = useState("");

  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }
    fetchRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, navigate]);

  const fetchRequests = async () => {
    if (!user) return;

    setLoading(true);

    // Fetch sent requests - get basic request data first
    const { data: sent } = await supabase
      .from('private_ride_requests')
      .select('*')
      .eq('sender_id', user.id)
      .order('created_at', { ascending: false });

    if (sent) {
      // Fetch recipient profiles for sent requests
      const recipientIds = [...new Set(sent.map(r => r.recipient_id))];
      const { data: recipientProfiles } = await supabase
        .from('profiles_public')
        .select('id, first_name, last_name, username, phone_number')
        .in('id', recipientIds);
      
      const profileMap = new Map(recipientProfiles?.map(p => [p.id, p]) || []);
      const sentWithProfiles = sent.map(r => ({
        ...r,
        recipient: profileMap.get(r.recipient_id) || null
      }));
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setSentRequests(sentWithProfiles as any);
    }

    // Fetch received requests
    const { data: received } = await supabase
      .from('private_ride_requests')
      .select('*')
      .eq('recipient_id', user.id)
      .order('created_at', { ascending: false });

    if (received) {
      // Fetch sender profiles for received requests
      const senderIds = [...new Set(received.map(r => r.sender_id))];
      const { data: senderProfiles } = await supabase
        .from('profiles_public')
        .select('id, first_name, last_name, username, phone_number')
        .in('id', senderIds);
      
      const profileMap = new Map(senderProfiles?.map(p => [p.id, p]) || []);
      const receivedWithProfiles = received.map(r => ({
        ...r,
        sender: profileMap.get(r.sender_id) || null
      }));
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setReceivedRequests(receivedWithProfiles as any);
    }

    setLoading(false);
  };

  const handleAcceptRequest = async () => {
    if (!selectedRequest) return;

    const { error } = await supabase
      .from('private_ride_requests')
      .update({ 
        status: 'accepted',
        responded_at: new Date().toISOString()
      })
      .eq('id', selectedRequest.id);

    if (error) {
      toast.error('Failed to accept request');
      return;
    }

    // Create notification for sender
    await supabase.from('notifications').insert({
      user_id: selectedRequest.sender_id,
      type: 'private_request_accepted',
      message: `${profile?.first_name} ${profile?.last_name} accepted your ${selectedRequest.request_type} for ${format(new Date(selectedRequest.ride_date), 'MMM d')}!`
    });

    toast.success('Request accepted!');
    setAcceptDialogOpen(false);
    setSelectedRequest(null);
    fetchRequests();
  };

  const handleDeclineRequest = async () => {
    if (!selectedRequest) return;

    const { error } = await supabase
      .from('private_ride_requests')
      .update({ 
        status: 'declined',
        responded_at: new Date().toISOString()
      })
      .eq('id', selectedRequest.id);

    if (error) {
      toast.error('Failed to decline request');
      return;
    }

    // Create notification for sender
    const message = declineReason 
      ? `${profile?.first_name} ${profile?.last_name} declined your ${selectedRequest.request_type}. Reason: ${declineReason}`
      : `${profile?.first_name} ${profile?.last_name} declined your ${selectedRequest.request_type}`;

    await supabase.from('notifications').insert({
      user_id: selectedRequest.sender_id,
      type: 'private_request_declined',
      message
    });

    toast.success('Request declined');
    setDeclineDialogOpen(false);
    setSelectedRequest(null);
    setDeclineReason("");
    fetchRequests();
  };

  const handleCancelRequest = async (requestId: string) => {
    // Delete the request entirely so it disappears from the list
    const { error } = await supabase
      .from('private_ride_requests')
      .delete()
      .eq('id', requestId)
      .eq('sender_id', user?.id);

    if (error) {
      console.error('Delete error:', error);
      toast.error('Failed to cancel request');
      return;
    }

    // Remove from local state immediately for instant UI feedback
    setSentRequests(prev => prev.filter(r => r.id !== requestId));
    toast.success('Request cancelled and removed');
  };

  const getInitials = (firstName: string | null, lastName: string | null, username: string) => {
    if (firstName && lastName) {
      return `${firstName[0]}${lastName[0]}`.toUpperCase();
    }
    return username.substring(0, 2).toUpperCase();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-600/20">Awaiting Response</Badge>;
      case 'accepted':
        return <Badge className="bg-green-500/10 text-green-600 border-green-600/20">✓ Accepted</Badge>;
      case 'declined':
        return <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-600/20">✗ Declined</Badge>;
      case 'cancelled':
        return <Badge variant="secondary">Cancelled</Badge>;
      default:
        return null;
    }
  };

  const getTimeAgo = (timestamp: string) => {
    const now = new Date();
    const created = new Date(timestamp);
    const diffMs = now.getTime() - created.getTime();
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) return 'Less than 1 hour ago';
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  };

  if (!user || !profile) {
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
      <SEO
        title="Private Ride Requests — Dolphin Carpool"
        description="Review and manage your direct, private ride requests with other Dolphin parents."
        path="/requests/private"
      />
      <div className="container mx-auto px-4 max-w-7xl">
        <Breadcrumbs items={[{ label: "My Private Requests" }]} />

        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">My Private Requests</h1>
          <p className="text-muted-foreground">
            Manage your direct ride requests and offers
          </p>
        </div>

        <Tabs defaultValue="sent" className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="sent" className="gap-2">
              <Send className="h-4 w-4" />
              Sent ({sentRequests.length})
            </TabsTrigger>
            <TabsTrigger value="received" className="gap-2">
              <MessageSquare className="h-4 w-4" />
              Received ({receivedRequests.length})
            </TabsTrigger>
          </TabsList>

          {/* SENT REQUESTS TAB */}
          <TabsContent value="sent" className="space-y-4">
            {loading ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  Loading your sent requests...
                </CardContent>
              </Card>
            ) : sentRequests.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="py-12 text-center">
                  <Send className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold mb-2">No Sent Requests</h3>
                  <p className="text-muted-foreground mb-4">
                    You haven't sent any private requests yet. Find rides to get started!
                  </p>
                  <Button onClick={() => navigate('/find-rides')} className="gap-2">
                    <MapPin className="h-4 w-4" />
                    Find Rides
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {sentRequests.map((request) => (
                  <Card key={request.id}>
                    <CardContent className="pt-6">
                      <div className="flex items-start gap-4">
                        <div className="flex-1 space-y-3">
                          <div className="flex items-start justify-between">
                            <div>
                              <RideUserBadge
                                userId={request.recipient_id}
                                firstName={request.recipient?.first_name || null}
                                lastName={request.recipient?.last_name || null}
                                username={request.recipient?.username || 'Unknown'}
                                accountType="parent"
                                variant="compact"
                                showViewButton={false}
                              />
                              <div className="flex items-center gap-2 mt-2">
                                <Badge variant="outline" className="gap-1">
                                  {request.request_type === 'request' ? (
                                    <>
                                      <Hand className="h-3 w-3" />
                                      Ride Request
                                    </>
                                  ) : (
                                    <>
                                      <Car className="h-3 w-3" />
                                      Ride Offer
                                    </>
                                  )}
                                </Badge>
                                {getStatusBadge(request.status)}
                              </div>
                            </div>
                            {request.distance_from_route && (
                              <Badge variant="secondary" className="gap-1">
                                <MapPin className="h-3 w-3" />
                                {request.distance_from_route.toFixed(1)} mi
                              </Badge>
                            )}
                          </div>

                          <div className="space-y-2 text-sm">
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Calendar className="h-4 w-4" />
                              {format(new Date(request.ride_date), 'EEEE, MMMM d, yyyy')}
                            </div>
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Clock className="h-4 w-4" />
                              {request.pickup_time}
                              {request.is_round_trip && request.return_time && ` (Round trip: ${request.return_time})`}
                            </div>
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <MapPin className="h-4 w-4" />
                              {request.pickup_address} → {request.dropoff_address}
                            </div>
                          </div>

                          {request.message && (
                            <div className="p-3 bg-muted/50 rounded-lg text-sm">
                              <p className="text-muted-foreground">Your message:</p>
                              <p className="mt-1">{request.message}</p>
                            </div>
                          )}

                          <div className="flex items-center justify-between pt-2 border-t">
                            <p className="text-xs text-muted-foreground">
                              Sent {getTimeAgo(request.created_at)}
                            </p>
                            
                            <div className="flex gap-2">
                              {request.status === 'pending' && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleCancelRequest(request.id)}
                                >
                                  Cancel Request
                                </Button>
                              )}
                              {request.status === 'accepted' && (
                                <>
                                  <Button variant="outline" size="sm" className="gap-2">
                                    <MessageSquare className="h-4 w-4" />
                                    Message
                                  </Button>
                                  <Button size="sm">View Details</Button>
                                </>
                              )}
                              {request.status === 'declined' && (
                                <Button variant="outline" size="sm">
                                  Send Again
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* RECEIVED REQUESTS TAB */}
          <TabsContent value="received" className="space-y-4">
            {loading ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  Loading received requests...
                </CardContent>
              </Card>
            ) : receivedRequests.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="py-12 text-center">
                  <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold mb-2">No Requests Received</h3>
                  <p className="text-muted-foreground">
                    No requests received yet. Other parents will find you on the map!
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {receivedRequests.map((request) => (
                  <Card key={request.id}>
                    <CardContent className="pt-6">
                      <div className="flex items-start gap-4">
                        <div className="flex-1 space-y-3">
                          <div className="flex items-start justify-between">
                            <div>
                              <RideUserBadge
                                userId={request.sender_id}
                                firstName={request.sender?.first_name || null}
                                lastName={request.sender?.last_name || null}
                                username={request.sender?.username || 'Unknown'}
                                accountType="parent"
                                variant="compact"
                                showViewButton={false}
                              />
                              <div className="flex items-center gap-2 mt-2">
                                <Badge variant="outline" className="gap-1">
                                  {request.request_type === 'request' ? (
                                    <>
                                      <Hand className="h-3 w-3" />
                                      Ride Request
                                    </>
                                  ) : (
                                    <>
                                      <Car className="h-3 w-3" />
                                      Ride Offer
                                    </>
                                  )}
                                </Badge>
                                {getStatusBadge(request.status)}
                              </div>
                            </div>
                            {request.distance_from_route && (
                              <Badge variant="secondary" className="gap-1">
                                <MapPin className="h-3 w-3" />
                                {request.distance_from_route.toFixed(1)} mi from your route
                              </Badge>
                            )}
                          </div>

                          <div className="space-y-2 text-sm">
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Calendar className="h-4 w-4" />
                              {format(new Date(request.ride_date), 'EEEE, MMMM d, yyyy')}
                            </div>
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Clock className="h-4 w-4" />
                              {request.pickup_time}
                              {request.is_round_trip && request.return_time && ` (Round trip: ${request.return_time})`}
                            </div>
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <MapPin className="h-4 w-4" />
                              {request.pickup_address} → {request.dropoff_address}
                            </div>
                          </div>

                          {request.message && (
                            <div className="p-3 bg-muted/50 rounded-lg text-sm">
                              <p className="text-muted-foreground">Their message:</p>
                              <p className="mt-1">{request.message}</p>
                            </div>
                          )}

                          <div className="flex items-center justify-between pt-2 border-t">
                            <p className="text-xs text-muted-foreground">
                              Received {getTimeAgo(request.created_at)}
                            </p>
                            
                            <div className="flex gap-2">
                              {request.status === 'pending' && (
                                <>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      setSelectedRequest(request);
                                      setDeclineDialogOpen(true);
                                    }}
                                    className="gap-2"
                                  >
                                    <X className="h-4 w-4" />
                                    Decline
                                  </Button>
                                  <Button
                                    size="sm"
                                    onClick={() => {
                                      setSelectedRequest(request);
                                      setAcceptDialogOpen(true);
                                    }}
                                    className="gap-2"
                                  >
                                    <Check className="h-4 w-4" />
                                    Accept
                                  </Button>
                                </>
                              )}
                              {request.status === 'accepted' && (
                                <>
                                  <Button variant="outline" size="sm" className="gap-2">
                                    <MessageSquare className="h-4 w-4" />
                                    Message
                                  </Button>
                                  <Button size="sm">View Details</Button>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Accept Confirmation Dialog */}
        <AlertDialog open={acceptDialogOpen} onOpenChange={setAcceptDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Accept {selectedRequest?.request_type === 'request' ? 'Ride Request' : 'Ride Offer'}?</AlertDialogTitle>
              <AlertDialogDescription className="space-y-2">
                <p>
                  You're about to accept a {selectedRequest?.request_type} from {selectedRequest?.sender?.first_name} {selectedRequest?.sender?.last_name}.
                </p>
                <div className="bg-muted p-3 rounded-lg text-sm space-y-1">
                  <p><strong>Date:</strong> {selectedRequest && format(new Date(selectedRequest.ride_date), 'EEEE, MMMM d, yyyy')}</p>
                  <p><strong>Time:</strong> {selectedRequest?.pickup_time}</p>
                  <p><strong>Route:</strong> {selectedRequest?.pickup_address} → {selectedRequest?.dropoff_address}</p>
                </div>
                <p className="text-yellow-600 font-medium">
                  ⚠️ By accepting, {selectedRequest?.sender?.first_name} will receive your contact information.
                </p>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleAcceptRequest} className="bg-green-600 hover:bg-green-700">
                Confirm Accept
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Decline Confirmation Dialog */}
        <AlertDialog open={declineDialogOpen} onOpenChange={setDeclineDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Decline {selectedRequest?.request_type === 'request' ? 'Ride Request' : 'Ride Offer'}?</AlertDialogTitle>
              <AlertDialogDescription className="space-y-3">
                <p>
                  Decline the {selectedRequest?.request_type} from {selectedRequest?.sender?.first_name} {selectedRequest?.sender?.last_name}?
                </p>
                <div>
                  <label className="text-sm font-medium">Reason (optional)</label>
                  <Textarea
                    value={declineReason}
                    onChange={(e) => setDeclineReason(e.target.value)}
                    placeholder="Let them know why you can't help this time..."
                    className="mt-2"
                    rows={3}
                  />
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeclineRequest}>
                Confirm Decline
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
};

export default MyPrivateRequests;
