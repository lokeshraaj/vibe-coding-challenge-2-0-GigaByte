"use client";

import { useEffect, useState } from "react";
import { DashboardShell } from "@/components/shared/dashboard-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/status-badge";
import { FeatureLockInfo } from "@/components/ui/feature-lock-info";
import {
  CalendarCheck,
  Plus,
  X,
  CheckCircle2,
  XCircle,
  Lock,
  Shield,
} from "lucide-react";
import { toast } from "sonner";

interface SessionSummary {
  id: string;
  sport: string;
  date: string;
  title: string;
  status: "OPEN" | "CLOSED";
  closedAt: string | null;
  presentCount: number;
  absentCount: number;
  totalMarked: number;
}

interface RosterPlayerAttendance {
  playerId: string;
  playerCode: string;
  name: string;
  position: string;
  status: "PRESENT" | "ABSENT" | null;
  notes?: string;
}

export default function CoachSessionsPage() {
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [assignedSport, setAssignedSport] = useState<string>("");

  // New session modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newSessionForm, setNewSessionForm] = useState({
    date: new Date().toISOString().split("T")[0],
    sport: "Cricket",
    title: "",
  });

  // Active attendance session
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [activeSessionDetails, setActiveSessionDetails] = useState<any | null>(null);
  const [attendanceRecords, setAttendanceRecords] = useState<Map<string, "PRESENT" | "ABSENT">>(
    new Map()
  );
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [savingAttendance, setSavingAttendance] = useState(false);
  const [closingSession, setClosingSession] = useState(false);

  const fetchSessions = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/sessions");
      if (res.ok) {
        const data = await res.json();
        setSessions(data.sessions || []);
      }
    } catch (e) {
      console.error(e);
      toast.error("Failed to load sessions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
    async function fetchMe() {
      try {
        const res = await fetch("/api/auth/me");
        if (res.ok) {
          const data = await res.json();
          if (data.user?.sport) {
            setAssignedSport(data.user.sport);
            setNewSessionForm((prev) => ({ ...prev, sport: data.user.sport }));
          }
        }
      } catch (err) {
        console.error(err);
      }
    }
    fetchMe();
  }, []);

  const handleOpenSessionSheet = async (sessionId: string) => {
    setActiveSessionId(sessionId);
    setLoadingDetails(true);
    try {
      const res = await fetch(`/api/sessions/${sessionId}`);
      if (res.ok) {
        const data = await res.json();
        setActiveSessionDetails(data);

        // Populate map
        const map = new Map<string, "PRESENT" | "ABSENT">();
        data.roster.forEach((r: RosterPlayerAttendance) => {
          if (r.status) {
            map.set(r.playerId, r.status);
          }
        });
        setAttendanceRecords(map);
      }
    } catch (e) {
      toast.error("Failed to load session details");
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...newSessionForm,
          sport: assignedSport || newSessionForm.sport,
          coachId: "self",
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create practice session");

      toast.success("Practice session scheduled successfully!");
      setIsCreateOpen(false);
      setNewSessionForm({
        date: new Date().toISOString().split("T")[0],
        sport: assignedSport || "Cricket",
        title: "",
      });
      fetchSessions();
      handleOpenSessionSheet(data.session.id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error creating session");
    } finally {
      setCreating(false);
    }
  };

  const handleToggleAttendance = (playerId: string, status: "PRESENT" | "ABSENT") => {
    if (activeSessionDetails?.session.status === "CLOSED") {
      toast.error("Violation: Cannot modify attendance of a CLOSED and locked session.");
      return;
    }

    const next = new Map(attendanceRecords);
    next.set(playerId, status);
    setAttendanceRecords(next);
  };

  const handleMarkAll = (status: "PRESENT" | "ABSENT") => {
    if (activeSessionDetails?.session.status === "CLOSED") return;
    const next = new Map(attendanceRecords);
    activeSessionDetails?.roster.forEach((r: RosterPlayerAttendance) => {
      next.set(r.playerId, status);
    });
    setAttendanceRecords(next);
  };

  const handleSaveAttendance = async () => {
    if (!activeSessionId) return;
    setSavingAttendance(true);
    try {
      const records = Array.from(attendanceRecords.entries()).map(([playerId, status]) => ({
        playerId,
        status,
      }));

      const res = await fetch(`/api/sessions/${activeSessionId}/attendance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ records }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to record attendance");

      toast.success("Attendance saved successfully!");
      fetchSessions();
      handleOpenSessionSheet(activeSessionId);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error saving attendance");
    } finally {
      setSavingAttendance(false);
    }
  };

  const handleCloseSession = async () => {
    if (!activeSessionId) return;

    // Check if every roster member has a status
    const totalRoster = activeSessionDetails?.roster?.length || 0;
    if (attendanceRecords.size < totalRoster) {
      const unassignedCount = totalRoster - attendanceRecords.size;
      const proceed = confirm(
        `Warning: ${unassignedCount} athlete(s) have not been marked PRESENT or ABSENT.\n\nOnce LOCKED, attendance is strictly IMMUTABLE and cannot be altered.\n\nDo you want to proceed with closing?`
      );
      if (!proceed) return;
    } else {
      const proceed = confirm(
        "CRITICAL IMMUTABILITY WARNING:\n\nClosing this session permanently locks attendance records and calculates match-eligibility. You will NOT be able to modify attendance after this.\n\nLock and close now?"
      );
      if (!proceed) return;
    }

    setClosingSession(true);
    try {
      // First save current draft
      const records = Array.from(attendanceRecords.entries()).map(([playerId, status]) => ({
        playerId,
        status,
      }));
      await fetch(`/api/sessions/${activeSessionId}/attendance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ records }),
      });

      // Now close
      const res = await fetch(`/api/sessions/${activeSessionId}/close`, {
        method: "POST",
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to close session");

      toast.success("Practice session successfully LOCKED & CLOSED!");
      fetchSessions();
      handleOpenSessionSheet(activeSessionId);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error closing session");
    } finally {
      setClosingSession(false);
    }
  };

  const isClosed = activeSessionDetails?.session.status === "CLOSED";

  return (
    <DashboardShell allowedRoles={["COACH"]}>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap">
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold tracking-tight uppercase text-[#101820]">
                Practice Sessions & Attendance
              </h1>
              {assignedSport && (
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-[#C6F432] text-[#101820] border border-[#101820] uppercase tracking-wider">
                    <Shield className="h-3.5 w-3.5" />
                    {assignedSport}
                  </span>
                  <FeatureLockInfo
                    category="SPORT"
                    title="Sport Discipline Locked"
                    reason={`Your coaching account is locked to ${assignedSport}. Sessions and rosters reflect this sport.`}
                    whoCanChange="Academy Administrator or Super Admin"
                    suggestedAction="Contact your administrator if your coaching discipline needs reassignment."
                    size="xs"
                  />
                </div>
              )}
            </div>
            <p className="text-xs text-[#8B969E] uppercase tracking-wider mt-1 font-semibold">
              Log Rosters & Enforce Attendance Immutability • {assignedSport || "Assigned"} Sessions Only
            </p>
          </div>

          <Button
            variant="athletic"
            size="sm"
            onClick={() => setIsCreateOpen(true)}
            className="gap-2 font-bold shadow-sm"
          >
            <Plus className="h-4 w-4" />
            <span>Open Practice Session</span>
          </Button>
        </div>

        {/* Two-Column Layout: Session List & Attendance Sheet */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Sessions List */}
          <div className="lg:col-span-5 space-y-4">
            <Card className="border-[#DCE1E3] bg-white shadow-sm">
              <CardHeader className="pb-3 border-b border-[#DCE1E3]">
                <CardTitle className="text-sm uppercase flex items-center justify-between text-[#101820]">
                  <span>Sessions History</span>
                  <span className="text-[#101820] font-bold">{sessions.length}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 space-y-2">
                {loading ? (
                  <div className="py-8 text-center text-xs text-[#8B969E]">Loading...</div>
                ) : sessions.length > 0 ? (
                  sessions.map((s) => {
                    const isSelected = activeSessionId === s.id;
                    return (
                      <button
                        key={s.id}
                        onClick={() => handleOpenSessionSheet(s.id)}
                        className={`w-full text-left p-3.5 rounded-lg border transition-all ${
                          isSelected
                            ? "bg-[#F4F3EE] border-[#101820] shadow-xs"
                            : "bg-white border-[#DCE1E3] hover:border-[#101820]/40"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-sm text-[#101820]">{s.title || "Practice Session"}</span>
                          <StatusBadge status={s.status} type="session" />
                        </div>
                        <div className="flex items-center justify-between text-xs text-[#8B969E] mt-1">
                          <span>
                            {new Date(s.date).toLocaleDateString()} • {s.sport}
                          </span>
                          <span className="font-semibold text-[#101820]">
                            {s.presentCount} Present / {s.totalMarked} Marked
                          </span>
                        </div>
                      </button>
                    );
                  })
                ) : (
                  <div className="py-8 text-center text-xs text-[#8B969E] space-y-3">
                    <p>No practice sessions scheduled yet.</p>
                    <Button variant="athletic" size="sm" onClick={() => setIsCreateOpen(true)}>
                      Open Session
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Attendance Roster Sheet */}
          <div className="lg:col-span-7">
            {loadingDetails ? (
              <Card className="p-12 text-center text-xs text-[#8B969E] border-[#DCE1E3] bg-white shadow-sm">
                Loading session roster...
              </Card>
            ) : activeSessionDetails ? (
              <Card className="border-[#DCE1E3] bg-white shadow-sm">
                <CardHeader className="pb-4 border-b border-[#DCE1E3]">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-lg font-bold uppercase text-[#101820]">
                          {activeSessionDetails.session.title || "Practice Session"}
                        </h2>
                        <StatusBadge status={activeSessionDetails.session.status} type="session" />
                      </div>
                      <p className="text-xs text-[#8B969E] mt-0.5 font-medium">
                        {new Date(activeSessionDetails.session.date).toLocaleDateString()} •{" "}
                        {activeSessionDetails.session.sport} Discipline
                      </p>
                    </div>

                    {isClosed ? (
                      <div className="flex items-center gap-1.5">
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#F4F3EE] text-xs font-bold text-[#101820] border border-[#DCE1E3]">
                          <Lock className="h-3.5 w-3.5 text-[#101820]" />
                          <span>Attendance Locked</span>
                        </div>
                        <FeatureLockInfo
                          category="LOCKED"
                          title="Attendance Records Immutable"
                          reason="This session is closed. In accordance with competition audit integrity, roster attendance cannot be altered once locked."
                          whoCanChange="Immutable System Audit Rule"
                          suggestedAction="Create a new practice session for subsequent training days."
                          size="xs"
                        />
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleMarkAll("PRESENT")}
                          className="text-xs h-8 border-[#DCE1E3] bg-white text-[#101820]"
                        >
                          All Present
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleMarkAll("ABSENT")}
                          className="text-xs h-8 border-[#DCE1E3] bg-white text-[#101820]"
                        >
                          All Absent
                        </Button>
                      </div>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="p-0">
                  {/* Attendance Roster Table */}
                  <div className="divide-y divide-[#DCE1E3]">
                    {activeSessionDetails.roster.map((player: RosterPlayerAttendance) => {
                      const currentStatus = attendanceRecords.get(player.playerId);

                      return (
                        <div
                          key={player.playerId}
                          className="flex items-center justify-between p-4 hover:bg-[#F4F3EE]/50 transition-colors"
                        >
                          <div>
                            <div className="text-sm font-bold text-[#101820]">{player.name}</div>
                            <div className="text-xs text-[#8B969E] flex items-center gap-2 mt-0.5">
                              <span className="font-mono text-[#101820] font-semibold">{player.playerCode}</span>
                              <span>•</span>
                              <span>{player.position}</span>
                            </div>
                          </div>

                          {/* Quick Toggle Controls */}
                          {isClosed ? (
                            <span
                              className={`inline-flex items-center px-2.5 py-1 rounded text-xs font-bold uppercase tracking-wider ${
                                currentStatus === "PRESENT"
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                  : "bg-rose-50 text-rose-700 border border-rose-200"
                              }`}
                            >
                              {currentStatus || "NOT MARKED"}
                            </span>
                          ) : (
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleToggleAttendance(player.playerId, "PRESENT")}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                                  currentStatus === "PRESENT"
                                    ? "bg-emerald-600 text-white shadow-xs"
                                    : "bg-white text-[#8B969E] border border-[#DCE1E3] hover:border-emerald-600 hover:text-emerald-600"
                                }`}
                              >
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                <span>Present</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleToggleAttendance(player.playerId, "ABSENT")}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                                  currentStatus === "ABSENT"
                                    ? "bg-rose-600 text-white shadow-xs"
                                    : "bg-white text-[#8B969E] border border-[#DCE1E3] hover:border-rose-600 hover:text-rose-600"
                                }`}
                              >
                                <XCircle className="h-3.5 w-3.5" />
                                <span>Absent</span>
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Bottom Action Footer */}
                  {!isClosed && (
                    <div className="p-4 border-t border-[#DCE1E3] flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#F4F3EE]/50">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleSaveAttendance}
                        isLoading={savingAttendance}
                        className="w-full sm:w-auto border-[#DCE1E3] bg-white text-[#101820]"
                      >
                        Save Attendance Draft
                      </Button>

                      <div className="flex items-center gap-2 w-full sm:w-auto">
                        <FeatureLockInfo
                          category="PREREQUISITE"
                          title="Session Closure Rules"
                          reason="Closing locks attendance irrevocably and certifies attendees for upcoming match fixtures and trial readiness."
                          whoCanChange="Assigned Squad Coach"
                          suggestedAction="Verify and mark each player as Present or Absent before locking."
                          size="sm"
                        />
                        <Button
                          variant="athletic"
                          size="sm"
                          onClick={handleCloseSession}
                          isLoading={closingSession}
                          className="w-full sm:w-auto gap-2 font-bold shadow-sm"
                        >
                          <Lock className="h-4 w-4" />
                          <span>Lock & Close Session</span>
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card className="p-12 text-center text-xs text-[#8B969E] border-dashed border-[#DCE1E3] bg-white shadow-sm">
                <CalendarCheck className="h-10 w-10 mx-auto text-[#101820]/40 mb-3" />
                <h4 className="text-sm font-bold text-[#101820] uppercase">No Session Selected</h4>
                <p className="mt-1">
                  Select a session from the history or open a new practice session to mark attendance.
                </p>
              </Card>
            )}
          </div>
        </div>

        {/* Modal: Open Practice Session */}
        {isCreateOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
            <Card className="w-full max-w-md border-[#DCE1E3] bg-white shadow-xl">
              <div className="flex items-center justify-between p-6 border-b border-[#DCE1E3]">
                <div className="flex items-center gap-2">
                  <CalendarCheck className="h-5 w-5 text-[#101820]" />
                  <h3 className="text-lg font-bold uppercase text-[#101820]">Open Practice Session</h3>
                </div>
                <button onClick={() => setIsCreateOpen(false)} className="text-[#8B969E] hover:text-[#101820]">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleCreateSession} className="p-6 space-y-4">
                <Input
                  label="Session Date *"
                  type="date"
                  value={newSessionForm.date}
                  onChange={(e) => setNewSessionForm({ ...newSessionForm, date: e.target.value })}
                  required
                />

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#8B969E]">
                      Sport Discipline (Locked to Assigned Sport)
                    </label>
                    <FeatureLockInfo
                      category="SPORT"
                      title="Discipline Locked"
                      reason="You can only conduct practice sessions for your assigned coaching sport."
                      size="xs"
                    />
                  </div>
                  <div className="flex h-11 w-full items-center justify-between rounded-md border border-[#DCE1E3] bg-[#F4F3EE] px-3 text-sm font-bold text-[#101820]">
                    <span className="flex items-center gap-2">
                      <Lock className="h-4 w-4 text-[#101820]" />
                      {assignedSport || newSessionForm.sport}
                    </span>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider bg-[#C6F432] text-[#101820] px-2 py-0.5 rounded border border-[#101820]">
                      Assigned Discipline
                    </span>
                  </div>
                </div>

                <Input
                  label="Session Title (Optional)"
                  placeholder="e.g. Morning Tactical Drill"
                  value={newSessionForm.title}
                  onChange={(e) => setNewSessionForm({ ...newSessionForm, title: e.target.value })}
                />

                <div className="flex justify-end gap-3 pt-4 border-t border-[#DCE1E3]">
                  <Button type="button" variant="ghost" size="sm" onClick={() => setIsCreateOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" variant="athletic" size="sm" isLoading={creating}>
                    Create Session
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
