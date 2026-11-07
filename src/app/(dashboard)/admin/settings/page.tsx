"use client";

import { useEffect, useState } from "react";
import { DashboardShell } from "@/components/shared/dashboard-shell";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RestrictionInfo } from "@/components/ui/feature-lock-info";
import {
  Settings,
  Trophy,
  Plus,
  Shield,
  Save,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";

interface SportItem {
  code: string;
  name: string;
  active: boolean;
  defaultScoreLabel: string;
}

interface PlatformControls {
  allowAcademyRegistration: boolean;
  allowCoachRegistration: boolean;
  allowPlayerRegistration: boolean;
  requireApproval: boolean;
  maintenanceMode: boolean;
  maintenanceMessage: string;
}

export default function PlatformSettingsPage() {
  const [sports, setSports] = useState<SportItem[]>([]);
  const [controls, setControls] = useState<PlatformControls>({
    allowAcademyRegistration: true,
    allowCoachRegistration: true,
    allowPlayerRegistration: true,
    requireApproval: false,
    maintenanceMode: false,
    maintenanceMessage: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // New Sport State
  const [newSportCode, setNewSportCode] = useState("");
  const [newSportName, setNewSportName] = useState("");
  const [newScoreLabel, setNewScoreLabel] = useState("");

  async function loadSettings() {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/settings");
      if (res.ok) {
        const data = await res.json();
        setSports(data.sports || []);
        if (data.controls) setControls(data.controls);
      } else {
        toast.error("Failed to load platform settings");
      }
    } catch (e) {
      console.error(e);
      toast.error("Network error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSettings();
  }, []);

  const handleToggleSport = (index: number) => {
    const updated = [...sports];
    updated[index].active = !updated[index].active;
    setSports(updated);
  };

  const handleAddSport = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSportCode.trim() || !newSportName.trim()) {
      toast.error("Please provide both sport code and name");
      return;
    }

    const cleanCode = newSportCode.trim().toUpperCase().replace(/\s+/g, "_");
    if (sports.some((s) => s.code === cleanCode)) {
      toast.error("A sport with this code already exists");
      return;
    }

    setSports([
      ...sports,
      {
        code: cleanCode,
        name: newSportName.trim(),
        active: true,
        defaultScoreLabel: newScoreLabel.trim() || "Points",
      },
    ]);

    setNewSportCode("");
    setNewSportName("");
    setNewScoreLabel("");
    toast.success(`Sport '${newSportName}' added to configuration.`);
  };

  const handleSaveSettings = async () => {
    try {
      setSaving(true);
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sports,
          controls,
        }),
      });

      if (!res.ok) throw new Error("Failed to save settings");

      toast.success("Platform settings updated and audited successfully!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardShell allowedRoles={["PLATFORM_ADMIN", "SUPER_ADMIN"]}>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#DCE1E3] pb-6">
          <div>
            <div className="inline-flex items-center gap-2 px-2 py-0.5 rounded bg-[#C6F432]/30 border border-[#C6F432] text-[#101820] text-[10px] font-black uppercase tracking-widest mb-2">
              <Settings className="h-3 w-3" />
              Platform Controls
            </div>
            <h1 className="text-2xl font-black uppercase text-[#101820]">
              Global Platform Configuration
            </h1>
            <p className="text-xs text-[#8B969E] uppercase tracking-wider mt-1 font-semibold">
              Supported Disciplines, Registration Gates, and Operational Toggles
            </p>
          </div>

          <Button
            onClick={handleSaveSettings}
            disabled={saving || loading}
            className="bg-[#101820] text-white hover:bg-black font-bold uppercase text-xs inline-flex items-center gap-2"
          >
            <Save className="h-4 w-4" />
            {saving ? "Saving Changes..." : "Save Configuration"}
          </Button>
        </div>

        {/* Section 1: Registration Gates */}
        <Card className="border-[#DCE1E3] bg-white shadow-sm">
          <CardHeader className="border-b border-[#DCE1E3] pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs font-bold uppercase text-[#101820]">
                Registration & Onboarding Availability
              </CardTitle>
              <RestrictionInfo
                category="ROLE"
                title="Global Registration Policy"
                reason="Platform-level policy toggles. Disabling these switches will immediately close registrations for all users across every academy tenant."
                whoCanChange="Super Administrator"
                suggestedAction="Leave enabled unless conducting scheduled maintenance or closed beta testing."
                size="xs"
              />
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-4 text-xs">
            <div className="flex items-center justify-between p-3 bg-[#F4F3EE]/50 rounded border border-[#DCE1E3]">
              <div>
                <div className="font-bold text-[#101820]">Allow New Sports Academy Registrations</div>
                <div className="text-[11px] text-[#8B969E]">When disabled, new academy signup forms reject requests.</div>
              </div>
              <input
                type="checkbox"
                checked={controls.allowAcademyRegistration}
                onChange={(e) => setControls({ ...controls, allowAcademyRegistration: e.target.checked })}
                className="h-4 w-4 accent-[#101820]"
              />
            </div>

            <div className="flex items-center justify-between p-3 bg-[#F4F3EE]/50 rounded border border-[#DCE1E3]">
              <div>
                <div className="font-bold text-[#101820]">Allow Coach ID Onboarding</div>
                <div className="text-[11px] text-[#8B969E]">Allow invited coaches to register using their assigned Coach ID.</div>
              </div>
              <input
                type="checkbox"
                checked={controls.allowCoachRegistration}
                onChange={(e) => setControls({ ...controls, allowCoachRegistration: e.target.checked })}
                className="h-4 w-4 accent-[#101820]"
              />
            </div>

            <div className="flex items-center justify-between p-3 bg-[#F4F3EE]/50 rounded border border-[#DCE1E3]">
              <div>
                <div className="font-bold text-[#101820]">Allow Athlete ID Onboarding</div>
                <div className="text-[11px] text-[#8B969E]">Allow athletes to activate their account using their Player ID.</div>
              </div>
              <input
                type="checkbox"
                checked={controls.allowPlayerRegistration}
                onChange={(e) => setControls({ ...controls, allowPlayerRegistration: e.target.checked })}
                className="h-4 w-4 accent-[#101820]"
              />
            </div>
          </CardContent>
        </Card>

        {/* Section 2: Supported Sports Management */}
        <Card className="border-[#DCE1E3] bg-white shadow-sm">
          <CardHeader className="border-b border-[#DCE1E3] pb-3">
            <CardTitle className="text-xs font-bold uppercase text-[#101820] flex items-center gap-2">
              <Trophy className="h-4 w-4" /> Supported Sports Disciplines
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {sports.map((sport, idx) => (
                <div
                  key={sport.code}
                  className={`p-3 rounded-lg border text-xs flex items-center justify-between transition-colors ${
                    sport.active
                      ? "bg-white border-[#DCE1E3]"
                      : "bg-[#F4F3EE]/80 border-[#DCE1E3]/50 opacity-60"
                  }`}
                >
                  <div>
                    <div className="font-bold text-[#101820]">{sport.name}</div>
                    <div className="text-[10px] text-[#8B969E]">
                      Code: <code className="font-mono">{sport.code}</code> • Scoring: {sport.defaultScoreLabel}
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleToggleSport(idx)}
                    className="h-7 px-2 text-[10px] font-bold uppercase"
                  >
                    {sport.active ? "Disable" : "Enable"}
                  </Button>
                </div>
              ))}
            </div>

            {/* Add New Sport Form */}
            <form onSubmit={handleAddSport} className="p-4 bg-[#F4F3EE] rounded-lg border border-[#DCE1E3] space-y-3">
              <div className="font-bold uppercase text-[11px] text-[#101820] flex items-center gap-1.5">
                <Plus className="h-3.5 w-3.5" /> Add New Supported Sport
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Input
                  placeholder="Sport Name (e.g. Rugby)"
                  value={newSportName}
                  onChange={(e) => setNewSportName(e.target.value)}
                  className="h-8 text-xs bg-white"
                  required
                />
                <Input
                  placeholder="Code (e.g. RUGBY)"
                  value={newSportCode}
                  onChange={(e) => setNewSportCode(e.target.value)}
                  className="h-8 text-xs bg-white"
                  required
                />
                <Input
                  placeholder="Score Metric (e.g. Tries / Points)"
                  value={newScoreLabel}
                  onChange={(e) => setNewScoreLabel(e.target.value)}
                  className="h-8 text-xs bg-white"
                />
              </div>
              <div className="flex justify-end">
                <Button type="submit" size="sm" className="bg-[#101820] text-white hover:bg-black text-xs font-bold uppercase">
                  Add Sport
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Section 3: Platform Maintenance Mode */}
        <Card className="border-[#DCE1E3] bg-white shadow-sm">
          <CardHeader className="border-b border-[#DCE1E3] pb-3">
            <CardTitle className="text-xs font-bold uppercase text-[#101820] flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600" /> Platform Maintenance Controls
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4 text-xs">
            <div className="flex items-center justify-between p-3 bg-amber-50 rounded border border-amber-200">
              <div>
                <div className="font-bold text-amber-900">Maintenance Mode</div>
                <div className="text-[11px] text-amber-700">
                  When enabled, non-admin users will see a maintenance screen upon visiting the application.
                </div>
              </div>
              <input
                type="checkbox"
                checked={controls.maintenanceMode}
                onChange={(e) => setControls({ ...controls, maintenanceMode: e.target.checked })}
                className="h-4 w-4 accent-amber-700"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold uppercase text-[#101820] block mb-1">
                Maintenance Banner Message
              </label>
              <Input
                value={controls.maintenanceMessage}
                onChange={(e) => setControls({ ...controls, maintenanceMessage: e.target.value })}
                placeholder="Message displayed to users during maintenance..."
                className="h-9 text-xs"
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  );
}
