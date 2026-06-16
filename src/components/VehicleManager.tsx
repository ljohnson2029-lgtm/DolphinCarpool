import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Car, Plus, Trash2, Star } from "lucide-react";
import { useVehicles } from "@/hooks/useVehicles";
import { useToast } from "@/hooks/use-toast";

interface NewVehicle {
  car_make: string;
  car_model: string;
  car_color: string;
  license_plate: string;
}

const emptyVehicle: NewVehicle = { car_make: "", car_model: "", car_color: "", license_plate: "" };

export interface VehicleManagerHandle {
  /** If no vehicles exist yet, save the in-progress draft. Returns true if a valid vehicle exists (saved or already present). */
  commitDraftIfNeeded: () => Promise<boolean>;
  hasDraftStarted: () => boolean;
  isDraftValid: () => boolean;
}

interface VehicleManagerProps {
  onValidityChange?: (isValid: boolean) => void;
}

// Moved OUTSIDE VehicleManager to prevent focus loss on re-render
const VehicleFields = ({ data, onChange }: { data: NewVehicle; onChange: (d: NewVehicle) => void }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
    <div>
      <Label>Make <span className="text-destructive">*</span></Label>
      <Input value={data.car_make} onChange={(e) => onChange({ ...data, car_make: e.target.value })} placeholder="e.g., Toyota" />
    </div>
    <div>
      <Label>Model <span className="text-destructive">*</span></Label>
      <Input value={data.car_model} onChange={(e) => onChange({ ...data, car_model: e.target.value })} placeholder="e.g., Camry" />
    </div>
    <div>
      <Label>Color <span className="text-destructive">*</span></Label>
      <Input value={data.car_color} onChange={(e) => onChange({ ...data, car_color: e.target.value })} placeholder="e.g., Silver" />
    </div>
    <div>
      <Label>License Plate <span className="text-destructive">*</span></Label>
      <Input value={data.license_plate} onChange={(e) => onChange({ ...data, license_plate: e.target.value })} placeholder="e.g., ABC1234" />
    </div>
  </div>
);

const isValid = (v: NewVehicle) =>
  !!(v.car_make.trim() && v.car_model.trim() && v.car_color.trim() && v.license_plate.trim());

const isStarted = (v: NewVehicle) =>
  !!(v.car_make.trim() || v.car_model.trim() || v.car_color.trim() || v.license_plate.trim());

const VehicleManager = forwardRef<VehicleManagerHandle, VehicleManagerProps>(({ onValidityChange }, ref) => {
  const { vehicles, loading, addVehicle, updateVehicle, removeVehicle, setPrimary } = useVehicles();
  const { toast } = useToast();
  // First vehicle fields are always visible — no button required to reveal them.
  const [newVehicle, setNewVehicle] = useState<NewVehicle>(emptyVehicle);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<NewVehicle>(emptyVehicle);
  const [saving, setSaving] = useState(false);
  const lastValidRef = useRef(isValid(newVehicle));

  // Notify parent about draft validity changes only when validity flips, to avoid re-rendering on every keystroke.
  useEffect(() => {
    const nowValid = isValid(newVehicle);
    if (nowValid !== lastValidRef.current) {
      lastValidRef.current = nowValid;
      onValidityChange?.(nowValid);
    }
  }, [newVehicle, onValidityChange]);

  useImperativeHandle(ref, () => ({
    hasDraftStarted: () => isStarted(newVehicle),
    isDraftValid: () => isValid(newVehicle),
    commitDraftIfNeeded: async () => {
      if (vehicles.length > 0) return true;
      if (!isValid(newVehicle)) return false;
      const error = await addVehicle(newVehicle);
      if (error) {
        toast({ title: "Error adding vehicle", description: error.message, variant: "destructive" });
        return false;
      }
      setNewVehicle(emptyVehicle);
      return true;
    },
  }), [vehicles.length, newVehicle, addVehicle, toast]);

  const isFirstVehicle = vehicles.length === 0;

  const handleAdd = async () => {
    if (!isValid(newVehicle)) {
      toast({ title: "All vehicle fields are required", variant: "destructive" });
      return;
    }
    setSaving(true);
    const error = await addVehicle(newVehicle);
    if (error) {
      toast({ title: "Error adding vehicle", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Vehicle added" });
      setNewVehicle(emptyVehicle);
      // Keep the draft form visible so users can keep adding more vehicles.
    }
    setSaving(false);
  };

  const handleSaveEdit = async () => {
    if (!editingId || !isValid(editData)) {
      toast({ title: "All vehicle fields are required", variant: "destructive" });
      return;
    }
    setSaving(true);
    const error = await updateVehicle(editingId, editData);
    if (error) {
      toast({ title: "Error updating vehicle", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Vehicle updated" });
      setEditingId(null);
    }
    setSaving(false);
  };

  const handleRemove = async (id: string) => {
    setSaving(true);
    const error = await removeVehicle(id);
    if (error) {
      toast({ title: "Error removing vehicle", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Vehicle removed" });
    }
    setSaving(false);
  };

  const handleSetPrimary = async (id: string) => {
    await setPrimary(id);
    toast({ title: "Primary vehicle updated" });
  };

  if (loading) return <Card><CardContent className="py-6 text-center text-muted-foreground">Loading vehicles...</CardContent></Card>;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Car className="h-5 w-5" />
            My Vehicles
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {vehicles.map((v) => (
          <div key={v.id} className="border rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm">
                  {v.car_color} {v.car_make} {v.car_model}
                </span>
                {v.is_primary && (
                  <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 gap-0.5 text-xs">
                    <Star className="h-3 w-3 fill-current" />
                    Primary
                  </Badge>
                )}
              </div>
              <div className="flex gap-1.5">
                {!v.is_primary && (
                  <Button type="button" variant="ghost" size="sm" className="text-xs" onClick={() => handleSetPrimary(v.id)} disabled={saving}>
                    <Star className="h-3 w-3 mr-1" /> Set as Primary
                  </Button>
                )}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-xs"
                  onClick={() => { setEditingId(v.id); setEditData({ car_make: v.car_make, car_model: v.car_model, car_color: v.car_color, license_plate: v.license_plate }); }}
                  disabled={saving}
                >
                  Edit
                </Button>
                {vehicles.length > 1 && (
                  <Button type="button" variant="ghost" size="sm" className="text-xs text-destructive" onClick={() => handleRemove(v.id)} disabled={saving}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </div>
            <p className="text-xs text-muted-foreground">Plate: {v.license_plate}</p>

            {editingId === v.id && (
              <div className="space-y-3 pt-2 border-t">
                <VehicleFields data={editData} onChange={setEditData} />
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleSaveEdit} disabled={saving}>Save</Button>
                  <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>Cancel</Button>
                </div>
              </div>
            )}
          </div>
        ))}

        {/* First vehicle fields are always visible; Add Vehicle button below is only for adding more vehicles. */}
        <div className="border rounded-lg p-4 space-y-3 border-dashed border-primary/40">
          {isFirstVehicle ? (
            <p className="text-xs text-muted-foreground">
              Fill in your vehicle details — they'll be saved automatically when you continue.
            </p>
          ) : (
            <p className="text-sm font-medium">Add Another Vehicle</p>
          )}
          <VehicleFields data={newVehicle} onChange={setNewVehicle} />
          <Button type="button" size="sm" onClick={handleAdd} disabled={saving}>
            <Plus className="w-4 h-4 mr-2" />
            Add Vehicle
          </Button>
        </div>
      </CardContent>
    </Card>
  );
});

VehicleManager.displayName = "VehicleManager";

export default VehicleManager;
