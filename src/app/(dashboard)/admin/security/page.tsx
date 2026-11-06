"use client";

import { useEffect, useState } from "react";
import { DashboardShell } from "@/components/shared/dashboard-shell";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/status-badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  ShieldAlert,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  ChevronLeft,
  ChevronRight,
  Lock,
} from "lucide-react";
import { toast } from "sonner";

interface AuditLogItem {
  id: string;
  action: string;
  resourceType: string;
  resourceId: string;
  reason: string;
  status: string;
  details: any;
  actor?: { name: string; email: string; role: string };
  actorRole?: string;
  createdAt: string;
}

export default function SecurityAuditPage() {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [resourceType, setResourceType] = useState("ALL");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  async function loadLogs() {
    try {
      setLoading(true);
      const query = new URLSearchParams({
        search,
        resourceType,
        page: page.toString(),
        limit: "25",
      });

      const res = await fetch(`/api/admin/audit-logs?${query.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data.items || []);
        setTotalPages(data.pagination?.totalPages || 1);
        setTotalCount(data.pagination?.total || 0);
      } else {
        toast.error("Failed to load audit logs");
      }
    } catch (e) {
      console.error(e);
      toast.error("Error loading logs");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadLogs();
  }, [resourceType, page]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadLogs();
  };

  return (
    <DashboardShell allowedRoles={["PLATFORM_ADMIN", "SUPER_ADMIN"]}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#DCE1E3] pb-6">
          <div>
            <div className="inline-flex items-center gap-2 px-2 py-0.5 rounded bg-[#C6F432]/30 border border-[#C6F432] text-[#101820] text-[10px] font-black uppercase tracking-widest mb-2">
              <ShieldAlert className="h-3 w-3" />
              Platform Integrity
            </div>
            <h1 className="text-2xl font-black uppercase text-[#101820]">
              Security & Immutable Audit Trail
            </h1>
            <p className="text-xs text-[#8B969E] uppercase tracking-wider mt-1 font-semibold">
              Live Governance & Administrative Action Records ({totalCount} Audit Logs)
            </p>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white p-4 rounded-lg border border-[#DCE1E3]">
          <form onSubmit={handleSearchSubmit} className="flex-1 flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#8B969E]" />
              <Input
                placeholder="Search audit action, target ID, reason..."
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
              value={resourceType}
              onChange={(e) => {
                setResourceType(e.target.value);
                setPage(1);
              }}
              className="h-9 px-3 text-xs font-semibold bg-[#F4F3EE]/60 border border-[#DCE1E3] rounded text-[#101820] outline-none"
            >
              <option value="ALL">All Resource Types</option>
              <option value="ACADEMY">Academy</option>
              <option value="USER">User</option>
              <option value="SUPER_ADMIN">Super Admin</option>
              <option value="COMPLAINT">Complaint</option>
              <option value="PLATFORM_CONFIG">Platform Config</option>
              <option value="ANNOUNCEMENT">Announcement</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <Card className="border-[#DCE1E3] bg-white shadow-sm overflow-hidden">
          <CardContent className="p-0">
            {loading ? (
              <div className="py-16 text-center text-xs text-[#8B969E]">Loading immutable audit trail...</div>
            ) : logs.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-[#DCE1E3] bg-[#F4F3EE] text-[10px] uppercase font-black tracking-wider text-[#8B969E]">
                      <th className="p-4">Action Event</th>
                      <th className="p-4">Target Resource</th>
                      <th className="p-4">Administrative Actor</th>
                      <th className="p-4">Reason / Notes</th>
                      <th className="p-4">Execution Status</th>
                      <th className="p-4">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#DCE1E3]">
                    {logs.map((log) => (
                      <tr key={log.id} className="hover:bg-[#F4F3EE]/50 transition-colors">
                        <td className="p-4">
                          <div className="font-bold text-[#101820]">{log.action.replace(/_/g, " ")}</div>
                        </td>
                        <td className="p-4">
                          <code className="text-[#101820] font-mono text-[11px] bg-[#F4F3EE] px-2 py-0.5 rounded border border-[#DCE1E3]">
                            {log.resourceType} {log.resourceId && `(${log.resourceId.slice(-6)})`}
                          </code>
                        </td>
                        <td className="p-4">
                          <div className="font-semibold text-[#101820]">{log.actor?.name || "System Administrator"}</div>
                          <div className="text-[10px] text-[#8B969E]">{log.actorRole || log.actor?.role}</div>
                        </td>
                        <td className="p-4 text-[#8B969E] max-w-xs truncate" title={log.reason}>
                          {log.reason || "—"}
                        </td>
                        <td className="p-4">
                          {log.status === "SUCCESS" ? (
                            <span className="inline-flex items-center gap-1 text-emerald-700 font-bold text-[10px] uppercase">
                              <CheckCircle2 className="h-3 w-3" /> Success
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-red-700 font-bold text-[10px] uppercase">
                              <XCircle className="h-3 w-3" /> Failure
                            </span>
                          )}
                        </td>
                        <td className="p-4 text-[#8B969E] whitespace-nowrap">
                          {new Date(log.createdAt).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-16 text-center text-xs text-[#8B969E]">
                No audit log records found.
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
