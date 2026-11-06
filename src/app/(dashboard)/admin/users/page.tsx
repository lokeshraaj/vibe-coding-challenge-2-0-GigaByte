"use client";

import { useEffect, useState } from "react";
import { DashboardShell } from "@/components/shared/dashboard-shell";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/status-badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Users,
  Search,
  Filter,
  Ban,
  CheckCircle,
  Eye,
  ChevronLeft,
  ChevronRight,
  Shield,
  ShieldAlert,
  UserCheck,
  Trash2,
  AlertOctagon,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";

interface UserItem {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  blockedReason?: string;
  phone?: string;
  academy?: {
    name?: string;
    slug?: string;
    academyCode?: string;
  } | null;
  lastLoginAt?: string | null;
  createdAt: string;
}

interface UserProfileDetails {
  user: UserItem & { metadata?: any; adminPermissions?: string[] };
  profiles: {
    coach?: any;
    player?: any;
    scout?: any;
  };
  auditHistory: any[];
}

interface UserImpactData {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    status: string;
    academyName?: string;
  };
  profiles: {
    coach?: { id: string; sport: string; assignedPlayersCount: number };
    player?: { id: string; sport: string; matchCount: number; attendanceCount: number };
    scout?: { id: string };
    ownedAcademiesCount: number;
  };
  recordCounts: {
    attendances: number;
    matchParticipants: number;
    practiceSessions: number;
    complaints: number;
  };
}

export default function UsersManagementPage() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);

  // User Inspector Modal
  const [inspectModalOpen, setInspectModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserProfileDetails | null>(null);
  const [inspectLoading, setInspectLoading] = useState(false);

  // Status Action Modal (Block / Unblock)
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [targetUser, setTargetUser] = useState<UserItem | null>(null);
  const [actionType, setActionType] = useState<"BLOCK" | "UNBLOCK" | null>(null);
  const [actionReason, setActionReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  // Cascade Delete User Modal
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteTargetUser, setDeleteTargetUser] = useState<UserItem | null>(null);
  const [impactData, setImpactData] = useState<UserImpactData | null>(null);
  const [impactLoading, setImpactLoading] = useState(false);
  const [confirmEmail, setConfirmEmail] = useState("");
  const [deleteReason, setDeleteReason] = useState("");
  const [reauthPassword, setReauthPassword] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);

  async function loadUsers() {
    try {
      setLoading(true);
      const query = new URLSearchParams({
        page: page.toString(),
        limit: "15",
        role: roleFilter,
        status: statusFilter,
        search,
      });

      const res = await fetch(`/api/admin/users?${query.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setUsers(data.items || []);
        setTotalPages(data.pagination?.totalPages || 1);
        setTotalUsers(data.pagination?.total || 0);
      } else {
        toast.error("Failed to load users directory");
      }
    } catch (e) {
      console.error(e);
      toast.error("Error loading users");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadUsers();
  }, [page, roleFilter, statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadUsers();
  };

  const openUserInspector = async (userId: string) => {
    try {
      setInspectModalOpen(true);
      setInspectLoading(true);
      const res = await fetch(`/api/admin/users/${userId}`);
      if (!res.ok) throw new Error("Failed to load user details");
      const data = await res.json();
      setSelectedUser(data);
    } catch (err) {
      toast.error("Could not load user profile");
      setInspectModalOpen(false);
    } finally {
      setInspectLoading(false);
    }
  };

  const handleUserStatusUpdate = async () => {
    if (!targetUser || !actionType) return;
    if (!actionReason || actionReason.trim().length < 3) {
      toast.error("Please enter a reason (at least 3 characters)");
      return;
    }

    try {
      setActionLoading(true);
      const targetStatus = actionType === "BLOCK" ? "BLOCKED" : "ACTIVE";

      const res = await fetch(`/api/admin/users/${targetUser.id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: targetStatus,
          reason: actionReason.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Status update failed");

      toast.success(data.message || `User account updated to ${targetStatus}`);
      setStatusModalOpen(false);
      setTargetUser(null);
      setActionReason("");
      loadUsers();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update user status");
    } finally {
      setActionLoading(false);
    }
  };

  const openCascadeDeleteModal = async (user: UserItem) => {
    if (user.role === "SUPER_ADMIN") {
      toast.error("SUPER_ADMIN accounts cannot be deleted.");
      return;
    }

    setDeleteTargetUser(user);
    setConfirmEmail("");
    setDeleteReason("");
    setReauthPassword("");
    setDeleteModalOpen(true);
    setImpactLoading(true);

    try {
      const res = await fetch(`/api/admin/users/${user.id}/impact`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to calculate user impact");
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
    if (!deleteTargetUser) return;
    if (confirmEmail.trim().toLowerCase() !== deleteTargetUser.email.trim().toLowerCase()) {
      toast.error(`Confirmation mismatch: Please type '${deleteTargetUser.email}' exactly.`);
      return;
    }
    if (!deleteReason || deleteReason.trim().length < 3) {
      toast.error("A deletion reason (at least 3 characters) is mandatory.");
      return;
    }

    try {
      setDeleteLoading(true);
      const res = await fetch(`/api/admin/users/${deleteTargetUser.id}/delete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          confirmEmail: confirmEmail.trim(),
          reason: deleteReason.trim(),
          reauthPassword: reauthPassword.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Permanent deletion failed");

      toast.success(data.message || "User and all associated database records permanently erased.");
      setDeleteModalOpen(false);
      setInspectModalOpen(false);
      setDeleteTargetUser(null);
      loadUsers();
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
              <Users className="h-3 w-3" />
              User Governance
            </div>
            <h1 className="text-2xl font-black uppercase text-[#101820]">
              Global User Directory
            </h1>
            <p className="text-xs text-[#8B969E] uppercase tracking-wider mt-1 font-semibold">
              Cross-Tenant Accounts ({totalUsers} Registered Users)
            </p>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white p-4 rounded-lg border border-[#DCE1E3]">
          <form onSubmit={handleSearchSubmit} className="flex-1 flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#8B969E]" />
              <Input
                placeholder="Search by user name, email, or phone..."
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
            {/* Role Filter */}
            <select
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value);
                setPage(1);
              }}
              className="h-9 px-3 text-xs font-semibold bg-[#F4F3EE]/60 border border-[#DCE1E3] rounded text-[#101820] outline-none"
            >
              <option value="ALL">All Roles</option>
              <option value="SUPER_ADMIN">Super Admin</option>
              <option value="PLATFORM_ADMIN">Platform Admin</option>
              <option value="ACADEMY_OWNER">Academy Owner</option>
              <option value="COACH">Coach</option>
              <option value="PLAYER">Athlete</option>
              <option value="SCOUT">Scout</option>
            </select>

            {/* Status Filter */}
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
              <option value="BLOCKED">Blocked</option>
              <option value="PENDING">Pending</option>
              <option value="DEACTIVATED">Deactivated</option>
            </select>
          </div>
        </div>

        {/* Users Table */}
        <Card className="border-[#DCE1E3] bg-white shadow-sm overflow-hidden">
          <CardContent className="p-0">
            {loading ? (
              <div className="py-16 text-center text-xs text-[#8B969E]">Loading accounts...</div>
            ) : users.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-[#DCE1E3] bg-[#F4F3EE] text-[10px] uppercase font-black tracking-wider text-[#8B969E]">
                      <th className="p-4">Name / Email</th>
                      <th className="p-4">Account Role</th>
                      <th className="p-4">Tenant Academy</th>
                      <th className="p-4">Last Login</th>
                      <th className="p-4">Status</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#DCE1E3]">
                    {users.map((u) => (
                      <tr key={u.id} className="hover:bg-[#F4F3EE]/50 transition-colors">
                        <td className="p-4">
                          <div className="font-bold text-[#101820] text-sm">{u.name}</div>
                          <div className="text-[11px] text-[#8B969E]">{u.email}</div>
                          {u.phone && <div className="text-[10px] text-[#8B969E]">{u.phone}</div>}
                        </td>
                        <td className="p-4">
                          <span className="font-mono text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-[#F4F3EE] border border-[#DCE1E3] text-[#101820]">
                            {u.role.replace("_", " ")}
                          </span>
                        </td>
                        <td className="p-4">
                          {u.academy ? (
                            <div>
                              <div className="font-semibold text-[#101820]">{u.academy.name}</div>
                              <div className="text-[10px] text-[#8B969E]">Code: {u.academy.academyCode}</div>
                            </div>
                          ) : (
                            <span className="text-[#8B969E] italic">Global / Unassigned</span>
                          )}
                        </td>
                        <td className="p-4 text-[#8B969E]">
                          {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString() : "Never"}
                        </td>
                        <td className="p-4">
                          <StatusBadge status={u.status} />
                          {u.status === "BLOCKED" && u.blockedReason && (
                            <div className="text-[10px] text-red-600 mt-1 truncate max-w-[150px]" title={u.blockedReason}>
                              {u.blockedReason}
                            </div>
                          )}
                        </td>
                        <td className="p-4 text-right space-x-1.5 whitespace-nowrap">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openUserInspector(u.id)}
                            className="h-7 px-2.5 text-[11px] font-bold uppercase"
                          >
                            <Eye className="h-3 w-3 mr-1" /> Inspect
                          </Button>

                          {u.role !== "SUPER_ADMIN" && (
                            <>
                              {u.status === "BLOCKED" ? (
                                <Button
                                  size="sm"
                                  onClick={() => {
                                    setTargetUser(u);
                                    setActionType("UNBLOCK");
                                    setStatusModalOpen(true);
                                  }}
                                  className="h-7 px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold uppercase"
                                >
                                  <CheckCircle className="h-3 w-3 mr-1" /> Unblock
                                </Button>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setTargetUser(u);
                                    setActionType("BLOCK");
                                    setStatusModalOpen(true);
                                  }}
                                  className="h-7 px-2.5 border-amber-300 text-amber-700 hover:bg-amber-50 text-[11px] font-bold uppercase"
                                >
                                  <Ban className="h-3 w-3 mr-1" /> Block
                                </Button>
                              )}

                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openCascadeDeleteModal(u)}
                                className="h-7 px-2.5 border-red-300 text-red-700 hover:bg-red-50 text-[11px] font-bold uppercase"
                                title="Permanently delete user from database"
                              >
                                <Trash2 className="h-3 w-3 mr-1" /> Delete
                              </Button>
                            </>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-16 text-center text-xs text-[#8B969E]">
                No users found matching the filter criteria.
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

        {/* User Details Inspector Modal */}
        {inspectModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="bg-white rounded-lg max-w-lg w-full border border-[#DCE1E3] p-6 space-y-4 shadow-xl max-h-[85vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-[#DCE1E3] pb-3">
                <div className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-[#101820]" />
                  <h3 className="font-black uppercase text-sm text-[#101820]">User Account Profile</h3>
                </div>
                <span className="text-xs font-mono text-[#8B969E]">{selectedUser?.user?.id}</span>
              </div>

              {inspectLoading ? (
                <div className="py-8 text-center text-xs text-[#8B969E]">Loading profile details...</div>
              ) : selectedUser ? (
                <div className="space-y-4 text-xs">
                  <div className="grid grid-cols-2 gap-3 p-3 bg-[#F4F3EE] rounded border border-[#DCE1E3]">
                    <div>
                      <div className="text-[10px] font-bold uppercase text-[#8B969E]">Full Name</div>
                      <div className="font-bold text-[#101820]">{selectedUser.user.name}</div>
                    </div>
                    <div>
                      <div className="text-[10px] font-bold uppercase text-[#8B969E]">Email Address</div>
                      <div className="font-medium text-[#101820] truncate">{selectedUser.user.email}</div>
                    </div>
                    <div>
                      <div className="text-[10px] font-bold uppercase text-[#8B969E]">Role</div>
                      <div className="font-mono text-[#101820]">{selectedUser.user.role}</div>
                    </div>
                    <div>
                      <div className="text-[10px] font-bold uppercase text-[#8B969E]">Account Status</div>
                      <StatusBadge status={selectedUser.user.status} />
                    </div>
                  </div>

                  {selectedUser.profiles.coach && (
                    <div className="p-3 bg-white border border-[#DCE1E3] rounded">
                      <div className="font-bold text-[#101820] mb-1">Coach Profile</div>
                      <div className="text-[11px] text-[#8B969E]">
                        Sport: <b>{selectedUser.profiles.coach.sport}</b> • Code: <b>{selectedUser.profiles.coach.code}</b>
                      </div>
                    </div>
                  )}

                  {selectedUser.profiles.player && (
                    <div className="p-3 bg-white border border-[#DCE1E3] rounded">
                      <div className="font-bold text-[#101820] mb-1">Athlete Profile</div>
                      <div className="text-[11px] text-[#8B969E]">
                        Sport: <b>{selectedUser.profiles.player.sport}</b> • Position: <b>{selectedUser.profiles.player.position}</b> • Code: <b>{selectedUser.profiles.player.code}</b>
                      </div>
                    </div>
                  )}

                  {selectedUser.auditHistory && selectedUser.auditHistory.length > 0 && (
                    <div>
                      <div className="font-bold uppercase text-[10px] text-[#8B969E] mb-2">Recent Security Events</div>
                      <div className="max-h-36 overflow-y-auto divide-y divide-[#DCE1E3] border border-[#DCE1E3] rounded">
                        {selectedUser.auditHistory.map((a: any) => (
                          <div key={a.id} className="p-2 text-[11px]">
                            <span className="font-bold text-[#101820]">{a.action}</span>
                            <span className="text-[#8B969E] ml-2">{new Date(a.createdAt).toLocaleDateString()}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : null}

              <div className="flex justify-between items-center pt-2 border-t border-[#DCE1E3]">
                {selectedUser && selectedUser.user.role !== "SUPER_ADMIN" ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openCascadeDeleteModal(selectedUser.user)}
                    className="border-red-300 text-red-600 hover:bg-red-50 text-xs font-bold uppercase"
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-1" /> Cascade Delete User
                  </Button>
                ) : <div />}

                <Button variant="outline" size="sm" onClick={() => setInspectModalOpen(false)}>
                  Close
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* User Status Action Modal (Block / Unblock) */}
        {statusModalOpen && targetUser && actionType && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="bg-white rounded-lg max-w-md w-full border border-[#DCE1E3] p-6 space-y-4 shadow-xl">
              <div className="flex items-center gap-2">
                {actionType === "BLOCK" ? (
                  <Ban className="h-5 w-5 text-amber-600" />
                ) : (
                  <CheckCircle className="h-5 w-5 text-emerald-600" />
                )}
                <h3 className="font-black uppercase text-sm text-[#101820]">
                  {actionType === "BLOCK" ? "Block User Account" : "Unblock User Account"}
                </h3>
              </div>

              <p className="text-xs text-[#8B969E]">
                {actionType === "BLOCK"
                  ? `Blocking '${targetUser.name}' will immediately revoke active sessions and reject future authentication requests across ATHLIX.`
                  : `Unblocking '${targetUser.name}' will restore standard login and portal access.`}
              </p>

              <div>
                <label className="text-[11px] font-bold uppercase text-[#101820] block mb-1">
                  Reason for Action <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={actionReason}
                  onChange={(e) => setActionReason(e.target.value)}
                  placeholder="Enter administrative reason for audit logs..."
                  rows={3}
                  className="w-full text-xs p-2.5 border border-[#DCE1E3] rounded outline-none focus:border-[#101820]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setStatusModalOpen(false);
                    setTargetUser(null);
                    setActionReason("");
                  }}
                  disabled={actionLoading}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleUserStatusUpdate}
                  disabled={actionLoading || actionReason.trim().length < 3}
                  className={
                    actionType === "BLOCK"
                      ? "bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold uppercase"
                      : "bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold uppercase"
                  }
                >
                  {actionLoading ? "Processing..." : `Confirm ${actionType}`}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* User Cascade Delete Modal */}
        {deleteModalOpen && deleteTargetUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 overflow-y-auto">
            <div className="bg-white rounded-lg max-w-lg w-full border border-red-300 shadow-2xl p-6 space-y-4 my-8">
              <div className="flex items-center gap-3 border-b border-red-200 pb-3">
                <AlertOctagon className="h-6 w-6 text-red-600 shrink-0" />
                <div>
                  <h3 className="font-black uppercase text-base text-red-900">
                    Permanently Delete User From Database
                  </h3>
                  <p className="text-xs text-red-700">
                    Hard Cascade Purge: <span className="font-bold">{deleteTargetUser.name}</span> ({deleteTargetUser.email})
                  </p>
                </div>
              </div>

              {impactLoading ? (
                <div className="py-8 text-center text-xs text-[#8B969E]">
                  Calculating database references and cascade impact...
                </div>
              ) : impactData ? (
                <div className="space-y-4 text-xs">
                  {/* Warning banner */}
                  <div className="p-3 bg-red-50 border border-red-200 rounded text-red-800 space-y-1">
                    <div className="font-bold uppercase text-[10px] tracking-wider text-red-900 flex items-center gap-1">
                      <AlertTriangle className="h-3.5 w-3.5 text-red-600" />
                      Irreversible Database Operation
                    </div>
                    <div>
                      This action will <b>permanently delete</b> this user document and cascade-delete all related records across all MongoDB collections.
                    </div>
                  </div>

                  {/* Impact Counts */}
                  <div className="bg-[#F4F3EE] p-3 rounded border border-[#DCE1E3] space-y-1.5">
                    <div className="font-bold uppercase text-[10px] text-[#101820]">
                      Database Records Marked For Permanent Deletion:
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[11px] text-[#101820]">
                      <div>• Role Profile: <b>{impactData.user.role}</b></div>
                      {impactData.profiles.coach && (
                        <div>• Assigned Athletes: <b>{impactData.profiles.coach.assignedPlayersCount} (Will be safely unassigned)</b></div>
                      )}
                      <div>• Training Attendances: <b>{impactData.recordCounts.attendances}</b></div>
                      <div>• Match Participations: <b>{impactData.recordCounts.matchParticipants}</b></div>
                      <div>• Practice Sessions: <b>{impactData.recordCounts.practiceSessions}</b></div>
                      <div>• Filed Complaints: <b>{impactData.recordCounts.complaints}</b></div>
                    </div>
                  </div>

                  {/* Confirmation Inputs */}
                  <div className="space-y-3 pt-1">
                    <div>
                      <label className="text-[11px] font-bold uppercase text-[#101820] block mb-1">
                        Type user's exact email <span className="font-mono text-red-600">"{deleteTargetUser.email}"</span> to confirm:
                      </label>
                      <Input
                        value={confirmEmail}
                        onChange={(e) => setConfirmEmail(e.target.value)}
                        placeholder={deleteTargetUser.email}
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
                    confirmEmail.trim().toLowerCase() !== deleteTargetUser.email.trim().toLowerCase() ||
                    deleteReason.trim().length < 3
                  }
                  className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold uppercase"
                >
                  {deleteLoading ? "Executing Cascade Purge..." : "Confirm & Cascade Delete"}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
