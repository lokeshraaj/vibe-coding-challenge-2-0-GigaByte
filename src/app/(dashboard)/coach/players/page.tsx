"use client";

import { useEffect, useState } from "react";
import { DashboardShell } from "@/components/shared/dashboard-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/status-badge";
import { Users, Plus, X } from "lucide-react";
import { toast } from "sonner";

interface PlayerItem {
  id: string;
  playerCode: string;
  name: string;
  age: number;
  gender: string;
  sport: string;
  position: string;
  enrollmentDate: string;
  status: string;
  hasLoginAccount: boolean;
}

export default function CoachPlayersPage() {
  const [players, setPlayers] = useState<PlayerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    dateOfBirth: "2008-05-15",
    gender: "MALE",
    sport: "Football",
    position: "Midfielder",
    enrollmentDate: new Date().toISOString().split("T")[0],
    coachId: "self", // Scoped server-side
    createLoginAccount: false,
    accountPassword: "",
    contact: {
      email: "",
      phone: "",
      emergencyContactName: "",
      emergencyContactPhone: "",
    },
  });

  const fetchRoster = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/players");
      if (res.ok) {
        const data = await res.json();
        setPlayers(data.items || []);
      }
    } catch (e) {
      console.error(e);
      toast.error("Failed to load roster");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoster();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/players", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to add player");
      }

      toast.success(`Athlete ${formData.name} added to your roster!`);
      setIsModalOpen(false);
      setFormData({
        name: "",
        dateOfBirth: "2008-05-15",
        gender: "MALE",
        sport: "Football",
        position: "Midfielder",
        enrollmentDate: new Date().toISOString().split("T")[0],
        coachId: "self",
        createLoginAccount: false,
        accountPassword: "",
        contact: {
          email: "",
          phone: "",
          emergencyContactName: "",
          emergencyContactPhone: "",
        },
      });
      fetchRoster();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error creating player");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DashboardShell allowedRoles={["COACH"]}>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight uppercase text-[#101820]">
              My Squad Roster
            </h1>
            <p className="text-xs text-[#8B969E] uppercase tracking-wider mt-1 font-semibold">
              Athletes Assigned Under Your Training
            </p>
          </div>

          <Button
            variant="athletic"
            size="sm"
            onClick={() => setIsModalOpen(true)}
            className="gap-2 font-bold shadow-sm"
          >
            <Plus className="h-4 w-4" />
            <span>Add New Player</span>
          </Button>
        </div>

        {/* Roster Table Card */}
        <Card className="border-[#DCE1E3] bg-white shadow-sm">
          <CardHeader className="pb-4 border-b border-[#DCE1E3]">
            <CardTitle className="text-base flex items-center gap-2 text-[#101820]">
              <Users className="h-5 w-5 text-[#101820]" />
              <span>Assigned Athletes ({players.length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="py-12 text-center text-xs text-[#8B969E]">
                Loading roster...
              </div>
            ) : players.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-[#DCE1E3] bg-[#F4F3EE] text-[10px] uppercase font-bold tracking-wider text-[#8B969E]">
                      <th className="p-4">Player Details</th>
                      <th className="p-4">Athlete ID</th>
                      <th className="p-4">Sport & Position</th>
                      <th className="p-4">Age / Gender</th>
                      <th className="p-4">Enrollment Date</th>
                      <th className="p-4">Portal Login</th>
                      <th className="p-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#DCE1E3]">
                    {players.map((p) => (
                      <tr key={p.id} className="hover:bg-[#F4F3EE] transition-colors">
                        <td className="p-4 font-bold text-[#101820]">
                          <div className="text-sm">{p.name}</div>
                        </td>
                        <td className="p-4">
                          <code className="text-[#101820] font-mono font-bold text-[11px] bg-[#F4F3EE] px-2 py-0.5 rounded border border-[#DCE1E3]">
                            {p.playerCode}
                          </code>
                        </td>
                        <td className="p-4">
                          <div className="font-bold text-[#101820] uppercase">{p.sport}</div>
                          <div className="text-[10px] text-[#8B969E]">{p.position}</div>
                        </td>
                        <td className="p-4 font-semibold text-[#101820]">
                          {p.age} yrs • {p.gender}
                        </td>
                        <td className="p-4 text-[#8B969E]">
                          {new Date(p.enrollmentDate).toLocaleDateString()}
                        </td>
                        <td className="p-4">
                          {p.hasLoginAccount ? (
                            <span className="text-[10px] font-bold text-emerald-600 uppercase">
                              Enabled
                            </span>
                          ) : (
                            <span className="text-[10px] text-[#8B969E] uppercase">No Account</span>
                          )}
                        </td>
                        <td className="p-4">
                          <StatusBadge status={p.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-12 text-center text-xs text-[#8B969E] space-y-3">
                <p>No players assigned to your coaching roster yet.</p>
                <Button variant="athletic" size="sm" onClick={() => setIsModalOpen(true)}>
                  Add First Player
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Modal: Add Player */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 overflow-y-auto">
            <Card className="w-full max-w-lg border-[#DCE1E3] bg-white shadow-xl my-8">
              <div className="flex items-center justify-between p-6 border-b border-[#DCE1E3]">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-[#101820]" />
                  <h3 className="text-lg font-bold uppercase text-[#101820]">Register Athlete</h3>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="text-[#8B969E] hover:text-[#101820]">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleCreate} className="p-6 space-y-4">
                <Input
                  label="Athlete Full Name *"
                  placeholder="e.g. Leo Vance"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />

                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Date of Birth *"
                    type="date"
                    value={formData.dateOfBirth}
                    onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                    required
                  />

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#8B969E]">
                      Gender *
                    </label>
                    <select
                      className="flex h-11 w-full rounded-md border border-[#DCE1E3] bg-white px-3 py-2 text-sm text-[#101820] focus-visible:outline-none focus-visible:border-[#101820]"
                      value={formData.gender}
                      onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                    >
                      <option value="MALE">Male</option>
                      <option value="FEMALE">Female</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>
                </div>

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
                    </select>
                  </div>

                  <Input
                    label="Position / Role *"
                    placeholder="e.g. Striker / Point Guard"
                    value={formData.position}
                    onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                    required
                  />
                </div>

                <Input
                  label="Enrollment Date *"
                  type="date"
                  value={formData.enrollmentDate}
                  onChange={(e) => setFormData({ ...formData, enrollmentDate: e.target.value })}
                  required
                />

                <div className="pt-2 border-t border-[#DCE1E3] space-y-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="createAccount"
                      checked={formData.createLoginAccount}
                      onChange={(e) => setFormData({ ...formData, createLoginAccount: e.target.checked })}
                      className="h-4 w-4 rounded border-[#DCE1E3] text-[#101820] focus:ring-[#C6F432]"
                    />
                    <label htmlFor="createAccount" className="text-xs font-bold uppercase text-[#101820] cursor-pointer">
                      Create Athlete Login Account
                    </label>
                  </div>

                  {formData.createLoginAccount && (
                    <div className="space-y-3 pl-6 border-l-2 border-[#101820]">
                      <Input
                        label="Athlete Login Email *"
                        type="email"
                        placeholder="player@academy.com"
                        value={formData.contact.email}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            contact: { ...formData.contact, email: e.target.value },
                          })
                        }
                        required={formData.createLoginAccount}
                      />
                      <Input
                        label="Account Password (Min 8 chars) *"
                        type="password"
                        placeholder="••••••••"
                        value={formData.accountPassword}
                        onChange={(e) => setFormData({ ...formData, accountPassword: e.target.value })}
                        required={formData.createLoginAccount}
                      />
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-[#DCE1E3]">
                  <Button type="button" variant="ghost" size="sm" onClick={() => setIsModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" variant="athletic" size="sm" isLoading={submitting}>
                    Register Athlete
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
