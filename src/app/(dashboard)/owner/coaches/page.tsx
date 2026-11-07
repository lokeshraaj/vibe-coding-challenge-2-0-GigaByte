"use client";

import { useEffect, useState } from "react";
import { DashboardShell } from "@/components/shared/dashboard-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PhoneInput } from "@/components/ui/phone-input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/status-badge";
import { RestrictionInfo } from "@/components/ui/feature-lock-info";
import { UserCheck, Plus, X, Copy, Mail, Check } from "lucide-react";
import { toast } from "sonner";

interface CoachItem {
  id: string;
  coachCode?: string;
  name: string;
  email: string;
  phone?: string;
  sport: string;
  specialization: string;
  experienceYears: number;
  accountStatus: string;
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
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [isPhoneValid, setIsPhoneValid] = useState(true);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
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

      toast.success(
        `Coach created with ID: ${data.coach.coachCode}! Informational notice dispatched via Brevo.`
      );
      setIsModalOpen(false);
      setFormData({
        name: "",
        email: "",
        phone: "",
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

  const handleCopyId = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(code);
    toast.info(`Copied Coach ID: ${code}`);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleResendNotice = async (coachId: string) => {
    setResendingId(coachId);
    try {
      const res = await fetch(`/api/coaches/${coachId}/resend-notification`, {
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
                      <th className="p-4">
                        <div className="flex items-center gap-1">
                          <span>Coach ID</span>
                          <RestrictionInfo
                            category="SYSTEM"
                            title="Permanent Coach ID"
                            reason="Coach IDs are assigned uniquely upon creation and cannot be edited manually."
                            whoCanChange="System Managed"
                            suggestedAction="Use this ID for coach sign-in and activation."
                            size="xs"
                          />
                        </div>
                      </th>
                      <th className="p-4">Coach Details</th>
                      <th className="p-4">Sport & Spec</th>
                      <th className="p-4">Experience</th>
                      <th className="p-4">Players</th>
                      <th className="p-4">Dedicated Scout</th>
                      <th className="p-4">Activation Status</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#DCE1E3]">
                    {coaches.map((c) => (
                      <tr key={c.id} className="hover:bg-[#F4F3EE] transition-colors">
                        <td className="p-4">
                          {c.coachCode ? (
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono bg-[#FAF9F5] border border-[#DCE1E3] px-2 py-0.5 rounded text-xs font-bold text-[#101820]">
                                {c.coachCode}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleCopyId(c.coachCode!)}
                                className="text-[#8B969E] hover:text-[#101820] p-1"
                                title="Copy Coach ID"
                              >
                                {copiedId === c.coachCode ? (
                                  <Check className="h-3 w-3 text-emerald-600" />
                                ) : (
                                  <Copy className="h-3 w-3" />
                                )}
                              </button>
                            </div>
                          ) : (
                            <span className="text-xs text-[#8B969E]">Legacy</span>
                          )}
                        </td>
                        <td className="p-4 font-bold text-[#101820]">
                          <div className="text-sm">{c.name}</div>
                          <div className="text-[10px] text-[#8B969E] font-normal">{c.email}</div>
                          {c.phone && (
                            <div className="text-[10px] text-[#8B969E] font-normal">{c.phone}</div>
                          )}
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
                          {c.accountStatus === "PENDING" ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 uppercase tracking-wider">
                              Pending OTP
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase tracking-wider">
                              Active
                            </span>
                          )}
                        </td>
                        <td className="p-4 text-right">
                          {c.accountStatus === "PENDING" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleResendNotice(c.id)}
                              disabled={resendingId === c.id}
                              className="text-xs font-semibold gap-1 text-[#101820]"
                              title="Resend notification email with Coach ID"
                            >
                              <Mail className={`h-3.5 w-3.5 ${resendingId === c.id ? "animate-spin" : ""}`} />
                              <span>{resendingId === c.id ? "Sending..." : "Resend"}</span>
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

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Coach Email Address *"
                    type="email"
                    placeholder="coach.cole@academy.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                  />

                  <PhoneInput
                    label="Phone Number (Optional)"
                    name="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
                    onValidationChange={(isValid, e164) => {
                      setIsPhoneValid(isValid);
                      if (e164) {
                        setFormData((prev) => ({ ...prev, phone: e164 }));
                      }
                    }}
                    required={false}
                  />
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

                <div className="rounded-lg bg-[#F4F3EE] border border-[#DCE1E3] p-3 text-[11px] text-[#202A32] space-y-1">
                  <strong>Automated Onboarding:</strong>
                  <div>
                    A unique Coach ID (e.g. <code>DCOFO001</code>) will be generated and saved. An informational notice will be sent to the coach via Brevo informing them of their Coach ID and registration instructions.
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#DCE1E3]">
                  {!isPhoneValid && (
                    <RestrictionInfo
                      category="DATA"
                      title="Invalid Phone Format"
                      reason="Coach contact phone must be a valid national or international telephone number before the invitation notice can be sent."
                      whoCanChange="Form Author"
                      suggestedAction="Enter a valid phone number with the appropriate country code."
                      size="sm"
                    />
                  )}
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
                    disabled={submitting || !isPhoneValid}
                  >
                    Provision & Send Notice
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
