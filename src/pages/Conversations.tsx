import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";
import { DashboardLayout } from "@/components/DashboardLayout";
import SEO from "@/components/SEO";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  MessageSquare, 
  Calendar, 
  Clock, 
  MapPin, 
  Check, 
  X,
  CheckCheck,
  Send,
  Inbox,
  Sparkles,
  TrendingUp
} from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { format, formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import {
  CancelRequestDialog,
  DeclineRequestDialog,
  ConfirmDialog,
} from "@/components/ConfirmDialogs";
import { useScrollReveal, useStaggeredAnimation } from "@/lib/animations";

interface Conversation {
  id: string;
  ride_id: string;
  sender_id: string;
  recipient_id: string;
  status: string;
  message: string | null;
  created_at: string;
  updated_at: string | null;
  read_at: string | null;
  sender_profile?: {
    first_name: string | null;
    last_name: string | null;
    username: string;
  };
  recipient_profile?: {
    first_name: string | null;
    last_name: string | null;
    username: string;
  };
  ride?: {
    id: string;
    type: string;
    pickup_location: string;
    dropoff_location: string;
    ride_date: string;
    ride_time: string;
    seats_needed: number | null;
    seats_available: number | null;
    user_id: string;
  };
}

const Conversations = () => {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [acceptDialogOpen, setAcceptDialogOpen] = useState(false);
  const [declineDialogOpen, setDeclineDialogOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'sent' | 'received'>('all');

  // Animation hooks must be called before any early returns
  const { ref: headerRef, isVisible: headerVisible } = useScrollReveal<HTMLDivElement>();
  const staggeredAnimation = useStaggeredAnimation(50);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/login");
    }
  }, [user, loading, navigate]);

  const fetchConversations = useCallback(async () => {
    if (!user) return;

    setLoadingConversations(true);
    const { data, error } = await supabase
      .from('ride_conversations')
      .select(`
        *,
        sender_profile:profiles!ride_conversations_sender_id_fkey(first_name, last_name, username),
        recipient_profile:profiles!ride_conversations_recipient_id_fkey(first_name, last_name, username),
        ride:rides(id, type, pickup_location, dropoff_location, ride_date, ride_time, seats_needed, seats_available, user_id)
      `)
      .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
      .order('created_at', { ascending: false });

    if (error) {
      logger.error('Error fetching conversations:', error);
      toast.error('Failed to load conversations');
    } else {
      logger.log('[Conversations] Loaded conversations:', data?.length || 0);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setConversations(data as any || []);
      
      // Mark unread conversations as read (where user is recipient)
      const unreadIds = (data || [])
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .filter((c: any) => c.recipient_id === user.id && !c.read_at)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((c: any) => c.id);
      
      if (unreadIds.length > 0) {
        markAsRead(unreadIds);
      }
    }
    setLoadingConversations(false);
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchConversations();
    }
  }, [user, fetchConversations]);

  // Real-time subscription for conversation updates
  // Only subscribe AFTER the initial data has been fetched to prevent race conditions
  const initialFetchDone = useRef(false);
  useEffect(() => {
    if (!user) return;
    if (!initialFetchDone.current) {
      // Mark initial fetch as done after first successful fetchConversations
      initialFetchDone.current = true;
      return;
    }

    const channel = supabase
      .channel('conversations-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ride_conversations',
          filter: `sender_id=eq.${user.id}`
        },
        (payload) => {
          logger.log('[Conversations] Real-time update (sender):', payload);
          fetchConversations();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ride_conversations',
          filter: `recipient_id=eq.${user.id}`
        },
        (payload) => {
          logger.log('[Conversations] Real-time update (recipient):', payload);
          fetchConversations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchConversations]);

  const markAsRead = async (conversationIds: string[]) => {
    const { error } = await supabase
      .from('ride_conversations')
      .update({ read_at: new Date().toISOString() })
      .in('id', conversationIds);

    if (error) {
      console.error('Error marking conversations as read:', error);
    }
  };

  const handleAccept = async () => {
    if (!selectedConversation) return;
    setActionLoading(true);
    
    const { error } = await supabase
      .from('ride_conversations')
      .update({ 
        status: 'accepted',
        updated_at: new Date().toISOString()
      })
      .eq('id', selectedConversation.id);

    if (error) {
      toast.error('Failed to accept ride');
    } else {
      toast.success('Ride accepted! The requester will be notified.');
      fetchConversations();
    }
    setActionLoading(false);
    setAcceptDialogOpen(false);
    setSelectedConversation(null);
  };

  const handleDecline = async (reason?: string) => {
    if (!selectedConversation) return;
    setActionLoading(true);
    
    const { error } = await supabase
      .from('ride_conversations')
      .update({ 
        status: 'declined',
        updated_at: new Date().toISOString()
      })
      .eq('id', selectedConversation.id);

    if (error) {
      toast.error('Failed to decline ride');
    } else {
      toast.success('Ride declined');
      fetchConversations();
    }
    setActionLoading(false);
    setDeclineDialogOpen(false);
    setSelectedConversation(null);
  };

  const handleCancel = async () => {
    if (!selectedConversation) return;
    setActionLoading(true);
    
    const { error } = await supabase
      .from('ride_conversations')
      .update({ 
        status: 'cancelled',
        updated_at: new Date().toISOString()
      })
      .eq('id', selectedConversation.id);

    if (error) {
      toast.error('Failed to cancel request');
    } else {
      toast.success('Request cancelled');
      fetchConversations();
    }
    setActionLoading(false);
    setCancelDialogOpen(false);
    setSelectedConversation(null);
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
        return <Badge variant="outline" className="bg-yellow-50 dark:bg-yellow-950 text-yellow-700 dark:text-yellow-300">Pending</Badge>;
      case 'accepted':
        return <Badge className="bg-green-600">Accepted</Badge>;
      case 'declined':
        return <Badge variant="destructive">Declined</Badge>;
      case 'cancelled':
        return <Badge variant="secondary">Cancelled</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  // Filter out cancelled and declined conversations - they should disappear
  const activeConversations = conversations.filter(conv => 
    conv.status !== 'cancelled' && conv.status !== 'declined'
  );

  // Filter conversations based on active tab
  const filteredConversations = activeConversations.filter(conv => {
    if (activeTab === 'sent') return conv.sender_id === user?.id;
    if (activeTab === 'received') return conv.recipient_id === user?.id;
    return true;
  });

  const sentCount = activeConversations.filter(c => c.sender_id === user?.id).length;
  const receivedCount = activeConversations.filter(c => c.recipient_id === user?.id).length;
  const unreadCount = activeConversations.filter(c => c.recipient_id === user?.id && !c.read_at).length;

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

  const ConversationCard = ({ conversation }: { conversation: Conversation }) => {
    const isSender = conversation.sender_id === user?.id;
    const otherParty = isSender ? conversation.recipient_profile : conversation.sender_profile;
    const canRespond = !isSender && conversation.status === 'pending';
    const canCancel = isSender && conversation.status === 'pending';
    const isUnread = !isSender && !conversation.read_at;

    // Verify this conversation is properly linked to a ride
    const isValidConversation = conversation.ride && conversation.ride_id;

    return (
      <Card className={isUnread ? 'border-primary/50 bg-primary/5' : ''}>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <Avatar className="h-12 w-12">
                <AvatarFallback className="bg-primary/10 text-primary">
                  {getInitials(otherParty?.first_name || null, otherParty?.last_name || null, otherParty?.username || 'UN')}
                </AvatarFallback>
              </Avatar>
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  {otherParty?.first_name} {otherParty?.last_name}
                  {isUnread && (
                    <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                  )}
                </CardTitle>
                <p className="text-sm text-muted-foreground">@{otherParty?.username}</p>
              </div>
            </div>
            <div className="flex flex-col items-end gap-1">
              {getStatusBadge(conversation.status)}
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                {isSender && conversation.read_at && (
                  <CheckCheck className="h-3 w-3 text-blue-500" />
                )}
                {isSender && !conversation.read_at && conversation.status !== 'pending' && (
                  <Check className="h-3 w-3" />
                )}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              {isSender ? (
                <Send className="h-4 w-4 text-muted-foreground" />
              ) : (
                <Inbox className="h-4 w-4 text-muted-foreground" />
              )}
              <p className="text-sm font-medium">
                {isSender ? 'You sent a request' : 'Received a request'} for a {conversation.ride?.type === 'offer' ? 'ride offer' : 'ride request'}
              </p>
            </div>
            {conversation.message && (
              <p className="text-sm text-muted-foreground italic pl-6">"{conversation.message}"</p>
            )}
          </div>

          {!isValidConversation && (
            <div className="text-sm text-destructive bg-destructive/10 p-2 rounded">
              ⚠️ Ride data unavailable - the original ride may have been deleted
            </div>
          )}

          {isValidConversation && (
            <>
              <Separator />

              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 mt-1 text-muted-foreground flex-shrink-0" />
                  <div className="text-sm">
                    <div className="font-medium">{conversation.ride?.pickup_location}</div>
                    <div className="text-muted-foreground">to {conversation.ride?.dropoff_location}</div>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    {conversation.ride?.ride_date && format(new Date(conversation.ride.ride_date), 'MMM d, yyyy')}
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    {conversation.ride?.ride_time}
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Timestamps */}
          <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
            <span>Created {formatDistanceToNow(new Date(conversation.created_at), { addSuffix: true })}</span>
            {conversation.updated_at && conversation.updated_at !== conversation.created_at && (
              <span>Updated {formatDistanceToNow(new Date(conversation.updated_at), { addSuffix: true })}</span>
            )}
          </div>

          {canRespond && (
            <div className="flex gap-2 pt-2">
              <Button 
                onClick={() => {
                  setSelectedConversation(conversation);
                  setAcceptDialogOpen(true);
                }}
                className="flex-1 gap-2"
              >
                <Check className="h-4 w-4" />
                Accept
              </Button>
              <Button 
                variant="outline"
                onClick={() => {
                  setSelectedConversation(conversation);
                  setDeclineDialogOpen(true);
                }}
                className="flex-1 gap-2"
              >
                <X className="h-4 w-4" />
                Decline
              </Button>
            </div>
          )}

          {canCancel && (
            <Button 
              variant="outline"
              onClick={() => {
                setSelectedConversation(conversation);
                setCancelDialogOpen(true);
              }}
              className="w-full gap-2"
            >
              <X className="h-4 w-4" />
              Cancel Request
            </Button>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <DashboardLayout>
      <SEO
        title="Messages — Dolphin Carpool"
        description="Coordinate confirmed carpools with parents through in-app ride conversations."
        path="/conversations"
      />
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="min-h-screen bg-gradient-to-br from-gray-50/50 via-white to-blue-50/30"
      >
      <div className="container mx-auto px-4 max-w-5xl py-8">
        <Breadcrumbs items={[{ label: "My Conversations" }]} />

        {/* Premium Header */}
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
                  className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/25"
                >
                  <MessageSquare className="w-6 h-6 text-white" />
                </motion.div>
                <div>
                  <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 bg-clip-text text-transparent">
                    My Conversations
                  </h1>
                </div>
              </motion.div>
              <motion.p 
                className="text-gray-500 ml-15"
                initial={{ opacity: 0 }}
                animate={headerVisible ? { opacity: 1 } : {}}
                transition={{ delay: 0.3 }}
              >
                All your direct ride negotiations and responses to public posts
              </motion.p>
            </div>

            {/* Quick Stats */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={headerVisible ? { opacity: 1, scale: 1 } : {}}
              transition={{ delay: 0.4 }}
              className="flex items-center gap-2"
            >
              <div className="flex items-center gap-2 px-3 py-1.5 bg-white/80 backdrop-blur-sm rounded-lg border border-gray-200">
                <TrendingUp className="w-4 h-4 text-violet-600" />
                <span className="text-sm font-medium text-gray-700">{conversations.length} Total</span>
              </div>
              {unreadCount > 0 && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-red-50 rounded-lg border border-red-200">
                  <Sparkles className="w-4 h-4 text-red-500" />
                  <span className="text-sm font-medium text-red-700">{unreadCount} New</span>
                </div>
              )}
            </motion.div>
          </div>
        </motion.div>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab( // eslint-disable-next-line @typescript-eslint/no-explicit-any
          v as any)} className="mb-6">
          <TabsList className="bg-white/80 backdrop-blur-sm p-1 rounded-xl">
            <TabsTrigger value="all" className="gap-2 rounded-lg data-[state=active]:bg-violet-500 data-[state=active]:text-white">
              All
              <Badge variant="secondary" className="ml-1 bg-gray-100">{conversations.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="sent" className="gap-2 rounded-lg data-[state=active]:bg-blue-500 data-[state=active]:text-white">
              <Send className="h-4 w-4" />
              Sent
              <Badge variant="secondary" className="ml-1 bg-gray-100">{sentCount}</Badge>
            </TabsTrigger>
            <TabsTrigger value="received" className="gap-2 rounded-lg data-[state=active]:bg-emerald-500 data-[state=active]:text-white">
              <Inbox className="h-4 w-4" />
              Received
              {unreadCount > 0 && (
                <Badge className="ml-1 bg-red-500 text-white">{unreadCount}</Badge>
              )}
              {unreadCount === 0 && (
                <Badge variant="secondary" className="ml-1 bg-gray-100">{receivedCount}</Badge>
              )}
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <AnimatePresence mode="wait">
          {loadingConversations ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="grid grid-cols-1 md:grid-cols-2 gap-4"
            >
              {[1, 2, 3, 4].map((i) => (
                <Card key={i} className="rounded-2xl border-gray-100 bg-white/80 backdrop-blur-sm">
                  <CardContent className="p-6 space-y-4">
                    <div className="flex items-center gap-3">
                      <Skeleton className="w-10 h-10 rounded-full" />
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                    </div>
                    <Skeleton className="h-20 w-full" />
                  </CardContent>
                </Card>
              ))}
            </motion.div>
          ) : filteredConversations.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <EmptyState
                icon={MessageSquare}
                title={activeTab === 'sent' ? "No Sent Requests" : activeTab === 'received' ? "No Received Requests" : "No Active Conversations"}
                description={
                  activeTab === 'sent' 
                    ? "When you respond to rides, they'll appear here" 
                    : activeTab === 'received'
                    ? "When others respond to your rides, they'll appear here"
                    : "When you respond to rides or receive ride requests, they'll appear here"
                }
                action={{
                  label: "Find Rides",
                  onClick: () => navigate('/family-carpools')
                }}
              />
            </motion.div>
          ) : (
            <motion.div 
              className="grid grid-cols-1 md:grid-cols-2 gap-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <AnimatePresence mode="popLayout">
                {filteredConversations.map((conversation, index) => (
                  <motion.div
                    key={conversation.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: index * 0.05 }}
                    layout
                  >
                    <ConversationCard conversation={conversation} />
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Accept Dialog */}
        <ConfirmDialog
          open={acceptDialogOpen}
          onOpenChange={setAcceptDialogOpen}
          onConfirm={handleAccept}
          title="Accept this request?"
          description={`By accepting, ${selectedConversation?.sender_profile?.first_name || 'the requester'} will be notified and receive your contact information.`}
          confirmLabel="Accept Request"
          cancelLabel="Cancel"
          loading={actionLoading}
          icon={<Check className="w-5 h-5 text-green-600" />}
        />

        {/* Decline Dialog */}
        <DeclineRequestDialog
          open={declineDialogOpen}
          onOpenChange={setDeclineDialogOpen}
          onConfirm={handleDecline}
          senderName={`${selectedConversation?.sender_profile?.first_name || ''} ${selectedConversation?.sender_profile?.last_name || ''}`.trim() || 'This user'}
          loading={actionLoading}
        />

        {/* Cancel Dialog */}
        <CancelRequestDialog
          open={cancelDialogOpen}
          onOpenChange={setCancelDialogOpen}
          onConfirm={handleCancel}
          recipientName={`${selectedConversation?.recipient_profile?.first_name || ''} ${selectedConversation?.recipient_profile?.last_name || ''}`.trim() || 'The recipient'}
          loading={actionLoading}
        />
      </div>
      </motion.div>
    </DashboardLayout>
  );
};

export default Conversations;