"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { DashboardShell } from "@/components/shared/dashboard-shell";
import { MetricCard } from "@/components/shared/metric-card";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/status-badge";
import { RestrictionInfo } from "@/components/ui/feature-lock-info";
import {
  Building2,
  Users,
  UserCheck,
  Trophy,
  ShieldAlert,
  TrendingUp,
  AlertTriangle,
  ArrowRight,
  Activity,
  Calendar,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

interface AdminStats {
  academies: {
    total: number;
    active: number;
    blocked: number;
    suspended: number;
    pending: number;
  };
  coaches: {
    total: number;
    active: number;
    inactive: number;
  };
  players: {
    total: number;
    active: number;
    injured: number;
    deactivated: number;
  };
  scouts: {
    total: number;
    active: number;
  };
  owners: {
    total: number;
  };
  matches: {
    total: number;
  };
  users: {
    total: number;
    active: number;
    blocked: number;
    pending: number;
    deactivated: number;
  };
  registrationAnalytics: {
    today: number;
    thisWeek: number;
    thisMonth: number;
    timeline: Array<{
      date: string;
      academies: number;
      coaches: number;
      players: number;
      total: number;
    }>;
  };
  recentActivities: Array<{
    id: string;
    action: string;
    resourceType: string;
    resourceId?: string;
    reason?: string;
    actorName: string;
    actorRole: string;
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
        const res = await fetch("/api/admin/stats");
        if (res.ok) {
          const data = await res.json();
          setStats(data.stats);
        } else {
          // Fallback to legacy dashboard stats if admin stats fails
          const fallbackRes = await fetch("/api/dashboard/stats");
          if (fallbackRes.ok) {
            const data = await fallbackRes.json();
            const s = data.stats;
            setStats({
              academies: { total: s.totalAcademies, active: s.activeAcademies, blocked: 0, suspended: 0, pending: 0 },
              coaches: { total: s.totalCoaches, active: s.totalCoaches, inactive: 0 },
              players: { total: s.totalPlayers, active: s.totalPlayers, injured: 0, deactivated: 0 },
              scouts: { total: 0, active: 0 },
              owners: { total: s.totalAcademies },
              matches: { total: s.totalMatches },
              users: { total: s.totalCoaches + s.totalPlayers, active: s.totalCoaches + s.totalPlayers, blocked: 0, pending: 0, deactivated: 0 },
              registrationAnalytics: { today: 0, thisWeek: 0, thisMonth: 0, timeline: [] },
              recentActivities: [],
            });
          }
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

  const maxTimelineTotal = Math.max(
    ...(stats?.registrationAnalytics?.timeline?.map((t) => t.total) || [1]),
    1
  );

  return (
    <DashboardShell allowedRoles={["PLATFORM_ADMIN", "SUPER_ADMIN"]}>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#DCE1E3] pb-6">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded bg-[#C6F432]/30 border border-[#C6F432] text-[#101820] text-[10px] font-black uppercase tracking-widest mb-2">
              <ShieldAlert className="h-3 w-3" />
              <span>Platform Super Admin Authority</span>
              <RestrictionInfo
                category="ROLE"
                title="Super Administrator Scope"
                reason="Global administrative authority active. You have full multi-tenant visibility and management across all registered academies and accounts."
                whoCanChange="Platform Root Security"
                suggestedAction="Use settings and security panels for global configuration changes."
                size="xs"
              />
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight uppercase text-[#101820]">
              Platform Super Admin HQ
            </h1>
            <p className="text-xs text-[#8B969E] uppercase tracking-wider mt-1 font-semibold">
              Global Multi-Tenant Telemetry, Security & System Health
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/admin/academies"
              className="px-4 py-2 bg-[#101820] text-white hover:bg-black rounded text-xs font-bold uppercase tracking-wider transition-colors inline-flex items-center gap-2"
            >
              <Building2 className="h-3.5 w-3.5" />
              Manage Academies
            </Link>
            <Link
              href="/admin/users"
              className="px-4 py-2 bg-white border border-[#DCE1E3] text-[#101820] hover:bg-[#F4F3EE] rounded text-xs font-bold uppercase tracking-wider transition-colors inline-flex items-center gap-2"
            >
              <Users className="h-3.5 w-3.5" />
              Users Directory
            </Link>
          </div>
        </div>

        {/* Global Platform Primary Metrics */}
        <div>
          <h2 className="text-xs font-bold uppercase tracking-widest text-[#8B969E] mb-4">
            Platform-Wide Capacity & Status
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <MetricCard
              title="Registered Academies"
              value={loading ? "..." : stats?.academies?.total || 0}
              subtitle={`${stats?.academies?.active || 0} active | ${stats?.academies?.blocked || 0} blocked`}
              icon={<Building2 className="h-5 w-5" />}
              highlight={true}
            />
            <MetricCard
              title="Total Coaching Staff"
              value={loading ? "..." : stats?.coaches?.total || 0}
              subtitle={`${stats?.coaches?.active || 0} active coaches worldwide`}
              icon={<UserCheck className="h-5 w-5" />}
            />
            <MetricCard
              title="Total Athletes"
              value={loading ? "..." : stats?.players?.total || 0}
              subtitle={`${stats?.players?.active || 0} active | ${stats?.players?.injured || 0} injured`}
              icon={<Users className="h-5 w-5" />}
            />
            <MetricCard
              title="Matches Logged"
              value={loading ? "..." : stats?.matches?.total || 0}
              subtitle="Official competitive records"
              icon={<Trophy className="h-5 w-5" />}
            />
          </div>
        </div>

        {/* User Account Status & Security Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card className="border-[#DCE1E3] bg-white p-4">
            <div className="text-[10px] font-bold uppercase tracking-wider text-[#8B969E]">Total Users</div>
            <div className="text-xl font-black text-[#101820] mt-1">{loading ? "..." : stats?.users?.total || 0}</div>
            <div className="text-[11px] text-[#8B969E] mt-0.5">Across all roles</div>
          </Card>
          <Card className="border-[#DCE1E3] bg-white p-4">
            <div className="text-[10px] font-bold uppercase tracking-wider text-[#8B969E]">Active Accounts</div>
            <div className="text-xl font-black text-[#15803d] mt-1">{loading ? "..." : stats?.users?.active || 0}</div>
            <div className="text-[11px] text-[#8B969E] mt-0.5">Verified & active</div>
          </Card>
          <Card className="border-[#DCE1E3] bg-white p-4">
            <div className="text-[10px] font-bold uppercase tracking-wider text-[#8B969E]">Blocked Accounts</div>
            <div className="text-xl font-black text-[#b91c1c] mt-1">{loading ? "..." : stats?.users?.blocked || 0}</div>
            <div className="text-[11px] text-[#8B969E] mt-0.5">Access suspended</div>
          </Card>
          <Card className="border-[#DCE1E3] bg-white p-4">
            <div className="text-[10px] font-bold uppercase tracking-wider text-[#8B969E]">Pending Verification</div>
            <div className="text-xl font-black text-[#d97706] mt-1">{loading ? "..." : stats?.users?.pending || 0}</div>
            <div className="text-[11px] text-[#8B969E] mt-0.5">Awaiting ID completion</div>
          </Card>
        </div>

        {/* Registration Analytics & Growth Velocity */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="border-[#DCE1E3] bg-white lg:col-span-2 shadow-sm">
            <CardHeader className="border-b border-[#DCE1E3] pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-bold uppercase text-[#101820] flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-[#101820]" />
                  <span>14-Day Registration Velocity</span>
                </CardTitle>
                <div className="flex items-center gap-4 text-[11px] font-bold">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#101820]" />
                    <span className="text-[#8B969E]">Total Signups</span>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              {loading ? (
                <div className="py-16 text-center text-xs text-[#8B969E]">Loading telemetry...</div>
              ) : stats?.registrationAnalytics?.timeline && stats.registrationAnalytics.timeline.length > 0 ? (
                <div className="space-y-4">
                  <div className="h-44 flex items-end gap-2 pt-4 px-2">
                    {stats.registrationAnalytics.timeline.map((item) => {
                      const heightPercent = Math.max(8, Math.round((item.total / maxTimelineTotal) * 100));
                      return (
                        <div key={item.date} className="flex-1 flex flex-col items-center gap-2 group relative">
                          {/* Tooltip */}
                          <div className="absolute -top-10 opacity-0 group-hover:opacity-100 transition-opacity bg-[#101820] text-white text-[10px] px-2 py-1 rounded whitespace-nowrap z-10 pointer-events-none">
                            {item.date}: {item.total} registrations
                          </div>
                          <div
                            className="w-full bg-[#101820] hover:bg-[#C6F432] transition-colors rounded-t-sm"
                            style={{ height: `${heightPercent}%` }}
                          />
                          <span className="text-[9px] font-mono text-[#8B969E] truncate w-full text-center">
                            {item.date.split("-").slice(1).join("/")}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="py-16 text-center text-xs text-[#8B969E]">No registration velocity recorded yet.</div>
              )}
            </CardContent>
          </Card>

          {/* Registration Velocity Summary */}
          <Card className="border-[#DCE1E3] bg-white shadow-sm flex flex-col justify-between">
            <CardHeader className="border-b border-[#DCE1E3] pb-4">
              <CardTitle className="text-sm font-bold uppercase text-[#101820] flex items-center gap-2">
                <Calendar className="h-4 w-4 text-[#101820]" />
                <span>Onboarding Velocity</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="py-6 space-y-6">
              <div className="p-4 bg-[#F4F3EE] rounded-lg border border-[#DCE1E3]">
                <div className="text-[10px] font-bold uppercase tracking-wider text-[#8B969E]">Today</div>
                <div className="text-2xl font-black text-[#101820] mt-1">
                  +{loading ? "..." : stats?.registrationAnalytics?.today || 0}
                </div>
                <p className="text-[11px] text-[#8B969E] mt-0.5">New users onboarded today</p>
              </div>

              <div className="p-4 bg-[#F4F3EE] rounded-lg border border-[#DCE1E3]">
                <div className="text-[10px] font-bold uppercase tracking-wider text-[#8B969E]">Last 7 Days</div>
                <div className="text-2xl font-black text-[#101820] mt-1">
                  +{loading ? "..." : stats?.registrationAnalytics?.thisWeek || 0}
                </div>
                <p className="text-[11px] text-[#8B969E] mt-0.5">Weekly onboarding volume</p>
              </div>

              <div className="p-4 bg-[#F4F3EE] rounded-lg border border-[#DCE1E3]">
                <div className="text-[10px] font-bold uppercase tracking-wider text-[#8B969E]">Last 30 Days</div>
                <div className="text-2xl font-black text-[#101820] mt-1">
                  +{loading ? "..." : stats?.registrationAnalytics?.thisMonth || 0}
                </div>
                <p className="text-[11px] text-[#8B969E] mt-0.5">Monthly platform expansion</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Administration Hub */}
        <div>
          <h2 className="text-xs font-bold uppercase tracking-widest text-[#8B969E] mb-4">
            Platform Command Modules
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link
              href="/admin/academies"
              className="p-5 bg-white border border-[#DCE1E3] hover:border-[#101820] rounded-lg transition-all group shadow-xs"
            >
              <div className="flex items-center justify-between">
                <Building2 className="h-6 w-6 text-[#101820]" />
                <ArrowRight className="h-4 w-4 text-[#8B969E] group-hover:translate-x-1 group-hover:text-[#101820] transition-all" />
              </div>
              <div className="mt-4 font-bold text-sm text-[#101820]">Academies Directory</div>
              <div className="text-xs text-[#8B969E] mt-1">Inspect, block, suspend, or cascade-delete academy tenants</div>
            </Link>

            <Link
              href="/admin/users"
              className="p-5 bg-white border border-[#DCE1E3] hover:border-[#101820] rounded-lg transition-all group shadow-xs"
            >
              <div className="flex items-center justify-between">
                <Users className="h-6 w-6 text-[#101820]" />
                <ArrowRight className="h-4 w-4 text-[#8B969E] group-hover:translate-x-1 group-hover:text-[#101820] transition-all" />
              </div>
              <div className="mt-4 font-bold text-sm text-[#101820]">User Governance</div>
              <div className="text-xs text-[#8B969E] mt-1">Global user directory, profile inspections, and individual blocks</div>
            </Link>

            <Link
              href="/admin/verification"
              className="p-5 bg-white border border-[#DCE1E3] hover:border-[#101820] rounded-lg transition-all group shadow-xs"
            >
              <div className="flex items-center justify-between">
                <UserCheck className="h-6 w-6 text-[#101820]" />
                <ArrowRight className="h-4 w-4 text-[#8B969E] group-hover:translate-x-1 group-hover:text-[#101820] transition-all" />
              </div>
              <div className="mt-4 font-bold text-sm text-[#101820]">Verification Queue</div>
              <div className="text-xs text-[#8B969E] mt-1">Audit Coach IDs, Player IDs, and registration records</div>
            </Link>

            <Link
              href="/admin/security"
              className="p-5 bg-white border border-[#DCE1E3] hover:border-[#101820] rounded-lg transition-all group shadow-xs"
            >
              <div className="flex items-center justify-between">
                <ShieldAlert className="h-6 w-6 text-[#101820]" />
                <ArrowRight className="h-4 w-4 text-[#8B969E] group-hover:translate-x-1 group-hover:text-[#101820] transition-all" />
              </div>
              <div className="mt-4 font-bold text-sm text-[#101820]">Security & Audit Trail</div>
              <div className="text-xs text-[#8B969E] mt-1">Live audit log inspection and critical security event telemetry</div>
            </Link>
          </div>
        </div>

        {/* Recent Audit Activities Feed */}
        <Card className="border-[#DCE1E3] bg-white shadow-sm">
          <CardHeader className="border-b border-[#DCE1E3] pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-bold uppercase text-[#101820] flex items-center gap-2">
                <Activity className="h-4 w-4 text-[#101820]" />
                <span>Live Platform Audit Trail</span>
              </CardTitle>
              <Link
                href="/admin/security"
                className="text-xs font-bold uppercase text-[#101820] hover:underline"
              >
                View Full Audit Logs &rarr;
              </Link>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="py-12 text-center text-xs text-[#8B969E]">Loading platform activities...</div>
            ) : stats?.recentActivities && stats.recentActivities.length > 0 ? (
              <div className="divide-y divide-[#DCE1E3]">
                {stats.recentActivities.map((act) => (
                  <div key={act.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[#F4F3EE]/50 transition-colors">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5">
                        {act.action.includes("BLOCK") || act.action.includes("DELETE") ? (
                          <XCircle className="h-4 w-4 text-red-600" />
                        ) : (
                          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        )}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-[#101820]">
                          {act.action.replace(/_/g, " ")}
                        </div>
                        <div className="text-[11px] text-[#8B969E] mt-0.5">
                          Target: <span className="font-mono">{act.resourceType}</span> {act.resourceId && `(${act.resourceId.slice(-6)})`}
                          {act.reason && ` • "${act.reason}"`}
                        </div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-[11px] font-semibold text-[#101820]">{act.actorName}</div>
                      <div className="text-[10px] text-[#8B969E]">{new Date(act.createdAt).toLocaleString()}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center text-xs text-[#8B969E]">No recent activity logs recorded yet.</div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  );
}
