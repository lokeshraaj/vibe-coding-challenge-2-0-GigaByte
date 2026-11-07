"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  Trophy,
  X,
  Calendar,
  MapPin,
  Clock,
  Shield,
  Users,
  Award,
  FileText,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  RefreshCw,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/shared/status-badge";
import { FeatureLockInfo } from "@/components/ui/feature-lock-info";
import { toast } from "sonner";

interface MatchDetailsData {
  match: {
    id: string;
    coachId?: string;
    coachName?: string;
    sessionId?: string | null;
    sessionTitle?: string | null;
    sessionDate?: string | null;
    sessionStatus?: string | null;
    date: string;
    sport: string;
    opponentName: string;
    venue?: string;
    scoreLabel: string;
    academyTeamScore: number;
    opponentScore: number;
    result: string;
    notes?: string;
    createdAt?: string;
    updatedAt?: string;
  };
  participants: Array<{
    playerId: string;
    name: string;
    playerCode: string;
    position: string;
    photoUrl?: string;
    score: number;
    minutesPlayed: number;
    performanceNotes?: string;
  }>;
}

interface MatchDetailsModalProps {
  matchId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export function MatchDetailsModal({ matchId, isOpen, onClose }: MatchDetailsModalProps) {
  const [data, setData] = useState<MatchDetailsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState(false);

  const fetchDetails = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/matches/${id}`);
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `Failed to fetch match (${res.status})`);
      }
      const json = await res.json();
      if (!json.success || !json.match) {
        throw new Error("Invalid match payload received");
      }
      setData({ match: json.match, participants: json.participants || [] });
    } catch (err: any) {
      console.error("MatchDetailsModal error:", err);
      setError(err.message || "Failed to load match record");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen && matchId) {
      fetchDetails(matchId);
    } else {
      setData(null);
      setError(null);
    }
  }, [isOpen, matchId, fetchDetails]);

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const copyMatchId = () => {
    if (!matchId) return;
    navigator.clipboard.writeText(matchId);
    setCopiedId(true);
    toast.success("Match ID copied to clipboard");
    setTimeout(() => setCopiedId(false), 2000);
  };

  const match = data?.match;
  const participants = data?.participants || [];
  const topScorer =
    participants.length > 0
      ? [...participants].sort((a, b) => (b.score || 0) - (a.score || 0))[0]
      : null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="match-details-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-3xl rounded-2xl border border-[#DCE1E3] bg-white shadow-2xl overflow-hidden my-4 sm:my-8 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#DCE1E3] bg-[#F4F3EE]/80 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-[#101820] text-[#C6F432] flex items-center justify-center shrink-0 shadow-sm">
              <Trophy className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 id="match-details-title" className="text-base sm:text-lg font-black tracking-tight text-[#101820] uppercase">
                  {match ? `vs ${match.opponentName}` : "Match Fixture Details"}
                </h2>
                {match && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-[#C6F432] text-[#101820] border border-[#101820] uppercase tracking-wider">
                    <Shield className="h-3 w-3" />
                    {match.sport}
                  </span>
                )}
                {match && <StatusBadge status={match.result} type="match" />}
              </div>
              <p className="text-xs text-[#8B969E] mt-0.5 font-medium">
                Official Scorecard & Player Statistics
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close match details dialog"
            className="rounded-lg p-2 text-[#8B969E] hover:text-[#101820] hover:bg-[#DCE1E3]/50 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {loading && (
            <div className="py-20 text-center space-y-4">
              <div className="inline-block animate-spin text-[#101820]">
                <RefreshCw className="h-8 w-8" />
              </div>
              <p className="text-xs uppercase font-bold tracking-wider text-[#8B969E]">
                Fetching official fixture record...
              </p>
            </div>
          )}

          {error && !loading && (
            <div className="p-6 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 space-y-3">
              <div className="flex items-center gap-2 font-bold text-sm">
                <AlertCircle className="h-5 w-5 shrink-0" />
                <span>Unable to load match details</span>
              </div>
              <p className="text-xs">{error}</p>
              {matchId && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => fetchDetails(matchId)}
                  className="gap-2 text-xs"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Try Again
                </Button>
              )}
            </div>
          )}

          {!loading && !error && match && (
            <>
              {/* Scorecard Hero Banner */}
              <div className="relative rounded-2xl bg-[#101820] text-white p-6 overflow-hidden shadow-lg border border-[#101820]">
                <div className="absolute right-0 top-0 translate-x-12 -translate-y-8 w-56 h-56 bg-[#C6F432]/10 rounded-full blur-2xl pointer-events-none" />
                
                <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-6">
                  {/* Our Academy */}
                  <div className="flex-1 text-center sm:text-left">
                    <span className="text-[10px] font-black uppercase tracking-widest text-[#C6F432] block">
                      Home Academy
                    </span>
                    <h3 className="text-lg font-black tracking-tight text-white mt-1">
                      Athlix Academy Squad
                    </h3>
                    <p className="text-xs text-[#8B969E] mt-0.5">
                      {participants.length} fielded athletes
                    </p>
                  </div>

                  {/* Score Display */}
                  <div className="flex flex-col items-center justify-center shrink-0 px-6 py-2 rounded-xl bg-white/5 border border-white/10 backdrop-blur-xs">
                    <div className="font-mono text-3xl sm:text-4xl font-black tracking-tight text-[#C6F432]">
                      {match.academyTeamScore}
                      <span className="text-[#8B969E] mx-3">-</span>
                      {match.opponentScore}
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-300 mt-1">
                      {match.scoreLabel || "Score"}
                    </span>
                  </div>

                  {/* Opponent */}
                  <div className="flex-1 text-center sm:text-right">
                    <span className="text-[10px] font-black uppercase tracking-widest text-[#8B969E] block">
                      Challenger
                    </span>
                    <h3 className="text-lg font-black tracking-tight text-white mt-1">
                      {match.opponentName}
                    </h3>
                    <p className="text-xs text-[#8B969E] mt-0.5">
                      {match.venue || "Opponent Ground"}
                    </p>
                  </div>
                </div>

                {/* Sub-strip with match metadata */}
                <div className="relative z-10 mt-6 pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-300">
                  <div className="flex items-center gap-1.5 font-medium">
                    <Calendar className="h-3.5 w-3.5 text-[#C6F432]" />
                    <span>{new Date(match.date).toLocaleDateString("en-US", { weekday: "short", year: "numeric", month: "short", day: "numeric" })}</span>
                  </div>
                  {match.venue && (
                    <div className="flex items-center gap-1.5 font-medium">
                      <MapPin className="h-3.5 w-3.5 text-[#C6F432]" />
                      <span>{match.venue}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#8B969E]">Outcome:</span>
                    <span className="font-bold uppercase tracking-wider text-[#C6F432]">{match.result}</span>
                  </div>
                </div>
              </div>

              {/* Linked Session & Roster Prerequisites Section */}
              <div className="p-4 rounded-xl bg-[#F4F3EE] border border-[#DCE1E3] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-white border border-[#DCE1E3] text-[#101820] shrink-0 mt-0.5 sm:mt-0">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-[#101820]">
                        Linked Practice Session
                      </h4>
                      <FeatureLockInfo
                        category="PREREQUISITE"
                        title="Eligibility Rule Enforced"
                        reason="ATHLIX rules require every match to be linked to a closed practice session. Only athletes marked Present in that session were eligible to be fielded."
                        size="xs"
                      />
                    </div>
                    <p className="text-xs text-[#8B969E] mt-0.5">
                      {match.sessionTitle ? (
                        <span>
                          <strong className="text-[#101820]">{match.sessionTitle}</strong>
                          {match.sessionDate && ` • ${new Date(match.sessionDate).toLocaleDateString()}`}
                        </span>
                      ) : match.sessionId ? (
                        <span>Linked Session ID: <code className="font-mono">{match.sessionId}</code></span>
                      ) : (
                        <span>Directly linked practice session record</span>
                      )}
                    </p>
                  </div>
                </div>
                <Badge variant="outline" className="border-emerald-300 bg-emerald-50 text-emerald-800 text-[10px] font-bold uppercase">
                  Attendance Verified
                </Badge>
              </div>

              {/* Player Performance Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-[#101820]" />
                    <h4 className="text-xs font-black uppercase tracking-wider text-[#101820]">
                      Squad Fielded & Individual Player Performance
                    </h4>
                  </div>
                  <span className="text-xs font-bold text-[#8B969E]">
                    {participants.length} {participants.length === 1 ? "Athlete" : "Athletes"} Fielded
                  </span>
                </div>

                {participants.length > 0 ? (
                  <div className="rounded-xl border border-[#DCE1E3] overflow-hidden bg-white shadow-xs">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs min-w-[620px]">
                        <thead className="bg-[#F4F3EE] text-[#8B969E] uppercase tracking-wider text-[10px] font-bold border-b border-[#DCE1E3]">
                          <tr>
                            <th className="p-3">Athlete</th>
                            <th className="p-3">Player ID</th>
                            <th className="p-3">Position</th>
                            <th className="p-3 text-center">Score ({match.scoreLabel || "Pts"})</th>
                            <th className="p-3 text-center">Minutes Played</th>
                            <th className="p-3">Performance Notes</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#DCE1E3] text-[#101820]">
                          {participants.map((p) => {
                            const isTop = topScorer && topScorer.score > 0 && p.score === topScorer.score;
                            return (
                              <tr key={p.playerId} className="hover:bg-[#F4F3EE]/50 transition-colors">
                                <td className="p-3">
                                  <div className="flex items-center gap-2">
                                    <div className="h-7 w-7 rounded-full bg-[#101820] text-[#C6F432] font-black text-xs flex items-center justify-center shrink-0">
                                      {p.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                      <span className="font-bold text-[#101820] block">{p.name}</span>
                                      {isTop && (
                                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700">
                                          <Award className="h-3 w-3" /> Top Scorer
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </td>
                                <td className="p-3">
                                  <span className="font-mono font-semibold text-[11px] text-[#8B969E] bg-[#F4F3EE] px-2 py-0.5 rounded border border-[#DCE1E3]">
                                    {p.playerCode || "N/A"}
                                  </span>
                                </td>
                                <td className="p-3">
                                  <span className="font-medium text-[11px] text-[#101820]">
                                    {p.position || "Player"}
                                  </span>
                                </td>
                                <td className="p-3 text-center">
                                  <span
                                    className={`inline-block font-mono font-bold text-xs px-2.5 py-0.5 rounded ${
                                      p.score > 0
                                        ? "bg-[#C6F432] text-[#101820] border border-[#101820]"
                                        : "bg-slate-100 text-slate-500"
                                    }`}
                                  >
                                    {p.score ?? 0}
                                  </span>
                                </td>
                                <td className="p-3 text-center">
                                  <span className="font-mono text-xs font-semibold text-[#8B969E]">
                                    {p.minutesPlayed ? `${p.minutesPlayed}'` : "90'"}
                                  </span>
                                </td>
                                <td className="p-3 text-[11px] text-[#8B969E] max-w-[200px] truncate">
                                  {p.performanceNotes || <span className="italic text-slate-400">Regular fixture performance</span>}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="py-8 text-center text-xs text-[#8B969E] border border-dashed border-[#DCE1E3] rounded-xl">
                    No individual player scores recorded for this fixture.
                  </div>
                )}
              </div>

              {/* Match Notes & Coach Observations */}
              {match.notes && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-[#101820]" />
                    <h4 className="text-xs font-black uppercase tracking-wider text-[#101820]">
                      Match Notes & Coach Observations
                    </h4>
                  </div>
                  <div className="p-4 rounded-xl bg-white border border-[#DCE1E3] text-xs text-[#101820] leading-relaxed whitespace-pre-wrap">
                    {match.notes}
                  </div>
                </div>
              )}

              {/* Audit & System Metadata */}
              <div className="pt-4 border-t border-[#DCE1E3] flex flex-wrap items-center justify-between gap-3 text-[11px] text-[#8B969E]">
                <div className="flex items-center gap-2">
                  <span>Match ID:</span>
                  <code className="font-mono font-semibold text-[#101820] bg-[#F4F3EE] px-2 py-0.5 rounded border border-[#DCE1E3]">
                    {match.id}
                  </code>
                  <button
                    type="button"
                    onClick={copyMatchId}
                    className="p-1 hover:text-[#101820] hover:bg-[#F4F3EE] rounded transition-colors"
                    title="Copy Match ID"
                  >
                    {copiedId ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                </div>

                <div className="flex items-center gap-4 text-[10px] uppercase font-bold tracking-wider">
                  {match.createdAt && (
                    <span>Logged: {new Date(match.createdAt).toLocaleDateString()}</span>
                  )}
                  {match.updatedAt && (
                    <span>Updated: {new Date(match.updatedAt).toLocaleDateString()}</span>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-[#DCE1E3] bg-[#F4F3EE]/50 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs text-[#8B969E]">
            <Clock className="h-3.5 w-3.5" />
            <span>ATHLIX Official Competition Records System</span>
          </div>
          <Button variant="outline" size="sm" onClick={onClose} className="font-bold">
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
