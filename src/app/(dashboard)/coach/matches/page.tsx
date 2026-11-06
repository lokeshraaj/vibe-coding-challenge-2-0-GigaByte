"use client";

import { useEffect, useState } from "react";
import { DashboardShell } from "@/components/shared/dashboard-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/status-badge";
import { Trophy, Plus, X, AlertCircle, CheckCircle2, Lock, Shield } from "lucide-react";
import { toast } from "sonner";

interface MatchItem {
  id: string;
  date: string;
  sport: string;
  opponentName: string;
  venue?: string;
  scoreLabel: string;
  academyTeamScore: number;
  opponentScore: number;
  result: string;
  participantsCount: number;
  topScorers: Array<{ name: string; score: number }>;
}

interface ClosedSessionOption {
  id: string;
  sport: string;
  date: string;
  title: string;
}

interface EligiblePlayer {
  playerId: string;
  name: string;
  playerCode: string;
  position: string;
}

export default function CoachMatchesPage() {
  const [matches, setMatches] = useState<MatchItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [assignedSport, setAssignedSport] = useState<string>("");

  // New match modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [closedSessions, setClosedSessions] = useState<ClosedSessionOption[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const [matchForm, setMatchForm] = useState({
    sessionId: "",
    opponentName: "",
    venue: "Main Stadium",
    sport: "Cricket",
    date: new Date().toISOString().split("T")[0],
    scoreLabel: "Runs",
    academyTeamScore: 0,
    opponentScore: 0,
    result: "WON" as "WON" | "LOST" | "DRAW",
    notes: "",
  });

  const [eligiblePlayers, setEligiblePlayers] = useState<EligiblePlayer[]>([]);
  const [loadingEligible, setLoadingEligible] = useState(false);
  const [selectedParticipants, setSelectedParticipants] = useState<
    Map<string, { score: number; minutesPlayed: number }>
  >(new Map());

  const fetchMatches = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/matches");
      if (res.ok) {
        const data = await res.json();
        setMatches(data.matches || []);
      }
    } catch (e) {
      console.error(e);
      toast.error("Failed to load matches");
    } finally {
      setLoading(false);
    }
  };

  const fetchClosedSessions = async () => {
    try {
      const res = await fetch("/api/sessions");
      if (res.ok) {
        const data = await res.json();
        const closed = (data.sessions || [])
          .filter((s: any) => s.status === "CLOSED")
          .map((s: any) => ({
            id: s.id,
            sport: s.sport,
            date: s.date,
            title: s.title,
          }));
        setClosedSessions(closed);
        if (closed.length > 0 && !matchForm.sessionId) {
          setMatchForm((prev) => ({
            ...prev,
            sessionId: closed[0].id,
            sport: closed[0].sport,
            date: closed[0].date.split("T")[0],
          }));
          loadEligibleRoster(closed[0].id);
        }
      }
    } catch (e) {
      console.error("Failed to fetch sessions for match creation:", e);
    }
  };

  const loadEligibleRoster = async (sessionId: string) => {
    setLoadingEligible(true);
    try {
      const res = await fetch(`/api/matches/eligible-roster?sessionId=${sessionId}`);
      if (res.ok) {
        const data = await res.json();
        const players: EligiblePlayer[] = data.eligiblePlayers || [];
        setEligiblePlayers(players);

        // Pre-select all present players with default 0 score
        const map = new Map<string, { score: number; minutesPlayed: number }>();
        players.forEach((p) => {
          map.set(p.playerId, { score: 0, minutesPlayed: 90 });
        });
        setSelectedParticipants(map);
      }
    } catch (e) {
      toast.error("Failed to fetch eligible roster for session");
    } finally {
      setLoadingEligible(false);
    }
  };

  useEffect(() => {
    fetchMatches();
    async function fetchMe() {
      try {
        const res = await fetch("/api/auth/me");
        if (res.ok) {
          const data = await res.json();
          if (data.user?.sport) {
            setAssignedSport(data.user.sport);
            setMatchForm((prev) => ({ ...prev, sport: data.user.sport }));
          }
        }
      } catch (err) {
        console.error(err);
      }
    }
    fetchMe();
  }, []);

  const handleOpenModal = () => {
    setIsModalOpen(true);
    fetchClosedSessions();
  };

  const handleSessionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const sId = e.target.value;
    const selected = closedSessions.find((s) => s.id === sId);
    setMatchForm((prev) => ({
      ...prev,
      sessionId: sId,
      sport: selected?.sport || prev.sport,
      date: selected?.date ? selected.date.split("T")[0] : prev.date,
    }));
    loadEligibleRoster(sId);
  };

  const handleToggleParticipant = (playerId: string) => {
    const next = new Map(selectedParticipants);
    if (next.has(playerId)) {
      next.delete(playerId);
    } else {
      next.set(playerId, { score: 0, minutesPlayed: 90 });
    }
    setSelectedParticipants(next);
  };

  const handleUpdateScore = (playerId: string, score: number) => {
    const next = new Map(selectedParticipants);
    const existing = next.get(playerId) || { score: 0, minutesPlayed: 90 };
    next.set(playerId, { ...existing, score });
    setSelectedParticipants(next);
  };

  const handleCreateMatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!matchForm.sessionId) {
      toast.error("You must link this match to a closed practice session");
      return;
    }

    if (selectedParticipants.size === 0) {
      toast.error("You must include at least one fielded player from the session");
      return;
    }

    setSubmitting(true);
    try {
      const participants = Array.from(selectedParticipants.entries()).map(([playerId, data]) => ({
        playerId,
        score: data.score,
        minutesPlayed: data.minutesPlayed,
      }));

      const res = await fetch("/api/matches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...matchForm,
          sport: assignedSport || matchForm.sport,
          participants,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to record match");

      toast.success("Match performance recorded successfully!");
      setIsModalOpen(false);
      fetchMatches();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error creating match");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DashboardShell allowedRoles={["COACH"]}>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight uppercase text-[#101820]">
                Competitive Match Logs
              </h1>
              {assignedSport && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-[#C6F432] text-[#101820] border border-[#101820] uppercase tracking-wider">
                  <Shield className="h-3.5 w-3.5" />
                  {assignedSport}
                </span>
              )}
            </div>
            <p className="text-xs text-[#8B969E] uppercase tracking-wider mt-1 font-semibold">
              Verify Scorecards & Player Statistics • {assignedSport || "Assigned"} Matches Only
            </p>
          </div>

          <Button
            variant="athletic"
            size="sm"
            onClick={handleOpenModal}
            className="gap-2 font-bold shadow-sm"
          >
            <Plus className="h-4 w-4" />
            <span>Record Match Performance</span>
          </Button>
        </div>

        {/* Matches List Card */}
        <Card className="border-[#DCE1E3] bg-white shadow-sm">
          <CardHeader className="pb-3 border-b border-[#DCE1E3]">
            <CardTitle className="text-sm uppercase flex items-center justify-between text-[#101820]">
              <span>Recorded Fixtures</span>
              <span className="text-[#101820] font-bold">{matches.length}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="py-12 text-center text-xs text-[#8B969E]">Loading matches...</div>
            ) : matches.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F4F3EE] text-[#8B969E] uppercase tracking-wider text-[10px] font-bold border-b border-[#DCE1E3]">
                    <tr>
                      <th className="p-4">Date</th>
                      <th className="p-4">Sport</th>
                      <th className="p-4">Opponent</th>
                      <th className="p-4">Score</th>
                      <th className="p-4">Squad Fielded</th>
                      <th className="p-4">Top Performers</th>
                      <th className="p-4">Outcome</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#DCE1E3] text-[#101820]">
                    {matches.map((m) => (
                      <tr key={m.id} className="hover:bg-[#F4F3EE]/50 transition-colors">
                        <td className="p-4 font-mono font-semibold">
                          {new Date(m.date).toLocaleDateString()}
                        </td>
                        <td className="p-4 font-semibold">{m.sport}</td>
                        <td className="p-4">
                          <div className="font-bold">{m.opponentName}</div>
                          {m.venue && <div className="text-[11px] text-[#8B969E]">{m.venue}</div>}
                        </td>
                        <td className="p-4">
                          <span className="font-mono font-bold text-sm">
                            {m.academyTeamScore} - {m.opponentScore}
                          </span>
                        </td>
                        <td className="p-4 font-semibold">{m.participantsCount} Players</td>
                        <td className="p-4">
                          {m.topScorers && m.topScorers.length > 0 ? (
                            <div className="space-y-0.5">
                              {m.topScorers.map((ts, idx) => (
                                <div key={idx} className="text-[11px] text-[#8B969E]">
                                  <span className="font-semibold text-[#101820]">{ts.name}</span>:{" "}
                                  <span className="font-mono">{ts.score}</span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <span className="text-[#8B969E]">-</span>
                          )}
                        </td>
                        <td className="p-4">
                          <StatusBadge status={m.result} type="match" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-12 text-center text-xs text-[#8B969E] space-y-3">
                <p>No matches recorded yet.</p>
                <Button variant="athletic" size="sm" onClick={handleOpenModal}>
                  Record First Match
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Modal: Record Match */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 overflow-y-auto">
            <Card className="w-full max-w-2xl border-[#DCE1E3] bg-white shadow-xl my-8">
              <div className="flex items-center justify-between p-6 border-b border-[#DCE1E3]">
                <div className="flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-[#101820]" />
                  <h3 className="text-lg font-bold uppercase text-[#101820]">Record Match Performance</h3>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="text-[#8B969E] hover:text-[#101820]">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleCreateMatch} className="p-6 space-y-5">
                {/* Linked Closed Session Selection */}
                <div className="p-4 rounded-xl bg-[#F4F3EE] border border-[#DCE1E3] space-y-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#101820] flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-[#101820]" />
                    <span>Link to Closed Practice Session *</span>
                  </label>
                  {closedSessions.length > 0 ? (
                    <select
                      className="flex h-11 w-full rounded-md border border-[#DCE1E3] bg-white px-3 py-2 text-sm text-[#101820] focus-visible:outline-none focus-visible:border-[#101820]"
                      value={matchForm.sessionId}
                      onChange={handleSessionChange}
                      required
                    >
                      {closedSessions.map((s) => (
                        <option key={s.id} value={s.id}>
                          {new Date(s.date).toLocaleDateString()} — {s.title || "Practice Session"} ({s.sport})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="text-xs text-amber-700 font-semibold flex items-center gap-2 p-3 bg-amber-50 rounded-lg border border-amber-200">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      <span>
                        No closed sessions found! You must conduct and close a practice session before recording a match.
                      </span>
                    </div>
                  )}
                  <p className="text-[11px] text-[#8B969E]">
                    System rule: Only athletes marked Present in this closed session will be eligible for the match sheet.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Opponent Academy / Team *"
                    placeholder="e.g. Manchester Youth FC"
                    value={matchForm.opponentName}
                    onChange={(e) => setMatchForm({ ...matchForm, opponentName: e.target.value })}
                    required
                  />

                  <Input
                    label="Venue / Stadium"
                    placeholder="e.g. Academy Main Pitch"
                    value={matchForm.venue}
                    onChange={(e) => setMatchForm({ ...matchForm, venue: e.target.value })}
                  />
                </div>

                {/* Sport Discipline Locked Display */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#8B969E]">
                    Sport Discipline
                  </label>
                  <div className="flex h-11 w-full items-center justify-between rounded-md border border-[#DCE1E3] bg-[#F4F3EE] px-3 text-sm font-bold text-[#101820]">
                    <span className="flex items-center gap-2">
                      <Lock className="h-4 w-4 text-[#101820]" />
                      {assignedSport || matchForm.sport}
                    </span>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider bg-[#C6F432] text-[#101820] px-2 py-0.5 rounded border border-[#101820]">
                      Assigned Discipline
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <Input
                    label="Our Academy Score *"
                    type="number"
                    min="0"
                    value={matchForm.academyTeamScore}
                    onChange={(e) =>
                      setMatchForm({ ...matchForm, academyTeamScore: parseInt(e.target.value, 10) || 0 })
                    }
                    required
                  />

                  <Input
                    label="Opponent Score *"
                    type="number"
                    min="0"
                    value={matchForm.opponentScore}
                    onChange={(e) =>
                      setMatchForm({ ...matchForm, opponentScore: parseInt(e.target.value, 10) || 0 })
                    }
                    required
                  />

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#8B969E]">
                      Outcome *
                    </label>
                    <select
                      className="flex h-11 w-full rounded-md border border-[#DCE1E3] bg-white px-3 py-2 text-sm text-[#101820] focus-visible:outline-none focus-visible:border-[#101820]"
                      value={matchForm.result}
                      onChange={(e) => setMatchForm({ ...matchForm, result: e.target.value as any })}
                    >
                      <option value="WON">Won</option>
                      <option value="LOST">Lost</option>
                      <option value="DRAW">Draw</option>
                    </select>
                  </div>
                </div>

                {/* Eligible Player Roster Participation */}
                <div className="space-y-2 pt-2 border-t border-[#DCE1E3]">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold uppercase tracking-wider text-[#101820]">
                      Fielded Players & Scores ({selectedParticipants.size} Selected)
                    </label>
                    <span className="text-[10px] text-[#101820] font-bold uppercase bg-[#F4F3EE] px-2 py-0.5 rounded border border-[#DCE1E3]">
                      Present in Session Only
                    </span>
                  </div>

                  {loadingEligible ? (
                    <div className="py-6 text-center text-xs text-[#8B969E]">
                      Verifying session attendance...
                    </div>
                  ) : eligiblePlayers.length > 0 ? (
                    <div className="max-h-56 overflow-y-auto divide-y divide-[#DCE1E3] border border-[#DCE1E3] rounded-xl bg-white">
                      {eligiblePlayers.map((player) => {
                        const isSelected = selectedParticipants.has(player.playerId);
                        const participantData = selectedParticipants.get(player.playerId) || {
                          score: 0,
                          minutesPlayed: 90,
                        };

                        return (
                          <div
                            key={player.playerId}
                            className="flex items-center justify-between p-3 text-xs hover:bg-[#F4F3EE] transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handleToggleParticipant(player.playerId)}
                                className="h-4 w-4 rounded border-[#DCE1E3] text-[#101820] focus:ring-[#101820]"
                              />
                              <div>
                                <div className="font-bold text-[#101820]">{player.name}</div>
                                <div className="text-[10px] text-[#8B969E] font-mono">
                                  {player.playerCode} • {player.position}
                                </div>
                              </div>
                            </div>

                            {isSelected && (
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-bold text-[#8B969E] uppercase">
                                  Score Contribution:
                                </span>
                                <input
                                  type="number"
                                  min="0"
                                  className="w-16 h-8 rounded border border-[#DCE1E3] px-2 text-right font-mono font-bold text-xs"
                                  value={participantData.score}
                                  onChange={(e) =>
                                    handleUpdateScore(player.playerId, parseInt(e.target.value, 10) || 0)
                                  }
                                />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="py-6 text-center text-xs text-[#8B969E] border border-dashed border-[#DCE1E3] rounded-xl p-4">
                      No PRESENT players found for this practice session.
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-[#DCE1E3]">
                  <Button type="button" variant="ghost" size="sm" onClick={() => setIsModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="athletic"
                    size="sm"
                    isLoading={submitting}
                    disabled={closedSessions.length === 0}
                  >
                    Save Match Record
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
