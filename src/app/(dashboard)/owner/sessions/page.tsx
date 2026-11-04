"use client";

import { useEffect, useState } from "react";
import { DashboardShell } from "@/components/shared/dashboard-shell";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { CalendarCheck } from "lucide-react";

export default function OwnerSessionsPage() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadSessions() {
      try {
        setLoading(true);
        await fetch("/api/dashboard/stats");
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    loadSessions();
  }, []);

  return (
    <DashboardShell allowedRoles={["ACADEMY_OWNER", "PLATFORM_ADMIN"]}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight uppercase text-[#101820]">
            Practice Sessions Overview
          </h1>
          <p className="text-xs text-[#8B969E] uppercase tracking-wider mt-1 font-semibold">
            All Practice Sessions Across Coaching Squads
          </p>
        </div>

        <Card className="border-[#DCE1E3] bg-white shadow-sm">
          <CardHeader className="pb-4 border-b border-[#DCE1E3]">
            <CardTitle className="text-base flex items-center gap-2 text-[#101820]">
              <CalendarCheck className="h-5 w-5 text-[#101820]" />
              <span>Academy Practice Telemetry</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 text-xs text-[#8B969E] leading-relaxed">
            Coaches manage their individual daily training schedules and attendance directly from their coach desk. As Academy Owner, you can view aggregate attendance trends and audit locked records at any time.
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  );
}
