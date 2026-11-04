"use client";

import { useEffect, useState } from "react";
import { DashboardShell } from "@/components/shared/dashboard-shell";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/status-badge";
import { Award, CheckCircle2, AlertTriangle, ShieldCheck } from "lucide-react";
import { IEligibilityCalculation } from "@/types";
import { toast } from "sonner";

export default function CoachEligibilityPage() {
  const [calculations, setCalculations] = useState<IEligibilityCalculation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const res = await fetch("/api/dashboard/stats");
        if (res.ok) {
          const data = await res.json();
          setCalculations(data.stats?.rosterEligibility || []);
        }
      } catch (e) {
        console.error(e);
        toast.error("Failed to calculate eligibility telemetry");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const readyCount = calculations.filter((c) => c.status === "READY").length;
  const notReadyCount = calculations.length - readyCount;

  return (
    <DashboardShell allowedRoles={["COACH"]}>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black italic tracking-tight uppercase text-white">
              TRIAL ELIGIBILITY RADAR
            </h1>
            <p className="text-xs text-athletic-textMuted uppercase tracking-wider mt-1">
              MATHEMATICAL TRIAL READINESS AUDIT (&ge; 75% ATTENDANCE + &ge; 2 MATCHES)
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="px-4 py-2 rounded-lg bg-athletic-charcoal border border-athletic-border text-xs flex items-center gap-4">
              <div>
                <span className="text-[10px] uppercase font-bold text-athletic-textMuted block">
                  Trial Ready
                </span>
                <span className="text-base font-black italic text-athletic-lime">
                  {readyCount} Athletes
                </span>
              </div>
              <div className="w-[1px] h-6 bg-athletic-border" />
              <div>
                <span className="text-[10px] uppercase font-bold text-athletic-textMuted block">
                  Developing
                </span>
                <span className="text-base font-black italic text-white">
                  {notReadyCount} Athletes
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Engine Rules Callout */}
        <div className="p-4 rounded-lg bg-athletic-charcoal border border-athletic-border flex items-start gap-3">
          <ShieldCheck className="h-5 w-5 text-athletic-lime shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <span className="font-bold text-white uppercase tracking-wider block">
              Objective Scouting Criteria:
            </span>
            <p className="text-athletic-textMuted leading-relaxed">
              Athletes become <strong>READY</strong> only when both conditions are strictly satisfied from database records:
              1) Attendance percentage $\ge 75\%$ across closed practice sessions since enrollment;
              2) Participation in at least 2 competitive matches. Status cannot be manually modified.
            </p>
          </div>
        </div>

        {/* Eligibility Table Card */}
        <Card>
          <CardHeader className="pb-4 border-b border-athletic-border/70">
            <CardTitle className="text-base flex items-center gap-2">
              <Award className="h-5 w-5 text-athletic-lime" />
              <span>Squad Evaluation Table ({calculations.length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="py-12 text-center text-xs text-athletic-textMuted">
                Calculating eligibility metrics...
              </div>
            ) : calculations.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-athletic-border/80 bg-athletic-black/50 text-[10px] uppercase font-black tracking-wider text-athletic-textMuted">
                      <th className="p-4">Athlete</th>
                      <th className="p-4">Sport & Position</th>
                      <th className="p-4">Closed Sessions</th>
                      <th className="p-4">Attendance Rate</th>
                      <th className="p-4">Matches Played</th>
                      <th className="p-4">Trial Status</th>
                      <th className="p-4">Eligibility Audit Detail</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-athletic-border/50">
                    {calculations.map((c) => (
                      <tr key={c.playerId} className="hover:bg-athletic-elevated/40 transition-colors">
                        <td className="p-4 font-bold text-white">
                          <div className="text-sm">{c.playerName}</div>
                          <div className="text-[10px] text-athletic-textMuted font-normal">
                            Enrolled: {new Date(c.enrollmentDate).toLocaleDateString()}
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="font-bold text-white uppercase">{c.sport}</div>
                          <div className="text-[10px] text-athletic-textMuted">{c.position}</div>
                        </td>
                        <td className="p-4">
                          <span className="font-semibold text-white">
                            {c.presentSessions} / {c.totalClosedSessions}
                          </span>
                        </td>
                        <td className="p-4">
                          <span
                            className={`font-black text-sm ${
                              c.isAttendanceMet ? "text-emerald-400" : "text-amber-400"
                            }`}
                          >
                            {c.attendancePercentage}%
                          </span>
                          <span className="text-[10px] text-athletic-textMuted ml-1">
                            {c.isAttendanceMet ? "(&ge;75%)" : "(<75%)"}
                          </span>
                        </td>
                        <td className="p-4">
                          <span
                            className={`font-black text-sm ${
                              c.isMatchesMet ? "text-emerald-400" : "text-amber-400"
                            }`}
                          >
                            {c.matchesPlayed}
                          </span>
                          <span className="text-[10px] text-athletic-textMuted ml-1">
                            {c.isMatchesMet ? "(&ge;2)" : "(<2)"}
                          </span>
                        </td>
                        <td className="p-4">
                          <StatusBadge status={c.status} type="eligibility" />
                        </td>
                        <td className="p-4 max-w-xs text-[11px] text-athletic-textMuted font-medium leading-relaxed">
                          {c.reasons[0]}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-12 text-center text-xs text-athletic-textMuted">
                No athletes in roster to evaluate.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  );
}
