import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Shield, Eye, Mail, Phone, Users, MapPin, Loader2 } from "lucide-react";

interface PrivacySettingsData {
  show_on_map: boolean;
  share_email: boolean;
  share_phone: boolean;
  accept_requests_from_anyone: boolean;
}

const PrivacySettings = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<PrivacySettingsData>({
    show_on_map: true,
    share_email: true,
    share_phone: false,
    accept_requests_from_anyone: true,
  });

  useEffect(() => {
    const fetchSettings = async () => {
      if (!user) return;

      const { data, error } = await supabase
        .from("profiles")
        .select("show_on_map, share_email, share_phone, accept_requests_from_anyone")
        .eq("id", user.id)
        .single();

      if (error) {
        console.error("Error fetching privacy settings:", error);
      } else if (data) {
        setSettings({
          show_on_map: data.show_on_map ?? true,
          share_email: data.share_email ?? true,
          share_phone: data.share_phone ?? false,
          accept_requests_from_anyone: data.accept_requests_from_anyone ?? true,
        });
      }
      setLoading(false);
    };

    fetchSettings();
  }, [user]);

  const handleToggle = (key: keyof PrivacySettingsData) => {
    setSettings((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleSave = async () => {
    if (!user) return;

    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        show_on_map: settings.show_on_map,
        share_email: settings.share_email,
        share_phone: settings.share_phone,
        accept_requests_from_anyone: settings.accept_requests_from_anyone,
      })
      .eq("id", user.id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to save privacy settings. Please try again.",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Settings Saved",
        description: "Your privacy settings have been updated.",
      });
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-primary" />
          Privacy Settings
        </CardTitle>
        <CardDescription>
          Control what information is visible to other Dolphin Carpool families
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Map Visibility */}
        <div className="flex items-center justify-between">
          <div className="flex items-start gap-3">
            <MapPin className="w-5 h-5 text-muted-foreground mt-0.5" />
            <div className="space-y-1">
              <Label htmlFor="show_on_map" className="font-medium">
                Show me on the map
              </Label>
              <p className="text-sm text-muted-foreground">
                Allow other parents to see your approximate location
              </p>
            </div>
          </div>
          <Switch
            id="show_on_map"
            checked={settings.show_on_map}
            onCheckedChange={() => handleToggle("show_on_map")}
          />
        </div>

        {/* Email Sharing */}
        <div className="flex items-center justify-between">
          <div className="flex items-start gap-3">
            <Mail className="w-5 h-5 text-muted-foreground mt-0.5" />
            <div className="space-y-1">
              <Label htmlFor="share_email" className="font-medium">
                Share email address
              </Label>
              <p className="text-sm text-muted-foreground">
                Allow matched parents to see your email
              </p>
            </div>
          </div>
          <Switch
            id="share_email"
            checked={settings.share_email}
            onCheckedChange={() => handleToggle("share_email")}
          />
        </div>

        {/* Phone Sharing */}
        <div className="flex items-center justify-between">
          <div className="flex items-start gap-3">
            <Phone className="w-5 h-5 text-muted-foreground mt-0.5" />
            <div className="space-y-1">
              <Label htmlFor="share_phone" className="font-medium">
                Share phone number
              </Label>
              <p className="text-sm text-muted-foreground">
                Allow matched parents to see your phone number
              </p>
            </div>
          </div>
          <Switch
            id="share_phone"
            checked={settings.share_phone}
            onCheckedChange={() => handleToggle("share_phone")}
          />
        </div>

        {/* Request Preferences */}
        <div className="flex items-center justify-between">
          <div className="flex items-start gap-3">
            <Users className="w-5 h-5 text-muted-foreground mt-0.5" />
            <div className="space-y-1">
              <Label htmlFor="accept_requests_from_anyone" className="font-medium">
                Accept requests from anyone
              </Label>
              <p className="text-sm text-muted-foreground">
                {settings.accept_requests_from_anyone
                  ? "Any verified parent can send you ride requests"
                  : "Only linked families can send you requests"}
              </p>
            </div>
          </div>
          <Switch
            id="accept_requests_from_anyone"
            checked={settings.accept_requests_from_anyone}
            onCheckedChange={() => handleToggle("accept_requests_from_anyone")}
          />
        </div>

        <div className="pt-4 border-t">
          <Button onClick={handleSave} disabled={saving} className="w-full sm:w-auto">
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Privacy Settings"
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default PrivacySettings;
