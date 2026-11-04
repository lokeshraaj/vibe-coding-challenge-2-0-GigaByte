"use client";

import { useEffect, useState } from "react";
import { DashboardShell } from "@/components/shared/dashboard-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/status-badge";
import { Trophy, Plus, X, AlertCircle, CheckCircle2 } from "lucide-react";
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

  // New match modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [closedSessions, setClosedSessions] = useState<ClosedSessionOption[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const [matchForm, setMatchForm] = useState({
    sessionId: "",
    opponentName: "",
    venue: "Main Stadium",
    sport: "Football",
    date: new Date().toISOString().split("T")[0],
    scoreLabel: "Goals",
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

        // Pre-select all eligible present players with 0 score
        const initialMap = new Map();
        players.forEach((p) => {
          initialMap.set(p.playerId, { score: 0, minutesPlayed: 90 });
        });
        setSelectedParticipants(initialMap);
      }
    } catch (e) {
      toast.error("Failed to load eligible session roster");
    } finally {
      setLoadingEligible(false);
    }
  };

  useEffect(() => {
    fetchMatches();
  }, []);

  const handleOpenModal = () => {
    setIsModalOpen(true);
    fetchClosedSessions();
  };

  const handleSessionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const sId = e.target.value;
    const selectedSess = closedSessions.find((s) => s.id === sId);
    if (selectedSess) {
      setMatchForm((prev) => ({
        ...prev,
        sessionId: sId,
        sport: selectedSess.sport,
        date: selectedSess.date.split("T")[0],
      }));
      loadEligibleRoster(sId);
    }
  };

  const handleTogglePlayer = (playerId: string) => {
    const next = new Map(selectedParticipants);
    if (next.has(playerId)) {
      next.delete(playerId);
    } else {
      next.set(playerId, { score: 0, minutesPlayed: 90 });
    }
    setSelectedParticipants(next);
  };

  const handlePlayerScoreChange = (playerId: string, score: number) => {
    const next = new Map(selectedParticipants);
    const existing = next.get(playerId) || { score: 0, minutesPlayed: 90 };
    next.set(playerId, { ...existing, score: Math.max(0, score) });
    setSelectedParticipants(next);
  };

  const handleCreateMatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!matchForm.sessionId) {
      toast.error("Please select a linked closed practice session");
      return;
    }

    if (selectedParticipants.size === 0) {
      toast.error("At least one participating athlete must be selected for the match");
      return;
    }

    setSubmitting(true);
    try {
      const participants = Array.from(selectedParticipants.entries()).map(([playerId, val]) => ({
        playerId,
        score: val.score,
        minutesPlayed: val.minutesPlayed,
      }));

      const res = await fetch("/api/matches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...matchForm,
          coachId: "self",
          participants,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to record match");
      }

      toast.success("Match performance recorded successfully!");
      setIsModalOpen(false);
      fetchMatches();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error recording match");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DashboardShell allowedRoles={["COACH"]}>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight uppercase text-[#101820]">
              Match Performance & Scores
            </h1>
            <p className="text-xs text-[#8B969E] uppercase tracking-wider mt-1 font-semibold">
              Record Fixtures With Session-Locked Verification
            </p>
          </div>

          <Button variant="athletic" size="sm" onClick={handleOpenModal} className="gap-2 font-bold shadow-sm">
            <Plus className="h-4 w-4" />
            <span>Record New Match</span>
          </Button>
        </div>

        {/* Matches List */}
        <Card className="border-[#DCE1E3] bg-white shadow-sm">
          <CardHeader className="pb-4 border-b border-[#DCE1E3]">
            <CardTitle className="text-base flex items-center gap-2 text-[#101820]">
              <Trophy className="h-5 w-5 text-[#101820]" />
              <span>Match Records ({matches.length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="py-12 text-center text-xs text-[#8B969E]">Loading matches...</div>
            ) : matches.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-[#DCE1E3] bg-[#F4F3EE] text-[10px] uppercase font-bold tracking-wider text-[#8B969E]">
                      <th className="p-4">Match Date</th>
                      <th className="p-4">Opponent & Sport</th>
                      <th className="p-4">Score Sheet</th>
                      <th className="p-4">Top Scorers</th>
                      <th className="p-4">Participants</th>
                      <th className="p-4">Result</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#DCE1E3]">
                    {matches.map((m) => (
                      <tr key={m.id} className="hover:bg-[#F4F3EE] transition-colors">
                        <td className="p-4 font-bold text-[#101820]">
                          <div>{new Date(m.date).toLocaleDateString()}</div>
                          <div className="text-[10px] text-[#8B969E] font-normal">{m.venue || "Stadium"}</div>
                        </td>
                        <td className="p-4">
                          <div className="font-bold text-[#101820] text-sm">vs {m.opponentName}</div>
                          <div className="text-[10px] text-[#8B969E] uppercase font-medium">{m.sport}</div>
                        </td>
                        <td className="p-4">
                          <span className="text-base font-extrabold text-[#101820]">
                            {m.academyTeamScore} - {m.opponentScore}
                          </span>
                          <span className="text-[10px] text-[#8B969E] ml-1.5 uppercase font-medium">
                            ({m.scoreLabel})
                          </span>
                        </td>
                        <td className="p-4">
                          {m.topScorers && m.topScorers.length > 0 ? (
                            <div className="space-y-0.5">
                              {m.topScorers.map((s, idx) => (
                                <div key={idx} className="text-[11px] font-semibold text-[#101820]">
                                  {s.name}: <span className="font-bold text-[#101820]">{s.score}</span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <span className="text-[#8B969E] text-[10px]">No scorers</span>
                          )}
                        </td>
                        <td className="p-4 font-bold text-[#101820]">
                          {m.participantsCount} Players
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
                                onChange={() => handleTogglePlayer(player.playerId)}
                                className="h-4 w-4 rounded border-[#DCE1E3] text-[#101820] focus:ring-[#C6F432]"
                              />
                              <div>
                                <div className="font-bold text-[#101820]">{player.name}</div>
                                <div className="text-[10px] text-[#8B969E]">
                                  {player.playerCode} • {player.position}
                                </div>
                              </div>
                            </div>

                            {isSelected && (
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] text-[#8B969E] uppercase font-bold">
                                  Score:
                                </span>
                                <input
                                  type="number"
                                  min="0"
                                  value={participantData.score}
                                  onChange={(e) =>
                                    handlePlayerScoreChange(
                                      player.playerId,
                                      parseInt(e.target.value, 10) || 0
                                    )
                                  }
                                  className="h-8 w-16 rounded border border-[#DCE1E3] bg-[#F4F3EE] px-2 text-center text-[#101820] font-bold"
                                />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="p-4 text-center text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg">
                      No present players found in this session.
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
                    disabled={closedSessions.length === 0}
                    isLoading={submitting}
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
