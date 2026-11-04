"use client";

import { useEffect, useState } from "react";
import { DashboardShell } from "@/components/shared/dashboard-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/status-badge";
import { Search, Plus, X, RefreshCw } from "lucide-react";
import { toast } from "sonner";

interface ScoutItem {
  id: string;
  name: string;
  email: string;
  organization?: string;
  experienceYears: number;
  status: string;
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

      toast.success(`Scout ${addForm.name} assigned successfully!`);
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
      toast.error(err instanceof Error ? err.message : "Error creating scout");
    } finally {
      setSubmittingAdd(false);
    }
  };

  const handleReassign = async (e: React.FormEvent) => {
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
      if (!res.ok) throw new Error(data.error || "Failed to reassign scout");

      toast.success("Scout reassigned successfully!");
      setReassignScoutItem(null);
      fetchData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error reassigning scout");
    } finally {
      setSubmittingReassign(false);
    }
  };

  return (
    <DashboardShell allowedRoles={["ACADEMY_OWNER", "PLATFORM_ADMIN"]}>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black italic tracking-tight uppercase text-white">
              DEDICATED SCOUT NETWORK
            </h1>
            <p className="text-xs text-athletic-textMuted uppercase tracking-wider mt-1">
              ASSIGN TALENT SCOUTS TO HEAD COACHES
            </p>
          </div>

          <Button
            variant="athletic"
            size="sm"
            onClick={() => setIsAddOpen(true)}
            disabled={coaches.length === 0}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            <span>Assign New Scout</span>
          </Button>
        </div>

        {/* Scouts Table Card */}
        <Card>
          <CardHeader className="pb-4 border-b border-athletic-border/70">
            <CardTitle className="text-base flex items-center gap-2">
              <Search className="h-5 w-5 text-athletic-lime" />
              <span>Assigned Scouts Directory ({scouts.length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="py-12 text-center text-xs text-athletic-textMuted">
                Loading scouts...
              </div>
            ) : scouts.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-athletic-border/80 bg-athletic-black/50 text-[10px] uppercase font-black tracking-wider text-athletic-textMuted">
                      <th className="p-4">Scout Name</th>
                      <th className="p-4">Organization / Agency</th>
                      <th className="p-4">Assigned Coach</th>
                      <th className="p-4">Experience</th>
                      <th className="p-4">Status</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-athletic-border/50">
                    {scouts.map((s) => (
                      <tr key={s.id} className="hover:bg-athletic-elevated/40 transition-colors">
                        <td className="p-4 font-bold text-white">
                          <div className="text-sm">{s.name}</div>
                          <div className="text-[10px] text-athletic-textMuted font-normal">{s.email}</div>
                        </td>
                        <td className="p-4 text-white font-medium">
                          {s.organization || "Independent Scouting"}
                        </td>
                        <td className="p-4">
                          <div className="font-bold text-athletic-lime">{s.coachName}</div>
                          <div className="text-[10px] text-athletic-textMuted uppercase">
                            {s.coachSport} Head Coach
                          </div>
                        </td>
                        <td className="p-4 font-semibold text-white">
                          {s.experienceYears} Years
                        </td>
                        <td className="p-4">
                          <StatusBadge status={s.status} />
                        </td>
                        <td className="p-4 text-right">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => {
                              setReassignScoutItem(s);
                              setNewCoachId(s.assignedCoachId);
                            }}
                            className="text-xs gap-1.5"
                          >
                            <RefreshCw className="h-3.5 w-3.5" />
                            <span>Reassign</span>
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-12 text-center text-xs text-athletic-textMuted space-y-3">
                <p>No scouts attached to coaching staff yet.</p>
                {coaches.length > 0 ? (
                  <Button variant="athletic" size="sm" onClick={() => setIsAddOpen(true)}>
                    Assign First Scout
                  </Button>
                ) : (
                  <p className="text-[11px] text-amber-400">
                    You must invite at least one coach before assigning scouts.
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Modal: Add Scout */}
        {isAddOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <Card className="w-full max-w-lg border-athletic-border bg-athletic-charcoal shadow-2xl">
              <div className="flex items-center justify-between p-6 border-b border-athletic-border/70">
                <div className="flex items-center gap-2">
                  <Search className="h-5 w-5 text-athletic-lime" />
                  <h3 className="text-lg font-black uppercase text-white">Assign Dedicated Scout</h3>
                </div>
                <button onClick={() => setIsAddOpen(false)} className="text-athletic-textMuted hover:text-white">
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
                  placeholder="scout@agency.com"
                  value={addForm.email}
                  onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
                  required
                />

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-athletic-textMuted">
                    Assign To Head Coach *
                  </label>
                  <select
                    className="flex h-11 w-full rounded-md border border-athletic-border bg-athletic-black px-3 py-2 text-sm text-white focus-visible:outline-none focus-visible:border-athletic-lime"
                    value={addForm.assignedCoachId}
                    onChange={(e) => setAddForm({ ...addForm, assignedCoachId: e.target.value })}
                    required
                  >
                    {coaches.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.sport})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Agency / Organization"
                    placeholder="e.g. Global Talent Group"
                    value={addForm.organization}
                    onChange={(e) => setAddForm({ ...addForm, organization: e.target.value })}
                  />

                  <Input
                    label="Years of Experience"
                    type="number"
                    min="0"
                    value={addForm.experienceYears}
                    onChange={(e) =>
                      setAddForm({ ...addForm, experienceYears: parseInt(e.target.value, 10) || 0 })
                    }
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-athletic-border/70">
                  <Button type="button" variant="ghost" size="sm" onClick={() => setIsAddOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" variant="athletic" size="sm" isLoading={submittingAdd}>
                    Confirm Assignment
                  </Button>
                </div>
              </form>
            </Card>
          </div>
        )}

        {/* Modal: Reassign Scout */}
        {reassignScoutItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <Card className="w-full max-w-md border-athletic-border bg-athletic-charcoal shadow-2xl">
              <div className="flex items-center justify-between p-6 border-b border-athletic-border/70">
                <h3 className="text-base font-black uppercase text-white">
                  Reassign Scout: {reassignScoutItem.name}
                </h3>
                <button onClick={() => setReassignScoutItem(null)} className="text-athletic-textMuted hover:text-white">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleReassign} className="p-6 space-y-4">
                <p className="text-xs text-athletic-textMuted">
                  Transfer this scout to monitor a different coach's roster. The scout will immediately lose access to the previous coach's players and see only the new coach's trial-ready athletes.
                </p>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-athletic-textMuted">
                    Select New Head Coach *
                  </label>
                  <select
                    className="flex h-11 w-full rounded-md border border-athletic-border bg-athletic-black px-3 py-2 text-sm text-white focus-visible:outline-none focus-visible:border-athletic-lime"
                    value={newCoachId}
                    onChange={(e) => setNewCoachId(e.target.value)}
                    required
                  >
                    {coaches.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.sport})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-athletic-border/70">
                  <Button type="button" variant="ghost" size="sm" onClick={() => setReassignScoutItem(null)}>
                    Cancel
                  </Button>
                  <Button type="submit" variant="athletic" size="sm" isLoading={submittingReassign}>
                    Save Reassignment
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
