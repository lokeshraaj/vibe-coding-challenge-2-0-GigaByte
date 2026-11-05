"use client";

import { useEffect, useState } from "react";
import { DashboardShell } from "@/components/shared/dashboard-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/status-badge";
import { Users, Plus, X, Copy, Mail, Check } from "lucide-react";
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
  accountStatus: string;
  contact?: {
    email?: string;
    phone?: string;
  };
  hasLoginAccount: boolean;
}

export default function CoachPlayersPage() {
  const [players, setPlayers] = useState<PlayerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [resendingId, setResendingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    dateOfBirth: "2008-05-15",
    gender: "MALE",
    sport: "Football",
    position: "Midfielder",
    enrollmentDate: new Date().toISOString().split("T")[0],
    coachId: "self", // Scoped server-side
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

      toast.success(
        `Athlete enrolled with ID: ${data.player.playerCode}! Informational email dispatched via Brevo.`
      );
      setIsModalOpen(false);
      setFormData({
        name: "",
        dateOfBirth: "2008-05-15",
        gender: "MALE",
        sport: "Football",
        position: "Midfielder",
        enrollmentDate: new Date().toISOString().split("T")[0],
        coachId: "self",
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

  const handleCopyId = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(code);
    toast.info(`Copied Player ID: ${code}`);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleResendNotice = async (playerId: string) => {
    setResendingId(playerId);
    try {
      const res = await fetch(`/api/players/${playerId}/resend-notification`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to resend notice");
      toast.success(data.message || "Notification email re-sent successfully via Brevo");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not resend email");
    } finally {
      setResendingId(null);
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
                      <th className="p-4">Player ID</th>
                      <th className="p-4">Athlete Details</th>
                      <th className="p-4">Sport & Position</th>
                      <th className="p-4">Age / Gender</th>
                      <th className="p-4">Enrollment Date</th>
                      <th className="p-4">Account Status</th>
                      <th className="p-4">Training Status</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#DCE1E3]">
                    {players.map((p) => (
                      <tr key={p.id} className="hover:bg-[#F4F3EE] transition-colors">
                        <td className="p-4">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono bg-[#FAF9F5] border border-[#DCE1E3] px-2 py-0.5 rounded text-xs font-bold text-[#101820]">
                              {p.playerCode}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCopyId(p.playerCode)}
                              className="text-[#8B969E] hover:text-[#101820] p-1"
                              title="Copy Player ID"
                            >
                              {copiedId === p.playerCode ? (
                                <Check className="h-3 w-3 text-emerald-600" />
                              ) : (
                                <Copy className="h-3 w-3" />
                              )}
                            </button>
                          </div>
                        </td>
                        <td className="p-4 font-bold text-[#101820]">
                          <div className="text-sm">{p.name}</div>
                          {p.contact?.email && (
                            <div className="text-[10px] text-[#8B969E] font-normal">{p.contact.email}</div>
                          )}
                          {p.contact?.phone && (
                            <div className="text-[10px] text-[#8B969E] font-normal">{p.contact.phone}</div>
                          )}
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
                          {p.accountStatus === "PENDING" ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 uppercase tracking-wider">
                              Pending OTP
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase tracking-wider">
                              Active
                            </span>
                          )}
                        </td>
                        <td className="p-4">
                          <StatusBadge status={p.status} />
                        </td>
                        <td className="p-4 text-right">
                          {p.accountStatus === "PENDING" && p.contact?.email && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleResendNotice(p.id)}
                              disabled={resendingId === p.id}
                              className="text-xs font-semibold gap-1 text-[#101820]"
                              title="Resend notification email with Player ID"
                            >
                              <Mail className={`h-3.5 w-3.5 ${resendingId === p.id ? "animate-spin" : ""}`} />
                              <span>{resendingId === p.id ? "Sending..." : "Resend"}</span>
                            </Button>
                          )}
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

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Athlete Email Address"
                    type="email"
                    placeholder="player@academy.com"
                    value={formData.contact.email}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        contact: { ...formData.contact, email: e.target.value },
                      })
                    }
                  />

                  <Input
                    label="Phone Number"
                    type="tel"
                    placeholder="+91 98765 43210"
                    value={formData.contact.phone}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        contact: { ...formData.contact, phone: e.target.value },
                      })
                    }
                  />
                </div>

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
                      <option value="Athletics">Athletics</option>
                      <option value="Badminton">Badminton</option>
                      <option value="Swimming">Swimming</option>
                    </select>
                  </div>

                  <Input
                    label="Position / Role *"
                    placeholder="e.g. Striker / Midfielder"
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

                <div className="rounded-lg bg-[#F4F3EE] border border-[#DCE1E3] p-3 text-[11px] text-[#202A32] space-y-1">
                  <strong>Automated Athlete Onboarding:</strong>
                  <div>
                    A unique Player ID (e.g. <code>DPLFO001</code>) will be generated. An informational email will be sent via Brevo to the athlete&apos;s email address with instructions to activate their account on ATHLIX.
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-[#DCE1E3]">
                  <Button type="button" variant="ghost" size="sm" onClick={() => setIsModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" variant="athletic" size="sm" isLoading={submitting}>
                    Enroll Athlete & Send Notice
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
