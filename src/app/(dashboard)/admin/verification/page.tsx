"use client";

import { useEffect, useState } from "react";
import { DashboardShell } from "@/components/shared/dashboard-shell";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import {
  UserCheck,
  Filter,
  CheckCircle2,
  Clock,
  Shield,
  Building2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";

interface VerificationItem {
  id: string;
  type: "COACH" | "PLAYER";
  code: string;
  name: string;
  email: string;
  sport: string;
  accountStatus: string;
  academyName: string;
  academyCode: string;
  createdAt: string;
  activatedAt?: string | null;
}

export default function VerificationQueuePage() {
  const [items, setItems] = useState<VerificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"ALL" | "PENDING" | "ACTIVE">("PENDING");
  const [userType, setUserType] = useState<"ALL" | "COACH" | "PLAYER">("ALL");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  async function loadQueue() {
    try {
      setLoading(true);
      const query = new URLSearchParams({
        filter,
        userType,
        page: page.toString(),
        limit: "20",
      });

      const res = await fetch(`/api/admin/verification?${query.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setItems(data.items || []);
        setTotalPages(data.pagination?.totalPages || 1);
        setTotalCount(data.pagination?.total || 0);
      } else {
        toast.error("Failed to load verification queue");
      }
    } catch (e) {
      console.error(e);
      toast.error("Network error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadQueue();
  }, [filter, userType, page]);

  return (
    <DashboardShell allowedRoles={["PLATFORM_ADMIN", "SUPER_ADMIN"]}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#DCE1E3] pb-6">
          <div>
            <div className="inline-flex items-center gap-2 px-2 py-0.5 rounded bg-[#C6F432]/30 border border-[#C6F432] text-[#101820] text-[10px] font-black uppercase tracking-widest mb-2">
              <UserCheck className="h-3 w-3" />
              Identity Verification
            </div>
            <h1 className="text-2xl font-black uppercase text-[#101820]">
              Coach & Player Verification Queue
            </h1>
            <p className="text-xs text-[#8B969E] uppercase tracking-wider mt-1 font-semibold">
              Assigned ID Tracking & Registration Audits ({totalCount} Records)
            </p>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="flex items-center gap-3 bg-white p-4 rounded-lg border border-[#DCE1E3]">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-[#8B969E]" />
            <span className="text-xs font-bold uppercase text-[#101820]">Filters:</span>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={filter}
              onChange={(e) => {
                setFilter(e.target.value as any);
                setPage(1);
              }}
              className="h-8 px-3 text-xs font-semibold bg-[#F4F3EE]/60 border border-[#DCE1E3] rounded text-[#101820] outline-none"
            >
              <option value="ALL">All Statuses</option>
              <option value="PENDING">Pending Activation</option>
              <option value="ACTIVE">Verified & Active</option>
            </select>

            <select
              value={userType}
              onChange={(e) => {
                setUserType(e.target.value as any);
                setPage(1);
              }}
              className="h-8 px-3 text-xs font-semibold bg-[#F4F3EE]/60 border border-[#DCE1E3] rounded text-[#101820] outline-none"
            >
              <option value="ALL">All User Types</option>
              <option value="COACH">Coaches Only</option>
              <option value="PLAYER">Athletes Only</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <Card className="border-[#DCE1E3] bg-white shadow-sm overflow-hidden">
          <CardContent className="p-0">
            {loading ? (
              <div className="py-16 text-center text-xs text-[#8B969E]">Loading verification queue...</div>
            ) : items.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-[#DCE1E3] bg-[#F4F3EE] text-[10px] uppercase font-black tracking-wider text-[#8B969E]">
                      <th className="p-4">Assigned ID</th>
                      <th className="p-4">Entity Type</th>
                      <th className="p-4">Name / Contact</th>
                      <th className="p-4">Sport</th>
                      <th className="p-4">Tenant Academy</th>
                      <th className="p-4">Status</th>
                      <th className="p-4">Registered Date</th>
                      <th className="p-4">Activated Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#DCE1E3]">
                    {items.map((item) => (
                      <tr key={item.id} className="hover:bg-[#F4F3EE]/50 transition-colors">
                        <td className="p-4">
                          <code className="text-[#101820] font-mono font-bold text-xs bg-[#F4F3EE] px-2 py-0.5 rounded border border-[#DCE1E3]">
                            {item.code}
                          </code>
                        </td>
                        <td className="p-4">
                          <span
                            className={
                              item.type === "COACH"
                                ? "text-indigo-800 bg-indigo-50 px-2 py-0.5 rounded font-bold text-[10px] uppercase"
                                : "text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded font-bold text-[10px] uppercase"
                            }
                          >
                            {item.type}
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="font-bold text-[#101820]">{item.name}</div>
                          {item.email && <div className="text-[11px] text-[#8B969E]">{item.email}</div>}
                        </td>
                        <td className="p-4 font-semibold text-[#101820]">{item.sport}</td>
                        <td className="p-4">
                          <div className="font-semibold text-[#101820]">{item.academyName}</div>
                          <div className="text-[10px] font-mono text-[#8B969E]">Code: {item.academyCode}</div>
                        </td>
                        <td className="p-4">
                          <StatusBadge status={item.accountStatus} />
                        </td>
                        <td className="p-4 text-[#8B969E]">
                          {new Date(item.createdAt).toLocaleDateString()}
                        </td>
                        <td className="p-4 text-[#8B969E]">
                          {item.activatedAt ? (
                            <span className="text-emerald-700 font-medium">
                              {new Date(item.activatedAt).toLocaleString()}
                            </span>
                          ) : (
                            <span className="text-[#8B969E] italic">Pending Onboarding</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-16 text-center text-xs text-[#8B969E]">
                No verification records found matching current filters.
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
      </div>
    </DashboardShell>
  );
}
