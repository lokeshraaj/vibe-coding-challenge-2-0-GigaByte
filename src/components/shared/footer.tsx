import Link from "next/link";
import { Zap, ShieldCheck } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-[#DCE1E3] bg-[#F4F3EE] pt-14 pb-12">
      <div className="container mx-auto px-4 sm:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-10">
          {/* Brand info */}
          <div className="space-y-3 md:col-span-1">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-[#C6F432] text-[#101820] font-black">
                <Zap className="h-4 w-4 stroke-[3]" />
              </div>
              <span className="text-lg font-black italic tracking-tight text-[#101820] uppercase">
                ATHLIX
              </span>
            </div>
            <p className="text-xs text-[#8B969E] leading-relaxed">
              The minimalist multi-tenant operating system for sports academies, coaching rosters, and pro talent discovery networks.
            </p>
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>Multi-Tenant Enterprise Isolation</span>
            </div>
          </div>

          {/* Platform */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#101820]">Platform</h4>
            <ul className="space-y-2 text-xs text-[#8B969E]">
              <li>
                <Link href="#features" className="hover:text-[#101820] transition-colors">
                  Academy Management
                </Link>
              </li>
              <li>
                <Link href="#scouting" className="hover:text-[#101820] transition-colors">
                  Talent Trial Engine
                </Link>
              </li>
              <li>
                <Link href="#features" className="hover:text-[#101820] transition-colors">
                  Practice Attendance
                </Link>
              </li>
              <li>
                <Link href="#features" className="hover:text-[#101820] transition-colors">
                  Match Performance
                </Link>
              </li>
            </ul>
          </div>

          {/* Roles */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#101820]">Role Workspaces</h4>
            <ul className="space-y-2 text-xs text-[#8B969E]">
              <li>Academy Owner Dashboard</li>
              <li>Coach Practice & Match Sheet</li>
              <li>Dedicated Scout Directory</li>
              <li>Athlete Personal Portal</li>
              <li>Platform Super Admin</li>
            </ul>
          </div>

          {/* Quick Access */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#101820]">Get Started</h4>
            <p className="text-xs text-[#8B969E]">
              Digitize academy operations today and put your talent on the scout radar.
            </p>
            <div className="pt-1">
              <Link
                href="/register-academy"
                className="inline-block text-xs font-bold uppercase tracking-wider text-[#101820] hover:text-emerald-700 underline"
              >
                Register Your Academy &rarr;
              </Link>
            </div>
          </div>
        </div>

        <div className="border-t border-[#DCE1E3] pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-[#8B969E] gap-4">
          <p>© {new Date().getFullYear()} ATHLIX Technologies Inc. All rights reserved.</p>
          <div className="flex gap-6">
            <span className="hover:text-[#101820] cursor-pointer">Privacy Policy</span>
            <span className="hover:text-[#101820] cursor-pointer">Terms of Service</span>
            <span className="hover:text-[#101820] cursor-pointer">Security Standards</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
