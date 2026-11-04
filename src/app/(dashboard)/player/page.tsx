"use client";

import { useEffect, useState } from "react";
import { DashboardShell } from "@/components/shared/dashboard-shell";
import { MetricCard } from "@/components/shared/metric-card";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/status-badge";
import { User, Award, CalendarCheck, Trophy, CheckCircle, Clock } from "lucide-react";
import { IEligibilityCalculation } from "@/types";
import { toast } from "sonner";

interface PlayerDashboardData {
  player: {
    id: string;
    name: string;
    playerCode: string;
    sport: string;
    position: string;
  };
  eligibility: IEligibilityCalculation;
  matches: Array<{
    id: string;
    date: string;
    opponentName: string;
    score: number;
    scoreLabel: string;
    result: string;
  }>;
}

export default function PlayerDashboardPage() {
  const [data, setData] = useState<PlayerDashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadPlayerData() {
      try {
        setLoading(true);
        const res = await fetch("/api/dashboard/stats");
        if (res.ok) {
          const json = await res.json();
          setData(json.stats);
        }
      } catch (e) {
        console.error(e);
        toast.error("Failed to load athlete profile");
      } finally {
        setLoading(false);
      }
    }
    loadPlayerData();
  }, []);

  const elig = data?.eligibility;

  return (
    <DashboardShell allowedRoles={["PLAYER"]}>
      <div className="space-y-8 max-w-6xl mx-auto">
        {/* Athlete Hero Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-xl bg-athletic-charcoal border border-athletic-border">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-athletic-lime text-athletic-black font-black text-xl italic shadow-[0_0_20px_rgba(163,255,0,0.3)]">
              <User className="h-7 w-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-black italic tracking-tight uppercase text-white">
                  {data?.player?.name || "Athlete Portal"}
                </h1>
                {elig && <StatusBadge status={elig.status} type="eligibility" />}
              </div>
              <p className="text-xs text-athletic-textMuted uppercase font-bold tracking-wider mt-0.5">
                {data?.player?.playerCode} • {data?.player?.sport} • {data?.player?.position}
              </p>
            </div>
          </div>
        </div>

        {/* Core Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <MetricCard
            title="Practice Attendance Rate"
            value={loading ? "..." : `${elig?.attendancePercentage || 0}%`}
            subtitle={`${elig?.presentSessions || 0} of ${elig?.totalClosedSessions || 0} closed sessions`}
            icon={<CalendarCheck className="h-5 w-5" />}
            highlight={elig?.isAttendanceMet}
          />
          <MetricCard
            title="Matches Played"
            value={loading ? "..." : elig?.matchesPlayed || 0}
            subtitle="Verified official appearances"
            icon={<Trophy className="h-5 w-5" />}
            highlight={elig?.isMatchesMet}
          />
          <MetricCard
            title="Trial Readiness"
            value={loading ? "..." : elig?.status === "READY" ? "READY" : "DEVELOPING"}
            subtitle="Automated scouting qualification"
            icon={<Award className="h-5 w-5" />}
            highlight={elig?.status === "READY"}
          />
        </div>

        {/* Eligibility Verification Checklist Card */}
        {elig && (
          <Card className="border-athletic-border bg-athletic-charcoal">
            <CardHeader className="pb-3 border-b border-athletic-border/70">
              <CardTitle className="text-base flex items-center gap-2">
                <Award className="h-5 w-5 text-athletic-lime" />
                <span>Professional Trial Eligibility Checklist</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Condition 1 */}
                <div className="p-4 rounded-lg bg-athletic-black border border-athletic-border space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-white">
                      1. Attendance Threshold (&ge; 75%)
                    </span>
                    {elig.isAttendanceMet ? (
                      <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                        <CheckCircle className="h-4 w-4" /> Passed
                      </span>
                    ) : (
                      <span className="text-xs font-bold text-amber-400 flex items-center gap-1">
                        <Clock className="h-4 w-4" /> Pending
                      </span>
                    )}
                  </div>
                  <div className="w-full bg-athletic-charcoal h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${elig.isAttendanceMet ? "bg-emerald-400" : "bg-amber-400"}`}
                      style={{ width: `${Math.min(100, elig.attendancePercentage)}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-athletic-textMuted">
                    Current: <strong>{elig.attendancePercentage}%</strong> across {elig.totalClosedSessions} closed sessions.
                  </p>
                </div>

                {/* Condition 2 */}
                <div className="p-4 rounded-lg bg-athletic-black border border-athletic-border space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-white">
                      2. Match Participation (&ge; 2 Matches)
                    </span>
                    {elig.isMatchesMet ? (
                      <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                        <CheckCircle className="h-4 w-4" /> Passed
                      </span>
                    ) : (
                      <span className="text-xs font-bold text-amber-400 flex items-center gap-1">
                        <Clock className="h-4 w-4" /> Pending
                      </span>
                    )}
                  </div>
                  <div className="w-full bg-athletic-charcoal h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${elig.isMatchesMet ? "bg-emerald-400" : "bg-amber-400"}`}
                      style={{ width: `${Math.min(100, (elig.matchesPlayed / 2) * 100)}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-athletic-textMuted">
                    Current: <strong>{elig.matchesPlayed}</strong> of 2 required matches.
                  </p>
                </div>
              </div>

              <div className="p-3 rounded bg-athletic-black/50 text-xs text-athletic-textMuted border border-athletic-border/60">
                <strong>Current Status Reason:</strong> {elig.reasons[0]}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Match History Table */}
        <Card>
          <CardHeader className="pb-3 border-b border-athletic-border/70">
            <CardTitle className="text-base flex items-center gap-2">
              <Trophy className="h-5 w-5 text-athletic-lime" />
              <span>Personal Match History</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="py-8 text-center text-xs text-athletic-textMuted">Loading match history...</div>
            ) : data?.matches && data.matches.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-athletic-border/80 bg-athletic-black/50 text-[10px] uppercase font-black tracking-wider text-athletic-textMuted">
                      <th className="p-4">Match Date</th>
                      <th className="p-4">Opponent</th>
                      <th className="p-4">My Score</th>
                      <th className="p-4">Team Result</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-athletic-border/50">
                    {data.matches.map((m) => (
                      <tr key={m.id} className="hover:bg-athletic-elevated/40 transition-colors">
                        <td className="p-4 font-bold text-white">
                          {new Date(m.date).toLocaleDateString()}
                        </td>
                        <td className="p-4 font-bold text-white">
                          vs {m.opponentName}
                        </td>
                        <td className="p-4">
                          <span className="text-sm font-black text-athletic-lime">
                            {m.score} {m.scoreLabel}
                          </span>
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
              <div className="py-8 text-center text-xs text-athletic-textMuted">
                No match participation records logged yet.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  );
}
