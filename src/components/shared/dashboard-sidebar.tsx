"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Trophy,
  CalendarCheck,
  Search,
  UserCheck,
  Building2,
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
      case "SUPER_ADMIN":
        return [
          { label: "Platform Overview", href: "/admin", icon: <LayoutDashboard className="h-4 w-4" /> },
          { label: "Academies Directory", href: "/admin", icon: <Building2 className="h-4 w-4" /> },
        ];
      case "ACADEMY_OWNER":
        return [
          { label: "Academy HQ", href: "/owner", icon: <LayoutDashboard className="h-4 w-4" /> },
          { label: "Coaching Staff", href: "/owner/coaches", icon: <UserCheck className="h-4 w-4" /> },
          { label: "Scout Network", href: "/owner/scouts", icon: <Search className="h-4 w-4" /> },
          { label: "All Athletes", href: "/owner/players", icon: <Users className="h-4 w-4" /> },
          { label: "Practice Sessions", href: "/owner/sessions", icon: <CalendarCheck className="h-4 w-4" /> },
          { label: "Match Records", href: "/owner/matches", icon: <Trophy className="h-4 w-4" /> },
        ];
      case "COACH":
        return [
          { label: "Coach Desk", href: "/coach", icon: <LayoutDashboard className="h-4 w-4" /> },
          { label: "My Squad", href: "/coach/players", icon: <Users className="h-4 w-4" /> },
          { label: "Practice & Attendance", href: "/coach/sessions", icon: <CalendarCheck className="h-4 w-4" /> },
          { label: "Matches & Scores", href: "/coach/matches", icon: <Trophy className="h-4 w-4" /> },
          { label: "Trial Eligibility", href: "/coach/eligibility", icon: <Award className="h-4 w-4" /> },
        ];
      case "SCOUT":
        return [
          { label: "Talent Radar (Ready Only)", href: "/scout", icon: <Search className="h-4 w-4" /> },
        ];
      case "PLAYER":
        return [
          { label: "Athlete Portal", href: "/player", icon: <LayoutDashboard className="h-4 w-4" /> },
        ];
      default:
        return [];
    }
  };

  const navItems = getNavItems();

  return (
    <aside
      className={cn(
        "relative flex flex-col border-r border-[#DCE1E3] bg-white transition-all duration-200 z-40 select-none",
        collapsed ? "w-18" : "w-64"
      )}
    >
      {/* Brand Header */}
      <div className="flex h-18 min-h-[4.5rem] items-center justify-between px-4 py-3 border-b border-[#DCE1E3]">
        <Link href="/" className="flex items-center gap-2.5 overflow-hidden pt-1">
          {collapsed ? (
            <img
              src="/images/logo-icon.png"
              alt="ATHLIX"
              className="h-7 w-auto object-contain mx-auto"
            />
          ) : (
            <div className="flex flex-col pt-0.5">
              <img
                src="/images/logo.png"
                alt="ATHLIX"
                className="h-6 w-auto object-contain object-left"
              />
              <span className="text-[9px] font-bold tracking-widest text-[#8B969E] uppercase mt-1 truncate max-w-[150px]">
                {academyName || "SPORTS PLATFORM"}
              </span>
            </div>
          )}
        </Link>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="hidden sm:flex h-7 w-7 items-center justify-center rounded-md border border-[#DCE1E3] text-[#8B969E] hover:text-[#101820] hover:bg-[#F4F3EE] transition-colors"
        >
          {collapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
        </button>
      </div>

      {/* Navigation items */}
      <nav className="flex-1 space-y-1 p-3 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-md text-xs font-semibold uppercase tracking-wider transition-all",
                isActive
                  ? "bg-[#C6F432] text-[#101820] font-bold shadow-xs"
                  : "text-[#202A32] hover:text-[#101820] hover:bg-[#F4F3EE]"
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
        <div className="p-4 border-t border-[#DCE1E3] bg-[#F4F3EE]/60">
          <div className="text-[9px] font-bold uppercase tracking-widest text-[#8B969E]">
            Active Workspace
          </div>
          <div className="text-xs font-black uppercase text-[#101820] truncate">
            {role.replace("_", " ")}
          </div>
        </div>
      )}
    </aside>
  );
}
