"use client";

import { useEffect, useState } from "react";
import { DashboardShell } from "@/components/shared/dashboard-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/status-badge";
import { Search, Plus, X, RefreshCw, Mail } from "lucide-react";
import { toast } from "sonner";

interface ScoutItem {
  id: string;
  scoutCode?: string;
  name: string;
  email: string;
  organization?: string;
  experienceYears: number;
  status: string;
  accountStatus?: string;
  assignedCoachId: string;
  coachName: string;
  coachSport: string;
}

interface CoachOption {
  id: string;
  name: string;
  sport: string;
}

export default function ScoutsManagementPage() {
  const [scouts, setScouts] = useState<ScoutItem[]>([]);
  const [coaches, setCoaches] = useState<CoachOption[]>([]);
  const [loading, setLoading] = useState(true);

  // Add Scout modal
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [submittingAdd, setSubmittingAdd] = useState(false);
  const [addForm, setAddForm] = useState({
    name: "",
    email: "",
    assignedCoachId: "",
    organization: "",
    experienceYears: 5,
  });

  // Reassign Scout modal
  const [reassignScoutItem, setReassignScoutItem] = useState<ScoutItem | null>(null);
  const [newCoachId, setNewCoachId] = useState("");
  const [submittingReassign, setSubmittingReassign] = useState(false);
  const [resendingId, setResendingId] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [scoutsRes, coachesRes] = await Promise.all([
        fetch("/api/scouts"),
        fetch("/api/coaches"),
      ]);

      if (scoutsRes.ok) {
        const data = await scoutsRes.json();
        setScouts(data.scouts || []);
      }

      if (coachesRes.ok) {
        const data = await coachesRes.json();
        const cList = (data.coaches || []).map((c: any) => ({
          id: c.id,
          name: c.name,
          sport: c.sport,
        }));
        setCoaches(cList);
        if (cList.length > 0 && !addForm.assignedCoachId) {
          setAddForm((prev) => ({ ...prev, assignedCoachId: cList[0].id }));
        }
      }
    } catch (e) {
      console.error(e);
      toast.error("Failed to load scout data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAddScout = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingAdd(true);
    try {
      const res = await fetch("/api/scouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(addForm),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create scout");

      const codeMsg = data.scout?.scoutCode ? ` (Scout ID: ${data.scout.scoutCode})` : "";
      toast.success(`Scout profile created successfully!${codeMsg} Onboarding email sent.`);
      setIsAddOpen(false);
      setAddForm({
        name: "",
        email: "",
        assignedCoachId: coaches[0]?.id || "",
        organization: "",
        experienceYears: 5,
      });
      fetchData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Creation failed");
    } finally {
      setSubmittingAdd(false);
    }
  };

  const handleReassignScout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reassignScoutItem || !newCoachId) return;

    setSubmittingReassign(true);
    try {
      const res = await fetch("/api/scouts/reassign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scoutId: reassignScoutItem.id,
          newCoachId,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Reassignment failed");

      toast.success("Scout reassigned to new coach successfully!");
      setReassignScoutItem(null);
      fetchData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Reassignment failed");
    } finally {
      setSubmittingReassign(false);
    }
  };

  const handleResendNotification = async (scoutId: string) => {
    setResendingId(scoutId);
    try {
      const res = await fetch(`/api/scouts/${scoutId}/resend-notification`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to resend notification");
      toast.success("Scout onboarding email resent successfully!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to resend notification");
    } finally {
      setResendingId(null);
    }
  };

  return (
    <DashboardShell allowedRoles={["ACADEMY_OWNER"]}>
      <div className="space-y-6">
        {/* Header with Title and Add Scout Button */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight uppercase text-[#101820]">
              Academy Scouting Staff
            </h1>
            <p className="text-xs text-[#8B969E] uppercase tracking-wider mt-1 font-semibold">
              Manage talent scouts assigned to coaches and evaluate ready trial athletes
            </p>
          </div>

          <Button
            variant="athletic"
            size="sm"
            onClick={() => setIsAddOpen(true)}
            disabled={coaches.length === 0}
            className="gap-2 shadow-sm"
          >
            <Plus className="h-4 w-4" />
            <span>Add New Scout</span>
          </Button>
        </div>

        {/* Scouts Table Card */}
        <Card className="border-[#DCE1E3] bg-white shadow-sm">
          <CardHeader className="pb-4 border-b border-[#DCE1E3]">
            <CardTitle className="text-base flex items-center gap-2 text-[#101820]">
              <Search className="h-5 w-5 text-[#101820]" />
              <span>Assigned Scouts Directory ({scouts.length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="py-12 text-center text-xs text-[#8B969E]">
                Loading scouts...
              </div>
            ) : scouts.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-[#DCE1E3] bg-[#F4F3EE] text-[10px] uppercase font-bold tracking-wider text-[#8B969E]">
                      <th className="p-4">Scout ID</th>
                      <th className="p-4">Scout Name</th>
                      <th className="p-4">Organization / Agency</th>
                      <th className="p-4">Assigned Coach</th>
                      <th className="p-4">Experience</th>
                      <th className="p-4">Status</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#DCE1E3]">
                    {scouts.map((s) => (
                      <tr key={s.id} className="hover:bg-[#F4F3EE] transition-colors">
                        <td className="p-4">
                          <span className="font-mono text-xs font-bold text-[#101820] bg-[#F4F3EE] px-2 py-0.5 rounded border border-[#DCE1E3]">
                            {s.scoutCode || "PENDING"}
                          </span>
                        </td>
                        <td className="p-4 font-bold text-[#101820]">
                          <div className="text-sm">{s.name}</div>
                          <div className="text-[10px] text-[#8B969E] font-normal">{s.email}</div>
                        </td>
                        <td className="p-4 text-[#101820] font-medium">
                          {s.organization || "Independent Scouting"}
                        </td>
                        <td className="p-4">
                          <div className="font-bold text-[#101820]">{s.coachName}</div>
                          <div className="text-[10px] text-[#8B969E] uppercase">
                            {s.coachSport} Head Coach
                          </div>
                        </td>
                        <td className="p-4 font-semibold text-[#101820]">
                          {s.experienceYears} Years
                        </td>
                        <td className="p-4">
                          <StatusBadge status={s.accountStatus === "PENDING" ? "PENDING" : s.status} />
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleResendNotification(s.id)}
                              disabled={resendingId === s.id}
                              className="text-xs gap-1 border-[#DCE1E3] bg-white text-[#101820] hover:bg-[#F4F3EE]"
                              title="Resend welcome email with Scout ID and Academy Code"
                            >
                              <Mail className="h-3 w-3" />
                              <span className="hidden sm:inline">Resend Email</span>
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setReassignScoutItem(s);
                                setNewCoachId(s.assignedCoachId);
                              }}
                              className="text-xs gap-1.5 border-[#DCE1E3] bg-white text-[#101820] hover:bg-[#F4F3EE]"
                            >
                              <RefreshCw className="h-3.5 w-3.5" />
                              <span>Reassign</span>
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-12 text-center text-xs text-[#8B969E] space-y-3">
                <p>No scouts attached to coaching staff yet.</p>
                {coaches.length > 0 ? (
                  <Button variant="athletic" size="sm" onClick={() => setIsAddOpen(true)}>
                    Assign First Scout
                  </Button>
                ) : (
                  <p className="text-[11px] text-amber-600 font-semibold">
                    You must invite at least one coach before assigning scouts.
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Modal: Add Scout */}
        {isAddOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
            <Card className="w-full max-w-lg border-[#DCE1E3] bg-white shadow-xl">
              <div className="flex items-center justify-between p-6 border-b border-[#DCE1E3]">
                <div className="flex items-center gap-2">
                  <Search className="h-5 w-5 text-[#101820]" />
                  <h3 className="text-lg font-bold uppercase text-[#101820]">Assign Dedicated Scout</h3>
                </div>
                <button onClick={() => setIsAddOpen(false)} className="text-[#8B969E] hover:text-[#101820]">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleAddScout} className="p-6 space-y-4">
                <Input
                  label="Scout Full Name *"
                  placeholder="e.g. Elena Rostova"
                  value={addForm.name}
                  onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                  required
                />

                <Input
                  label="Scout Email *"
                  type="email"
                  placeholder="scout@apex.com"
                  value={addForm.email}
                  onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
                  required
                />

                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-[#101820]">
                    Assigned Coaching Desk *
                  </label>
                  <select
                    className="w-full h-10 px-3 rounded-lg border border-[#DCE1E3] bg-white text-xs font-medium text-[#101820] focus:outline-none focus:ring-1 focus:ring-[#101820]"
                    value={addForm.assignedCoachId}
                    onChange={(e) => setAddForm({ ...addForm, assignedCoachId: e.target.value })}
                    required
                  >
                    {coaches.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.sport} Head Coach)
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-[#8B969E]">
                    The scout will specifically inspect READY trial players belonging to this coach.
                  </p>
                </div>

                <Input
                  label="Organization / Agency"
                  placeholder="e.g. National Scouting Federation"
                  value={addForm.organization}
                  onChange={(e) => setAddForm({ ...addForm, organization: e.target.value })}
                />

                <Input
                  label="Years of Experience"
                  type="number"
                  min={0}
                  value={addForm.experienceYears}
                  onChange={(e) => setAddForm({ ...addForm, experienceYears: parseInt(e.target.value, 10) || 0 })}
                />

                <div className="flex justify-end gap-2 pt-4 border-t border-[#DCE1E3]">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsAddOpen(false)}
                    className="border-[#DCE1E3]"
                  >
                    Cancel
                  </Button>
                  <Button type="submit" variant="athletic" isLoading={submittingAdd}>
                    Provision & Send Invite
                  </Button>
                </div>
              </form>
            </Card>
          </div>
        )}

        {/* Modal: Reassign Scout */}
        {reassignScoutItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
            <Card className="w-full max-w-md border-[#DCE1E3] bg-white shadow-xl">
              <div className="flex items-center justify-between p-6 border-b border-[#DCE1E3]">
                <div className="flex items-center gap-2">
                  <RefreshCw className="h-5 w-5 text-[#101820]" />
                  <h3 className="text-base font-bold uppercase text-[#101820]">Reassign Scout</h3>
                </div>
                <button onClick={() => setReassignScoutItem(null)} className="text-[#8B969E] hover:text-[#101820]">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleReassignScout} className="p-6 space-y-4">
                <div className="p-3 bg-[#F4F3EE] rounded-lg text-xs space-y-1">
                  <div>
                    <span className="text-[#8B969E]">Scout:</span>{" "}
                    <strong className="text-[#101820]">{reassignScoutItem.name}</strong>{" "}
                    ({reassignScoutItem.scoutCode || "Pending"})
                  </div>
                  <div>
                    <span className="text-[#8B969E]">Current Coach:</span>{" "}
                    <strong className="text-[#101820]">{reassignScoutItem.coachName}</strong> (
                    {reassignScoutItem.coachSport})
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-[#101820]">
                    Assign to New Coach *
                  </label>
                  <select
                    className="w-full h-10 px-3 rounded-lg border border-[#DCE1E3] bg-white text-xs font-medium text-[#101820] focus:outline-none focus:ring-1 focus:ring-[#101820]"
                    value={newCoachId}
                    onChange={(e) => setNewCoachId(e.target.value)}
                    required
                  >
                    {coaches.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.sport} Head Coach)
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t border-[#DCE1E3]">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setReassignScoutItem(null)}
                    className="border-[#DCE1E3]"
                  >
                    Cancel
                  </Button>
                  <Button type="submit" variant="athletic" isLoading={submittingReassign}>
                    Confirm Reassignment
                  </Button>
                </div>
              </form>
            </Card>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
