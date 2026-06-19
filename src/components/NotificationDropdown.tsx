import { useState, useEffect, forwardRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Bell, 
  Check, 
  X, 
  MapPin, 
  MessageSquare, 
  Link2, 
  CheckCircle2, 
  XCircle, 
  UserMinus,
  Car,
  BellOff,
  Users,
  Trash2,
  Clock,
  Repeat
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';

interface Notification {
  id: string;
  user_id: string;
  type: string;
  message: string;
  is_read: boolean;
  link_id: string | null;
  created_at: string;
}

export const NotificationDropdown = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!user) return;

    fetchNotifications();

    // Set up real-time subscription
    const channel = supabase
      .channel('notifications-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setNotifications((prev) => [payload.new as Notification, ...prev].slice(0, 50));
            toast.info('New notification received', {
              icon: <Bell className="h-4 w-4" />,
            });
          } else if (payload.eventType === 'UPDATE') {
            setNotifications((prev) =>
              prev.map((n) =>
                n.id === payload.new.id ? (payload.new as Notification) : n
              )
            );
          } else if (payload.eventType === 'DELETE') {
            setNotifications((prev) => prev.filter((n) => n.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    setUnreadCount(notifications.filter((n) => !n.is_read).length);
  }, [notifications]);

  const fetchNotifications = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Error fetching notifications:', error);
      return;
    }

    setNotifications(data || []);
  };

  const markAsRead = async (notificationId: string) => {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId);

    if (error) {
      console.error('Error marking notification as read:', error);
      return;
    }

    setNotifications((prev) =>
      prev.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n))
    );
  };

  const markAllAsRead = async () => {
    if (!user) return;

    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', user.id)
      .eq('is_read', false);

    if (error) {
      console.error('Error marking all as read:', error);
      toast.error('Failed to mark all as read');
      return;
    }

    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    toast.success('All notifications marked as read');
  };

  const clearAllNotifications = async () => {
    if (!user) return;

    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('user_id', user.id);

    if (error) {
      console.error('Error clearing notifications:', error);
      toast.error('Failed to clear notifications');
      return;
    }

    setNotifications([]);
    toast.success('All notifications cleared');
  };

  const deleteNotification = async (notificationId: string) => {
    // Delete from database so it doesn't reappear
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', notificationId);

    if (error) {
      console.error('Error deleting notification:', error);
    }
    
    // Also remove from local state immediately
    setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
  };

  const handleApproveLink = async (linkId: string, notificationId: string) => {
    const { error } = await supabase
      .from('account_links')
      .update({ status: 'approved' })
      .eq('id', linkId);

    if (error) {
      console.error('Error approving link:', error);
      toast.error('Failed to approve link request');
      return;
    }

    // Delete the notification from database so it doesn't reappear
    await deleteNotification(notificationId);
    toast.success('Link request approved!');
  };

  const handleDenyLink = async (linkId: string, notificationId: string) => {
    const { error } = await supabase
      .from('account_links')
      .update({ status: 'denied' })
      .eq('id', linkId);

    if (error) {
      console.error('Error denying link:', error);
      toast.error('Failed to deny link request');
      return;
    }

    // Delete the notification from database so it doesn't reappear
    await deleteNotification(notificationId);
    toast.success('Link request denied');
  };

  const getTimeAgo = (timestamp: string) => {
    const now = new Date();
    const created = new Date(timestamp);
    const diffMs = now.getTime() - created.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return created.toLocaleDateString();
  };

  // Get icon based on notification type
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'link_request':
        return <Link2 className="h-4 w-4 text-blue-500" />;
      case 'link_request_sent':
        return <Link2 className="h-4 w-4 text-blue-500" />;
      case 'link_approved':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'link_denied':
        return <XCircle className="h-4 w-4 text-destructive" />;
      case 'unlinked':
      case 'student_unlinked':
        return <UserMinus className="h-4 w-4 text-orange-500" />;
      case 'co_parent_request':
        return <Users className="h-4 w-4 text-purple-500" />;
      case 'co_parent_approved':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'co_parent_denied':
        return <XCircle className="h-4 w-4 text-destructive" />;
      case 'ride_request':
      case 'ride_offer':
      case 'private_ride_request_received':
      case 'private_ride_offer_received':
        return <Car className="h-4 w-4 text-primary" />;
      case 'private_request_accepted':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'private_request_declined':
        return <XCircle className="h-4 w-4 text-destructive" />;
      case 'new_message':
      case 'ride_message':
        return <MessageSquare className="h-4 w-4 text-blue-500" />;
      case 'series_message':
        return <MessageSquare className="h-4 w-4 text-purple-500" />;
      case 'schedule_proposal':
        return <Repeat className="h-4 w-4 text-teal-500" />;
      case 'schedule_accepted':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'schedule_declined':
        return <XCircle className="h-4 w-4 text-destructive" />;
      case 'schedule_cancelled':
        return <XCircle className="h-4 w-4 text-destructive" />;
      case 'schedule_cancel_one':
      case 'schedule_leave_one':
        return <Clock className="h-4 w-4 text-amber-500" />;
      case 'series_ride':
        return <Car className="h-4 w-4 text-teal-500" />;
      case 'ride_expiring':
        return <Clock className="h-4 w-4 text-amber-500" />;
      default:
        return <Bell className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const isRideNotification = (type: string) => {
    if (type.startsWith('schedule_') || type.startsWith('series_')) return false;
    return type === 'ride_request' || type === 'ride_offer' || type.includes('ride');
  };

  const isPrivateRequestNotification = (type: string) => {
    return type === 'private_request_accepted' || type === 'private_request_declined' || 
           type === 'private_ride_request_received' || type === 'private_ride_offer_received';
  };

  // Notifications that mean "someone wants to join/help with YOUR ride" — deep-link to Pending tab
  const isIncomingJoinRequestNotif = (type: string) =>
    type === 'ride_join_request' || type === 'ride_request' || type === 'ride_offer';

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.is_read) {
      markAsRead(notification.id);
    }
    
    // Navigate based on notification type
    if (notification.type === 'new_message') {
      setIsOpen(false);
      navigate('/conversations');
    } else if (notification.type === 'ride_message') {
      setIsOpen(false);
      navigate('/my-rides?tab=pending');
    } else if (notification.type === 'series_message' || notification.type === 'series_ride' || notification.type === 'schedule_proposal' || notification.type === 'schedule_accepted' || notification.type === 'schedule_declined') {
      setIsOpen(false);
      navigate('/series');
    } else if (notification.type === 'schedule_cancelled') {
      setIsOpen(false);
      navigate('/family-carpools');
    } else if (notification.type === 'schedule_cancel_one' || notification.type === 'schedule_leave_one') {
      setIsOpen(false);
      navigate('/my-rides?tab=pending');
    } else if (notification.type === 'ride_expiring') {
      setIsOpen(false);
      navigate('/my-rides?tab=pending');
    } else if (notification.type.includes('link') || notification.type.includes('unlinked')) {
      setIsOpen(false);
      navigate('/family-links');
    } else if (isPrivateRequestNotification(notification.type)) {
      setIsOpen(false);
      navigate('/requests/private');
    } else if (isIncomingJoinRequestNotif(notification.type)) {
      setIsOpen(false);
      navigate('/my-rides?tab=pending');
    } else if (isRideNotification(notification.type)) {
      setIsOpen(false);
      navigate('/my-rides?tab=pending');
    }
  };

  // IMPORTANT: This component is used inside Radix "asChild" triggers.
  // It must forward refs and pass props through so Radix can attach handlers.
  const NotificationBell = forwardRef<
    HTMLButtonElement,
    React.ComponentPropsWithoutRef<typeof Button>
  >(({ className, ...props }, ref) => (
    <Button
      ref={ref}
      variant="ghost"
      size="icon"
      aria-label="Notifications"
      className={cn('relative', className)}
      {...props}
    >
      <Bell className="h-5 w-5" />
      {unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground text-xs font-bold animate-in zoom-in duration-200">
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      )}
    </Button>
  ));
  NotificationBell.displayName = 'NotificationBell';

  const NotificationContent = () => (
    <>
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h3 className="font-semibold text-foreground">Notifications</h3>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={markAllAsRead}
              className="h-auto py-1 text-xs text-primary hover:text-primary/80"
            >
              Mark all read
            </Button>
          )}
          {notifications.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAllNotifications}
              className="h-auto py-1 text-xs text-destructive hover:text-destructive/80"
            >
              <Trash2 className="h-3 w-3 mr-1" />
              Clear all
            </Button>
          )}
        </div>
      </div>
      <ScrollArea className={isMobile ? "h-[calc(100vh-120px)]" : "h-[480px]"}>
        {notifications.length === 0 ? (
          <div className="p-8 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <BellOff className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="font-medium text-foreground">You're all caught up!</p>
            <p className="text-sm text-muted-foreground mt-1">No new notifications</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={`p-4 hover:bg-accent/50 cursor-pointer transition-colors ${
                  !notification.is_read ? 'bg-primary/5' : ''
                }`}
                onClick={() => handleNotificationClick(notification)}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-0.5">
                    {getNotificationIcon(notification.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground whitespace-pre-wrap break-words">
                      {notification.message}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {getTimeAgo(notification.created_at)}
                    </p>
                    
                    {/* Action buttons for ride notifications */}
                    {isRideNotification(notification.type) && !notification.type.includes('link') && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsOpen(false);
                          navigate('/my-rides?tab=pending');
                        }}
                        className="h-7 mt-2 gap-1 text-xs"
                      >
                        <Car className="h-3 w-3" />
                        View in My Rides
                      </Button>
                    )}

                    {/* Action buttons for private request notifications */}
                    {isPrivateRequestNotification(notification.type) && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsOpen(false);
                          navigate('/requests/private');
                        }}
                        className="h-7 mt-2 gap-1 text-xs"
                      >
                        <MessageSquare className="h-3 w-3" />
                        View Requests
                      </Button>
                    )}

                    {/* Action buttons for series notifications */}
                    {(notification.type === 'series_message' || notification.type === 'series_ride' || notification.type === 'schedule_proposal' || notification.type === 'schedule_accepted' || notification.type === 'schedule_declined') && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsOpen(false);
                          navigate('/series');
                        }}
                        className="h-7 mt-2 gap-1 text-xs"
                      >
                        <Repeat className="h-3 w-3" />
                        View in Series
                      </Button>
                    )}

                    {/* Action buttons for schedule cancelled notifications */}
                    {notification.type === 'schedule_cancelled' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsOpen(false);
                          navigate('/family-carpools');
                        }}
                        className="h-7 mt-2 gap-1 text-xs"
                      >
                        <Car className="h-3 w-3" />
                        View Family Carpools
                      </Button>
                    )}

                    {/* Action buttons for individual ride cancel/leave */}
                    {(notification.type === 'schedule_cancel_one' || notification.type === 'schedule_leave_one') && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsOpen(false);
                          navigate('/my-rides?tab=pending');
                        }}
                        className="h-7 mt-2 gap-1 text-xs"
                      >
                        <Car className="h-3 w-3" />
                        View in My Rides
                      </Button>
                    )}
                    
                    {/* Inline actions for link requests */}
                    {notification.type === 'link_request' && notification.link_id && (
                      <div className="flex gap-2 mt-3">
                        <Button
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleApproveLink(notification.link_id!, notification.id);
                          }}
                          className="h-7 text-xs"
                        >
                          <Check className="h-3 w-3 mr-1" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDenyLink(notification.link_id!, notification.id);
                          }}
                          className="h-7 text-xs"
                        >
                          <X className="h-3 w-3 mr-1" />
                          Deny
                        </Button>
                      </div>
                    )}
                  </div>
                  {!notification.is_read && (
                    <div className="h-2 w-2 rounded-full bg-primary flex-shrink-0 mt-1.5" />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </>
  );

  // Mobile: Use Sheet for full-screen experience
  if (isMobile) {
    return (
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <NotificationBell />
        </SheetTrigger>
        <SheetContent side="right" className="w-full sm:max-w-md p-0">
          <SheetHeader className="sr-only">
            <SheetTitle>Notifications</SheetTitle>
          </SheetHeader>
          <NotificationContent />
        </SheetContent>
      </Sheet>
    );
  }

  // Desktop: Use Dropdown
  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <NotificationBell />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-96 p-0 bg-background border-border z-[100]">
        <NotificationContent />
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
