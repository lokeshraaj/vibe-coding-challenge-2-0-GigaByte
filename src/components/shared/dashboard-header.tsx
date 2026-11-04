"use client";

import { useRouter } from "next/navigation";
import { LogOut, User, ShieldAlert } from "lucide-react";
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
    <header className="sticky top-0 z-30 flex h-20 w-full items-center justify-between border-b border-athletic-border/70 bg-athletic-black/80 px-4 sm:px-8 backdrop-blur-md">
      {/* Left: Academy Tenant context */}
      <div className="flex items-center gap-3">
        {academyName ? (
          <div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-athletic-textMuted block">
              Active Academy Tenant
            </span>
            <span className="text-sm font-black uppercase tracking-wide text-white">
              {academyName}
            </span>
          </div>
        ) : (
          <span className="text-sm font-black uppercase tracking-wide text-white">
            Athlix Global Platform
          </span>
        )}
      </div>

      {/* Right: User profile & Logout */}
      <div className="flex items-center gap-4">
        <div className="hidden sm:flex flex-col text-right">
          <span className="text-xs font-bold uppercase tracking-wider text-white">
            {userName}
          </span>
          <span className="text-[10px] text-athletic-textMuted truncate max-w-[180px]">
            {userEmail}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="hidden md:inline-block px-2.5 py-0.5 rounded text-[10px] font-extrabold tracking-wider uppercase bg-athletic-elevated text-athletic-lime border border-athletic-border">
            {userRole.replace("_", " ")}
          </span>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            title="Log Out"
            className="text-xs font-bold text-athletic-textMuted hover:text-athletic-danger hover:bg-athletic-elevated gap-1.5"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Sign Out</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
