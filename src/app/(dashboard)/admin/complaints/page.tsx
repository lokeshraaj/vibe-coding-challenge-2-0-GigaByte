"use client";

import { useEffect, useState } from "react";
import { DashboardShell } from "@/components/shared/dashboard-shell";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import {
  AlertTriangle,
  Filter,
  CheckCircle,
  Eye,
  FileText,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
} from "lucide-react";
import { toast } from "sonner";

interface ComplaintItem {
  id: string;
  subject: string;
  category: string;
  targetType: string;
  targetId: string;
  targetName?: string;
  description: string;
  status: string;
  internalNotes?: string;
  resolutionNotes?: string;
  reporter?: { name: string; email: string; role: string };
  academy?: { name: string; slug: string };
  createdAt: string;
}

export default function ComplaintsManagementPage() {
  const [complaints, setComplaints] = useState<ComplaintItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Moderation Dialog State
  const [selectedComplaint, setSelectedComplaint] = useState<ComplaintItem | null>(null);
  const [modStatus, setModStatus] = useState<string>("UNDER_REVIEW");
  const [modInternalNotes, setModInternalNotes] = useState("");
  const [modResolutionNotes, setModResolutionNotes] = useState("");
  const [modLoading, setModLoading] = useState(false);

  async function loadComplaints() {
    try {
      setLoading(true);
      const query = new URLSearchParams({
        status: statusFilter,
        category: categoryFilter,
        page: page.toString(),
        limit: "15",
      });

      const res = await fetch(`/api/admin/complaints?${query.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setComplaints(data.items || []);
        setTotalPages(data.pagination?.totalPages || 1);
        setTotalCount(data.pagination?.total || 0);
      } else {
        toast.error("Failed to load reports");
      }
    } catch (e) {
      console.error(e);
      toast.error("Error loading complaints");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadComplaints();
  }, [statusFilter, categoryFilter, page]);

  const handleOpenModeration = (c: ComplaintItem) => {
    setSelectedComplaint(c);
    setModStatus(c.status);
    setModInternalNotes(c.internalNotes || "");
    setModResolutionNotes(c.resolutionNotes || "");
  };

  const handleUpdateComplaint = async () => {
    if (!selectedComplaint) return;

    try {
      setModLoading(true);
      const res = await fetch(`/api/admin/complaints/${selectedComplaint.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: modStatus,
          internalNotes: modInternalNotes.trim(),
          resolutionNotes: modResolutionNotes.trim(),
        }),
      });

      if (!res.ok) throw new Error("Failed to update complaint");

      toast.success("Complaint report status updated successfully");
      setSelectedComplaint(null);
      loadComplaints();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Moderation update failed");
    } finally {
      setModLoading(false);
    }
  };

  return (
    <DashboardShell allowedRoles={["PLATFORM_ADMIN", "SUPER_ADMIN"]}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#DCE1E3] pb-6">
          <div>
            <div className="inline-flex items-center gap-2 px-2 py-0.5 rounded bg-[#C6F432]/30 border border-[#C6F432] text-[#101820] text-[10px] font-black uppercase tracking-widest mb-2">
              <AlertTriangle className="h-3 w-3" />
              Platform Moderation
            </div>
            <h1 className="text-2xl font-black uppercase text-[#101820]">
              Reports & Complaints Center
            </h1>
            <p className="text-xs text-[#8B969E] uppercase tracking-wider mt-1 font-semibold">
              Dispute Resolution & Conduct Investigations ({totalCount} Total Reports)
            </p>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="flex items-center gap-3 bg-white p-4 rounded-lg border border-[#DCE1E3]">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-[#8B969E]" />
            <span className="text-xs font-bold uppercase text-[#101820]">Filter By:</span>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="h-8 px-3 text-xs font-semibold bg-[#F4F3EE]/60 border border-[#DCE1E3] rounded text-[#101820] outline-none"
            >
              <option value="ALL">All Statuses</option>
              <option value="OPEN">Open</option>
              <option value="UNDER_REVIEW">Under Review</option>
              <option value="ACTION_REQUIRED">Action Required</option>
              <option value="RESOLVED">Resolved</option>
              <option value="REJECTED">Rejected</option>
            </select>

            <select
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setPage(1);
              }}
              className="h-8 px-3 text-xs font-semibold bg-[#F4F3EE]/60 border border-[#DCE1E3] rounded text-[#101820] outline-none"
            >
              <option value="ALL">All Categories</option>
              <option value="CONDUCT">Conduct</option>
              <option value="ATTENDANCE_FRAUD">Attendance Fraud</option>
              <option value="MATCH_DISPUTE">Match Dispute</option>
              <option value="SAFETY">Safety</option>
              <option value="OTHER">Other</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <Card className="border-[#DCE1E3] bg-white shadow-sm overflow-hidden">
          <CardContent className="p-0">
            {loading ? (
              <div className="py-16 text-center text-xs text-[#8B969E]">Loading reports...</div>
            ) : complaints.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-[#DCE1E3] bg-[#F4F3EE] text-[10px] uppercase font-black tracking-wider text-[#8B969E]">
                      <th className="p-4">Report Subject</th>
                      <th className="p-4">Category</th>
                      <th className="p-4">Target Entity</th>
                      <th className="p-4">Reporter</th>
                      <th className="p-4">Tenant Academy</th>
                      <th className="p-4">Status</th>
                      <th className="p-4">Submitted Date</th>
                      <th className="p-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#DCE1E3]">
                    {complaints.map((c) => (
                      <tr key={c.id} className="hover:bg-[#F4F3EE]/50 transition-colors">
                        <td className="p-4">
                          <div className="font-bold text-[#101820] text-sm">{c.subject}</div>
                          <div className="text-[11px] text-[#8B969E] line-clamp-1">{c.description}</div>
                        </td>
                        <td className="p-4">
                          <span className="font-mono text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-[#F4F3EE] border border-[#DCE1E3] text-[#101820]">
                            {c.category.replace("_", " ")}
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="font-semibold text-[#101820]">{c.targetName || c.targetType}</div>
                          <div className="text-[10px] text-[#8B969E]">Type: {c.targetType}</div>
                        </td>
                        <td className="p-4">
                          <div className="font-semibold text-[#101820]">{c.reporter?.name || "Anonymous"}</div>
                          <div className="text-[10px] text-[#8B969E]">{c.reporter?.role}</div>
                        </td>
                        <td className="p-4">
                          {c.academy ? (
                            <span className="font-semibold text-[#101820]">{c.academy.name}</span>
                          ) : (
                            <span className="text-[#8B969E] italic">Cross-Platform</span>
                          )}
                        </td>
                        <td className="p-4">
                          <StatusBadge status={c.status} />
                        </td>
                        <td className="p-4 text-[#8B969E]">
                          {new Date(c.createdAt).toLocaleDateString()}
                        </td>
                        <td className="p-4 text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenModeration(c)}
                            className="h-7 px-2.5 text-[11px] font-bold uppercase"
                          >
                            <Eye className="h-3 w-3 mr-1" /> Inspect
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-16 text-center text-xs text-[#8B969E]">
                No reports or complaints found matching the criteria.
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

        {/* Moderation & Review Modal */}
        {selectedComplaint && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="bg-white rounded-lg max-w-lg w-full border border-[#DCE1E3] p-6 space-y-4 shadow-xl">
              <div className="flex items-center justify-between border-b border-[#DCE1E3] pb-3">
                <h3 className="font-black uppercase text-sm text-[#101820] flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4 text-amber-600" />
                  Investigation & Moderation Dossier
                </h3>
                <button
                  onClick={() => setSelectedComplaint(null)}
                  className="text-xs text-[#8B969E] hover:text-[#101820] font-bold"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <div className="text-[10px] font-bold uppercase text-[#8B969E]">Subject</div>
                  <div className="font-bold text-sm text-[#101820]">{selectedComplaint.subject}</div>
                </div>

                <div className="p-3 bg-[#F4F3EE] rounded border border-[#DCE1E3]">
                  <div className="text-[10px] font-bold uppercase text-[#8B969E] mb-1">Incident Report Description</div>
                  <p className="text-[#101820] leading-relaxed whitespace-pre-wrap">{selectedComplaint.description}</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold uppercase text-[#101820] block mb-1">
                      Moderation Status
                    </label>
                    <select
                      value={modStatus}
                      onChange={(e) => setModStatus(e.target.value)}
                      className="w-full h-8 px-2 text-xs font-semibold bg-white border border-[#DCE1E3] rounded outline-none"
                    >
                      <option value="OPEN">OPEN</option>
                      <option value="UNDER_REVIEW">UNDER REVIEW</option>
                      <option value="ACTION_REQUIRED">ACTION REQUIRED</option>
                      <option value="RESOLVED">RESOLVED</option>
                      <option value="REJECTED">REJECTED</option>
                    </select>
                  </div>

                  <div>
                    <div className="text-[10px] font-bold uppercase text-[#8B969E] mb-1">Target Entity</div>
                    <div className="font-semibold text-[#101820]">{selectedComplaint.targetType}: {selectedComplaint.targetName || selectedComplaint.targetId}</div>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase text-[#101820] block mb-1">
                    Internal Investigation Notes (Private to Admins)
                  </label>
                  <textarea
                    value={modInternalNotes}
                    onChange={(e) => setModInternalNotes(e.target.value)}
                    placeholder="Add private investigation findings..."
                    rows={2}
                    className="w-full text-xs p-2 border border-[#DCE1E3] rounded outline-none"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase text-[#101820] block mb-1">
                    Resolution Findings / Action Taken
                  </label>
                  <textarea
                    value={modResolutionNotes}
                    onChange={(e) => setModResolutionNotes(e.target.value)}
                    placeholder="Enter formal resolution or reason for rejection..."
                    rows={2}
                    className="w-full text-xs p-2 border border-[#DCE1E3] rounded outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#DCE1E3]">
                <Button variant="outline" size="sm" onClick={() => setSelectedComplaint(null)}>
                  Cancel
                </Button>
                <Button size="sm" onClick={handleUpdateComplaint} disabled={modLoading}>
                  {modLoading ? "Saving..." : "Update Complaint Status"}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
