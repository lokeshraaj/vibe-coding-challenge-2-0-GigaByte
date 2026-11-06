"use client";

import { useEffect, useState } from "react";
import { DashboardShell } from "@/components/shared/dashboard-shell";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Bell,
  Plus,
  Send,
  Radio,
  CheckCircle2,
  AlertTriangle,
  Info,
} from "lucide-react";
import { toast } from "sonner";

interface AnnouncementItem {
  id: string;
  title: string;
  content: string;
  category: string;
  priority: string;
  targetAudience: string;
  active: boolean;
  creator?: { name: string; role: string };
  createdAt: string;
}

export default function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([]);
  const [loading, setLoading] = useState(true);

  // New Announcement Modal
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState<"GENERAL" | "MAINTENANCE" | "FEATURE" | "ALERT">("GENERAL");
  const [priority, setPriority] = useState<"LOW" | "NORMAL" | "HIGH" | "URGENT">("NORMAL");
  const [targetAudience, setTargetAudience] = useState<"ALL" | "ACADEMY_OWNERS" | "COACHES" | "PLAYERS" | "SCOUTS">("ALL");
  const [submitting, setSubmitting] = useState(false);

  async function loadAnnouncements() {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/announcements");
      if (res.ok) {
        const data = await res.json();
        setAnnouncements(data.announcements || []);
      }
    } catch (e) {
      console.error(e);
      toast.error("Failed to load announcements");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAnnouncements();
  }, []);

  const handleCreateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      toast.error("Please enter both title and content");
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch("/api/admin/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          content: content.trim(),
          category,
          priority,
          targetAudience,
        }),
      });

      if (!res.ok) throw new Error("Failed to broadcast announcement");

      toast.success("Platform announcement broadcasted successfully");
      setCreateModalOpen(false);
      setTitle("");
      setContent("");
      loadAnnouncements();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Broadcast failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DashboardShell allowedRoles={["PLATFORM_ADMIN", "SUPER_ADMIN"]}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#DCE1E3] pb-6">
          <div>
            <div className="inline-flex items-center gap-2 px-2 py-0.5 rounded bg-[#C6F432]/30 border border-[#C6F432] text-[#101820] text-[10px] font-black uppercase tracking-widest mb-2">
              <Bell className="h-3 w-3" />
              Platform Broadcast
            </div>
            <h1 className="text-2xl font-black uppercase text-[#101820]">
              Announcements & Communications
            </h1>
            <p className="text-xs text-[#8B969E] uppercase tracking-wider mt-1 font-semibold">
              Broadcast Messages to Academies, Coaches, and Athletes
            </p>
          </div>

          <Button
            onClick={() => setCreateModalOpen(true)}
            className="bg-[#101820] text-white hover:bg-black text-xs font-bold uppercase inline-flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            New Announcement
          </Button>
        </div>

        {/* Announcements List */}
        {loading ? (
          <div className="py-16 text-center text-xs text-[#8B969E]">Loading broadcasts...</div>
        ) : announcements.length > 0 ? (
          <div className="space-y-4">
            {announcements.map((a) => (
              <Card key={a.id} className="border-[#DCE1E3] bg-white p-5 shadow-sm space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <span
                      className={
                        a.priority === "URGENT" || a.priority === "HIGH"
                          ? "px-2 py-0.5 rounded font-bold text-[10px] uppercase bg-red-100 text-red-800"
                          : "px-2 py-0.5 rounded font-bold text-[10px] uppercase bg-[#F4F3EE] text-[#101820]"
                      }
                    >
                      {a.priority}
                    </span>
                    <span className="font-mono text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200">
                      {a.category}
                    </span>
                    <h3 className="text-sm font-bold text-[#101820]">{a.title}</h3>
                  </div>

                  <div className="text-[11px] text-[#8B969E] shrink-0">
                    Target: <b className="text-[#101820]">{a.targetAudience}</b> • {new Date(a.createdAt).toLocaleString()}
                  </div>
                </div>

                <p className="text-xs text-[#202A32] leading-relaxed whitespace-pre-wrap">{a.content}</p>

                <div className="text-[10px] text-[#8B969E] pt-2 border-t border-[#DCE1E3]">
                  Author: <span className="font-semibold text-[#101820]">{a.creator?.name || "System Administrator"}</span>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <div className="py-20 text-center text-xs text-[#8B969E] bg-white rounded-lg border border-[#DCE1E3]">
            No platform announcements broadcasted yet. Click "New Announcement" to publish one.
          </div>
        )}

        {/* Create Announcement Modal */}
        {createModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="bg-white rounded-lg max-w-lg w-full border border-[#DCE1E3] p-6 space-y-4 shadow-xl">
              <div className="flex items-center justify-between border-b border-[#DCE1E3] pb-3">
                <h3 className="font-black uppercase text-sm text-[#101820] flex items-center gap-2">
                  <Radio className="h-4 w-4 text-[#101820]" />
                  Broadcast Platform Announcement
                </h3>
                <button
                  onClick={() => setCreateModalOpen(false)}
                  className="text-xs text-[#8B969E] hover:text-[#101820] font-bold"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreateAnnouncement} className="space-y-4 text-xs">
                <div>
                  <label className="text-[11px] font-bold uppercase text-[#101820] block mb-1">
                    Announcement Title <span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Scheduled Maintenance Notice / New Feature Alert"
                    className="h-9 text-xs"
                    required
                  />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-[10px] font-bold uppercase text-[#101820] block mb-1">
                      Category
                    </label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value as any)}
                      className="w-full h-8 px-2 text-xs font-semibold bg-white border border-[#DCE1E3] rounded outline-none"
                    >
                      <option value="GENERAL">General</option>
                      <option value="MAINTENANCE">Maintenance</option>
                      <option value="FEATURE">Feature</option>
                      <option value="ALERT">Alert</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold uppercase text-[#101820] block mb-1">
                      Priority
                    </label>
                    <select
                      value={priority}
                      onChange={(e) => setPriority(e.target.value as any)}
                      className="w-full h-8 px-2 text-xs font-semibold bg-white border border-[#DCE1E3] rounded outline-none"
                    >
                      <option value="LOW">Low</option>
                      <option value="NORMAL">Normal</option>
                      <option value="HIGH">High</option>
                      <option value="URGENT">Urgent</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold uppercase text-[#101820] block mb-1">
                      Audience
                    </label>
                    <select
                      value={targetAudience}
                      onChange={(e) => setTargetAudience(e.target.value as any)}
                      className="w-full h-8 px-2 text-xs font-semibold bg-white border border-[#DCE1E3] rounded outline-none"
                    >
                      <option value="ALL">All Users</option>
                      <option value="ACADEMY_OWNERS">Academy Owners</option>
                      <option value="COACHES">Coaches</option>
                      <option value="PLAYERS">Athletes</option>
                      <option value="SCOUTS">Scouts</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold uppercase text-[#101820] block mb-1">
                    Announcement Body <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Type the announcement details and instructions..."
                    rows={4}
                    className="w-full text-xs p-2.5 border border-[#DCE1E3] rounded outline-none"
                    required
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-[#DCE1E3]">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setCreateModalOpen(false)}
                    disabled={submitting}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={submitting || !title.trim() || !content.trim()}
                    className="bg-[#101820] text-white hover:bg-black font-bold uppercase text-xs"
                  >
                    {submitting ? "Broadcasting..." : "Broadcast Announcement"}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
