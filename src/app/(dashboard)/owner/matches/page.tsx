"use client";

import { DashboardShell } from "@/components/shared/dashboard-shell";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Trophy } from "lucide-react";

export default function OwnerMatchesPage() {
  return (
    <DashboardShell allowedRoles={["ACADEMY_OWNER", "PLATFORM_ADMIN"]}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight uppercase text-[#101820]">
            Academy Fixtures & Competitions
          </h1>
          <p className="text-xs text-[#8B969E] uppercase tracking-wider mt-1 font-semibold">
            Aggregate Match Performance Across All Sport Disciplines
          </p>
        </div>

        <Card className="border-[#DCE1E3] bg-white shadow-sm">
          <CardHeader className="pb-4 border-b border-[#DCE1E3]">
            <CardTitle className="text-base flex items-center gap-2 text-[#101820]">
              <Trophy className="h-5 w-5 text-[#101820]" />
              <span>Competitive Performance Hub</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 text-xs text-[#8B969E] leading-relaxed">
            Coaches schedule matches linked to closed practice sessions. Verified scores contribute directly towards player trial readiness calculations, visible immediately to assigned scouts.
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  );
}
