import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, Clock, Shield, Loader2 } from "lucide-react";

interface AccessRequest {
  id: string;
  email: string;
  full_name: string;
  user_type: string;
  reason: string | null;
  status: string;
  created_at: string;
  approved_at: string | null;
  approved_by: string | null;
}

const AdminApprovals = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchRequests = useCallback(async () => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) {
        navigate("/login");
        return;
      }

      const { data, error } = await supabase.functions.invoke("manage-access-requests", {
        method: "GET",
      });

      if (error) {
        if (error.message?.includes("403") || error.message?.includes("Unauthorized")) {
          setAuthorized(false);
          setLoading(false);
          return;
        }
        throw error;
      }

      setAuthorized(true);
      setRequests(data.requests || []);
    } catch (err) {
      console.error("Error fetching requests:", err);
      toast({ title: "Error", description: "Failed to load requests", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }
    fetchRequests();
  }, [user, navigate, fetchRequests]);

  const handleAction = async (requestId: string, action: "approve" | "deny") => {
    setActionLoading(requestId);
    try {
      const { data, error } = await supabase.functions.invoke("manage-access-requests", {
        body: { request_id: requestId, action },
      });

      if (error) throw error;

      if (action === "approve") {
        toast({ title: "Approved!", description: "User has been approved and notified via email." });
      } else {
        toast({ title: "Request Denied", description: "The access request has been denied." });
      }

      fetchRequests();
    } catch (err) {
      toast({ title: "Error", description: (err as Error)?.message || "Action failed", variant: "destructive" });
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navigation />
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </main>
      </div>
    );
  }

  if (!authorized) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navigation />
        <main className="flex-1 flex items-center justify-center p-4">
          <Card className="max-w-md w-full text-center">
            <CardHeader>
              <Shield className="w-12 h-12 mx-auto text-destructive mb-2" />
              <CardTitle>Access Denied</CardTitle>
              <CardDescription>You don't have permission to view this page.</CardDescription>
            </CardHeader>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  const pendingRequests = requests.filter((r) => r.status === "pending");
  const processedRequests = requests.filter((r) => r.status !== "pending");

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navigation />
      <main className="flex-1 container max-w-4xl mx-auto p-4 py-8 space-y-8">
        <div>
          <h1 className="text-3xl font-bold">Access Request Approvals</h1>
          <p className="text-muted-foreground mt-1">Review and manage access requests to ​Dolphin.</p>
        </div>

        {/* Pending Requests */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            Pending Requests ({pendingRequests.length})
          </h2>
          {pendingRequests.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center text-muted-foreground">
                No pending requests.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {pendingRequests.map((req) => (
                <Card key={req.id}>
                  <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center gap-4">
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold">{req.full_name}</span>
                        <Badge variant="outline">
                          {req.user_type === "parent" ? "Parent" : "Student"}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{req.email}</p>
                      {req.reason && (
                        <p className="text-sm text-muted-foreground italic">"{req.reason}"</p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        Submitted {new Date(req.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Button
                        size="sm"
                        onClick={() => handleAction(req.id, "approve")}
                        disabled={actionLoading === req.id}
                        className="bg-primary hover:bg-primary/90"
                      >
                        {actionLoading === req.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <CheckCircle className="w-4 h-4 mr-1" />
                        )}
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleAction(req.id, "deny")}
                        disabled={actionLoading === req.id}
                      >
                        <XCircle className="w-4 h-4 mr-1" />
                        Deny
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>

        {/* Processed Requests */}
        {processedRequests.length > 0 && (
          <section className="space-y-4">
            <h2 className="text-xl font-semibold">Previous Requests ({processedRequests.length})</h2>
            <div className="space-y-2">
              {processedRequests.map((req) => (
                <Card key={req.id} className="opacity-75">
                  <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium">{req.full_name}</span>
                        <Badge variant="outline">
                          {req.user_type === "parent" ? "Parent" : "Student"}
                        </Badge>
                        <Badge variant={req.status === "approved" ? "default" : "destructive"}>
                          {req.status === "approved" ? "Approved" : "Denied"}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{req.email}</p>
                      {req.approved_at && (
                        <p className="text-xs text-muted-foreground">
                          {req.status === "approved" ? "Approved" : "Denied"} on{" "}
                          {new Date(req.approved_at).toLocaleDateString()}
                          {req.approved_by && ` by ${req.approved_by}`}
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default AdminApprovals;
