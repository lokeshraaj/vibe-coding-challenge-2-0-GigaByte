"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DashboardSidebar } from "@/components/shared/dashboard-sidebar";
import { DashboardHeader } from "@/components/shared/dashboard-header";
import { UserRole } from "@/types";

interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  academyId?: string;
  coachId?: string;
  playerId?: string;
  academy?: {
    name: string;
    slug: string;
    status: string;
  } | null;
}

interface DashboardShellProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

export function DashboardShell({ children, allowedRoles }: DashboardShellProps) {
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadUser() {
      try {
        const res = await fetch("/api/auth/me");
        if (!res.ok) {
          router.push("/login");
          return;
        }
        const data = await res.json();
        if (!data.user) {
          router.push("/login");
          return;
        }

        if (allowedRoles && !allowedRoles.includes(data.user.role)) {
          // Redirect to appropriate dashboard
          const r = data.user.role;
          if (r === "PLATFORM_ADMIN") router.push("/dashboard/admin");
          else if (r === "ACADEMY_OWNER") router.push("/dashboard/owner");
          else if (r === "COACH") router.push("/dashboard/coach");
          else if (r === "SCOUT") router.push("/dashboard/scout");
          else if (r === "PLAYER") router.push("/dashboard/player");
          return;
        }

        setUser(data.user);
      } catch (err) {
        console.error("Auth check failed:", err);
        router.push("/login");
      } finally {
        setLoading(false);
      }
    }

    loadUser();
  }, [router, allowedRoles]);

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-athletic-black">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-athletic-border border-t-athletic-lime" />
          <span className="text-xs font-black uppercase tracking-widest text-athletic-textMuted">
            AUTHENTICATING TENANT ENVIRONMENT...
          </span>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="flex min-h-screen bg-athletic-black text-white">
      <DashboardSidebar role={user.role} academyName={user.academy?.name} />
      <div className="flex flex-1 flex-col overflow-x-hidden">
        <DashboardHeader
          userName={user.name}
          userEmail={user.email}
          userRole={user.role}
          academyName={user.academy?.name}
        />
        <main className="flex-1 p-4 sm:p-8 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
