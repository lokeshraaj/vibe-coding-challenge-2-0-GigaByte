"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { DashboardShell } from "@/components/shared/dashboard-shell";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/status-badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Building2,
  Users,
  UserCheck,
  Trophy,
  CalendarCheck,
  ShieldAlert,
  ArrowLeft,
  Ban,
  CheckCircle,
  Trash2,
  AlertOctagon,
  Clock,
  MapPin,
  Mail,
  Phone,
  Shield,
} from "lucide-react";
import { toast } from "sonner";

interface AcademyDetails {
  academy: {
    id: string;
    name: string;
    slug: string;
    academyCode?: string;
    description?: string;
    location: {
      address?: string;
      city: string;
      state: string;
      country: string;
      postalCode?: string;
    };
    contactEmail: string;
    contactPhone: string;
    status: string;
    blockedReason?: string;
    createdAt: string;
    owner: {
      _id: string;
      name: string;
      email: string;
      status: string;
    };
  };
  counts: {
    coaches: number;
    players: number;
    scouts: number;
    sessions: number;
    matches: number;
  };
  coaches: Array<{
    id: string;
    code?: string;
    sport: string;
    status: string;
    accountStatus: string;
    user?: { name: string; email: string };
  }>;
  players: Array<{
    id: string;
    code: string;
    name: string;
    sport: string;
    position: string;
    status: string;
    accountStatus: string;
  }>;
  recentSessions: Array<{
    id: string;
    sport: string;
    date: string;
    status: string;
    title?: string;
  }>;
  recentMatches: Array<{
    id: string;
    sport: string;
    opponent: string;
    date: string;
    score: string;
    result: string;
  }>;
  auditLogs: Array<{
    id: string;
    action: string;
    reason?: string;
    status: string;
    createdAt: string;
  }>;
}

interface ImpactData {
  academy: {
    id: string;
    name: string;
    slug: string;
  };
  recordCounts: {
    coaches: number;
    players: number;
    scouts: number;
    practiceSessions: number;
    attendances: number;
    matches: number;
    matchParticipants: number;
    invitations: number;
    idCounters: number;
    complaints: number;
  };
  userImpact: {
    exclusiveUsersCount: number;
    sharedUsersCount: number;
    exclusiveUsers: Array<{ id: string; name: string; email: string; role: string }>;
    sharedUsers: Array<{ id: string; name: string; email: string; role: string }>;
  };
}

export default function AcademyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const academyId = resolvedParams.id;
  const router = useRouter();

  const [details, setDetails] = useState<AcademyDetails | null>(null);
  const [loading, setLoading] = useState(true);

  // Status Modal State
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [newStatus, setNewStatus] = useState<"ACTIVE" | "BLOCKED" | "SUSPENDED">("ACTIVE");
  const [statusReason, setStatusReason] = useState("");
  const [statusLoading, setStatusLoading] = useState(false);

  // Cascade Delete Workflow State (Phase 12)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [impactLoading, setImpactLoading] = useState(false);
  const [impactData, setImpactData] = useState<ImpactData | null>(null);
  const [confirmName, setConfirmName] = useState("");
  const [deleteReason, setDeleteReason] = useState("");
  const [reauthPassword, setReauthPassword] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);

  async function loadDetails() {
    try {
      setLoading(true);
      const res = await fetch(`/api/admin/academies/${academyId}`);
      if (!res.ok) throw new Error("Failed to load academy details");
      const data = await res.json();
      setDetails(data);
    } catch (err) {
      console.error(err);
      toast.error("Error loading academy details");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDetails();
  }, [academyId]);

  const handleUpdateStatus = async () => {
    if (!statusReason || statusReason.trim().length < 3) {
      toast.error("Please enter a specific reason (at least 3 characters)");
      return;
    }

    try {
      setStatusLoading(true);
      const res = await fetch(`/api/admin/academies/${academyId}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: newStatus,
          reason: statusReason.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update status");

      toast.success(data.message || `Status changed to ${newStatus}`);
      setStatusModalOpen(false);
      setStatusReason("");
      loadDetails();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Status update failed");
    } finally {
      setStatusLoading(false);
    }
  };

  const openCascadeDeleteModal = async () => {
    try {
      setDeleteModalOpen(true);
      setImpactLoading(true);
      const res = await fetch(`/api/admin/academies/${academyId}/impact`);
      if (!res.ok) throw new Error("Failed to calculate deletion impact");
      const data = await res.json();
      setImpactData(data.impact);
    } catch (err) {
      toast.error("Could not calculate pre-deletion impact preview");
      setDeleteModalOpen(false);
    } finally {
      setImpactLoading(false);
    }
  };

  const handleExecuteCascadeDelete = async () => {
    if (!details) return;
    if (confirmName.trim().toLowerCase() !== details.academy.name.trim().toLowerCase()) {
      toast.error(`Confirmation mismatch: Please type '${details.academy.name}' exactly.`);
      return;
    }
    if (!deleteReason || deleteReason.trim().length < 5) {
      toast.error("A detailed administrative deletion reason (at least 5 characters) is required.");
      return;
    }

    try {
      setDeleteLoading(true);
      const res = await fetch(`/api/admin/academies/${academyId}/delete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          confirmName: confirmName.trim(),
          reason: deleteReason.trim(),
          reauthPassword: reauthPassword.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Cascade deletion failed");

      toast.success("Academy and all exclusively owned data permanently deleted!");
      router.push("/admin/academies");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Cascade deletion failed");
    } finally {
      setDeleteLoading(false);
    }
  };

  if (loading) {
    return (
      <DashboardShell allowedRoles={["PLATFORM_ADMIN", "SUPER_ADMIN"]}>
        <div className="py-20 text-center text-xs text-[#8B969E]">
          Loading sports academy tenant profile...
        </div>
      </DashboardShell>
    );
  }

  if (!details) {
    return (
      <DashboardShell allowedRoles={["PLATFORM_ADMIN", "SUPER_ADMIN"]}>
        <div className="py-20 text-center text-xs text-red-600">
          Academy not found.
        </div>
      </DashboardShell>
    );
  }

  const { academy, counts, coaches, players, recentSessions, recentMatches, auditLogs } = details;

  return (
    <DashboardShell allowedRoles={["PLATFORM_ADMIN", "SUPER_ADMIN"]}>
      <div className="space-y-8">
        {/* Breadcrumb / Back Link */}
        <div className="flex items-center justify-between border-b border-[#DCE1E3] pb-4">
          <Link
            href="/admin/academies"
            className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#8B969E] hover:text-[#101820] transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Academies Directory
          </Link>

          <div className="flex items-center gap-2">
            {academy.status === "BLOCKED" ? (
              <Button
                size="sm"
                onClick={() => {
                  setNewStatus("ACTIVE");
                  setStatusModalOpen(true);
                }}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold uppercase"
              >
                <CheckCircle className="h-3.5 w-3.5 mr-1" />
                Unblock Academy
              </Button>
            ) : (
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setNewStatus("BLOCKED");
                  setStatusModalOpen(true);
                }}
                className="border-red-300 text-red-700 hover:bg-red-50 text-xs font-bold uppercase"
              >
                <Ban className="h-3.5 w-3.5 mr-1" />
                Block Academy
              </Button>
            )}

            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setNewStatus("SUSPENDED");
                setStatusModalOpen(true);
              }}
              className="text-xs font-bold uppercase"
            >
              Suspend
            </Button>
          </div>
        </div>

        {/* Profile Card Header */}
        <div className="bg-white border border-[#DCE1E3] rounded-lg p-6 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-black uppercase text-[#101820]">
                  {academy.name}
                </h1>
                <StatusBadge status={academy.status} />
              </div>

              <div className="flex flex-wrap items-center gap-4 text-xs text-[#8B969E] mt-2">
                <span className="font-mono bg-[#F4F3EE] px-2 py-0.5 rounded border border-[#DCE1E3] text-[#101820]">
                  Code: {academy.academyCode || "PENDING"}
                </span>
                <span className="font-mono bg-[#F4F3EE] px-2 py-0.5 rounded border border-[#DCE1E3] text-[#101820]">
                  slug: {academy.slug}
                </span>
                <span className="flex items-center gap-1 text-[#101820]">
                  <MapPin className="h-3.5 w-3.5 text-[#8B969E]" />
                  {academy.location.city}, {academy.location.country}
                </span>
                <span className="flex items-center gap-1 text-[#101820]">
                  <Clock className="h-3.5 w-3.5 text-[#8B969E]" />
                  Joined {new Date(academy.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>

            {/* Owner badge */}
            <div className="p-3 bg-[#F4F3EE] rounded-lg border border-[#DCE1E3] shrink-0 text-right">
              <div className="text-[10px] font-bold uppercase tracking-wider text-[#8B969E]">Academy Owner</div>
              <div className="text-xs font-bold text-[#101820]">{academy.owner?.name || "Unassigned"}</div>
              <div className="text-[11px] text-[#8B969E]">{academy.owner?.email}</div>
            </div>
          </div>
        </div>

        {/* Telemetry Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          <Card className="border-[#DCE1E3] bg-white p-4">
            <div className="text-[10px] font-bold uppercase tracking-wider text-[#8B969E]">Coaches</div>
            <div className="text-2xl font-black text-[#101820] mt-1">{counts.coaches}</div>
          </Card>
          <Card className="border-[#DCE1E3] bg-white p-4">
            <div className="text-[10px] font-bold uppercase tracking-wider text-[#8B969E]">Athletes</div>
            <div className="text-2xl font-black text-[#101820] mt-1">{counts.players}</div>
          </Card>
          <Card className="border-[#DCE1E3] bg-white p-4">
            <div className="text-[10px] font-bold uppercase tracking-wider text-[#8B969E]">Scouts</div>
            <div className="text-2xl font-black text-[#101820] mt-1">{counts.scouts}</div>
          </Card>
          <Card className="border-[#DCE1E3] bg-white p-4">
            <div className="text-[10px] font-bold uppercase tracking-wider text-[#8B969E]">Practice Sessions</div>
            <div className="text-2xl font-black text-[#101820] mt-1">{counts.sessions}</div>
          </Card>
          <Card className="border-[#DCE1E3] bg-white p-4">
            <div className="text-[10px] font-bold uppercase tracking-wider text-[#8B969E]">Matches Logged</div>
            <div className="text-2xl font-black text-[#101820] mt-1">{counts.matches}</div>
          </Card>
        </div>

        {/* Roster & Competition Sections */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Coaching Staff */}
          <Card className="border-[#DCE1E3] bg-white shadow-sm">
            <CardHeader className="border-b border-[#DCE1E3] pb-3">
              <CardTitle className="text-xs font-bold uppercase text-[#101820] flex items-center gap-2">
                <UserCheck className="h-4 w-4" />
                <span>Assigned Coaching Staff ({coaches.length})</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {coaches.length > 0 ? (
                <div className="divide-y divide-[#DCE1E3] text-xs max-h-60 overflow-y-auto">
                  {coaches.map((c) => (
                    <div key={c.id} className="p-3 flex items-center justify-between">
                      <div>
                        <div className="font-bold text-[#101820]">{c.user?.name || "Pending User"}</div>
                        <div className="text-[11px] text-[#8B969E]">{c.sport} • Code: {c.code || "PENDING"}</div>
                      </div>
                      <StatusBadge status={c.accountStatus} />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-xs text-[#8B969E]">No coaches registered yet.</div>
              )}
            </CardContent>
          </Card>

          {/* Athletes Roster */}
          <Card className="border-[#DCE1E3] bg-white shadow-sm">
            <CardHeader className="border-b border-[#DCE1E3] pb-3">
              <CardTitle className="text-xs font-bold uppercase text-[#101820] flex items-center gap-2">
                <Users className="h-4 w-4" />
                <span>Athletes Roster ({players.length})</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {players.length > 0 ? (
                <div className="divide-y divide-[#DCE1E3] text-xs max-h-60 overflow-y-auto">
                  {players.map((p) => (
                    <div key={p.id} className="p-3 flex items-center justify-between">
                      <div>
                        <div className="font-bold text-[#101820]">{p.name}</div>
                        <div className="text-[11px] text-[#8B969E]">{p.sport} • {p.position} • {p.code}</div>
                      </div>
                      <StatusBadge status={p.accountStatus} />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-xs text-[#8B969E]">No athletes enrolled yet.</div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Phase 12: Danger Zone — Cascade Delete System */}
        <div className="border border-red-300 bg-red-50/50 rounded-lg p-6 space-y-4">
          <div className="flex items-center gap-3">
            <AlertOctagon className="h-6 w-6 text-red-600" />
            <div>
              <h3 className="text-sm font-black uppercase text-red-900 tracking-wide">
                Danger Zone — Permanent Academy Cascade Deletion
              </h3>
              <p className="text-xs text-red-700 mt-0.5">
                This action is permanently destructive. All academy-exclusive records (matches, sessions, attendance, profiles, counters) will be removed.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-red-200">
            <span className="text-xs text-red-800 font-semibold">
              Super Admin authority required. Pre-deletion impact analysis will be calculated.
            </span>
            <Button
              onClick={openCascadeDeleteModal}
              className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold uppercase inline-flex items-center gap-2"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Permanently Delete Academy
            </Button>
          </div>
        </div>

        {/* Status Update Modal */}
        {statusModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="bg-white rounded-lg max-w-md w-full border border-[#DCE1E3] p-6 space-y-4">
              <h3 className="text-sm font-black uppercase text-[#101820]">
                Update Academy Status to {newStatus}
              </h3>
              <div>
                <label className="text-[11px] font-bold uppercase text-[#101820] block mb-1">
                  Reason for Action <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={statusReason}
                  onChange={(e) => setStatusReason(e.target.value)}
                  placeholder="Enter administrative reason for audit logs..."
                  rows={3}
                  className="w-full text-xs p-2.5 border border-[#DCE1E3] rounded outline-none"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => setStatusModalOpen(false)}>
                  Cancel
                </Button>
                <Button size="sm" onClick={handleUpdateStatus} disabled={statusLoading}>
                  {statusLoading ? "Updating..." : "Confirm Status Change"}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Phase 12: Pre-Deletion Impact Preview & Confirmation Modal */}
        {deleteModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 overflow-y-auto">
            <div className="bg-white rounded-lg max-w-xl w-full border border-red-300 shadow-2xl overflow-hidden p-6 space-y-5 my-8">
              <div className="flex items-center gap-3 border-b border-red-200 pb-3">
                <AlertOctagon className="h-6 w-6 text-red-600 shrink-0" />
                <div>
                  <h3 className="font-black uppercase text-base text-red-900">
                    Pre-Deletion Impact Preview & Cascade Confirmation
                  </h3>
                  <p className="text-xs text-red-700">
                    Target: <span className="font-bold">{academy.name}</span> ({academy.slug})
                  </p>
                </div>
              </div>

              {impactLoading ? (
                <div className="py-12 text-center text-xs text-[#8B969E]">
                  Calculating real-time database impact...
                </div>
              ) : impactData ? (
                <div className="space-y-4 text-xs">
                  {/* Record Counts Grid */}
                  <div className="bg-red-50 p-4 rounded-lg border border-red-200 space-y-2">
                    <div className="font-bold uppercase tracking-wider text-red-900 text-[10px]">
                      Records To Be Permanently Erased:
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs text-red-800">
                      <div>• Coaches: <b>{impactData.recordCounts.coaches}</b></div>
                      <div>• Athletes: <b>{impactData.recordCounts.players}</b></div>
                      <div>• Scouts: <b>{impactData.recordCounts.scouts}</b></div>
                      <div>• Sessions: <b>{impactData.recordCounts.practiceSessions}</b></div>
                      <div>• Attendances: <b>{impactData.recordCounts.attendances}</b></div>
                      <div>• Matches: <b>{impactData.recordCounts.matches}</b></div>
                    </div>
                  </div>

                  {/* User Account Separation Rules */}
                  <div className="p-3 bg-[#F4F3EE] rounded border border-[#DCE1E3] space-y-1">
                    <div className="font-bold text-[#101820]">Multi-Academy User Separation:</div>
                    <div className="text-[11px] text-[#8B969E]">
                      • Exclusive User Accounts to be Deleted: <b>{impactData.userImpact.exclusiveUsersCount}</b>
                    </div>
                    <div className="text-[11px] text-emerald-700 font-semibold">
                      • Shared / Platform Accounts Safely Preserved: <b>{impactData.userImpact.sharedUsersCount}</b> (Association only detached)
                    </div>
                  </div>

                  {/* Security Input Confirmation */}
                  <div className="space-y-3 pt-2">
                    <div>
                      <label className="text-[11px] font-bold uppercase text-[#101820] block mb-1">
                        Type exact academy name <span className="font-mono text-red-600">"{academy.name}"</span> to confirm:
                      </label>
                      <Input
                        value={confirmName}
                        onChange={(e) => setConfirmName(e.target.value)}
                        placeholder={academy.name}
                        className="h-9 text-xs border-red-300 focus:border-red-600"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold uppercase text-[#101820] block mb-1">
                        Mandatory Administrative Deletion Reason:
                      </label>
                      <textarea
                        value={deleteReason}
                        onChange={(e) => setDeleteReason(e.target.value)}
                        placeholder="State reason for permanent deletion for platform audit records..."
                        rows={2}
                        className="w-full text-xs p-2.5 border border-[#DCE1E3] rounded outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold uppercase text-[#101820] block mb-1">
                        Super Admin Password (Step-up Verification):
                      </label>
                      <Input
                        type="password"
                        value={reauthPassword}
                        onChange={(e) => setReauthPassword(e.target.value)}
                        placeholder="Enter your Super Admin password"
                        className="h-9 text-xs"
                      />
                    </div>
                  </div>
                </div>
              ) : null}

              <div className="flex justify-end gap-3 pt-3 border-t border-[#DCE1E3]">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDeleteModalOpen(false)}
                  disabled={deleteLoading}
                  className="text-xs font-bold uppercase"
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleExecuteCascadeDelete}
                  disabled={
                    deleteLoading ||
                    impactLoading ||
                    confirmName.trim().toLowerCase() !== academy.name.trim().toLowerCase() ||
                    deleteReason.trim().length < 5
                  }
                  className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold uppercase"
                >
                  {deleteLoading ? "Executing Cascade Delete..." : "Confirm & Execute Cascade Delete"}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
