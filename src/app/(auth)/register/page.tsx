import { Metadata } from "next";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { UserCheck, Shield, Building2, ArrowRight } from "lucide-react";

export const metadata: Metadata = {
  title: "Account Registration | ATHLIX",
  description: "Select your role to register and activate your ATHLIX profile.",
};

export default function RegisterHubPage() {
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

      <Card className="w-full max-w-lg border-[#DCE1E3] bg-white shadow-sm">
        <CardHeader className="space-y-1.5 border-b border-[#DCE1E3] pb-4">
          <CardTitle className="text-2xl font-extrabold text-[#101820] tracking-tight">
            Register on ATHLIX
          </CardTitle>
          <CardDescription className="text-sm text-[#8B969E]">
            Choose your onboarding path below to activate your account.
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-6 space-y-4">
          {/* Option 1: Coach Registration */}
          <Link
            href="/register/coach"
            className="flex items-center justify-between p-4 rounded-xl border border-[#DCE1E3] hover:border-[#101820] hover:bg-[#F4F3EE] transition-all group"
          >
            <div className="flex items-center gap-3.5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[#101820] text-[#C6F432]">
                <Shield className="h-5 w-5" />
              </div>
              <div>
                <div className="text-sm font-bold text-[#101820] group-hover:text-black">
                  Coach Registration
                </div>
                <div className="text-xs text-[#8B969E]">
                  Activate with your assigned Coach ID (e.g. DCOFO001)
                </div>
              </div>
            </div>
            <ArrowRight className="h-4 w-4 text-[#8B969E] group-hover:text-[#101820] group-hover:translate-x-1 transition-all" />
          </Link>

          {/* Option 2: Player Registration */}
          <Link
            href="/register/player"
            className="flex items-center justify-between p-4 rounded-xl border border-[#DCE1E3] hover:border-[#101820] hover:bg-[#F4F3EE] transition-all group"
          >
            <div className="flex items-center gap-3.5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[#101820] text-[#C6F432]">
                <UserCheck className="h-5 w-5" />
              </div>
              <div>
                <div className="text-sm font-bold text-[#101820] group-hover:text-black">
                  Athlete / Player Registration
                </div>
                <div className="text-xs text-[#8B969E]">
                  Activate with your assigned Player ID (e.g. DPLFO001)
                </div>
              </div>
            </div>
            <ArrowRight className="h-4 w-4 text-[#8B969E] group-hover:text-[#101820] group-hover:translate-x-1 transition-all" />
          </Link>

          {/* Option 3: Academy Owner Registration */}
          <Link
            href="/register-academy"
            className="flex items-center justify-between p-4 rounded-xl border border-[#DCE1E3] hover:border-[#101820] hover:bg-[#F4F3EE] transition-all group"
          >
            <div className="flex items-center gap-3.5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[#F4F3EE] text-[#101820] border border-[#DCE1E3]">
                <Building2 className="h-5 w-5" />
              </div>
              <div>
                <div className="text-sm font-bold text-[#101820] group-hover:text-black">
                  Register New Academy
                </div>
                <div className="text-xs text-[#8B969E]">
                  Provision a new sports academy tenant environment
                </div>
              </div>
            </div>
            <ArrowRight className="h-4 w-4 text-[#8B969E] group-hover:text-[#101820] group-hover:translate-x-1 transition-all" />
          </Link>

          <div className="pt-4 border-t border-[#DCE1E3] text-center text-xs text-[#8B969E]">
            Already have an active account?{" "}
            <Link href="/login" className="font-bold text-[#101820] hover:underline uppercase">
              Sign In
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
