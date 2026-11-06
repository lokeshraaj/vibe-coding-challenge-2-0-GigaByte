"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { DashboardShell } from "@/components/shared/dashboard-shell";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/status-badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Building2,
  Search,
  Filter,
  ShieldAlert,
  ChevronLeft,
  ChevronRight,
  Eye,
  Ban,
  CheckCircle,
  PauseCircle,
  Users,
} from "lucide-react";
import { toast } from "sonner";

interface AcademyItem {
  id: string;
  name: string;
  slug: string;
  academyCode: string;
  city: string;
  country: string;
  contactEmail: string;
  contactPhone: string;
  status: string;
  blockedReason?: string;
  ownerName: string;
  ownerEmail: string;
  totalCoaches: number;
  totalPlayers: number;
  totalScouts: number;
  createdAt: string;
}

export default function AcademiesManagementPage() {
  const [academies, setAcademies] = useState<AcademyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // Status Action Modal State
  const [selectedAcademy, setSelectedAcademy] = useState<AcademyItem | null>(null);
  const [actionType, setActionType] = useState<"BLOCK" | "UNBLOCK" | "SUSPEND" | null>(null);
  const [actionReason, setActionReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  async function loadAcademies() {
    try {
      setLoading(true);
      const query = new URLSearchParams({
        page: page.toString(),
        limit: "15",
        status: statusFilter,
        search,
      });

      const res = await fetch(`/api/admin/academies?${query.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setAcademies(data.items || []);
        setTotalPages(data.pagination?.totalPages || 1);
        setTotalItems(data.pagination?.total || 0);
      } else {
        toast.error("Failed to load academies");
      }
    } catch (e) {
      console.error(e);
      toast.error("Network error while loading academies");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAcademies();
  }, [page, statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadAcademies();
  };

  const handleStatusAction = async () => {
    if (!selectedAcademy || !actionType) return;
    if (!actionReason || actionReason.trim().length < 3) {
      toast.error("Please provide a reason of at least 3 characters");
      return;
    }

    try {
      setActionLoading(true);
      const targetStatus =
        actionType === "BLOCK" ? "BLOCKED" : actionType === "SUSPEND" ? "SUSPENDED" : "ACTIVE";

      const res = await fetch(`/api/admin/academies/${selectedAcademy.id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: targetStatus,
          reason: actionReason.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update academy status");
      }

      toast.success(data.message || `Academy status updated to ${targetStatus}`);
      setSelectedAcademy(null);
      setActionType(null);
      setActionReason("");
      loadAcademies();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Status update failed");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <DashboardShell allowedRoles={["PLATFORM_ADMIN", "SUPER_ADMIN"]}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#DCE1E3] pb-6">
          <div>
            <div className="inline-flex items-center gap-2 px-2 py-0.5 rounded bg-[#C6F432]/30 border border-[#C6F432] text-[#101820] text-[10px] font-black uppercase tracking-widest mb-2">
              <Building2 className="h-3 w-3" />
              Tenant Directory
            </div>
            <h1 className="text-2xl font-black uppercase text-[#101820]">
              Academy Tenant Directory
            </h1>
            <p className="text-xs text-[#8B969E] uppercase tracking-wider mt-1 font-semibold">
              Global Multi-Tenant Registry ({totalItems} Registered Academies)
            </p>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white p-4 rounded-lg border border-[#DCE1E3]">
          <form onSubmit={handleSearchSubmit} className="flex-1 flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#8B969E]" />
              <Input
                placeholder="Search academy name, slug, owner, email, city..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9 text-xs border-[#DCE1E3] bg-[#F4F3EE]/40"
              />
            </div>
            <Button type="submit" size="sm" className="bg-[#101820] text-white hover:bg-black text-xs font-bold uppercase">
              Search
            </Button>
          </form>

          <div className="flex items-center gap-2 shrink-0">
            <Filter className="h-4 w-4 text-[#8B969E]" />
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
              <option value="SUSPENDED">Suspended</option>
              <option value="PENDING">Pending Verification</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <Card className="border-[#DCE1E3] bg-white shadow-sm overflow-hidden">
          <CardContent className="p-0">
            {loading ? (
              <div className="py-16 text-center text-xs text-[#8B969E]">Loading academies directory...</div>
            ) : academies.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-[#DCE1E3] bg-[#F4F3EE] text-[10px] uppercase font-black tracking-wider text-[#8B969E]">
                      <th className="p-4">Academy / Slug</th>
                      <th className="p-4">Academy Code</th>
                      <th className="p-4">Location</th>
                      <th className="p-4">Owner Administrator</th>
                      <th className="p-4 text-center">Staff / Athletes</th>
                      <th className="p-4">Tenant Status</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#DCE1E3]">
                    {academies.map((a) => (
                      <tr key={a.id} className="hover:bg-[#F4F3EE]/50 transition-colors">
                        <td className="p-4">
                          <div className="font-bold text-[#101820] text-sm">{a.name}</div>
                          <div className="text-[11px] font-mono text-[#8B969E]">slug: {a.slug}</div>
                        </td>
                        <td className="p-4">
                          <code className="text-[#101820] font-mono text-[11px] bg-[#F4F3EE] px-2 py-0.5 rounded border border-[#DCE1E3]">
                            {a.academyCode || "PENDING"}
                          </code>
                        </td>
                        <td className="p-4 text-[#101820] font-medium">
                          {a.city || "Global"}, {a.country || "Worldwide"}
                        </td>
                        <td className="p-4">
                          <div className="font-semibold text-[#101820]">{a.ownerName}</div>
                          <div className="text-[11px] text-[#8B969E]">{a.ownerEmail}</div>
                        </td>
                        <td className="p-4 text-center">
                          <span className="font-bold text-[#101820]">{a.totalCoaches}</span> Coaches •{" "}
                          <span className="font-bold text-[#101820]">{a.totalPlayers}</span> Athletes
                        </td>
                        <td className="p-4">
                          <StatusBadge status={a.status} />
                          {a.status === "BLOCKED" && a.blockedReason && (
                            <div className="text-[10px] text-red-600 mt-1 truncate max-w-[150px]" title={a.blockedReason}>
                              {a.blockedReason}
                            </div>
                          )}
                        </td>
                        <td className="p-4 text-right space-x-1.5 whitespace-nowrap">
                          <Link
                            href={`/admin/academies/${a.id}`}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-white border border-[#DCE1E3] hover:bg-[#F4F3EE] rounded text-[11px] font-bold text-[#101820]"
                          >
                            <Eye className="h-3 w-3" />
                            Details
                          </Link>

                          {a.status === "BLOCKED" ? (
                            <button
                              onClick={() => {
                                setSelectedAcademy(a);
                                setActionType("UNBLOCK");
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 border border-emerald-300 hover:bg-emerald-100 rounded text-[11px] font-bold text-emerald-800"
                            >
                              <CheckCircle className="h-3 w-3" />
                              Unblock
                            </button>
                          ) : (
                            <button
                              onClick={() => {
                                setSelectedAcademy(a);
                                setActionType("BLOCK");
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1 bg-red-50 border border-red-300 hover:bg-red-100 rounded text-[11px] font-bold text-red-800"
                            >
                              <Ban className="h-3 w-3" />
                              Block
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-16 text-center text-xs text-[#8B969E]">
                No academies match the current search or filters.
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

        {/* Status Action Dialog Modal */}
        {selectedAcademy && actionType && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="bg-white rounded-lg max-w-md w-full border border-[#DCE1E3] shadow-xl overflow-hidden p-6 space-y-4">
              <div className="flex items-center gap-2">
                {actionType === "BLOCK" ? (
                  <Ban className="h-5 w-5 text-red-600" />
                ) : (
                  <CheckCircle className="h-5 w-5 text-emerald-600" />
                )}
                <h3 className="font-black uppercase text-sm text-[#101820]">
                  {actionType === "BLOCK" ? "Block Sports Academy Tenant" : "Unblock Sports Academy Tenant"}
                </h3>
              </div>

              <p className="text-xs text-[#8B969E]">
                {actionType === "BLOCK"
                  ? `Blocking '${selectedAcademy.name}' will suspend access for its owner and staff to restricted tenant services while preserving all historical data.`
                  : `Unblocking '${selectedAcademy.name}' will restore standard active operations for this sports academy.`}
              </p>

              <div>
                <label className="text-[11px] font-bold uppercase text-[#101820] block mb-1">
                  Reason for Action <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={actionReason}
                  onChange={(e) => setActionReason(e.target.value)}
                  placeholder="Enter specific administrative reason for audit logs..."
                  rows={3}
                  className="w-full text-xs p-2.5 border border-[#DCE1E3] rounded outline-none focus:border-[#101820]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedAcademy(null);
                    setActionType(null);
                    setActionReason("");
                  }}
                  disabled={actionLoading}
                  className="text-xs font-bold uppercase"
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleStatusAction}
                  disabled={actionLoading || actionReason.trim().length < 3}
                  className={
                    actionType === "BLOCK"
                      ? "bg-red-600 hover:bg-red-700 text-white text-xs font-bold uppercase"
                      : "bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold uppercase"
                  }
                >
                  {actionLoading ? "Processing..." : `Confirm ${actionType}`}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
