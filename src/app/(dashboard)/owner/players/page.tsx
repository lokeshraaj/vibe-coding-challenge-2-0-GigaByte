"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { DashboardShell } from "@/components/shared/dashboard-shell";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/status-badge";
import { Users, Search, ArrowRight, Filter } from "lucide-react";
import { toast } from "sonner";

interface PlayerItem {
  id: string;
  playerCode: string;
  name: string;
  age: number;
  gender: string;
  sport: string;
  position: string;
  enrollmentDate: string;
  status: string;
  coachName: string;
  hasLoginAccount: boolean;
}

export default function OwnerPlayersPage() {
  const [players, setPlayers] = useState<PlayerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sport, setSport] = useState("ALL");

  const fetchPlayers = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (sport && sport !== "ALL") params.set("sport", sport);

      const res = await fetch(`/api/players?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setPlayers(data.items || []);
      }
    } catch (e) {
      console.error(e);
      toast.error("Failed to load players");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlayers();
  }, [sport]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchPlayers();
  };

  return (
    <DashboardShell allowedRoles={["ACADEMY_OWNER", "PLATFORM_ADMIN"]}>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black italic tracking-tight uppercase text-white">
              ACADEMY PLAYER DIRECTORY
            </h1>
            <p className="text-xs text-athletic-textMuted uppercase tracking-wider mt-1">
              ALL ENROLLED ATHLETES ACROSS COACHING ROSTERS
            </p>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-col sm:flex-row items-center gap-4 bg-athletic-charcoal p-4 rounded-lg border border-athletic-border">
          <form onSubmit={handleSearchSubmit} className="flex-1 flex gap-2 w-full">
            <Input
              placeholder="Search by player name, athlete code, position..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-athletic-black"
            />
            <Button type="submit" variant="secondary" size="md" className="gap-2 shrink-0">
              <Search className="h-4 w-4" />
              <span>Search</span>
            </Button>
          </form>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Filter className="h-4 w-4 text-athletic-lime shrink-0" />
            <select
              value={sport}
              onChange={(e) => setSport(e.target.value)}
              className="h-11 rounded-md border border-athletic-border bg-athletic-black px-3 text-xs font-bold uppercase text-white focus-visible:outline-none focus-visible:border-athletic-lime w-full sm:w-44"
            >
              <option value="ALL">All Sports</option>
              <option value="Football">Football</option>
              <option value="Basketball">Basketball</option>
              <option value="Cricket">Cricket</option>
              <option value="Tennis">Tennis</option>
            </select>
          </div>
        </div>

        {/* Players Table */}
        <Card>
          <CardHeader className="pb-4 border-b border-athletic-border/70">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-5 w-5 text-athletic-lime" />
              <span>Athletes Roster ({players.length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="py-12 text-center text-xs text-athletic-textMuted">
                Loading players...
              </div>
            ) : players.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-athletic-border/80 bg-athletic-black/50 text-[10px] uppercase font-black tracking-wider text-athletic-textMuted">
                      <th className="p-4">Player Details</th>
                      <th className="p-4">Athlete Code</th>
                      <th className="p-4">Sport & Position</th>
                      <th className="p-4">Assigned Coach</th>
                      <th className="p-4">Age / Gender</th>
                      <th className="p-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-athletic-border/50">
                    {players.map((p) => (
                      <tr key={p.id} className="hover:bg-athletic-elevated/40 transition-colors">
                        <td className="p-4">
                          <div className="font-bold text-white text-sm">{p.name}</div>
                          <div className="text-[10px] text-athletic-textMuted font-medium">
                            Enrolled: {new Date(p.enrollmentDate).toLocaleDateString()}
                          </div>
                        </td>
                        <td className="p-4">
                          <span className="font-black text-athletic-lime tracking-wider">
                            {p.playerCode}
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="font-bold text-white uppercase">{p.sport}</div>
                          <div className="text-[10px] text-athletic-textMuted">{p.position}</div>
                        </td>
                        <td className="p-4 text-white font-medium">
                          {p.coachName}
                        </td>
                        <td className="p-4 font-semibold text-white">
                          {p.age} yrs • {p.gender}
                        </td>
                        <td className="p-4">
                          <StatusBadge status={p.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-12 text-center text-xs text-athletic-textMuted">
                No players match your search criteria.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  );
}
