"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { DashboardShell } from "@/components/shared/dashboard-shell";
import { MetricCard } from "@/components/shared/metric-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Users, UserCheck, Trophy, CalendarCheck, Award, Plus, ArrowRight } from "lucide-react";

interface OwnerStats {
  totalCoaches: number;
  totalPlayers: number;
  totalSessions: number;
  totalMatches: number;
  readyPlayers: number;
  notReadyPlayers: number;
  sportDistribution: Array<{ sport: string; count: number }>;
  coaches: Array<{ id: string; name: string; sport: string; experienceYears: number }>;
}

export default function OwnerDashboardPage() {
  const [stats, setStats] = useState<OwnerStats | null>(null);
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
        console.error("Failed to load owner stats:", e);
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, []);

  return (
    <DashboardShell allowedRoles={["ACADEMY_OWNER", "PLATFORM_ADMIN"]}>
      <div className="space-y-8">
        {/* Page Title & Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black italic tracking-tight uppercase text-white">
              ACADEMY HEADQUARTERS
            </h1>
            <p className="text-xs text-athletic-textMuted uppercase tracking-wider mt-1">
              TENANT OPERATIONS & TALENT TELEMETRY
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/dashboard/owner/coaches">
              <Button variant="athletic" size="sm" className="gap-2">
                <Plus className="h-4 w-4" />
                <span>Invite Coach</span>
              </Button>
            </Link>
            <Link href="/dashboard/owner/players">
              <Button variant="secondary" size="sm" className="gap-2">
                <Users className="h-4 w-4" />
                <span>View All Players</span>
              </Button>
            </Link>
          </div>
        </div>

        {/* Primary Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard
            title="Active Coaching Staff"
            value={loading ? "..." : stats?.totalCoaches || 0}
            subtitle="Verified coaches in academy"
            icon={<UserCheck className="h-5 w-5" />}
          />
          <MetricCard
            title="Total Enrolled Players"
            value={loading ? "..." : stats?.totalPlayers || 0}
            subtitle="Across all sports disciplines"
            icon={<Users className="h-5 w-5" />}
          />
          <MetricCard
            title="Practice Sessions"
            value={loading ? "..." : stats?.totalSessions || 0}
            subtitle="Locked & logged attendance"
            icon={<CalendarCheck className="h-5 w-5" />}
          />
          <MetricCard
            title="Trial Ready Players"
            value={loading ? "..." : stats?.readyPlayers || 0}
            subtitle={`${stats?.notReadyPlayers || 0} currently developing`}
            icon={<Award className="h-5 w-5" />}
            highlight={true}
          />
        </div>

        {/* Breakdown & Rosters */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Coaching Staff Roster */}
          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <CardTitle className="text-base">Coaching Staff Directory</CardTitle>
              <Link
                href="/dashboard/owner/coaches"
                className="text-xs font-bold text-athletic-lime hover:underline flex items-center gap-1 uppercase"
              >
                <span>Manage Staff</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="py-8 text-center text-xs text-athletic-textMuted">Loading coaches...</div>
              ) : stats?.coaches && stats.coaches.length > 0 ? (
                <div className="space-y-3">
                  {stats.coaches.map((c) => (
                    <div
                      key={c.id}
                      className="flex items-center justify-between p-3.5 rounded-lg bg-athletic-black border border-athletic-border/70"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded bg-athletic-charcoal flex items-center justify-center font-black text-sm text-athletic-lime border border-athletic-border">
                          {c.sport.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="text-sm font-bold text-white">{c.name}</div>
                          <div className="text-[11px] text-athletic-textMuted uppercase font-medium">
                            {c.sport} • {c.experienceYears} Years Experience
                          </div>
                        </div>
                      </div>
                      <StatusBadge status="ACTIVE" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-xs text-athletic-textMuted space-y-3">
                  <p>No coaches registered yet.</p>
                  <Link href="/dashboard/owner/coaches">
                    <Button variant="athletic" size="sm">
                      Invite First Coach
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Sport Distribution */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base">Sports Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="py-8 text-center text-xs text-athletic-textMuted">Loading...</div>
              ) : stats?.sportDistribution && stats.sportDistribution.length > 0 ? (
                <div className="space-y-4">
                  {stats.sportDistribution.map((s) => (
                    <div key={s.sport} className="space-y-1.5">
                      <div className="flex justify-between text-xs font-bold uppercase">
                        <span className="text-white">{s.sport}</span>
                        <span className="text-athletic-lime">{s.count} Players</span>
                      </div>
                      <div className="w-full bg-athletic-black h-2 rounded-full overflow-hidden border border-athletic-border">
                        <div
                          className="bg-athletic-lime h-full rounded-full"
                          style={{
                            width: `${Math.min(100, (s.count / (stats.totalPlayers || 1)) * 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-xs text-athletic-textMuted">
                  No players enrolled yet.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardShell>
  );
}
