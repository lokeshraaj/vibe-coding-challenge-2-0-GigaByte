"use client";

import { useEffect, useState } from "react";
import { DashboardShell } from "@/components/shared/dashboard-shell";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/status-badge";
import { Award, ShieldCheck } from "lucide-react";
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
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight uppercase text-[#101820]">
              Trial Eligibility Radar
            </h1>
            <p className="text-xs text-[#8B969E] uppercase tracking-wider mt-1 font-semibold">
              Mathematical Trial Readiness Audit (&ge; 75% Attendance + &ge; 2 Matches)
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="px-4 py-2 rounded-xl bg-white border border-[#DCE1E3] text-xs flex items-center gap-4 shadow-sm">
              <div>
                <span className="text-[10px] uppercase font-bold text-[#8B969E] block">
                  Trial Ready
                </span>
                <span className="text-base font-extrabold text-[#101820]">
                  {readyCount} Athletes
                </span>
              </div>
              <div className="w-[1px] h-6 bg-[#DCE1E3]" />
              <div>
                <span className="text-[10px] uppercase font-bold text-[#8B969E] block">
                  Developing
                </span>
                <span className="text-base font-extrabold text-[#8B969E]">
                  {notReadyCount} Athletes
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Engine Rules Callout */}
        <div className="p-4 rounded-xl bg-white border border-[#DCE1E3] flex items-start gap-3 shadow-sm">
          <ShieldCheck className="h-5 w-5 text-[#101820] shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <span className="font-bold text-[#101820] uppercase tracking-wider block">
              Objective Scouting Criteria:
            </span>
            <p className="text-[#8B969E] leading-relaxed">
              Athletes become <strong>READY</strong> only when both conditions are strictly satisfied from database records:
              1) Attendance percentage &ge; 75% across closed practice sessions since enrollment;
              2) Participation in at least 2 competitive matches. Status is mathematically enforced and cannot be manually modified.
            </p>
          </div>
        </div>

        {/* Eligibility Table Card */}
        <Card className="border-[#DCE1E3] bg-white shadow-sm">
          <CardHeader className="pb-4 border-b border-[#DCE1E3]">
            <CardTitle className="text-base flex items-center gap-2 text-[#101820]">
              <Award className="h-5 w-5 text-[#101820]" />
              <span>Squad Evaluation Table ({calculations.length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="py-12 text-center text-xs text-[#8B969E]">
                Calculating eligibility metrics...
              </div>
            ) : calculations.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-[#DCE1E3] bg-[#F4F3EE] text-[10px] uppercase font-bold tracking-wider text-[#8B969E]">
                      <th className="p-4">Athlete</th>
                      <th className="p-4">Sport & Position</th>
                      <th className="p-4">Closed Sessions</th>
                      <th className="p-4">Attendance Rate</th>
                      <th className="p-4">Matches Played</th>
                      <th className="p-4">Trial Status</th>
                      <th className="p-4">Eligibility Audit Detail</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#DCE1E3]">
                    {calculations.map((c) => (
                      <tr key={c.playerId} className="hover:bg-[#F4F3EE] transition-colors">
                        <td className="p-4 font-bold text-[#101820]">
                          <div className="text-sm">{c.playerName}</div>
                          <div className="text-[10px] text-[#8B969E] font-medium">
                            Enrolled: {new Date(c.enrollmentDate).toLocaleDateString()}
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="font-bold text-[#101820] uppercase">{c.sport}</div>
                          <div className="text-[10px] text-[#8B969E]">{c.position}</div>
                        </td>
                        <td className="p-4">
                          <span className="font-semibold text-[#101820]">
                            {c.presentSessions} / {c.totalClosedSessions}
                          </span>
                        </td>
                        <td className="p-4">
                          <span
                            className={`font-bold text-sm ${
                              c.isAttendanceMet ? "text-emerald-700" : "text-amber-700"
                            }`}
                          >
                            {c.attendancePercentage}%
                          </span>
                          <span className="text-[10px] text-[#8B969E] ml-1">
                            {c.isAttendanceMet ? "(&ge;75%)" : "(<75%)"}
                          </span>
                        </td>
                        <td className="p-4">
                          <span
                            className={`font-bold text-sm ${
                              c.isMatchesMet ? "text-emerald-700" : "text-amber-700"
                            }`}
                          >
                            {c.matchesPlayed}
                          </span>
                          <span className="text-[10px] text-[#8B969E] ml-1">
                            {c.isMatchesMet ? "(&ge;2)" : "(<2)"}
                          </span>
                        </td>
                        <td className="p-4">
                          <StatusBadge status={c.status} type="eligibility" />
                        </td>
                        <td className="p-4 max-w-xs text-[11px] text-[#8B969E] font-medium leading-relaxed">
                          {c.reasons[0]}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-12 text-center text-xs text-[#8B969E]">
                No athletes in roster to evaluate.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  );
}
