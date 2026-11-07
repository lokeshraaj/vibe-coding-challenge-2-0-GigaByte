"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { DashboardShell } from "@/components/shared/dashboard-shell";
import { MetricCard } from "@/components/shared/metric-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { RestrictionInfo } from "@/components/ui/feature-lock-info";
import { Users, CalendarCheck, Trophy, Award, ArrowRight, Shield } from "lucide-react";

interface CoachStats {
  assignedSport?: string;
  assignedPlayersCount: number;
  readyCount: number;
  notReadyCount: number;
  recentSessions: Array<{
    id: string;
    sport: string;
    date: string;
    title: string;
    status: string;
  }>;
  recentMatches: Array<{
    id: string;
    sport: string;
    opponentName: string;
    result: string;
    date: string;
    score: string;
  }>;
}

export default function CoachDashboardPage() {
  const [stats, setStats] = useState<CoachStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch("/api/dashboard/stats");
        if (res.ok) {
          const data = await res.json();
          setStats(data.stats);
        }
      } catch (e) {
        console.error("Failed to load coach stats:", e);
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, []);

  return (
    <DashboardShell allowedRoles={["COACH"]}>
      <div className="space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap">
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold tracking-tight uppercase text-[#101820]">
                Coach Desk & Squad Command
              </h1>
              {stats?.assignedSport && (
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-[#C6F432] text-[#101820] border border-[#101820] shadow-2xs uppercase tracking-wider">
                    <Shield className="h-3.5 w-3.5" />
                    {stats.assignedSport} Discipline
                  </span>
                  <RestrictionInfo
                    category="SPORT"
                    title="Sport Discipline Restriction"
                    reason={`Your coach account is assigned to ${stats.assignedSport}. Your squad roster, practice sessions, and match scoring are strictly restricted to this sport discipline.`}
                    whoCanChange="Academy Administrator or Super Admin"
                    suggestedAction="Contact your academy administrator if your sport discipline needs to be updated."
                    size="xs"
                  />
                </div>
              )}
            </div>
            <p className="text-xs text-[#8B969E] uppercase tracking-wider mt-1 font-semibold">
              Daily Practice Attendance & Match Operations • Sport-Level Data Isolation Enforced
            </p>
          </div>

          <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap">
            <Link href="/coach/sessions" className="w-full sm:w-auto">
              <Button variant="athletic" size="sm" className="w-full sm:w-auto gap-2 font-bold shadow-sm min-h-[40px]">
                <CalendarCheck className="h-4 w-4" />
                <span>Practice Sessions</span>
              </Button>
            </Link>
            <Link href="/coach/matches" className="w-full sm:w-auto">
              <Button
                variant="outline"
                size="sm"
                className="w-full sm:w-auto gap-2 border-[#DCE1E3] bg-white text-[#101820] hover:bg-[#F4F3EE] min-h-[40px]"
              >
                <Trophy className="h-4 w-4" />
                <span>Record Match</span>
              </Button>
            </Link>
          </div>
        </div>

        {/* Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard
            title="Assigned Roster"
            value={loading ? "..." : stats?.assignedPlayersCount || 0}
            subtitle={stats?.assignedSport ? `${stats.assignedSport} athletes in your squad` : "Active athletes under your training"}
            icon={<Users className="h-5 w-5" />}
          />
          <MetricCard
            title="Trial Ready Athletes"
            value={loading ? "..." : stats?.readyCount || 0}
            subtitle="≥ 75% attendance + ≥ 2 matches"
            icon={<Award className="h-5 w-5" />}
            highlight={true}
          />
          <MetricCard
            title="Developing Athletes"
            value={loading ? "..." : stats?.notReadyCount || 0}
            subtitle="Working towards trial eligibility"
            icon={<Users className="h-5 w-5" />}
          />
          <MetricCard
            title="Matches Recorded"
            value={loading ? "..." : stats?.recentMatches?.length || 0}
            subtitle={stats?.assignedSport ? `Verified ${stats.assignedSport} matches` : "Verified competitive records"}
            icon={<Trophy className="h-5 w-5" />}
          />
        </div>

        {/* Recent Practice & Matches */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Practice Sessions */}
          <Card className="border-[#DCE1E3] bg-white shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-4 border-b border-[#DCE1E3]">
              <CardTitle className="text-base flex items-center gap-2 text-[#101820]">
                <CalendarCheck className="h-5 w-5 text-[#101820]" />
                <span>Recent Practice Sessions</span>
              </CardTitle>
              <Link
                href="/coach/sessions"
                className="text-xs font-bold text-[#101820] hover:underline flex items-center gap-1 uppercase"
              >
                <span>View All</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </CardHeader>
            <CardContent className="pt-4">
              {loading ? (
                <div className="py-8 text-center text-xs text-[#8B969E]">Loading...</div>
              ) : stats?.recentSessions && stats.recentSessions.length > 0 ? (
                <div className="space-y-3">
                  {stats.recentSessions.map((s) => (
                    <div
                      key={s.id}
                      className="flex items-center justify-between p-3.5 rounded-lg bg-[#F4F3EE] border border-[#DCE1E3]"
                    >
                      <div>
                        <div className="text-sm font-bold text-[#101820]">{s.title || "Practice Session"}</div>
                        <div className="text-[11px] text-[#8B969E]">
                          {new Date(s.date).toLocaleDateString()} • {s.sport}
                        </div>
                      </div>
                      <StatusBadge status={s.status} type="session" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-xs text-[#8B969E] space-y-3">
                  <p>No practice sessions recorded yet.</p>
                  <Link href="/coach/sessions">
                    <Button variant="athletic" size="sm">
                      Create Practice Session
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Matches */}
          <Card className="border-[#DCE1E3] bg-white shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-4 border-b border-[#DCE1E3]">
              <CardTitle className="text-base flex items-center gap-2 text-[#101820]">
                <Trophy className="h-5 w-5 text-[#101820]" />
                <span>Recent Match Records</span>
              </CardTitle>
              <Link
                href="/coach/matches"
                className="text-xs font-bold text-[#101820] hover:underline flex items-center gap-1 uppercase"
              >
                <span>View All</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </CardHeader>
            <CardContent className="pt-4">
              {loading ? (
                <div className="py-8 text-center text-xs text-[#8B969E]">Loading...</div>
              ) : stats?.recentMatches && stats.recentMatches.length > 0 ? (
                <div className="space-y-3">
                  {stats.recentMatches.map((m) => (
                    <div
                      key={m.id}
                      className="flex items-center justify-between p-3.5 rounded-lg bg-[#F4F3EE] border border-[#DCE1E3]"
                    >
                      <div>
                        <div className="text-sm font-bold text-[#101820]">vs {m.opponentName}</div>
                        <div className="text-[11px] text-[#8B969E]">
                          {new Date(m.date).toLocaleDateString()} • Score: {m.score}
                        </div>
                      </div>
                      <StatusBadge status={m.result} type="match" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-xs text-[#8B969E] space-y-3">
                  <p>No matches recorded yet.</p>
                  <Link href="/coach/matches">
                    <Button variant="outline" size="sm" className="border-[#DCE1E3] bg-white text-[#101820]">
                      Record Match Performance
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardShell>
  );
}
