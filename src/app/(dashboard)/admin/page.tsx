"use client";

import { useEffect, useState } from "react";
import { DashboardShell } from "@/components/shared/dashboard-shell";
import { MetricCard } from "@/components/shared/metric-card";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/status-badge";
import { Building2, Users, UserCheck, Trophy, ShieldAlert, Activity } from "lucide-react";
import { toast } from "sonner";

interface AdminStats {
  totalAcademies: number;
  activeAcademies: number;
  totalCoaches: number;
  totalPlayers: number;
  totalMatches: number;
  recentAcademies: Array<{
    id: string;
    name: string;
    slug: string;
    city: string;
    country: string;
    status: string;
    ownerName: string;
    createdAt: string;
  }>;
}

export default function PlatformAdminDashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      try {
        setLoading(true);
        const res = await fetch("/api/dashboard/stats");
        if (res.ok) {
          const data = await res.json();
          setStats(data.stats);
        }
      } catch (e) {
        console.error(e);
        toast.error("Failed to load platform analytics");
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, []);

  return (
    <DashboardShell allowedRoles={["PLATFORM_ADMIN"]}>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-black italic tracking-tight uppercase text-white">
            PLATFORM SUPER ADMIN HQ
          </h1>
          <p className="text-xs text-athletic-textMuted uppercase tracking-wider mt-1">
            GLOBAL TENANT TELEMETRY & SYSTEM HEALTH
          </p>
        </div>

        {/* Global Platform Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard
            title="Registered Academies"
            value={loading ? "..." : stats?.totalAcademies || 0}
            subtitle={`${stats?.activeAcademies || 0} active tenants`}
            icon={<Building2 className="h-5 w-5" />}
            highlight={true}
          />
          <MetricCard
            title="Total Coaching Staff"
            value={loading ? "..." : stats?.totalCoaches || 0}
            subtitle="Platform-wide active coaches"
            icon={<UserCheck className="h-5 w-5" />}
          />
          <MetricCard
            title="Total Athletes"
            value={loading ? "..." : stats?.totalPlayers || 0}
            subtitle="Enrolled across all academies"
            icon={<Users className="h-5 w-5" />}
          />
          <MetricCard
            title="Matches Logged"
            value={loading ? "..." : stats?.totalMatches || 0}
            subtitle="Official competitive records"
            icon={<Trophy className="h-5 w-5" />}
          />
        </div>

        {/* Recent Academies Directory */}
        <Card>
          <CardHeader className="pb-4 border-b border-athletic-border/70">
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="h-5 w-5 text-athletic-lime" />
              <span>Registered Sports Academy Tenants</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="py-12 text-center text-xs text-athletic-textMuted">
                Loading tenants...
              </div>
            ) : stats?.recentAcademies && stats.recentAcademies.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-athletic-border/80 bg-athletic-black/50 text-[10px] uppercase font-black tracking-wider text-athletic-textMuted">
                      <th className="p-4">Academy Name</th>
                      <th className="p-4">Tenant Slug</th>
                      <th className="p-4">Location</th>
                      <th className="p-4">Owner Administrator</th>
                      <th className="p-4">Created Date</th>
                      <th className="p-4">Tenant Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-athletic-border/50">
                    {stats.recentAcademies.map((a) => (
                      <tr key={a.id} className="hover:bg-athletic-elevated/40 transition-colors">
                        <td className="p-4 font-bold text-white text-sm">
                          {a.name}
                        </td>
                        <td className="p-4">
                          <code className="text-athletic-lime font-mono text-[11px] bg-athletic-black px-2 py-0.5 rounded border border-athletic-border">
                            {a.slug}
                          </code>
                        </td>
                        <td className="p-4 text-white font-medium">
                          {a.city}, {a.country}
                        </td>
                        <td className="p-4 font-semibold text-white">
                          {a.ownerName}
                        </td>
                        <td className="p-4 text-athletic-textMuted">
                          {new Date(a.createdAt).toLocaleDateString()}
                        </td>
                        <td className="p-4">
                          <StatusBadge status={a.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-12 text-center text-xs text-athletic-textMuted">
                No academies registered yet.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  );
}
