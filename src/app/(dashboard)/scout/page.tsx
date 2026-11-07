"use client";

import { useEffect, useState } from "react";
import { DashboardShell } from "@/components/shared/dashboard-shell";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/status-badge";
import { RestrictionInfo } from "@/components/ui/feature-lock-info";
import { Search, Award, ShieldCheck, UserCheck, Shield } from "lucide-react";
import { IEligibilityCalculation } from "@/types";
import { toast } from "sonner";

export default function ScoutDashboardPage() {
  const [eligiblePlayers, setEligiblePlayers] = useState<IEligibilityCalculation[]>([]);
  const [assignedCoach, setAssignedCoach] = useState<{ id: string; name: string; sport: string } | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchScoutDirectory = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.set("search", search);

      const res = await fetch(`/api/scout/talent-directory?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setEligiblePlayers(data.eligiblePlayers || []);
      }

      // Also get scout stats for assigned coach info and assigned sport
      const statsRes = await fetch("/api/dashboard/stats");
      if (statsRes.ok) {
        const sData = await statsRes.json();
        setAssignedCoach(sData.stats?.assignedCoach || null);
      }
    } catch (e) {
      console.error(e);
      toast.error("Failed to load scout talent radar");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchScoutDirectory();
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchScoutDirectory();
  };

  return (
    <DashboardShell allowedRoles={["SCOUT"]}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight uppercase text-[#101820]">
                Talent Scout Radar
              </h1>
              {assignedCoach?.sport && (
                <div className="flex items-center gap-1.5">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-[#C6F432] text-[#101820] border border-[#101820] uppercase tracking-wider">
                    <Shield className="h-3.5 w-3.5" />
                    {assignedCoach.sport} Discipline
                  </span>
                  <RestrictionInfo
                    category="SPORT"
                    title="Scout Sport Gate"
                    reason={`Scout view is restricted to ${assignedCoach.sport}. Athletes from other sports are excluded from this radar.`}
                    whoCanChange="Academy Administrator or Super Admin"
                    suggestedAction="Contact academy management if you require scouting clearance for other disciplines."
                    size="xs"
                  />
                </div>
              )}
            </div>
            <p className="text-xs text-[#8B969E] uppercase tracking-wider mt-1 font-semibold">
              Exclusive Verified Trial-Ready Athletes • Sport-Level Data Isolation Enforced
            </p>
          </div>

          {assignedCoach && (
            <div className="flex items-center gap-3 bg-white px-4 py-2.5 rounded-xl border border-[#DCE1E3] shadow-sm">
              <UserCheck className="h-4 w-4 text-[#101820]" />
              <div className="text-xs">
                <span className="text-[10px] text-[#8B969E] uppercase font-bold block">
                  Assigned Coaching Desk
                </span>
                <span className="font-bold text-[#101820]">
                  Coach {assignedCoach.name} ({assignedCoach.sport})
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Scout Boundary Notice */}
        <div className="p-4 rounded-xl bg-white border border-[#DCE1E3] flex items-start gap-3 shadow-sm">
          <ShieldCheck className="h-5 w-5 text-[#101820] shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <span className="font-bold text-[#101820] uppercase tracking-wider block">
              Automated Scout Gate & Sport Isolation:
            </span>
            <p className="text-[#8B969E] leading-relaxed">
              This directory displays <strong>strictly READY players</strong> belonging to your assigned coach and discipline (<strong>{assignedCoach?.sport || "Assigned Sport"}</strong>).
              Players of other sports or developing athletes are logically isolated and restricted until they meet both the mandatory
              &ge; 75% attendance threshold and &ge; 2 match appearances.
            </p>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-col sm:flex-row items-center gap-4 bg-white p-4 rounded-xl border border-[#DCE1E3] shadow-sm">
          <form onSubmit={handleSearchSubmit} className="flex-1 flex gap-2 w-full">
            <Input
              placeholder={`Search ${assignedCoach?.sport || ""} prospects by name or position...`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-white"
            />
            <Button
              type="submit"
              variant="outline"
              size="md"
              className="gap-2 shrink-0 border-[#DCE1E3] bg-white text-[#101820] hover:bg-[#F4F3EE]"
            >
              <Search className="h-4 w-4" />
              <span>Filter</span>
            </Button>
          </form>

          {/* Locked Sport Discipline Badge */}
          <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-lg bg-[#F4F3EE] border border-[#DCE1E3] text-xs font-bold text-[#101820] w-full sm:w-auto shrink-0">
            <Shield className="h-4 w-4 text-[#101820]" />
            <span>{assignedCoach?.sport || "Assigned"} Radar</span>
            <span className="text-[10px] font-extrabold uppercase tracking-wider bg-[#C6F432] text-[#101820] px-2 py-0.5 rounded border border-[#101820]">
              Sport-Locked
            </span>
            <RestrictionInfo
              category="ROLE"
              title="Scout Visibility Restricted"
              reason="By system rules, scouts can only view trial-ready athletes (>= 75% attendance and >= 2 matches). Developing athletes are hidden."
              whoCanChange="Assigned Squad Coach (via Training Sessions)"
              suggestedAction="Developing prospects will unlock on your radar once their coach records qualifying attendance and match appearances."
              size="xs"
            />
          </div>
        </div>

        {/* Eligible Players Cards Grid */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase text-[#101820] flex items-center gap-2">
              <Award className="h-4 w-4 text-[#101820]" />
              <span>Trial-Qualified Prospects ({eligiblePlayers.length})</span>
            </h3>
          </div>

          {loading ? (
            <div className="py-16 text-center text-xs text-[#8B969E]">
              Scanning roster for trial-ready athletes...
            </div>
          ) : eligiblePlayers.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {eligiblePlayers.map((player) => (
                <Card
                  key={player.playerId}
                  className="border-[#DCE1E3] hover:border-[#101820]/40 transition-all bg-white shadow-sm"
                >
                  <CardHeader className="pb-3 border-b border-[#DCE1E3]">
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#8B969E]">
                          {player.sport} • {player.position}
                        </span>
                        <CardTitle className="text-lg font-bold text-[#101820] mt-0.5">
                          {player.playerName}
                        </CardTitle>
                      </div>
                      <StatusBadge status="READY" type="eligibility" />
                    </div>
                  </CardHeader>
                  <CardContent className="pt-4 space-y-4">
                    {/* Performance metrics */}
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="p-3 rounded-xl bg-[#F4F3EE] border border-[#DCE1E3]">
                        <span className="text-[10px] font-bold uppercase text-[#8B969E] block">
                          Attendance Rate
                        </span>
                        <span className="text-lg font-extrabold text-emerald-700">
                          {player.attendancePercentage}%
                        </span>
                        <span className="text-[10px] text-[#8B969E] block mt-0.5">
                          {player.presentSessions} / {player.totalClosedSessions} sessions
                        </span>
                      </div>

                      <div className="p-3 rounded-xl bg-[#F4F3EE] border border-[#DCE1E3]">
                        <span className="text-[10px] font-bold uppercase text-[#8B969E] block">
                          Match Appearances
                        </span>
                        <span className="text-lg font-extrabold text-[#101820]">
                          {player.matchesPlayed} Matches
                        </span>
                        <span className="text-[10px] text-[#101820] block mt-0.5 font-bold">
                          {player.totalScore} Total Score
                        </span>
                      </div>
                    </div>

                    <div className="text-[11px] text-[#101820] font-medium bg-[#F4F3EE] p-3 rounded-lg border border-[#DCE1E3]">
                      {player.reasons[0]}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="p-16 text-center text-xs text-[#8B969E] border-dashed border-[#DCE1E3] bg-white shadow-sm">
              <Award className="h-12 w-12 mx-auto text-[#101820]/40 mb-3" />
              <h4 className="text-sm font-bold text-[#101820] uppercase">No Trial-Ready Athletes Yet</h4>
              <p className="mt-1 max-w-sm mx-auto text-[#8B969E]">
                No players under Coach {assignedCoach?.name || "your assigned coach"} currently meet both the 75% attendance and 2 match criteria in {assignedCoach?.sport || "your assigned sport"}. Check back after upcoming fixtures.
              </p>
            </Card>
          )}
        </div>
      </div>
    </DashboardShell>
  );
}
