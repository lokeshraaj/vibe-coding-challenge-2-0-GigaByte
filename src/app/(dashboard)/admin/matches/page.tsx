"use client";

import { useEffect, useState } from "react";
import { DashboardShell } from "@/components/shared/dashboard-shell";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/status-badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Trophy,
  Search,
  Filter,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Building2,
} from "lucide-react";
import { toast } from "sonner";

interface MatchItem {
  id: string;
  academyName: string;
  coachCode: string;
  sport: string;
  opponentName: string;
  venue: string;
  date: string;
  score: string;
  scoreLabel: string;
  result: string;
  notes: string;
}

export default function GlobalMatchesPage() {
  const [matches, setMatches] = useState<MatchItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sportFilter, setSportFilter] = useState("ALL");
  const [resultFilter, setResultFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalMatches, setTotalMatches] = useState(0);

  async function loadMatches() {
    try {
      setLoading(true);
      const query = new URLSearchParams({
        search,
        sport: sportFilter,
        result: resultFilter,
        page: page.toString(),
        limit: "15",
      });

      const res = await fetch(`/api/admin/matches?${query.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setMatches(data.items || []);
        setTotalPages(data.pagination?.totalPages || 1);
        setTotalMatches(data.pagination?.total || 0);
      } else {
        toast.error("Failed to load match records");
      }
    } catch (e) {
      console.error(e);
      toast.error("Error loading matches");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadMatches();
  }, [sportFilter, resultFilter, page]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadMatches();
  };

  return (
    <DashboardShell allowedRoles={["PLATFORM_ADMIN", "SUPER_ADMIN"]}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#DCE1E3] pb-6">
          <div>
            <div className="inline-flex items-center gap-2 px-2 py-0.5 rounded bg-[#C6F432]/30 border border-[#C6F432] text-[#101820] text-[10px] font-black uppercase tracking-widest mb-2">
              <Trophy className="h-3 w-3" />
              Competition Telemetry
            </div>
            <h1 className="text-2xl font-black uppercase text-[#101820]">
              Global Matches & Competitions
            </h1>
            <p className="text-xs text-[#8B969E] uppercase tracking-wider mt-1 font-semibold">
              Official Competitive Records Across All Academies ({totalMatches} Logged Matches)
            </p>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white p-4 rounded-lg border border-[#DCE1E3]">
          <form onSubmit={handleSearchSubmit} className="flex-1 flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#8B969E]" />
              <Input
                placeholder="Search opponent name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9 text-xs border-[#DCE1E3] bg-[#F4F3EE]/40"
              />
            </div>
            <Button type="submit" size="sm" className="bg-[#101820] text-white hover:bg-black text-xs font-bold uppercase">
              Search
            </Button>
          </form>

          <div className="flex items-center gap-3 shrink-0">
            <select
              value={sportFilter}
              onChange={(e) => {
                setSportFilter(e.target.value);
                setPage(1);
              }}
              className="h-9 px-3 text-xs font-semibold bg-[#F4F3EE]/60 border border-[#DCE1E3] rounded text-[#101820] outline-none"
            >
              <option value="ALL">All Sports</option>
              <option value="Football">Football</option>
              <option value="Basketball">Basketball</option>
              <option value="Cricket">Cricket</option>
              <option value="Tennis">Tennis</option>
            </select>

            <select
              value={resultFilter}
              onChange={(e) => {
                setResultFilter(e.target.value);
                setPage(1);
              }}
              className="h-9 px-3 text-xs font-semibold bg-[#F4F3EE]/60 border border-[#DCE1E3] rounded text-[#101820] outline-none"
            >
              <option value="ALL">All Outcomes</option>
              <option value="WON">Won</option>
              <option value="LOST">Lost</option>
              <option value="DRAW">Draw</option>
              <option value="ABANDONED">Abandoned</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <Card className="border-[#DCE1E3] bg-white shadow-sm overflow-hidden">
          <CardContent className="p-0">
            {loading ? (
              <div className="py-16 text-center text-xs text-[#8B969E]">Loading matches...</div>
            ) : matches.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-[#DCE1E3] bg-[#F4F3EE] text-[10px] uppercase font-black tracking-wider text-[#8B969E]">
                      <th className="p-4">Academy</th>
                      <th className="p-4">Coach</th>
                      <th className="p-4">Sport</th>
                      <th className="p-4">Opponent</th>
                      <th className="p-4">Final Score</th>
                      <th className="p-4">Outcome</th>
                      <th className="p-4">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#DCE1E3]">
                    {matches.map((m) => (
                      <tr key={m.id} className="hover:bg-[#F4F3EE]/50 transition-colors">
                        <td className="p-4 font-bold text-[#101820] text-sm">
                          {m.academyName}
                        </td>
                        <td className="p-4">
                          <code className="text-[#101820] font-mono text-[11px] bg-[#F4F3EE] px-2 py-0.5 rounded border border-[#DCE1E3]">
                            {m.coachCode}
                          </code>
                        </td>
                        <td className="p-4 font-semibold text-[#101820]">{m.sport}</td>
                        <td className="p-4">
                          <div className="font-bold text-[#101820]">{m.opponentName}</div>
                          {m.venue && <div className="text-[10px] text-[#8B969E]">Venue: {m.venue}</div>}
                        </td>
                        <td className="p-4 font-mono font-bold text-xs text-[#101820]">
                          {m.score} ({m.scoreLabel})
                        </td>
                        <td className="p-4">
                          <StatusBadge status={m.result} />
                        </td>
                        <td className="p-4 text-[#8B969E]">
                          {new Date(m.date).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-16 text-center text-xs text-[#8B969E]">
                No match records found matching current filters.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-[#DCE1E3] pt-4">
            <div className="text-xs text-[#8B969E]">
              Showing page <span className="font-bold text-[#101820]">{page}</span> of{" "}
              <span className="font-bold text-[#101820]">{totalPages}</span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="h-8 text-xs font-semibold"
              >
                <ChevronLeft className="h-3.5 w-3.5 mr-1" /> Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="h-8 text-xs font-semibold"
              >
                Next <ChevronRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
