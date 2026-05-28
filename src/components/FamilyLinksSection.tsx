import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, UserPlus, X, Unlink, Users, UserCheck, UserX, AlertTriangle } from "lucide-react";
import { createNotification, NotificationMessages } from "@/lib/notifications";
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
import { HelpTooltip } from "@/components/HelpTooltip";

interface LinkedAccount {
  id: string;
  user_id: string;
  email: string;
  first_name: string;
  last_name: string;
  status: string;
  created_at: string;
  requested_by: string | null;
}

const FamilyLinksSection = () => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [incomingRequests, setIncomingRequests] = useState<LinkedAccount[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<LinkedAccount[]>([]);
  const [linkedAccounts, setLinkedAccounts] = useState<LinkedAccount[]>([]);
  const [isLoadingLinks, setIsLoadingLinks] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [unlinkingId, setUnlinkingId] = useState<string | null>(null);

  const isStudent = profile?.account_type === 'student';

  useEffect(() => {
    if (user && profile) {
      fetchLinks();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, profile]);

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('family-links-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'account_links',
          filter: isStudent 
            ? `student_id=eq.${user.id}`
            : `parent_id=eq.${user.id}`,
        },
        () => {
          fetchLinks();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, isStudent]);

  const fetchLinks = async () => {
    setIsLoadingLinks(true);
    try {
      const { data: links, error } = await supabase
        .from('account_links')
        .select('id, student_id, parent_id, status, created_at, requested_by')
        .or(isStudent 
          ? `student_id.eq.${user?.id}`
          : `parent_id.eq.${user?.id}`
        );

      if (error) throw error;

      const userIds = links?.map(link => 
        isStudent ? link.parent_id : link.student_id
      ).filter(Boolean) || [];
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let userDetails: Record<string, any> = {};
      
      if (userIds.length > 0) {
        const { data: usersData } = await supabase
          .from('users_safe')
          .select('user_id, email, first_name, last_name')
          .in('user_id', userIds);
        
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        userDetails = (usersData || []).reduce((acc: Record<string, any>, u: any) => {
          acc[u.user_id] = u;
          return acc;
        }, {});
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const formattedLinks = links?.map((link: any) => {
        const userId = isStudent ? link.parent_id : link.student_id;
        const details = userDetails[userId];
        return {
          id: link.id,
          user_id: userId,
          email: details?.email || 'Unknown',
          first_name: details?.first_name || '',
          last_name: details?.last_name || '',
          status: link.status,
          created_at: link.created_at,
          requested_by: link.requested_by,
        };
      }) || [];

      const pending = formattedLinks.filter((l: LinkedAccount) => l.status === 'pending');
      setIncomingRequests(pending.filter((l: LinkedAccount) => l.requested_by !== user?.id));
      setOutgoingRequests(pending.filter((l: LinkedAccount) => l.requested_by === user?.id));
      setLinkedAccounts(formattedLinks.filter((l: LinkedAccount) => l.status === 'approved'));
    } catch (error) {
      console.error('Error fetching links:', error);
      toast({
        title: "Error",
        description: "Failed to load family links",
        variant: "destructive",
      });
    } finally {
      setIsLoadingLinks(false);
    }
  };

  const validateEmail = (email: string): string | null => {
    if (!email) return "Please enter an email address";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "Please enter a valid email address";
    
    if (isStudent && email.toLowerCase().endsWith('@chadwickschool.org')) {
      return "This email belongs to a student account. Please enter a parent's email.";
    }
    
    return null;
  };

  const handleSendRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validationError = validateEmail(email);
    if (validationError) {
      toast({ title: "Invalid Email", description: validationError, variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      const trimmedEmail = email.trim().toLowerCase();
      
      // Students search for parents, parents search for students
      const expectedRole = isStudent ? 'parent' : 'student';
      
      const { data: targetUser, error: lookupError } = await supabase.functions.invoke('lookup-parent', {
        body: { email: trimmedEmail, expected_role: expectedRole },
      });

      if (lookupError) throw lookupError;

      if (!targetUser?.found) {
        toast({ title: "Account Not Found", description: targetUser?.message || "No account found with this email", variant: "destructive" });
        return;
      }

      const targetUserId = targetUser.user_id;

      const { data: existingLink, error: checkError } = await supabase
        .from('account_links')
        .select('id, status')
        .eq('student_id', isStudent ? user?.id : targetUserId)
        .eq('parent_id', isStudent ? targetUserId : user?.id)
        .maybeSingle();

      if (checkError) throw checkError;

      if (existingLink) {
        if (existingLink.status === 'pending') {
          toast({ title: "Request Already Sent", description: "A pending request already exists", variant: "destructive" });
          return;
        }
        if (existingLink.status === 'approved') {
          toast({ title: "Already Linked", description: "You're already linked to this account", variant: "destructive" });
          return;
        }
        if (existingLink.status === 'denied') {
          await supabase.from('account_links').delete().eq('id', existingLink.id);
        }
      }

      const { data: newLink, error: insertError } = await supabase
        .from('account_links')
        .insert({
          student_id: isStudent ? user?.id : targetUserId,
          parent_id: isStudent ? targetUserId : user?.id,
          status: 'pending',
          requested_by: user?.id,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      const senderName = `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim() || 'A user';
      await createNotification(
        targetUserId,
        'link_request',
        NotificationMessages.linkRequest(senderName, user?.email || ''),
        newLink.id
      );

      toast({ title: "Request Sent!", description: `Link request sent to ${email}. They must accept your request to complete the connection.` });
      setEmail("");
      fetchLinks();
    } catch (error) {
      console.error('Error sending link request:', error);
      toast({ title: "Error", description: "Failed to send link request. Please try again.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApprove = async (linkId: string, userName: string, userId: string) => {
    setProcessingId(linkId);
    try {
      await supabase.from('account_links').update({ status: 'approved' }).eq('id', linkId);
      const approverName = `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim() || 'Your parent';
      await supabase.from('notifications').insert({
        user_id: userId, type: 'link_approved',
        message: NotificationMessages.linkApproved(approverName), link_id: linkId,
      });
      toast({ title: "Request Approved", description: `${userName} linked successfully` });
      fetchLinks();
    } catch (error) {
      console.error('Error approving request:', error);
      toast({ title: "Error", description: "Failed to approve request", variant: "destructive" });
    } finally {
      setProcessingId(null);
    }
  };

  const handleDeny = async (linkId: string, userId: string) => {
    setProcessingId(linkId);
    try {
      await supabase.from('account_links').delete().eq('id', linkId);
      const denierName = `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim() || 'Your parent';
      await supabase.from('notifications').insert({
        user_id: userId, type: 'link_denied',
        message: NotificationMessages.linkDenied(denierName),
      });
      toast({ title: "Request Denied", description: "Link request has been denied" });
      fetchLinks();
    } catch (error) {
      console.error('Error denying request:', error);
      toast({ title: "Error", description: "Failed to deny request", variant: "destructive" });
    } finally {
      setProcessingId(null);
    }
  };

  const handleCancelRequest = async (linkId: string, userId: string) => {
    try {
      await supabase.from('account_links').delete().eq('id', linkId);
      const userName = `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim() || 'A user';
      await createNotification(userId, 'student_unlinked', NotificationMessages.studentUnlinked(userName));
      toast({ title: "Request Cancelled", description: "Link request has been cancelled" });
      fetchLinks();
    } catch (error) {
      console.error('Error cancelling request:', error);
      toast({ title: "Error", description: "Failed to cancel request", variant: "destructive" });
    }
  };

  const handleUnlink = async () => {
    if (!unlinkingId) return;
    const account = linkedAccounts.find(a => a.id === unlinkingId);
    if (!account) return;

    try {
      const { error: deleteError } = await supabase.from('account_links').delete().eq('id', unlinkingId);
      if (deleteError) throw deleteError;

      // Send notification (best-effort, don't fail the unlink if this errors)
      const userName = `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim() || 'A user';
      try {
        await createNotification(
          account.user_id,
          isStudent ? 'student_unlinked' : 'unlinked_by_parent',
          isStudent 
            ? NotificationMessages.studentUnlinked(userName)
            : NotificationMessages.unlinkedByParent(userName)
        );
      } catch (notifErr) {
        console.warn('Failed to send unlink notification:', notifErr);
      }

      toast({ title: "Unlinked", description: `You have been unlinked from ${account.first_name} ${account.last_name}` });
      fetchLinks();
    } catch (error) {
      console.error('Error unlinking:', error);
      toast({ title: "Error", description: "Failed to unlink", variant: "destructive" });
    } finally {
      setUnlinkingId(null);
    }
  };

  if (isLoadingLinks) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Send Request Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            {isStudent ? 'Link to Parent' : 'Connect Your Child\'s Account'}
            <HelpTooltip content={
              isStudent
                ? "Linking to your parent allows them to schedule rides for you"
                : "Enter your child's school email to let them view rides you've scheduled for them on their student account"
            } />
          </CardTitle>
          <CardDescription>
            {isStudent
              ? "Enter the email your parent used to register (not a school email)"
              : "If you want your child to be able to see the rides you've scheduled for them from their own account, enter their email address here. They will need to accept your request."
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSendRequest} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="link-email">
                {isStudent ? "Parent's Email Address" : "Student's Email Address"}
              </Label>
              <Input
                id="link-email"
                type="email"
                placeholder={isStudent ? "parent@example.com" : "child@example.com"}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isSubmitting}
              />
            </div>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Sending...</>
              ) : (
                <><UserPlus className="mr-2 h-4 w-4" />Send Link Request</>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Incoming Requests (requests I need to accept/decline) */}
      {incomingRequests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Incoming Link Requests
              <Badge variant="destructive">{incomingRequests.length}</Badge>
            </CardTitle>
            <CardDescription>
              {isStudent ? 'Parents requesting to link to your account' : 'Students requesting to link to your account'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {incomingRequests.map((request) => (
                <div key={request.id} className="flex items-center justify-between p-4 border rounded-lg bg-card">
                  <div className="space-y-1">
                    <p className="font-semibold">{request.first_name} {request.last_name}</p>
                    <p className="text-sm text-muted-foreground">{request.email}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(request.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="destructive" size="sm" onClick={() => handleDeny(request.id, request.user_id)} disabled={processingId === request.id}>
                      {processingId === request.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <><UserX className="mr-2 h-4 w-4" />Decline</>}
                    </Button>
                    <Button size="sm" onClick={() => handleApprove(request.id, `${request.first_name} ${request.last_name}`, request.user_id)} disabled={processingId === request.id} className="bg-green-600 hover:bg-green-700">
                      {processingId === request.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <><UserCheck className="mr-2 h-4 w-4" />Accept</>}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Outgoing Requests (requests I sent, waiting for response) */}
      {outgoingRequests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Pending Outgoing Requests
              <Badge variant="secondary">{outgoingRequests.length}</Badge>
            </CardTitle>
            <CardDescription>
              Requests you sent that are waiting for approval
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {outgoingRequests.map((request) => (
                <div key={request.id} className="flex items-center justify-between p-4 border rounded-lg bg-card">
                  <div className="space-y-1">
                    <p className="font-semibold">{request.first_name} {request.last_name}</p>
                    <p className="text-sm text-muted-foreground">{request.email}</p>
                    <p className="text-xs text-muted-foreground">
                      Sent {new Date(request.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => handleCancelRequest(request.id, request.user_id)}>
                    <X className="mr-2 h-4 w-4" />Cancel
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Linked Accounts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            {isStudent ? 'Linked Parents' : 'Linked Students'}
          </CardTitle>
          <CardDescription>
            {isStudent 
              ? 'Parents who can manage your rides'
              : 'Students currently linked to your account'
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {linkedAccounts.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">
                {isStudent 
                  ? "You haven't linked to any parents yet"
                  : "No students linked to your account yet"
                }
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {linkedAccounts.map((account) => (
                <div key={account.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-1">
                    <p className="font-semibold">{account.first_name} {account.last_name}</p>
                    <p className="text-sm text-muted-foreground">{account.email}</p>
                    <p className="text-xs text-muted-foreground">
                      Linked {new Date(account.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <Button
                    variant="ghost" size="sm"
                    onClick={() => setUnlinkingId(account.id)}
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    {isStudent ? <Unlink className="h-4 w-4" /> : <><AlertTriangle className="mr-2 h-4 w-4" />Remove</>}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Unlink Confirmation */}
      <AlertDialog open={!!unlinkingId} onOpenChange={() => setUnlinkingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {isStudent ? 'Unlink from Parent?' : 'Remove Linked Student?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {isStudent 
                ? "Are you sure you want to unlink from this parent? You'll no longer see their carpools."
                : unlinkingId && linkedAccounts.find(a => a.id === unlinkingId) && (
                  <>Are you sure you want to remove <strong>{linkedAccounts.find(a => a.id === unlinkingId)?.first_name} {linkedAccounts.find(a => a.id === unlinkingId)?.last_name}</strong>? They will no longer be able to see your carpools.</>
                )
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleUnlink} className="bg-destructive hover:bg-destructive/90">
              {isStudent ? 'Unlink' : 'Remove Student'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default FamilyLinksSection;
