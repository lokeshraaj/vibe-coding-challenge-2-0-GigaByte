"use client";

import { useEffect, useState } from "react";
import { DashboardShell } from "@/components/shared/dashboard-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/status-badge";
import {
  CalendarCheck,
  Plus,
  X,
  CheckCircle2,
  XCircle,
  Lock,
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

  // New session modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newSessionForm, setNewSessionForm] = useState({
    date: new Date().toISOString().split("T")[0],
    sport: "Football",
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
          coachId: "self",
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create session");

      toast.success("Practice session opened!");
      setIsCreateOpen(false);
      fetchSessions();
      handleOpenSessionSheet(data.session._id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error creating session");
    } finally {
      setCreating(false);
    }
  };

  const handleSetPlayerStatus = (playerId: string, status: "PRESENT" | "ABSENT") => {
    if (activeSessionDetails?.session.status === "CLOSED") return;
    const next = new Map(attendanceRecords);
    next.set(playerId, status);
    setAttendanceRecords(next);
  };

  const handleMarkAll = (status: "PRESENT" | "ABSENT") => {
    if (activeSessionDetails?.session.status === "CLOSED") return;
    const next = new Map<string, "PRESENT" | "ABSENT">();
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
      if (!res.ok) throw new Error(data.error || "Failed to save attendance");

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

    // Check if every player has a status
    const totalRoster = activeSessionDetails?.roster.length || 0;
    if (attendanceRecords.size < totalRoster) {
      toast.error(
        `Cannot close session: Missing attendance for ${totalRoster - attendanceRecords.size} player(s). Mark all players first.`
      );
      return;
    }

    if (!confirm("Are you sure you want to LOCK and CLOSE this session? Once closed, attendance records become completely immutable and will count towards trial eligibility.")) {
      return;
    }

    setClosingSession(true);
    try {
      // First save current attendance
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
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight uppercase text-[#101820]">
              Practice Sessions & Attendance
            </h1>
            <p className="text-xs text-[#8B969E] uppercase tracking-wider mt-1 font-semibold">
              Log Rosters & Enforce Attendance Immutability
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

          {/* Right Column: Attendance Marking Workspace */}
          <div className="lg:col-span-7">
            {activeSessionId && activeSessionDetails ? (
              <Card className="border-[#DCE1E3] bg-white shadow-sm">
                <CardHeader className="border-b border-[#DCE1E3] pb-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-bold uppercase text-[#101820]">
                          {activeSessionDetails.session.title || "Practice Session"}
                        </h3>
                        <StatusBadge status={activeSessionDetails.session.status} type="session" />
                      </div>
                      <p className="text-xs text-[#8B969E] mt-0.5">
                        Date: {new Date(activeSessionDetails.session.date).toLocaleDateString()} • Sport:{" "}
                        {activeSessionDetails.session.sport}
                      </p>
                    </div>

                    {isClosed ? (
                      <div className="flex items-center gap-1.5 text-xs text-emerald-700 font-bold bg-emerald-50 px-3 py-1.5 rounded border border-emerald-200">
                        <Lock className="h-4 w-4" />
                        <span>IMMUTABLE (LOCKED)</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleMarkAll("PRESENT")}
                          className="text-[11px] text-emerald-700 hover:bg-emerald-50 font-bold"
                        >
                          All Present
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleMarkAll("ABSENT")}
                          className="text-[11px] text-rose-700 hover:bg-rose-50 font-bold"
                        >
                          All Absent
                        </Button>
                      </div>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="p-0">
                  {/* Summary bar */}
                  <div className="grid grid-cols-3 bg-[#F4F3EE] p-3 text-center border-b border-[#DCE1E3] text-xs">
                    <div>
                      <span className="text-[#8B969E] uppercase font-bold text-[10px] block">
                        Roster
                      </span>
                      <span className="font-extrabold text-[#101820] text-base">
                        {activeSessionDetails.roster.length}
                      </span>
                    </div>
                    <div>
                      <span className="text-emerald-700 uppercase font-bold text-[10px] block">
                        Present
                      </span>
                      <span className="font-extrabold text-emerald-700 text-base">
                        {Array.from(attendanceRecords.values()).filter((v) => v === "PRESENT").length}
                      </span>
                    </div>
                    <div>
                      <span className="text-rose-700 uppercase font-bold text-[10px] block">
                        Absent
                      </span>
                      <span className="font-extrabold text-rose-700 text-base">
                        {Array.from(attendanceRecords.values()).filter((v) => v === "ABSENT").length}
                      </span>
                    </div>
                  </div>

                  {/* Roster Attendance Table */}
                  <div className="max-h-[420px] overflow-y-auto divide-y divide-[#DCE1E3]">
                    {activeSessionDetails.roster.map((player: RosterPlayerAttendance) => {
                      const currentStatus = attendanceRecords.get(player.playerId);
                      return (
                        <div
                          key={player.playerId}
                          className="flex items-center justify-between p-3.5 hover:bg-[#F4F3EE] transition-colors text-xs"
                        >
                          <div>
                            <div className="font-bold text-[#101820] text-sm">{player.name}</div>
                            <div className="text-[11px] text-[#8B969E]">
                              {player.playerCode} • {player.position}
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              disabled={isClosed}
                              onClick={() => handleSetPlayerStatus(player.playerId, "PRESENT")}
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-bold uppercase transition-all ${
                                currentStatus === "PRESENT"
                                  ? "bg-emerald-600 text-white shadow-xs"
                                  : "bg-white text-[#202A32] border border-[#DCE1E3] hover:border-emerald-500"
                              } ${isClosed ? "cursor-not-allowed opacity-75" : ""}`}
                            >
                              <CheckCircle2 className="h-4 w-4" />
                              <span>Present</span>
                            </button>

                            <button
                              type="button"
                              disabled={isClosed}
                              onClick={() => handleSetPlayerStatus(player.playerId, "ABSENT")}
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-bold uppercase transition-all ${
                                currentStatus === "ABSENT"
                                  ? "bg-rose-600 text-white shadow-xs"
                                  : "bg-white text-[#202A32] border border-[#DCE1E3] hover:border-rose-500"
                              } ${isClosed ? "cursor-not-allowed opacity-75" : ""}`}
                            >
                              <XCircle className="h-4 w-4" />
                              <span>Absent</span>
                            </button>
                          </div>
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
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#8B969E]">
                    Sport Discipline *
                  </label>
                  <select
                    className="flex h-11 w-full rounded-md border border-[#DCE1E3] bg-white px-3 py-2 text-sm text-[#101820] focus-visible:outline-none focus-visible:border-[#101820]"
                    value={newSessionForm.sport}
                    onChange={(e) => setNewSessionForm({ ...newSessionForm, sport: e.target.value })}
                  >
                    <option value="Football">Football</option>
                    <option value="Basketball">Basketball</option>
                    <option value="Cricket">Cricket</option>
                    <option value="Tennis">Tennis</option>
                    <option value="Hockey">Hockey</option>
                  </select>
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
