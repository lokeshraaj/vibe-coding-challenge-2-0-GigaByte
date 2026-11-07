"use client";

import { useRouter } from "next/navigation";
import { LogOut, User, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UserRole } from "@/types";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase/client";
import { RestrictionInfo } from "@/components/ui/feature-lock-info";

interface DashboardHeaderProps {
  userName?: string;
  userEmail?: string;
  userRole: UserRole;
  academyName?: string;
  onMenuToggle?: () => void;
}

export function DashboardHeader({
  userName = "User",
  userEmail = "",
  userRole,
  academyName,
  onMenuToggle,
}: DashboardHeaderProps) {
  const router = useRouter();

  const handleLogout = async () => {
    try {
      if (auth && auth.currentUser) {
        try {
          await signOut(auth);
        } catch {}
      }
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } catch (e) {
      console.error("Logout failed:", e);
    }
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 sm:h-18 min-h-[4rem] sm:min-h-[4.5rem] w-full items-center justify-between border-b border-[#DCE1E3] bg-white px-3 sm:px-6 lg:px-8 py-2.5 sm:py-3 gap-2">
      {/* Left: Mobile Hamburger & Academy Tenant context */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        {/* Mobile Hamburger Drawer Trigger */}
        <button
          type="button"
          onClick={onMenuToggle}
          className="lg:hidden flex items-center justify-center h-9 w-9 rounded-lg border border-[#DCE1E3] bg-white text-[#101820] hover:bg-[#F4F3EE] transition-colors shrink-0"
          aria-label="Open navigation menu"
        >
          <Menu className="h-4 w-4" />
        </button>

        {academyName ? (
          <div className="min-w-0">
            <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-[#8B969E] block truncate">
              Active Academy Tenant
            </span>
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-xs sm:text-sm font-bold tracking-tight text-[#101820] truncate max-w-[140px] xs:max-w-[200px] sm:max-w-xs md:max-w-none">
                {academyName}
              </span>
              <RestrictionInfo
                category="ROLE"
                title="Academy Tenant Context"
                reason="Your account is restricted to this sports academy. All athlete records, squad operations, attendance, and match performances are strictly isolated to this tenant."
                whoCanChange="Platform Administrator / Super Admin"
                suggestedAction="Contact platform support if academy tenant affiliation needs adjustment."
                size="xs"
              />
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-xs sm:text-sm font-bold tracking-tight text-[#101820] truncate max-w-[150px] sm:max-w-none">
              ATHLIX Global Management
            </span>
            <RestrictionInfo
              category="ROLE"
              title="Global Management Scope"
              reason="Platform Administration mode with multi-tenant oversight across all registered sports academies."
              whoCanChange="Super Administrator"
              size="xs"
            />
          </div>
        )}
      </div>

      {/* Right: User profile & Logout */}
      <div className="flex items-center gap-2 sm:gap-4 shrink-0">
        <div className="hidden md:flex flex-col text-right">
          <span className="text-xs font-bold text-[#101820] truncate max-w-[160px]">
            {userName}
          </span>
          <span className="text-[10px] text-[#8B969E] truncate max-w-[160px]">
            {userEmail}
          </span>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          <div className="hidden sm:inline-flex items-center gap-1">
            <span className="px-2.5 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase bg-[#F4F3EE] text-[#101820] border border-[#DCE1E3] truncate max-w-[130px]">
              {userRole.replace("_", " ")}
            </span>
            <RestrictionInfo
              category="ROLE"
              title={`${userRole.replace("_", " ")} Role Access`}
              reason={`Your account operates with ${userRole.replace("_", " ")} privileges. Dashboard sections, write actions, and reporting views are scoped to this role.`}
              whoCanChange="Academy Administrator or Super Admin"
              suggestedAction="Contact your academy administrator if your role permissions need to be updated."
              size="xs"
            />
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            title="Log Out"
            className="h-8 sm:h-9 px-2 sm:px-3 text-xs font-semibold text-[#8B969E] hover:text-[#E53E3E] hover:bg-[#F4F3EE] gap-1.5 shrink-0"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Sign Out</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
