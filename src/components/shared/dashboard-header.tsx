"use client";

import { useRouter } from "next/navigation";
import { LogOut, User } from "lucide-react";
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
}

export function DashboardHeader({
  userName = "User",
  userEmail = "",
  userRole,
  academyName,
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
    <header className="sticky top-0 z-30 flex h-18 min-h-[4.5rem] w-full items-center justify-between border-b border-[#DCE1E3] bg-white px-4 sm:px-8 py-3">
      {/* Left: Academy Tenant context */}
      <div className="flex items-center gap-3">
        {academyName ? (
          <div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#8B969E] block">
              Active Academy Tenant
            </span>
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-bold tracking-tight text-[#101820]">
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
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-bold tracking-tight text-[#101820]">
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
      <div className="flex items-center gap-4">
        <div className="hidden sm:flex flex-col text-right">
          <span className="text-xs font-bold text-[#101820]">
            {userName}
          </span>
          <span className="text-[10px] text-[#8B969E] truncate max-w-[180px]">
            {userEmail}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden md:inline-flex items-center gap-1">
            <span className="px-2.5 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase bg-[#F4F3EE] text-[#101820] border border-[#DCE1E3]">
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
            className="text-xs font-semibold text-[#8B969E] hover:text-[#E53E3E] hover:bg-[#F4F3EE] gap-1.5"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Sign Out</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
