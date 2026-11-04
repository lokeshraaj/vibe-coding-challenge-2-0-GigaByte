"use client";

import { useEffect, useState } from "react";
import { DashboardShell } from "@/components/shared/dashboard-shell";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Trophy } from "lucide-react";

export default function OwnerMatchesPage() {
  return (
    <DashboardShell allowedRoles={["ACADEMY_OWNER", "PLATFORM_ADMIN"]}>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-black italic tracking-tight uppercase text-white">
            ACADEMY FIXTURES & COMPETITIONS
          </h1>
          <p className="text-xs text-athletic-textMuted uppercase tracking-wider mt-1">
            AGGREGATE MATCH PERFORMANCE ACROSS ALL SPORT DISCIPLINES
          </p>
        </div>

        <Card>
          <CardHeader className="pb-4 border-b border-athletic-border/70">
            <CardTitle className="text-base flex items-center gap-2">
              <Trophy className="h-5 w-5 text-athletic-lime" />
              <span>Competitive Performance Hub</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 text-xs text-athletic-textMuted">
            Coaches schedule matches linked to closed practice sessions. Verified scores contribute directly towards player trial readiness calculations, visible immediately to assigned scouts.
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  );
}
