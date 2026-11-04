"use client";

import { useEffect, useState } from "react";
import { DashboardShell } from "@/components/shared/dashboard-shell";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/status-badge";
import { Users, Search, Filter } from "lucide-react";
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
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight uppercase text-[#101820]">
              Academy Player Directory
            </h1>
            <p className="text-xs text-[#8B969E] uppercase tracking-wider mt-1 font-semibold">
              All Enrolled Athletes Across Coaching Rosters
            </p>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-col sm:flex-row items-center gap-4 bg-white p-4 rounded-xl border border-[#DCE1E3] shadow-sm">
          <form onSubmit={handleSearchSubmit} className="flex-1 flex gap-2 w-full">
            <Input
              placeholder="Search by player name, athlete code, position..."
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
              <span>Search</span>
            </Button>
          </form>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Filter className="h-4 w-4 text-[#101820] shrink-0" />
            <select
              value={sport}
              onChange={(e) => setSport(e.target.value)}
              className="h-11 rounded-md border border-[#DCE1E3] bg-white px-3 text-xs font-bold uppercase text-[#101820] focus-visible:outline-none focus-visible:border-[#101820] w-full sm:w-44"
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
        <Card className="border-[#DCE1E3] bg-white shadow-sm">
          <CardHeader className="pb-4 border-b border-[#DCE1E3]">
            <CardTitle className="text-base flex items-center gap-2 text-[#101820]">
              <Users className="h-5 w-5 text-[#101820]" />
              <span>Athletes Roster ({players.length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="py-12 text-center text-xs text-[#8B969E]">
                Loading players...
              </div>
            ) : players.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-[#DCE1E3] bg-[#F4F3EE] text-[10px] uppercase font-bold tracking-wider text-[#8B969E]">
                      <th className="p-4">Player Details</th>
                      <th className="p-4">Athlete Code</th>
                      <th className="p-4">Sport & Position</th>
                      <th className="p-4">Assigned Coach</th>
                      <th className="p-4">Age / Gender</th>
                      <th className="p-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#DCE1E3]">
                    {players.map((p) => (
                      <tr key={p.id} className="hover:bg-[#F4F3EE] transition-colors">
                        <td className="p-4">
                          <div className="font-bold text-[#101820] text-sm">{p.name}</div>
                          <div className="text-[10px] text-[#8B969E] font-medium">
                            Enrolled: {new Date(p.enrollmentDate).toLocaleDateString()}
                          </div>
                        </td>
                        <td className="p-4">
                          <code className="text-[#101820] font-mono font-bold text-[11px] bg-[#F4F3EE] px-2 py-0.5 rounded border border-[#DCE1E3]">
                            {p.playerCode}
                          </code>
                        </td>
                        <td className="p-4">
                          <div className="font-bold text-[#101820] uppercase">{p.sport}</div>
                          <div className="text-[10px] text-[#8B969E]">{p.position}</div>
                        </td>
                        <td className="p-4 text-[#101820] font-medium">
                          {p.coachName}
                        </td>
                        <td className="p-4 font-semibold text-[#101820]">
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
              <div className="py-12 text-center text-xs text-[#8B969E]">
                No players match your search criteria.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  );
}
