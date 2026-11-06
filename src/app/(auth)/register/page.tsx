"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Shield, UserCheck, Search, Building2, ArrowRight } from "lucide-react";
import { IdRegistrationFlow } from "@/components/auth/id-registration-flow";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

type RoleOption = "COACH" | "PLAYER" | "SCOUT";

function UnifiedRegisterContent() {
  const searchParams = useSearchParams();
  const initialRole = searchParams.get("role")?.toUpperCase();
  const [selectedRole, setSelectedRole] = useState<RoleOption>(
    initialRole === "COACH" || initialRole === "SCOUT" ? (initialRole as RoleOption) : "COACH"
  );

  useEffect(() => {
    const r = searchParams.get("role")?.toUpperCase();
    if (r === "COACH" || r === "PLAYER" || r === "SCOUT") {
      setSelectedRole(r as RoleOption);
    }
  }, [searchParams]);

  const roleConfigs = {
    COACH: {
      title: "Coach Registration",
      subtitle: "Activate your account using your Academy Code and official Coach ID.",
      idLabel: "Assigned Coach ID",
      idPlaceholder: "e.g. COFO001",
      idHelperText: "Enter the Coach ID (e.g. COFO001) assigned by your academy administrator.",
      redirectPath: "/coach",
    },
    PLAYER: {
      title: "Athlete / Player Registration",
      subtitle: "Activate your profile using your Academy Code and official Player ID.",
      idLabel: "Assigned Player ID",
      idPlaceholder: "e.g. PLFO001",
      idHelperText: "Enter the Player ID (e.g. PLFO001) assigned by your coach.",
      redirectPath: "/player",
    },
    SCOUT: {
      title: "Talent Scout Registration",
      subtitle: "Activate your profile using your Academy Code and official Scout ID.",
      idLabel: "Assigned Scout ID",
      idPlaceholder: "e.g. SCFO001",
      idHelperText: "Enter the Scout ID (e.g. SCFO001) assigned by your academy administrator.",
      redirectPath: "/scout",
    },
  };

  const currentConfig = roleConfigs[selectedRole];

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#F4F3EE] px-4 py-12">
      {/* Brand Header */}
      <Link href="/" className="mb-6 flex flex-col items-center group">
        <img
          src="/images/logo-stacked.png"
          alt="ATHLIX"
          className="h-16 w-auto object-contain group-hover:scale-102 transition-transform"
        />
      </Link>

      {/* Role Selection Tabs */}
      <div className="w-full max-w-lg mb-4">
        <div className="grid grid-cols-3 gap-2 bg-white p-1.5 rounded-xl border border-[#DCE1E3] shadow-xs">
          <button
            type="button"
            onClick={() => setSelectedRole("COACH")}
            className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs font-bold transition-all ${
              selectedRole === "COACH"
                ? "bg-[#101820] text-[#C6F432] shadow-sm"
                : "text-[#8B969E] hover:text-[#101820] hover:bg-[#F4F3EE]"
            }`}
          >
            <Shield className="h-4 w-4" />
            <span>Coach</span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedRole("PLAYER")}
            className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs font-bold transition-all ${
              selectedRole === "PLAYER"
                ? "bg-[#101820] text-[#C6F432] shadow-sm"
                : "text-[#8B969E] hover:text-[#101820] hover:bg-[#F4F3EE]"
            }`}
          >
            <UserCheck className="h-4 w-4" />
            <span>Player</span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedRole("SCOUT")}
            className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs font-bold transition-all ${
              selectedRole === "SCOUT"
                ? "bg-[#101820] text-[#C6F432] shadow-sm"
                : "text-[#8B969E] hover:text-[#101820] hover:bg-[#F4F3EE]"
            }`}
          >
            <Search className="h-4 w-4" />
            <span>Scout</span>
          </button>
        </div>
      </div>

      {/* Dynamic Registration Flow */}
      <div className="w-full max-w-lg">
        <IdRegistrationFlow
          key={selectedRole}
          role={selectedRole}
          title={currentConfig.title}
          subtitle={currentConfig.subtitle}
          idLabel={currentConfig.idLabel}
          idPlaceholder={currentConfig.idPlaceholder}
          idHelperText={currentConfig.idHelperText}
          redirectPath={currentConfig.redirectPath}
        />
      </div>

      {/* Academy Owner Registration Callout */}
      <div className="w-full max-w-lg mt-4 text-center">
        <Link
          href="/register-academy"
          className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#101820] hover:underline"
        >
          <Building2 className="h-3.5 w-3.5" />
          <span>Register a new sports academy tenant &rarr;</span>
        </Link>
      </div>
    </div>
  );
}

export default function UnifiedRegistrationPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen w-full items-center justify-center bg-[#F4F3EE]">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#DCE1E3] border-t-[#101820]" />
        </div>
      }
    >
      <UnifiedRegisterContent />
    </Suspense>
  );
}
