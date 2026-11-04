"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { DashboardShell } from "@/components/shared/dashboard-shell";
import { MetricCard } from "@/components/shared/metric-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Users, UserCheck, CalendarCheck, Award, Plus, ArrowRight } from "lucide-react";

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
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight uppercase text-[#101820]">
              Academy Headquarters
            </h1>
            <p className="text-xs text-[#8B969E] uppercase tracking-wider mt-1 font-semibold">
              Tenant Operations & Talent Telemetry
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/owner/coaches">
              <Button variant="athletic" size="sm" className="gap-2 font-bold shadow-sm">
                <Plus className="h-4 w-4" />
                <span>Invite Coach</span>
              </Button>
            </Link>
            <Link href="/owner/players">
              <Button
                variant="outline"
                size="sm"
                className="gap-2 border-[#DCE1E3] bg-white text-[#101820] hover:bg-[#F4F3EE]"
              >
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
          <Card className="lg:col-span-2 border-[#DCE1E3] bg-white shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-4 border-b border-[#DCE1E3]">
              <CardTitle className="text-base font-bold text-[#101820]">
                Coaching Staff Directory
              </CardTitle>
              <Link
                href="/owner/coaches"
                className="text-xs font-bold text-[#101820] hover:underline flex items-center gap-1 uppercase"
              >
                <span>Manage Staff</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </CardHeader>
            <CardContent className="pt-4">
              {loading ? (
                <div className="py-8 text-center text-xs text-[#8B969E]">Loading coaches...</div>
              ) : stats?.coaches && stats.coaches.length > 0 ? (
                <div className="space-y-3">
                  {stats.coaches.map((c) => (
                    <div
                      key={c.id}
                      className="flex items-center justify-between p-3.5 rounded-lg bg-[#F4F3EE] border border-[#DCE1E3]"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-lg bg-white flex items-center justify-center font-bold text-xs text-[#101820] border border-[#DCE1E3]">
                          {c.sport.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="text-sm font-bold text-[#101820]">{c.name}</div>
                          <div className="text-[11px] text-[#8B969E] uppercase font-medium">
                            {c.sport} • {c.experienceYears} Years Experience
                          </div>
                        </div>
                      </div>
                      <StatusBadge status="ACTIVE" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-xs text-[#8B969E] space-y-3">
                  <p>No coaches registered yet.</p>
                  <Link href="/owner/coaches">
                    <Button variant="athletic" size="sm">
                      Invite First Coach
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Sport Distribution */}
          <Card className="border-[#DCE1E3] bg-white shadow-sm">
            <CardHeader className="pb-4 border-b border-[#DCE1E3]">
              <CardTitle className="text-base font-bold text-[#101820]">Sports Distribution</CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              {loading ? (
                <div className="py-8 text-center text-xs text-[#8B969E]">Loading...</div>
              ) : stats?.sportDistribution && stats.sportDistribution.length > 0 ? (
                <div className="space-y-4">
                  {stats.sportDistribution.map((s) => (
                    <div key={s.sport} className="space-y-1.5">
                      <div className="flex justify-between text-xs font-bold uppercase">
                        <span className="text-[#101820]">{s.sport}</span>
                        <span className="text-[#101820] font-extrabold">{s.count} Players</span>
                      </div>
                      <div className="w-full bg-[#F4F3EE] h-2 rounded-full overflow-hidden border border-[#DCE1E3]">
                        <div
                          className="bg-[#C6F432] h-full rounded-full"
                          style={{
                            width: `${Math.min(100, (s.count / (stats.totalPlayers || 1)) * 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-xs text-[#8B969E]">
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
