"use client";

import { useEffect, useState } from "react";
import { DashboardShell } from "@/components/shared/dashboard-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/status-badge";
import { UserCheck, Plus, X } from "lucide-react";
import { toast } from "sonner";

interface CoachItem {
  id: string;
  name: string;
  email: string;
  sport: string;
  specialization: string;
  experienceYears: number;
  status: string;
  playerCount: number;
  assignedScout?: {
    id: string;
    name: string;
    email: string;
    organization?: string;
  } | null;
}

export default function CoachesManagementPage() {
  const [coaches, setCoaches] = useState<CoachItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    sport: "Football",
    specialization: "",
    experienceYears: 3,
    bio: "",
  });

  const fetchCoaches = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/coaches");
      if (res.ok) {
        const data = await res.json();
        setCoaches(data.coaches || []);
      }
    } catch (e) {
      console.error(e);
      toast.error("Failed to load coaches");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCoaches();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/coaches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create coach");
      }

      toast.success(`Coach ${formData.name} invited successfully!`);
      setIsModalOpen(false);
      setFormData({
        name: "",
        email: "",
        sport: "Football",
        specialization: "",
        experienceYears: 3,
        bio: "",
      });
      fetchCoaches();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error creating coach");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DashboardShell allowedRoles={["ACADEMY_OWNER", "PLATFORM_ADMIN"]}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight uppercase text-[#101820]">
              Coaching Staff Management
            </h1>
            <p className="text-xs text-[#8B969E] uppercase tracking-wider mt-1 font-semibold">
              Roster Management & Scout Attachments
            </p>
          </div>

          <Button
            variant="athletic"
            size="sm"
            onClick={() => setIsModalOpen(true)}
            className="gap-2 font-bold shadow-sm"
          >
            <Plus className="h-4 w-4" />
            <span>Add New Coach</span>
          </Button>
        </div>

        {/* Coaches Table Card */}
        <Card className="border-[#DCE1E3] bg-white shadow-sm">
          <CardHeader className="pb-4 border-b border-[#DCE1E3]">
            <CardTitle className="text-base flex items-center gap-2 text-[#101820]">
              <UserCheck className="h-5 w-5 text-[#101820]" />
              <span>Registered Coaches ({coaches.length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="py-12 text-center text-xs text-[#8B969E]">
                Loading coaches...
              </div>
            ) : coaches.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-[#DCE1E3] bg-[#F4F3EE] text-[10px] uppercase font-bold tracking-wider text-[#8B969E]">
                      <th className="p-4">Coach Name</th>
                      <th className="p-4">Sport & Spec</th>
                      <th className="p-4">Experience</th>
                      <th className="p-4">Assigned Players</th>
                      <th className="p-4">Dedicated Scout</th>
                      <th className="p-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#DCE1E3]">
                    {coaches.map((c) => (
                      <tr key={c.id} className="hover:bg-[#F4F3EE] transition-colors">
                        <td className="p-4 font-bold text-[#101820]">
                          <div className="text-sm">{c.name}</div>
                          <div className="text-[10px] text-[#8B969E] font-normal">{c.email}</div>
                        </td>
                        <td className="p-4">
                          <div className="font-bold text-[#101820] uppercase">{c.sport}</div>
                          <div className="text-[10px] text-[#8B969E]">
                            {c.specialization || "Head Coach"}
                          </div>
                        </td>
                        <td className="p-4 font-semibold text-[#101820]">
                          {c.experienceYears} Years
                        </td>
                        <td className="p-4">
                          <span className="font-bold text-[#101820]">{c.playerCount}</span> Players
                        </td>
                        <td className="p-4">
                          {c.assignedScout ? (
                            <div>
                              <div className="font-bold text-[#101820]">{c.assignedScout.name}</div>
                              <div className="text-[10px] text-[#8B969E]">{c.assignedScout.email}</div>
                            </div>
                          ) : (
                            <span className="text-[11px] text-amber-600 font-semibold">Unassigned</span>
                          )}
                        </td>
                        <td className="p-4">
                          <StatusBadge status={c.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-12 text-center text-xs text-[#8B969E] space-y-3">
                <p>No coaches registered yet in this academy tenant.</p>
                <Button variant="athletic" size="sm" onClick={() => setIsModalOpen(true)}>
                  Invite First Coach
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Modal: Invite / Add Coach */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
            <Card className="w-full max-w-lg border-[#DCE1E3] bg-white shadow-xl relative">
              <div className="flex items-center justify-between p-6 border-b border-[#DCE1E3]">
                <div className="flex items-center gap-2">
                  <UserCheck className="h-5 w-5 text-[#101820]" />
                  <h3 className="text-lg font-bold uppercase text-[#101820]">Invite Academy Coach</h3>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-[#8B969E] hover:text-[#101820]"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleCreate} className="p-6 space-y-4">
                <Input
                  label="Coach Full Name *"
                  placeholder="e.g. Marcus Cole"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />

                <Input
                  label="Coach Email Address *"
                  type="email"
                  placeholder="coach.cole@academy.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#8B969E]">
                      Sport Discipline *
                    </label>
                    <select
                      className="flex h-11 w-full rounded-md border border-[#DCE1E3] bg-white px-3 py-2 text-sm text-[#101820] focus-visible:outline-none focus-visible:border-[#101820]"
                      value={formData.sport}
                      onChange={(e) => setFormData({ ...formData, sport: e.target.value })}
                    >
                      <option value="Football">Football</option>
                      <option value="Basketball">Basketball</option>
                      <option value="Cricket">Cricket</option>
                      <option value="Tennis">Tennis</option>
                      <option value="Hockey">Hockey</option>
                      <option value="Athletics">Athletics</option>
                    </select>
                  </div>

                  <Input
                    label="Years of Experience *"
                    type="number"
                    min="0"
                    value={formData.experienceYears}
                    onChange={(e) =>
                      setFormData({ ...formData, experienceYears: parseInt(e.target.value, 10) || 0 })
                    }
                    required
                  />
                </div>

                <Input
                  label="Specialization / Tactics Role"
                  placeholder="e.g. Attacking Tactics / Goalkeeping"
                  value={formData.specialization}
                  onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
                />

                <div className="flex justify-end gap-3 pt-4 border-t border-[#DCE1E3]">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsModalOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="athletic"
                    size="sm"
                    isLoading={submitting}
                  >
                    Send Invitation
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
