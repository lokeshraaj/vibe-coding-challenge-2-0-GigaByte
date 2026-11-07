"use client";

import { useEffect, useState } from "react";
import { DashboardShell } from "@/components/shared/dashboard-shell";
import { MetricCard } from "@/components/shared/metric-card";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/status-badge";
import { RestrictionInfo } from "@/components/ui/feature-lock-info";
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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-white border border-[#DCE1E3] shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex h-13 w-13 items-center justify-center rounded-xl bg-[#C6F432] text-[#101820] font-bold shadow-xs">
              <User className="h-6 w-6 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight uppercase text-[#101820]">
                  {data?.player?.name || "Athlete Portal"}
                </h1>
                {elig && (
                  <div className="flex items-center gap-1.5">
                    <StatusBadge status={elig.status} type="eligibility" />
                    <RestrictionInfo
                      category={elig.status === "READY" ? "STATUS" : "PREREQUISITE"}
                      title={elig.status === "READY" ? "Trial Ready Certified" : "Trial Qualification Pending"}
                      reason={
                        elig.status === "READY"
                          ? "You have satisfied both conditions: >= 75% attendance and >= 2 matches. Your profile is now visible on the talent scout radar."
                          : elig.reasons?.join(". ") || "Both 75% attendance and 2 match appearances are required to unlock scout visibility."
                      }
                      whoCanChange="Assigned Squad Coach"
                      suggestedAction="Attend scheduled practice sessions and participate in matches to achieve qualification."
                      size="xs"
                    />
                  </div>
                )}
              </div>
              <p className="text-xs text-[#8B969E] uppercase font-bold tracking-wider mt-0.5">
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
          <Card className="border-[#DCE1E3] bg-white shadow-sm">
            <CardHeader className="pb-3 border-b border-[#DCE1E3]">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2 text-[#101820]">
                  <Award className="h-5 w-5 text-[#101820]" />
                  <span>Professional Trial Eligibility Checklist</span>
                </CardTitle>
                <RestrictionInfo
                  category="ROLE"
                  title="Scouting Gate Rules"
                  reason="Scouts can only discover and contact athletes who have passed both conditions on this checklist."
                  whoCanChange="Assigned Squad Coach"
                  suggestedAction="Maintain attendance above 75% and ensure match appearances are officially recorded."
                  size="xs"
                />
              </div>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Condition 1 */}
                <div className="p-4 rounded-xl bg-[#F4F3EE] border border-[#DCE1E3] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#101820]">
                      1. Attendance Threshold (&ge; 75%)
                    </span>
                    {elig.isAttendanceMet ? (
                      <span className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                        <CheckCircle className="h-4 w-4" /> Passed
                      </span>
                    ) : (
                      <span className="text-xs font-bold text-amber-700 flex items-center gap-1">
                        <Clock className="h-4 w-4" /> Pending
                      </span>
                    )}
                  </div>
                  <div className="w-full bg-[#DCE1E3] h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${elig.isAttendanceMet ? "bg-emerald-600" : "bg-amber-500"}`}
                      style={{ width: `${Math.min(100, elig.attendancePercentage)}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-[#8B969E]">
                    Current: <strong className="text-[#101820]">{elig.attendancePercentage}%</strong> across {elig.totalClosedSessions} closed sessions.
                  </p>
                </div>

                {/* Condition 2 */}
                <div className="p-4 rounded-xl bg-[#F4F3EE] border border-[#DCE1E3] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#101820]">
                      2. Match Participation (&ge; 2 Matches)
                    </span>
                    {elig.isMatchesMet ? (
                      <span className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                        <CheckCircle className="h-4 w-4" /> Passed
                      </span>
                    ) : (
                      <span className="text-xs font-bold text-amber-700 flex items-center gap-1">
                        <Clock className="h-4 w-4" /> Pending
                      </span>
                    )}
                  </div>
                  <div className="w-full bg-[#DCE1E3] h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${elig.isMatchesMet ? "bg-emerald-600" : "bg-amber-500"}`}
                      style={{ width: `${Math.min(100, (elig.matchesPlayed / 2) * 100)}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-[#8B969E]">
                    Current: <strong className="text-[#101820]">{elig.matchesPlayed}</strong> of 2 required matches.
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-lg bg-[#F4F3EE] text-xs text-[#8B969E] border border-[#DCE1E3]">
                <strong className="text-[#101820]">Current Status Reason:</strong> {elig.reasons[0]}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Match History Table */}
        <Card className="border-[#DCE1E3] bg-white shadow-sm">
          <CardHeader className="pb-3 border-b border-[#DCE1E3]">
            <CardTitle className="text-base flex items-center gap-2 text-[#101820]">
              <Trophy className="h-5 w-5 text-[#101820]" />
              <span>Personal Match History</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="py-8 text-center text-xs text-[#8B969E]">Loading match history...</div>
            ) : data?.matches && data.matches.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-[#DCE1E3] bg-[#F4F3EE] text-[10px] uppercase font-bold tracking-wider text-[#8B969E]">
                      <th className="p-4">Match Date</th>
                      <th className="p-4">Opponent</th>
                      <th className="p-4">My Score</th>
                      <th className="p-4">Team Result</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#DCE1E3]">
                    {data.matches.map((m) => (
                      <tr key={m.id} className="hover:bg-[#F4F3EE] transition-colors">
                        <td className="p-4 font-bold text-[#101820]">
                          {new Date(m.date).toLocaleDateString()}
                        </td>
                        <td className="p-4 font-bold text-[#101820]">
                          vs {m.opponentName}
                        </td>
                        <td className="p-4">
                          <span className="text-sm font-extrabold text-[#101820]">
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
              <div className="py-8 text-center text-xs text-[#8B969E]">
                No match participation records logged yet.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  );
}
