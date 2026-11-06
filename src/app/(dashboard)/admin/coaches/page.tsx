"use client";

import { useEffect, useState } from "react";
import { DashboardShell } from "@/components/shared/dashboard-shell";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/status-badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  UserCheck,
  Search,
  Filter,
  Eye,
  Trash2,
  Edit,
  AlertOctagon,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Shield,
  Building2,
  Users,
} from "lucide-react";
import { toast } from "sonner";

interface CoachItem {
  id: string;
  coachCode: string;
  sport: string;
  assignedSports: string[];
  specialization: string;
  experienceYears: number;
  status: string;
  accountStatus: string;
  createdAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    status: string;
  } | null;
  academy: {
    id: string;
    name: string;
    slug: string;
    sports: string[];
  } | null;
  assignedPlayersCount: number;
}

interface CoachImpactData {
  coach: {
    id: string;
    coachCode?: string;
    name: string;
    email: string;
    sport: string;
    academy: { id: string; name: string };
  };
  assignedPlayersCount: number;
  practiceSessionsCount: number;
  attendancesCount: number;
  hasUserAccount: boolean;
}

export default function AdminCoachesPage() {
  const [coaches, setCoaches] = useState<CoachItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sportFilter, setSportFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCoaches, setTotalCoaches] = useState(0);

  // Edit / Transfer Modal
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedCoach, setSelectedCoach] = useState<CoachItem | null>(null);
  const [editSport, setEditSport] = useState("");
  const [editSpecialization, setEditSpecialization] = useState("");
  const [editExperienceYears, setEditExperienceYears] = useState(0);
  const [editLoading, setEditLoading] = useState(false);

  // Cascade Delete Modal
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteTargetCoach, setDeleteTargetCoach] = useState<CoachItem | null>(null);
  const [impactData, setImpactData] = useState<CoachImpactData | null>(null);
  const [impactLoading, setImpactLoading] = useState(false);
  const [confirmName, setConfirmName] = useState("");
  const [deleteReason, setDeleteReason] = useState("");
  const [reauthPassword, setReauthPassword] = useState("");
  const [reassignCoachId, setReassignCoachId] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);

  async function loadCoaches() {
    try {
      setLoading(true);
      const query = new URLSearchParams({
        page: page.toString(),
        limit: "15",
        sport: sportFilter,
        status: statusFilter,
        search,
      });

      const res = await fetch(`/api/admin/coaches?${query.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setCoaches(data.items || []);
        setTotalPages(data.pagination?.totalPages || 1);
        setTotalCoaches(data.pagination?.total || 0);
      } else {
        toast.error("Failed to load coaches directory");
      }
    } catch (e) {
      console.error(e);
      toast.error("Error loading coaches");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCoaches();
  }, [page, sportFilter, statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadCoaches();
  };

  const openEditModal = (c: CoachItem) => {
    setSelectedCoach(c);
    setEditSport(c.sport);
    setEditSpecialization(c.specialization || "");
    setEditExperienceYears(c.experienceYears || 0);
    setEditModalOpen(true);
  };

  const handleUpdateCoach = async () => {
    if (!selectedCoach) return;
    try {
      setEditLoading(true);
      const res = await fetch(`/api/admin/coaches/${selectedCoach.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sport: editSport.trim(),
          specialization: editSpecialization.trim(),
          experienceYears: editExperienceYears,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Update failed");

      toast.success(data.message || "Coach updated successfully");
      setEditModalOpen(false);
      loadCoaches();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update coach");
    } finally {
      setEditLoading(false);
    }
  };

  const openCascadeDeleteModal = async (coach: CoachItem) => {
    setDeleteTargetCoach(coach);
    setConfirmName("");
    setDeleteReason("");
    setReauthPassword("");
    setReassignCoachId("");
    setDeleteModalOpen(true);
    setImpactLoading(true);

    try {
      const res = await fetch(`/api/admin/coaches/${coach.id}/impact`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to calculate coach impact");
      }
      const data = await res.json();
      setImpactData(data.impact);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not calculate deletion impact preview");
      setDeleteModalOpen(false);
    } finally {
      setImpactLoading(false);
    }
  };

  const handleExecuteCascadeDelete = async () => {
    if (!deleteTargetCoach) return;
    const coachName = deleteTargetCoach.user?.name || deleteTargetCoach.sport;
    if (confirmName.trim().toLowerCase() !== coachName.trim().toLowerCase()) {
      toast.error(`Confirmation mismatch: Please type '${coachName}' exactly.`);
      return;
    }
    if (!deleteReason || deleteReason.trim().length < 3) {
      toast.error("A deletion reason (at least 3 characters) is required.");
      return;
    }

    try {
      setDeleteLoading(true);
      const res = await fetch(`/api/admin/coaches/${deleteTargetCoach.id}/delete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          confirmName: confirmName.trim(),
          reason: deleteReason.trim(),
          reauthPassword: reauthPassword.trim(),
          reassignCoachId: reassignCoachId || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Permanent deletion failed");

      toast.success(data.message || "Coach and training records permanently removed from the database.");
      setDeleteModalOpen(false);
      setDeleteTargetCoach(null);
      loadCoaches();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Cascade deletion failed");
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <DashboardShell allowedRoles={["PLATFORM_ADMIN", "SUPER_ADMIN"]}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#DCE1E3] pb-6">
          <div>
            <div className="inline-flex items-center gap-2 px-2 py-0.5 rounded bg-[#C6F432]/30 border border-[#C6F432] text-[#101820] text-[10px] font-black uppercase tracking-widest mb-2">
              <UserCheck className="h-3 w-3" />
              Coaching Governance
            </div>
            <h1 className="text-2xl font-black uppercase text-[#101820]">
              Platform Coaches Directory
            </h1>
            <p className="text-xs text-[#8B969E] uppercase tracking-wider mt-1 font-semibold">
              Total Registered Coaches ({totalCoaches})
            </p>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white p-4 rounded-lg border border-[#DCE1E3]">
          <form onSubmit={handleSearchSubmit} className="flex-1 flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#8B969E]" />
              <Input
                placeholder="Search coaches by name, email, code, or sport..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9 text-xs border-[#DCE1E3] bg-[#F4F3EE]/40"
              />
            </div>
            <Button type="submit" size="sm" className="bg-[#101820] text-white hover:bg-black text-xs font-bold uppercase">
              Search
            </Button>
          </form>

          <div className="flex items-center gap-3 shrink-0">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="h-9 px-3 text-xs font-semibold bg-[#F4F3EE]/60 border border-[#DCE1E3] rounded text-[#101820] outline-none"
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </div>
        </div>

        {/* Coaches Table */}
        <Card className="border-[#DCE1E3] bg-white shadow-sm overflow-hidden">
          <CardContent className="p-0">
            {loading ? (
              <div className="py-16 text-center text-xs text-[#8B969E]">Loading coaches...</div>
            ) : coaches.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-[#DCE1E3] bg-[#F4F3EE] text-[10px] uppercase font-black tracking-wider text-[#8B969E]">
                      <th className="p-4">Coach / Contact</th>
                      <th className="p-4">Assigned Sport</th>
                      <th className="p-4">Academy</th>
                      <th className="p-4">Squad Roster</th>
                      <th className="p-4">Status</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#DCE1E3]">
                    {coaches.map((c) => (
                      <tr key={c.id} className="hover:bg-[#F4F3EE]/50 transition-colors">
                        <td className="p-4">
                          <div className="font-bold text-[#101820] text-sm">
                            {c.user?.name || "Unassigned Name"}
                          </div>
                          <div className="text-[11px] text-[#8B969E]">{c.user?.email || "No email"}</div>
                          {c.coachCode && (
                            <div className="font-mono text-[10px] text-[#8B969E] mt-0.5">Code: {c.coachCode}</div>
                          )}
                        </td>
                        <td className="p-4">
                          <span className="font-bold text-xs px-2.5 py-1 rounded bg-[#C6F432]/30 border border-[#C6F432] text-[#101820]">
                            {c.sport}
                          </span>
                          {c.specialization && (
                            <div className="text-[10px] text-[#8B969E] mt-1">{c.specialization}</div>
                          )}
                        </td>
                        <td className="p-4">
                          {c.academy ? (
                            <div>
                              <div className="font-semibold text-[#101820]">{c.academy.name}</div>
                              <div className="text-[10px] text-[#8B969E]">Slug: {c.academy.slug}</div>
                            </div>
                          ) : (
                            <span className="text-[#8B969E] italic">Unassigned Academy</span>
                          )}
                        </td>
                        <td className="p-4">
                          <div className="inline-flex items-center gap-1.5 font-bold text-xs text-[#101820]">
                            <Users className="h-3.5 w-3.5 text-[#8B969E]" />
                            {c.assignedPlayersCount} Athletes
                          </div>
                        </td>
                        <td className="p-4">
                          <StatusBadge status={c.status} />
                        </td>
                        <td className="p-4 text-right space-x-1.5 whitespace-nowrap">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openEditModal(c)}
                            className="h-7 px-2.5 text-[11px] font-bold uppercase"
                          >
                            <Edit className="h-3 w-3 mr-1" /> Edit
                          </Button>

                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openCascadeDeleteModal(c)}
                            className="h-7 px-2.5 border-red-300 text-red-700 hover:bg-red-50 text-[11px] font-bold uppercase"
                            title="Permanently cascade delete coach from database"
                          >
                            <Trash2 className="h-3 w-3 mr-1" /> Delete
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-16 text-center text-xs text-[#8B969E]">
                No coaches found matching the filter criteria.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-[#DCE1E3] pt-4">
            <div className="text-xs text-[#8B969E]">
              Showing page <span className="font-bold text-[#101820]">{page}</span> of{" "}
              <span className="font-bold text-[#101820]">{totalPages}</span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="h-8 text-xs font-semibold"
              >
                <ChevronLeft className="h-3.5 w-3.5 mr-1" /> Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="h-8 text-xs font-semibold"
              >
                Next <ChevronRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* Edit Coach Modal */}
        {editModalOpen && selectedCoach && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="bg-white rounded-lg max-w-md w-full border border-[#DCE1E3] p-6 space-y-4 shadow-xl">
              <div className="flex items-center gap-2 border-b border-[#DCE1E3] pb-3">
                <Edit className="h-5 w-5 text-[#101820]" />
                <h3 className="font-black uppercase text-sm text-[#101820]">
                  Edit Coach Profile & Sport Assignment
                </h3>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="font-bold uppercase text-[10px] text-[#8B969E] block mb-1">
                    Coach Name
                  </label>
                  <div className="font-bold text-sm text-[#101820]">{selectedCoach.user?.name}</div>
                </div>

                <div>
                  <label className="font-bold uppercase text-[10px] text-[#8B969E] block mb-1">
                    Assigned Sport <span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={editSport}
                    onChange={(e) => setEditSport(e.target.value)}
                    placeholder="e.g. Football, Basketball, Cricket"
                    className="h-9 text-xs"
                  />
                  {selectedCoach.academy && (
                    <div className="text-[10px] text-[#8B969E] mt-1">
                      Academy Supported Sports: {selectedCoach.academy.sports.join(", ") || "All"}
                    </div>
                  )}
                </div>

                <div>
                  <label className="font-bold uppercase text-[10px] text-[#8B969E] block mb-1">
                    Specialization
                  </label>
                  <Input
                    value={editSpecialization}
                    onChange={(e) => setEditSpecialization(e.target.value)}
                    placeholder="e.g. Tactical Defense, Goalkeeping, Strength"
                    className="h-9 text-xs"
                  />
                </div>

                <div>
                  <label className="font-bold uppercase text-[10px] text-[#8B969E] block mb-1">
                    Experience (Years)
                  </label>
                  <Input
                    type="number"
                    value={editExperienceYears}
                    onChange={(e) => setEditExperienceYears(parseInt(e.target.value, 10) || 0)}
                    className="h-9 text-xs"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#DCE1E3]">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditModalOpen(false)}
                  disabled={editLoading}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleUpdateCoach}
                  disabled={editLoading || !editSport.trim()}
                  className="bg-[#101820] text-white hover:bg-black text-xs font-bold uppercase"
                >
                  {editLoading ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Coach Cascade Delete Modal */}
        {deleteModalOpen && deleteTargetCoach && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 overflow-y-auto">
            <div className="bg-white rounded-lg max-w-lg w-full border border-red-300 shadow-2xl p-6 space-y-4 my-8">
              <div className="flex items-center gap-3 border-b border-red-200 pb-3">
                <AlertOctagon className="h-6 w-6 text-red-600 shrink-0" />
                <div>
                  <h3 className="font-black uppercase text-base text-red-900">
                    Permanently Delete Coach From Database
                  </h3>
                  <p className="text-xs text-red-700">
                    Target: <span className="font-bold">{deleteTargetCoach.user?.name || deleteTargetCoach.sport}</span> (Sport: {deleteTargetCoach.sport})
                  </p>
                </div>
              </div>

              {impactLoading ? (
                <div className="py-8 text-center text-xs text-[#8B969E]">
                  Calculating database dependencies and player assignments...
                </div>
              ) : impactData ? (
                <div className="space-y-4 text-xs">
                  {/* Warning */}
                  <div className="p-3 bg-red-50 border border-red-200 rounded text-red-800 space-y-1">
                    <div className="font-bold uppercase text-[10px] tracking-wider text-red-900 flex items-center gap-1">
                      <AlertTriangle className="h-3.5 w-3.5 text-red-600" />
                      Cascade Purge Warning
                    </div>
                    <div>
                      This coach will be <b>permanently erased</b> from MongoDB. Practice sessions, training attendances, and their user credentials will be purged.
                    </div>
                  </div>

                  {/* Impact preview */}
                  <div className="bg-[#F4F3EE] p-3 rounded border border-[#DCE1E3] space-y-1">
                    <div className="font-bold uppercase text-[10px] text-[#101820]">
                      Database Records Affected:
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[11px] text-[#101820]">
                      <div>• Assigned Athletes: <b>{impactData.assignedPlayersCount}</b></div>
                      <div>• Practice Sessions: <b>{impactData.practiceSessionsCount}</b></div>
                      <div>• Training Attendances: <b>{impactData.attendancesCount}</b></div>
                      <div>• User Account: <b>{impactData.hasUserAccount ? "Will be deleted" : "None"}</b></div>
                    </div>
                  </div>

                  {/* Player Reassignment Option */}
                  {impactData.assignedPlayersCount > 0 && (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded text-amber-900 space-y-2">
                      <div className="font-bold text-[11px]">
                        Safe Athlete Reassignment (Optional):
                      </div>
                      <p className="text-[10px] text-amber-800">
                        {impactData.assignedPlayersCount} active athletes are currently assigned to this coach. You can reassign them to another coach or leave this empty to safely unassign them into the academy squad.
                      </p>
                      <Input
                        value={reassignCoachId}
                        onChange={(e) => setReassignCoachId(e.target.value)}
                        placeholder="Target Coach ID for player reassignment (optional)"
                        className="h-8 text-xs border-amber-300"
                      />
                    </div>
                  )}

                  {/* Confirmation Inputs */}
                  <div className="space-y-3 pt-1">
                    <div>
                      <label className="text-[11px] font-bold uppercase text-[#101820] block mb-1">
                        Type coach name <span className="font-mono text-red-600">"{deleteTargetCoach.user?.name || deleteTargetCoach.sport}"</span> to confirm:
                      </label>
                      <Input
                        value={confirmName}
                        onChange={(e) => setConfirmName(e.target.value)}
                        placeholder={deleteTargetCoach.user?.name || deleteTargetCoach.sport}
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
                        className="w-full text-xs p-2 border border-[#DCE1E3] rounded outline-none focus:border-red-500"
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
                    confirmName.trim().toLowerCase() !== (deleteTargetCoach.user?.name || deleteTargetCoach.sport).trim().toLowerCase() ||
                    deleteReason.trim().length < 3
                  }
                  className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold uppercase"
                >
                  {deleteLoading ? "Executing Cascade Purge..." : "Confirm & Cascade Delete Coach"}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
