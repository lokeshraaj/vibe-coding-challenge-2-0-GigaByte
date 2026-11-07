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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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

        const userRole = data.user.role;
        const roleAuthorized =
          !allowedRoles ||
          allowedRoles.includes(userRole) ||
          ((userRole === "SUPER_ADMIN" || userRole === "PLATFORM_ADMIN") &&
            (allowedRoles.includes("PLATFORM_ADMIN") || allowedRoles.includes("SUPER_ADMIN")));

        if (allowedRoles && !roleAuthorized) {
          // Redirect to appropriate dashboard
          const r = userRole;
          if (r === "PLATFORM_ADMIN" || r === "SUPER_ADMIN") router.push("/admin");
          else if (r === "ACADEMY_OWNER") router.push("/owner");
          else if (r === "COACH") router.push("/coach");
          else if (r === "SCOUT") router.push("/scout");
          else if (r === "PLAYER") router.push("/player");
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
      <div className="flex h-screen w-full items-center justify-center bg-[#F4F3EE]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#DCE1E3] border-t-[#101820]" />
          <span className="text-[11px] font-bold uppercase tracking-widest text-[#8B969E]">
            Loading Workspace...
          </span>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="flex min-h-screen bg-[#F4F3EE] text-[#101820]">
      {/* Desktop Sidebar & Mobile Responsive Slide-Out Drawer */}
      <DashboardSidebar
        role={user.role}
        academyName={user.academy?.name}
        mobileMenuOpen={mobileMenuOpen}
        onMobileClose={() => setMobileMenuOpen(false)}
      />

      <div className="flex flex-1 flex-col min-w-0 overflow-x-hidden">
        <DashboardHeader
          userName={user.name}
          userEmail={user.email}
          userRole={user.role}
          academyName={user.academy?.name}
          onMenuToggle={() => setMobileMenuOpen((prev) => !prev)}
        />
        <main className="flex-1 p-3 sm:p-6 lg:p-8 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
