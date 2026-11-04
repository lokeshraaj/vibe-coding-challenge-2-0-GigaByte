"use client";

import { useEffect, useState } from "react";
import { DashboardShell } from "@/components/shared/dashboard-shell";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/status-badge";
import { CalendarCheck } from "lucide-react";
import { toast } from "sonner";

export default function OwnerSessionsPage() {
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadSessions() {
      try {
        setLoading(true);
        const res = await fetch("/api/dashboard/stats");
        if (res.ok) {
          const data = await res.json();
          // Owner stats carries overview
        }
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
          <h1 className="text-3xl font-black italic tracking-tight uppercase text-white">
            PRACTICE SESSIONS OVERVIEW
          </h1>
          <p className="text-xs text-athletic-textMuted uppercase tracking-wider mt-1">
            ALL PRACTICE SESSIONS ACROSS COACHING SQUADS
          </p>
        </div>

        <Card>
          <CardHeader className="pb-4 border-b border-athletic-border/70">
            <CardTitle className="text-base flex items-center gap-2">
              <CalendarCheck className="h-5 w-5 text-athletic-lime" />
              <span>Academy Practice Telemetry</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 text-xs text-athletic-textMuted">
            Coaches manage their individual daily training schedules and attendance directly from their coach desk. As Academy Owner, you can view aggregate attendance trends and audit locked records at any time.
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  );
}
