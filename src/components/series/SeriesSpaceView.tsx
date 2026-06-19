import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Send, Loader2, CalendarPlus, Contact, Info, GraduationCap, Pencil, X, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ContactCardModal } from "@/components/ContactCardModal";
import ScheduleRecurringRideForm from "./ScheduleRecurringRideForm";
import ScheduleCard from "./ScheduleCard";

interface Message {
  id: string;
  sender_id: string;
  message_text: string;
  is_read: boolean;
  created_at: string;
}

interface ScheduleData {
  id: string;
  space_id: string;
  proposer_id: string;
  recipient_id: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  day_assignments: any;
  proposer_regular_time: string | null;
  proposer_wednesday_time: string | null;
  recipient_regular_time: string | null;
  recipient_wednesday_time: string | null;
  proposer_children: string[];
  recipient_children: string[] | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  proposer_vehicle: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  recipient_vehicle: any;
  status: string;
  created_at: string;
}

interface ChildInfo {
  id: string;
  first_name: string;
  last_name: string;
  grade_level: string | null;
}

interface Props {
  spaceId: string;
  otherParentName: string;
  onBack: () => void;
}

const SeriesSpaceView = ({ spaceId, otherParentName, onBack }: Props) => {
  const { user, profile } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [schedules, setSchedules] = useState<ScheduleData[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [loadingMsgs, setLoadingMsgs] = useState(true);
  const [loadingSchedules, setLoadingSchedules] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [otherParentId, setOtherParentId] = useState("");
  const [currentUserName, setCurrentUserName] = useState("");
  const [otherParentAddress, setOtherParentAddress] = useState<string | null>(null);
  const [otherParentPhone, setOtherParentPhone] = useState<string | null>(null);
  const [otherParentChildren, setOtherParentChildren] = useState<ChildInfo[]>([]);
  const [otherParentSelectedChildIds, setOtherParentSelectedChildIds] = useState<string[]>([]);
  const [otherParentSubmitted, setOtherParentSubmitted] = useState(false);
  const [myChildren, setMyChildren] = useState<ChildInfo[]>([]);
  const [selectedChildIds, setSelectedChildIds] = useState<string[]>([]);
  const [mySubmitted, setMySubmitted] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingChildIds, setEditingChildIds] = useState<string[]>([]);
  const [submittingChildren, setSubmittingChildren] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const [myAddress, setMyAddress] = useState<string | null>(null);
  const [proposerNames, setProposerNames] = useState<Record<string, string>>({});
  const [refreshingSeries, setRefreshingSeries] = useState(false);

  // Fetch space info, other parent data, and own children
  useEffect(() => {
    if (!user) return;
    const fetchSpace = async () => {
      const { data } = await supabase
        .from("series_spaces")
        .select("parent_a_id, parent_b_id")
        .eq("id", spaceId)
        .single();
      if (data) {
        const otherId = data.parent_a_id === user.id ? data.parent_b_id : data.parent_a_id;
        setOtherParentId(otherId);

        const [{ data: otherProfile }, { data: otherChildrenData }, { data: myChildrenData }, { data: mySelections }, { data: otherSelections }] = await Promise.all([
          supabase.from("profiles").select("home_address, phone_number").eq("id", otherId).single(),
          supabase.from("children").select("id, first_name, last_name, grade_level").eq("user_id", otherId),
          supabase.from("children").select("id, first_name, last_name, grade_level").eq("user_id", user.id),
          supabase.from("series_child_selections").select("child_id").eq("space_id", spaceId).eq("parent_id", user.id),
          supabase.from("series_child_selections").select("child_id").eq("space_id", spaceId).eq("parent_id", otherId),
        ]);
        setOtherParentAddress(otherProfile?.home_address || null);
        setOtherParentPhone(otherProfile?.phone_number || null);
        setOtherParentChildren(otherChildrenData || []);
        setMyChildren(myChildrenData || []);

        // Other parent submitted = has selections in DB
        const otherHasSelections = otherSelections && otherSelections.length > 0;
        setOtherParentSubmitted(!!otherHasSelections);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setOtherParentSelectedChildIds(otherHasSelections ? otherSelections.map((s: any) => s.child_id) : []);

        // My submitted state
        const myHasSelections = mySelections && mySelections.length > 0;
        setMySubmitted(!!myHasSelections);
        if (myHasSelections) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          setSelectedChildIds(mySelections.map((s: any) => s.child_id));
        }
      }
    };
    fetchSpace();
    setMyAddress(profile?.home_address || null);
    const name = [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") || profile?.username || "A parent";
    setCurrentUserName(name);
  }, [user, spaceId, profile]);

  // Submit children selections
  const handleSubmitChildren = async () => {
    if (!user || selectedChildIds.length === 0) return;
    setSubmittingChildren(true);
    // Delete existing, then insert new
    await supabase.from("series_child_selections").delete().eq("space_id", spaceId).eq("parent_id", user.id);
    const inserts = selectedChildIds.map((cid) => ({ space_id: spaceId, parent_id: user.id, child_id: cid }));
    await supabase.from("series_child_selections").insert(inserts);
    setMySubmitted(true);
    setSubmittingChildren(false);
  };

  // Save edited children
  const handleSaveEdit = async () => {
    if (!user || editingChildIds.length === 0) return;
    setSubmittingChildren(true);
    await supabase.from("series_child_selections").delete().eq("space_id", spaceId).eq("parent_id", user.id);
    const inserts = editingChildIds.map((cid) => ({ space_id: spaceId, parent_id: user.id, child_id: cid }));
    await supabase.from("series_child_selections").insert(inserts);
    setSelectedChildIds(editingChildIds);
    setIsEditing(false);
    setSubmittingChildren(false);
  };

  const handleStartEdit = () => {
    setEditingChildIds([...selectedChildIds]);
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditingChildIds([]);
  };

  const toggleChildForSubmit = (childId: string) => {
    setSelectedChildIds((prev) =>
      prev.includes(childId) ? prev.filter((id) => id !== childId) : [...prev, childId]
    );
  };

  const toggleChildForEdit = (childId: string) => {
    setEditingChildIds((prev) =>
      prev.includes(childId) ? prev.filter((id) => id !== childId) : [...prev, childId]
    );
  };

  const fetchMessages = useCallback(async () => {
    const { data } = await supabase
      .from("series_messages")
      .select("*")
      .eq("space_id", spaceId)
      .order("created_at", { ascending: false })
      .limit(100);
    if (data) setMessages(data.reverse());
    setLoadingMsgs(false);
  }, [spaceId]);

  const fetchSchedules = useCallback(async () => {
    const { data } = await supabase
      .from("recurring_schedules")
      .select("*")
      .eq("space_id", spaceId)
      .not("status", "in", '("cancelled","declined")')
      .order("created_at", { ascending: false });
    if (data) {
      setSchedules(data as unknown as ScheduleData[]);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const ids = [...new Set(data.map((s: any) => s.proposer_id))];
      if (ids.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, first_name, last_name, username")
          .in("id", ids);
        if (profiles) {
          const nameMap: Record<string, string> = {};
          for (const p of profiles) {
            nameMap[p.id] = [p.first_name, p.last_name].filter(Boolean).join(" ") || p.username;
          }
          setProposerNames(nameMap);
        }
      }
    }
    setLoadingSchedules(false);
  }, [spaceId]);

  useEffect(() => { fetchMessages(); fetchSchedules(); }, [fetchMessages, fetchSchedules]);

  const handleRefreshSeries = useCallback(async () => {
    setRefreshingSeries(true);
    await Promise.all([fetchMessages(), fetchSchedules()]);
    // Re-fetch children selections
    if (otherParentId) {
      const [{ data: mySelections }, { data: otherSelections }] = await Promise.all([
        supabase.from("series_child_selections").select("child_id").eq("space_id", spaceId).eq("parent_id", user!.id),
        supabase.from("series_child_selections").select("child_id").eq("space_id", spaceId).eq("parent_id", otherParentId),
      ]);
      const myHas = mySelections && mySelections.length > 0;
      setMySubmitted(!!myHas);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (myHas) setSelectedChildIds(mySelections.map((s: any) => s.child_id));
      const otherHas = otherSelections && otherSelections.length > 0;
      setOtherParentSubmitted(!!otherHas);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setOtherParentSelectedChildIds(otherHas ? otherSelections.map((s: any) => s.child_id) : []);
    }
    setRefreshingSeries(false);
    toast.success('Series updated', { duration: 2000 });
  }, [fetchMessages, fetchSchedules, otherParentId, spaceId, user]);

  // Mark messages as read
  useEffect(() => {
    if (!user || messages.length === 0) return;
    supabase
      .from("series_messages")
      .update({ is_read: true })
      .eq("space_id", spaceId)
      .neq("sender_id", user.id)
      .eq("is_read", false)
      .then();
  }, [messages, user, spaceId]);

  // Realtime for messages
  useEffect(() => {
    const channel = supabase
      .channel(`series-chat-${spaceId}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "series_messages",
        filter: `space_id=eq.${spaceId}`,
      }, (payload) => {
        const msg = payload.new as Message;
        setMessages((prev) => prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [spaceId]);

  // Realtime for child selections — sync between parents
  useEffect(() => {
    if (!otherParentId) return;
    const channel = supabase
      .channel(`series-children-${spaceId}`)
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "series_child_selections",
        filter: `space_id=eq.${spaceId}`,
      }, async () => {
        const { data } = await supabase
          .from("series_child_selections")
          .select("child_id")
          .eq("space_id", spaceId)
          .eq("parent_id", otherParentId);
        if (data && data.length > 0) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          setOtherParentSelectedChildIds(data.map((s: any) => s.child_id));
          setOtherParentSubmitted(true);
        } else {
          setOtherParentSelectedChildIds([]);
          setOtherParentSubmitted(false);
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [spaceId, otherParentId]);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const handleSend = async () => {
    if (!newMessage.trim() || sending || !user) return;
    setSending(true);
    const text = newMessage.trim();
    setNewMessage("");

    const { error } = await supabase.from("series_messages").insert({
      space_id: spaceId,
      sender_id: user.id,
      message_text: text,
    });

    if (error) {
      setNewMessage(text);
    } else {
      if (otherParentId) {
        try {
          await supabase.functions.invoke("create-notification", {
            body: {
              userId: otherParentId,
              type: "series_message",
              message: `💬 ${currentUserName || "A parent"} sent you a message about your series ride`,
              linkId: spaceId,
            },
          });
        } catch {
          // Silently ignore notification errors
        }
      }
    }
    setSending(false);
  };

  const handleSchedulePosted = () => {
    setShowForm(false);
    fetchSchedules();
  };

  // Active checkbox IDs depending on mode
  const activeIds = isEditing ? editingChildIds : selectedChildIds;
  const toggleFn = isEditing ? toggleChildForEdit : toggleChildForSubmit;

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold text-foreground">Series with {otherParentName}</h1>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          disabled={refreshingSeries}
          onClick={handleRefreshSeries}
        >
          <RefreshCw className={`h-3.5 w-3.5 ${refreshingSeries ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* LEFT COLUMN: Chat + Children */}
        <div className="space-y-4">
          {/* Chat Section */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Coordinate recurring rides with this parent here</CardTitle>
                <Button variant="outline" size="sm" className="gap-1.5 text-xs shrink-0" onClick={() => setContactOpen(true)}>
                  <Contact className="h-3.5 w-3.5" />
                  View Contact Info
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-3 pt-0">
              <div ref={scrollRef} className="h-64 overflow-y-auto space-y-2 mb-3 border rounded-lg p-3 bg-muted/30">
                {loadingMsgs ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  </div>
                ) : messages.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-8">No messages yet. Start a conversation!</p>
                ) : (
                  messages.map((msg) => {
                    const isMe = msg.sender_id === user?.id;
                    return (
                      <div key={msg.id} className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                        <p className="text-[10px] text-muted-foreground mb-0.5">
                          {isMe ? "You" : otherParentName}
                        </p>
                        <div className={`max-w-[80%] rounded-lg px-3 py-1.5 text-sm ${isMe ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"}`}>
                          {msg.message_text}
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {format(new Date(msg.created_at), "h:mm a")}
                        </p>
                      </div>
                    );
                  })
                )}
              </div>
              <div className="flex gap-2">
                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message..."
                  className="h-9 text-sm"
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
                />
                <Button size="sm" className="h-9 px-3" onClick={handleSend} disabled={sending || !newMessage.trim()}>
                  {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Children Info Section */}
          <div className="bg-muted/40 border border-border rounded-lg p-4 space-y-4">
            <div className="flex items-center gap-2">
              <GraduationCap className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm font-semibold text-foreground">Children in This Series</p>
            </div>

            {/* Other Parent's Children — read only */}
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-foreground">{otherParentName}'s Children Needing a Ride in This Series:</p>
              <p className="text-[10px] text-muted-foreground italic mb-1">These are the children from this parent's profile who will be included in this recurring carpool series</p>
              {otherParentSubmitted ? (
                otherParentChildren
                  .filter((child) => otherParentSelectedChildIds.includes(child.id))
                  .map((child, i) => (
                    <p key={i} className="text-xs text-muted-foreground pl-2">
                      {child.first_name} {child.last_name}{child.grade_level ? `, ${child.grade_level}` : ''}
                    </p>
                  ))
              ) : (
                <p className="text-xs text-muted-foreground italic pl-2">
                  Pending — {otherParentName} has not yet confirmed their children
                </p>
              )}
            </div>

            {/* My Children — submit/edit flow */}
            {myChildren.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-foreground">Your Children Needing a Ride in This Series:</p>
                    <p className="text-[10px] text-muted-foreground italic">Check the children who will be included in this recurring carpool series</p>
                  </div>
                  {mySubmitted && !isEditing && (
                    <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={handleStartEdit}>
                      <Pencil className="h-3 w-3" /> Edit
                    </Button>
                  )}
                </div>

                {/* Show checkboxes if not yet submitted OR in edit mode */}
                {(!mySubmitted || isEditing) && (
                  <>
                    {myChildren.map((child) => (
                      <div key={child.id} className="flex items-center space-x-2 pl-2">
                        <Checkbox
                          id={`series-child-${child.id}`}
                          checked={activeIds.includes(child.id)}
                          onCheckedChange={() => toggleFn(child.id)}
                        />
                        <Label htmlFor={`series-child-${child.id}`} className="cursor-pointer text-xs text-muted-foreground">
                          {child.first_name} {child.last_name}{child.grade_level ? `, ${child.grade_level}` : ''}
                        </Label>
                      </div>
                    ))}
                    <div className="flex gap-2 pt-1">
                      {!mySubmitted ? (
                        <Button
                          size="sm"
                          className="h-7 text-xs"
                          disabled={selectedChildIds.length === 0 || submittingChildren}
                          onClick={handleSubmitChildren}
                        >
                          {submittingChildren ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                          Submit
                        </Button>
                      ) : (
                        <>
                          <Button
                            size="sm"
                            className="h-7 text-xs"
                            disabled={editingChildIds.length === 0 || submittingChildren}
                            onClick={handleSaveEdit}
                          >
                            {submittingChildren ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                            Save Changes
                          </Button>
                          <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={handleCancelEdit}>
                            <X className="h-3 w-3" /> Cancel
                          </Button>
                        </>
                      )}
                    </div>
                  </>
                )}

                {/* Show confirmed list when submitted and not editing */}
                {mySubmitted && !isEditing && (
                  <div className="pl-2 space-y-1">
                    {myChildren
                      .filter((child) => selectedChildIds.includes(child.id))
                      .map((child, i) => (
                        <p key={i} className="text-xs text-muted-foreground">
                          ✓ {child.first_name} {child.last_name}{child.grade_level ? `, ${child.grade_level}` : ''}
                        </p>
                      ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Recurring Rides */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-start gap-2">
              <CardTitle className="text-base">Recurring Rides</CardTitle>
              <p className="text-xs text-muted-foreground italic">(Sort this information out in the chat before filling out the schedule)</p>
            </div>
          </CardHeader>
          <CardContent className="p-3 pt-0 space-y-3">
            {/* Info banner */}
            <div className="flex items-start gap-2 bg-muted/40 border border-border rounded-md p-2.5">
              <Info className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
              <p className="text-xs text-muted-foreground">
                This schedule is for recurring weekly carpools coordinated between you and this parent
              </p>
            </div>
            {showForm ? (
              <ScheduleRecurringRideForm
                spaceId={spaceId}
                otherParentId={otherParentId}
                otherParentName={otherParentName}
                otherParentAddress={otherParentAddress}
                myAddress={myAddress}
                onCancel={() => setShowForm(false)}
                onSuccess={handleSchedulePosted}
              />
            ) : (
              <Button size="sm" onClick={() => setShowForm(true)} className="gap-1">
                <CalendarPlus className="h-3.5 w-3.5" /> Schedule Recurring Ride
              </Button>
            )}

            {loadingSchedules ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            ) : schedules.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No recurring rides yet.</p>
            ) : (
              schedules.map((schedule) => (
                <ScheduleCard
                  key={schedule.id}
                  schedule={schedule}
                  otherParentName={otherParentName}
                  proposerName={proposerNames[schedule.proposer_id] || otherParentName}
                  proposerAddress={schedule.proposer_id === user?.id ? myAddress : otherParentAddress}
                  recipientAddress={schedule.recipient_id === user?.id ? myAddress : otherParentAddress}
                  onUpdate={fetchSchedules}
                />
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Contact Card Modal */}
      <ContactCardModal
        open={contactOpen}
        onClose={() => setContactOpen(false)}
        parentName={otherParentName}
        phone={otherParentPhone}
      />
    </div>
  );
};

export default SeriesSpaceView;
