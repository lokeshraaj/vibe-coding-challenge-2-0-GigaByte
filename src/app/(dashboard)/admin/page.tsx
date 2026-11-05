"use client";

import { useEffect, useState } from "react";
import { DashboardShell } from "@/components/shared/dashboard-shell";
import { MetricCard } from "@/components/shared/metric-card";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/status-badge";
import { Building2, Users, UserCheck, Trophy } from "lucide-react";
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
    <DashboardShell allowedRoles={["PLATFORM_ADMIN", "SUPER_ADMIN"]}>
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight uppercase text-[#101820]">
            Platform Super Admin HQ
          </h1>
          <p className="text-xs text-[#8B969E] uppercase tracking-wider mt-1 font-semibold">
            Global Tenant Telemetry & System Health
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
        <Card className="border-[#DCE1E3] bg-white shadow-sm">
          <CardHeader className="pb-4 border-b border-[#DCE1E3]">
            <CardTitle className="text-base flex items-center gap-2 text-[#101820]">
              <Building2 className="h-5 w-5 text-[#101820]" />
              <span>Registered Sports Academy Tenants</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="py-12 text-center text-xs text-[#8B969E]">
                Loading tenants...
              </div>
            ) : stats?.recentAcademies && stats.recentAcademies.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-[#DCE1E3] bg-[#F4F3EE] text-[10px] uppercase font-bold tracking-wider text-[#8B969E]">
                      <th className="p-4">Academy Name</th>
                      <th className="p-4">Tenant Slug</th>
                      <th className="p-4">Location</th>
                      <th className="p-4">Owner Administrator</th>
                      <th className="p-4">Created Date</th>
                      <th className="p-4">Tenant Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#DCE1E3]">
                    {stats.recentAcademies.map((a) => (
                      <tr key={a.id} className="hover:bg-[#F4F3EE] transition-colors">
                        <td className="p-4 font-bold text-[#101820] text-sm">
                          {a.name}
                        </td>
                        <td className="p-4">
                          <code className="text-[#101820] font-mono text-[11px] bg-[#F4F3EE] px-2 py-0.5 rounded border border-[#DCE1E3]">
                            {a.slug}
                          </code>
                        </td>
                        <td className="p-4 text-[#101820] font-medium">
                          {a.city}, {a.country}
                        </td>
                        <td className="p-4 font-semibold text-[#101820]">
                          {a.ownerName}
                        </td>
                        <td className="p-4 text-[#8B969E]">
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
              <div className="py-12 text-center text-xs text-[#8B969E]">
                No academies registered yet.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  );
}
