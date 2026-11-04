"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Zap,
  LayoutDashboard,
  Users,
  Trophy,
  CalendarCheck,
  Search,
  UserCheck,
  Building2,
  FileSpreadsheet,
  Award,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { UserRole } from "@/types";
import { useState } from "react";

interface SidebarProps {
  role: UserRole;
  academyName?: string;
}

export function DashboardSidebar({ role, academyName }: SidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  interface NavItem {
    label: string;
    href: string;
    icon: React.ReactNode;
  }

  const getNavItems = (): NavItem[] => {
    switch (role) {
      case "PLATFORM_ADMIN":
        return [
          { label: "Platform Overview", href: "/dashboard/admin", icon: <LayoutDashboard className="h-5 w-5" /> },
          { label: "Academies Directory", href: "/dashboard/admin/academies", icon: <Building2 className="h-5 w-5" /> },
        ];
      case "ACADEMY_OWNER":
        return [
          { label: "Academy HQ", href: "/dashboard/owner", icon: <LayoutDashboard className="h-5 w-5" /> },
          { label: "Coaches", href: "/dashboard/owner/coaches", icon: <UserCheck className="h-5 w-5" /> },
          { label: "Scouts", href: "/dashboard/owner/scouts", icon: <Search className="h-5 w-5" /> },
          { label: "All Players", href: "/dashboard/owner/players", icon: <Users className="h-5 w-5" /> },
          { label: "Practice Sessions", href: "/dashboard/owner/sessions", icon: <CalendarCheck className="h-5 w-5" /> },
          { label: "Matches", href: "/dashboard/owner/matches", icon: <Trophy className="h-5 w-5" /> },
        ];
      case "COACH":
        return [
          { label: "Coach Desk", href: "/dashboard/coach", icon: <LayoutDashboard className="h-5 w-5" /> },
          { label: "My Roster", href: "/dashboard/coach/players", icon: <Users className="h-5 w-5" /> },
          { label: "Practice Sessions", href: "/dashboard/coach/sessions", icon: <CalendarCheck className="h-5 w-5" /> },
          { label: "Matches & Scores", href: "/dashboard/coach/matches", icon: <Trophy className="h-5 w-5" /> },
          { label: "Trial Eligibility", href: "/dashboard/coach/eligibility", icon: <Award className="h-5 w-5" /> },
        ];
      case "SCOUT":
        return [
          { label: "Talent Radar (Ready Only)", href: "/dashboard/scout", icon: <Search className="h-5 w-5" /> },
        ];
      case "PLAYER":
        return [
          { label: "My Athlete Portal", href: "/dashboard/player", icon: <LayoutDashboard className="h-5 w-5" /> },
        ];
      default:
        return [];
    }
  };

  const navItems = getNavItems();

  return (
    <aside
      className={cn(
        "relative flex flex-col border-r border-athletic-border bg-athletic-black transition-all duration-300 z-40",
        collapsed ? "w-20" : "w-64"
      )}
    >
      {/* Brand Header */}
      <div className="flex h-20 items-center justify-between px-4 border-b border-athletic-border/70">
        <Link href="/" className="flex items-center gap-3 overflow-hidden">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-athletic-lime text-athletic-black font-black italic shadow-[0_0_15px_rgba(163,255,0,0.3)]">
            <Zap className="h-5 w-5 stroke-[3]" />
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="text-xl font-black italic tracking-tight text-white uppercase">
                ATHLIX
              </span>
              <span className="text-[9px] font-bold tracking-widest text-athletic-lime uppercase -mt-1 truncate max-w-[140px]">
                {academyName || "TENANT OS"}
              </span>
            </div>
          )}
        </Link>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="hidden sm:flex h-7 w-7 items-center justify-center rounded-md border border-athletic-border text-athletic-textMuted hover:text-white hover:bg-athletic-elevated transition-colors"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>

      {/* Navigation items */}
      <nav className="flex-1 space-y-1.5 p-3 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={cn(
                "flex items-center gap-3 px-3 py-3 rounded-md text-xs font-bold uppercase tracking-wider transition-all duration-200",
                isActive
                  ? "bg-athletic-lime text-athletic-black shadow-[0_0_15px_rgba(163,255,0,0.3)]"
                  : "text-athletic-textMuted hover:text-white hover:bg-athletic-elevated"
              )}
            >
              <div className="shrink-0">{item.icon}</div>
              {!collapsed && <span className="truncate">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Role Footer */}
      {!collapsed && (
        <div className="p-4 border-t border-athletic-border/50 bg-athletic-charcoal/50">
          <div className="text-[10px] font-bold uppercase tracking-widest text-athletic-textMuted">
            Active Role
          </div>
          <div className="text-xs font-black uppercase text-athletic-lime truncate">
            {role.replace("_", " ")}
          </div>
        </div>
      )}
    </aside>
  );
}
