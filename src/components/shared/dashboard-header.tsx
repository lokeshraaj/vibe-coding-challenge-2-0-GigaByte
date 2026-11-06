"use client";

import { useRouter } from "next/navigation";
import { LogOut, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UserRole } from "@/types";

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
            <span className="text-sm font-bold tracking-tight text-[#101820]">
              {academyName}
            </span>
          </div>
        ) : (
          <span className="text-sm font-bold tracking-tight text-[#101820]">
            ATHLIX Global Management
          </span>
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
          <span className="hidden md:inline-block px-2.5 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase bg-[#F4F3EE] text-[#101820] border border-[#DCE1E3]">
            {userRole.replace("_", " ")}
          </span>

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
