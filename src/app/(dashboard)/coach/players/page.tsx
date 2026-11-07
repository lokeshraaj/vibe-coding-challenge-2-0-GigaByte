"use client";

import { useEffect, useState } from "react";
import { DashboardShell } from "@/components/shared/dashboard-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PhoneInput } from "@/components/ui/phone-input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/status-badge";
import { FeatureLockInfo } from "@/components/ui/feature-lock-info";
import { Users, Plus, X, Copy, Mail, Check, Lock, Shield } from "lucide-react";
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
  const [assignedSport, setAssignedSport] = useState<string>("");
  const [isPhoneValid, setIsPhoneValid] = useState(true);

  const [formData, setFormData] = useState({
    name: "",
    dateOfBirth: "2008-05-15",
    gender: "MALE",
    sport: "Cricket",
    position: "All-Rounder",
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
    async function fetchMe() {
      try {
        const res = await fetch("/api/auth/me");
        if (res.ok) {
          const data = await res.json();
          if (data.user?.sport) {
            setAssignedSport(data.user.sport);
            setFormData((prev) => ({ ...prev, sport: data.user.sport }));
          }
        }
      } catch (err) {
        console.error(err);
      }
    }
    fetchMe();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/players", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          sport: assignedSport || formData.sport,
        }),
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
        sport: assignedSport || "Cricket",
        position: "All-Rounder",
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
    try {
      setResendingId(playerId);
      const res = await fetch(`/api/players/${playerId}/resend-notification`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to resend notification email");
      }
      toast.success(data.message || "Notification email re-sent successfully!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error sending notification email");
    } finally {
      setResendingId(null);
    }
  };

  return (
    <DashboardShell allowedRoles={["COACH"]}>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight uppercase text-[#101820]">
                Assigned Squad Roster
              </h1>
              {assignedSport && (
                <div className="flex items-center gap-1.5">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-[#C6F432] text-[#101820] border border-[#101820] uppercase tracking-wider">
                    <Shield className="h-3.5 w-3.5" />
                    {assignedSport}
                  </span>
                  <FeatureLockInfo
                    category="SPORT"
                    title="Sport Discipline Locked"
                    reason={`Your coaching roster is restricted to ${assignedSport}. All enrolled players are registered in this discipline.`}
                    whoCanChange="Academy Administrator or Super Admin"
                    suggestedAction="Contact your administrator if you need to coach multiple disciplines."
                    size="xs"
                  />
                </div>
              )}
            </div>
            <p className="text-xs text-[#8B969E] uppercase tracking-wider mt-1 font-semibold">
              Athlete Identification, Profiles & Academy Enrolment • {assignedSport || "Assigned"} Squad Only
            </p>
          </div>

          <Button
            variant="athletic"
            size="sm"
            onClick={() => setIsModalOpen(true)}
            className="gap-2 font-bold shadow-sm"
          >
            <Plus className="h-4 w-4" />
            <span>Enroll Athlete</span>
          </Button>
        </div>

        {/* Players Table Card */}
        <Card className="border-[#DCE1E3] bg-white shadow-sm">
          <CardHeader className="pb-3 border-b border-[#DCE1E3]">
            <CardTitle className="text-sm uppercase flex items-center justify-between text-[#101820]">
              <span>Active Athletes</span>
              <span className="text-[#101820] font-bold">{players.length}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="py-12 text-center text-xs text-[#8B969E]">Loading roster...</div>
            ) : players.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F4F3EE] text-[#8B969E] uppercase tracking-wider text-[10px] font-bold border-b border-[#DCE1E3]">
                    <tr>
                      <th className="p-4">Athlix ID</th>
                      <th className="p-4">Athlete Name</th>
                      <th className="p-4">Sport</th>
                      <th className="p-4">Position</th>
                      <th className="p-4">Age / DOB</th>
                      <th className="p-4">Enrolled</th>
                      <th className="p-4">Login Status</th>
                      <th className="p-4">Status</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#DCE1E3] text-[#101820]">
                    {players.map((p) => (
                      <tr key={p.id} className="hover:bg-[#F4F3EE]/50 transition-colors">
                        <td className="p-4 font-mono font-bold text-[#101820]">
                          <button
                            onClick={() => handleCopyId(p.playerCode)}
                            className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#F4F3EE] hover:bg-[#DCE1E3] transition-colors border border-[#DCE1E3] text-xs font-mono"
                            title="Click to copy Player ID"
                          >
                            <span>{p.playerCode}</span>
                            {copiedId === p.playerCode ? (
                              <Check className="h-3 w-3 text-emerald-600" />
                            ) : (
                              <Copy className="h-3 w-3 text-[#8B969E]" />
                            )}
                          </button>
                        </td>
                        <td className="p-4">
                          <div className="font-bold text-[#101820]">{p.name}</div>
                          {p.contact?.email && (
                            <div className="text-[11px] text-[#8B969E]">{p.contact.email}</div>
                          )}
                        </td>
                        <td className="p-4 font-semibold">{p.sport}</td>
                        <td className="p-4">{p.position}</td>
                        <td className="p-4 text-[#8B969E]">
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

                  <PhoneInput
                    label="Phone Number (Optional)"
                    name="phone"
                    value={formData.contact.phone}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        contact: { ...prev.contact, phone: e.target.value },
                      }))
                    }
                    onValidationChange={(isValid, e164) => {
                      setIsPhoneValid(isValid);
                      if (e164) {
                        setFormData((prev) => ({
                          ...prev,
                          contact: { ...prev.contact, phone: e164 },
                        }));
                      }
                    }}
                    required={false}
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
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-bold uppercase tracking-wider text-[#8B969E]">
                        Sport Discipline
                      </label>
                      <FeatureLockInfo
                        category="SPORT"
                        title="Discipline Enforced"
                        reason="Athletes will be automatically enrolled in your assigned sport discipline."
                        whoCanChange="Academy Administrator"
                        suggestedAction="Athletes automatically inherit your assigned coaching sport."
                        size="xs"
                      />
                    </div>
                    <div className="flex h-11 w-full items-center justify-between rounded-md border border-[#DCE1E3] bg-[#F4F3EE] px-3 text-sm font-bold text-[#101820]">
                      <span className="flex items-center gap-2">
                        <Lock className="h-4 w-4 text-[#101820]" />
                        {assignedSport || formData.sport}
                      </span>
                      <span className="text-[10px] font-extrabold uppercase tracking-wider bg-[#C6F432] text-[#101820] px-2 py-0.5 rounded border border-[#101820]">
                        Assigned
                      </span>
                    </div>
                  </div>

                  <Input
                    label="Position / Role *"
                    placeholder="e.g. Striker / Batsman"
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

                <div className="p-3 bg-[#F4F3EE] rounded-lg border border-[#DCE1E3] text-[11px] text-[#8B969E]">
                  Athlix ID will be generated atomically upon enrolment and locked permanently to {assignedSport || formData.sport}. An automated email with identification credentials will be dispatched if an email address is provided.
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#DCE1E3]">
                  {!isPhoneValid && (
                    <FeatureLockInfo
                      category="DATA"
                      title="Invalid Phone Number"
                      reason="The contact phone number is invalid. Enter a valid national or international telephone number to enable enrollment."
                      whoCanChange="Form Author"
                      suggestedAction="Enter a valid phone number with the appropriate country calling code."
                      size="sm"
                    />
                  )}
                  <Button type="button" variant="ghost" size="sm" onClick={() => setIsModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="athletic"
                    size="sm"
                    isLoading={submitting}
                    disabled={submitting || !isPhoneValid}
                  >
                    Enroll Athlete
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
