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
  AlertTriangle,
  ShieldAlert,
  Bell,
  Settings,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { UserRole } from "@/types";
import { useState, useEffect } from "react";

interface SidebarProps {
  role: UserRole;
  academyName?: string;
  mobileMenuOpen?: boolean;
  onMobileClose?: () => void;
}

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

export function DashboardSidebar({
  role,
  academyName,
  mobileMenuOpen = false,
  onMobileClose,
}: SidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  // Close mobile drawer on route transition
  useEffect(() => {
    if (mobileMenuOpen && onMobileClose) {
      onMobileClose();
    }
  }, [pathname]);

  // Lock background scroll when mobile drawer is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileMenuOpen]);

  // Dismiss on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && mobileMenuOpen && onMobileClose) {
        onMobileClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [mobileMenuOpen, onMobileClose]);

  const getNavItems = (): NavItem[] => {
    switch (role) {
      case "PLATFORM_ADMIN":
      case "SUPER_ADMIN":
        return [
          { label: "Platform HQ", href: "/admin", icon: <LayoutDashboard className="h-4 w-4" /> },
          { label: "Academies", href: "/admin/academies", icon: <Building2 className="h-4 w-4" /> },
          { label: "Coaches", href: "/admin/coaches", icon: <UserCheck className="h-4 w-4" /> },
          { label: "Users Directory", href: "/admin/users", icon: <Users className="h-4 w-4" /> },
          { label: "Verification", href: "/admin/verification", icon: <UserCheck className="h-4 w-4" /> },
          { label: "Global Matches", href: "/admin/matches", icon: <Trophy className="h-4 w-4" /> },
          { label: "Complaints & Reports", href: "/admin/complaints", icon: <AlertTriangle className="h-4 w-4" /> },
          { label: "Security & Audit", href: "/admin/security", icon: <ShieldAlert className="h-4 w-4" /> },
          { label: "Announcements", href: "/admin/announcements", icon: <Bell className="h-4 w-4" /> },
          { label: "Platform Settings", href: "/admin/settings", icon: <Settings className="h-4 w-4" /> },
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
          { label: "Player management", href: "/coach/players", icon: <Users className="h-4 w-4" /> },
          { label: "Sessions & Attendance", href: "/coach/sessions", icon: <CalendarCheck className="h-4 w-4" /> },
          { label: "Matches & Scores", href: "/coach/matches", icon: <Trophy className="h-4 w-4" /> },
          { label: "Ready players", href: "/coach/eligibility", icon: <Award className="h-4 w-4" /> },
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
    <>
      {/* =========================================================================
          1. Desktop / Laptop Sidebar (Visible on lg: 1024px+)
         ========================================================================= */}
      <aside
        className={cn(
          "hidden lg:flex relative flex-col border-r border-[#DCE1E3] bg-white transition-all duration-200 z-40 select-none shrink-0",
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
              <div className="flex flex-col pt-0.5 min-w-0">
                <img
                  src="/images/logo.png"
                  alt="ATHLIX"
                  className="h-6 w-auto object-contain object-left"
                />
                <span className="text-[9px] font-bold tracking-widest text-[#8B969E] uppercase mt-1 truncate max-w-[150px]">
                  {role === "SUPER_ADMIN" || role === "PLATFORM_ADMIN"
                    ? "SUPER ADMIN HQ"
                    : academyName || "SPORTS PLATFORM"}
                </span>
              </div>
            )}
          </Link>
          <button
            type="button"
            onClick={() => setCollapsed(!collapsed)}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="flex h-7 w-7 items-center justify-center rounded-md border border-[#DCE1E3] text-[#8B969E] hover:text-[#101820] hover:bg-[#F4F3EE] transition-colors"
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

      {/* =========================================================================
          2. Mobile & Tablet Slide-out Drawer (Visible on < 1024px)
         ========================================================================= */}
      {/* Backdrop */}
      <div
        className={cn(
          "fixed inset-0 z-50 bg-black/60 backdrop-blur-xs transition-opacity duration-300 lg:hidden",
          mobileMenuOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
        onClick={onMobileClose}
        aria-hidden="true"
      />

      {/* Slide-out Drawer Panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Navigation drawer"
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col border-r border-[#DCE1E3] bg-white shadow-2xl transition-transform duration-300 ease-in-out lg:hidden select-none",
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Drawer Header */}
        <div className="flex h-16 min-h-[4rem] items-center justify-between px-4 py-3 border-b border-[#DCE1E3] bg-white">
          <Link href="/" onClick={onMobileClose} className="flex flex-col min-w-0">
            <img
              src="/images/logo.png"
              alt="ATHLIX"
              className="h-6 w-auto object-contain object-left"
            />
            <span className="text-[9px] font-bold tracking-widest text-[#8B969E] uppercase mt-1 truncate max-w-[170px]">
              {role === "SUPER_ADMIN" || role === "PLATFORM_ADMIN"
                ? "SUPER ADMIN HQ"
                : academyName || "SPORTS PLATFORM"}
            </span>
          </Link>
          <button
            type="button"
            onClick={onMobileClose}
            aria-label="Close navigation drawer"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#DCE1E3] text-[#8B969E] hover:text-[#101820] hover:bg-[#F4F3EE] transition-colors shrink-0"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Drawer Nav Items */}
        <nav className="flex-1 space-y-1.5 p-3 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onMobileClose}
                className={cn(
                  "flex items-center gap-3 px-3.5 py-3 rounded-lg text-xs font-bold uppercase tracking-wider transition-all min-h-[44px]",
                  isActive
                    ? "bg-[#C6F432] text-[#101820] shadow-xs"
                    : "text-[#202A32] hover:text-[#101820] hover:bg-[#F4F3EE]"
                )}
              >
                <div className="shrink-0">{item.icon}</div>
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Drawer Role Footer */}
        <div className="p-4 border-t border-[#DCE1E3] bg-[#F4F3EE]/60">
          <div className="text-[9px] font-bold uppercase tracking-widest text-[#8B969E]">
            Active Workspace
          </div>
          <div className="text-xs font-black uppercase text-[#101820] truncate">
            {role.replace("_", " ")}
          </div>
        </div>
      </div>
    </>
  );
}
