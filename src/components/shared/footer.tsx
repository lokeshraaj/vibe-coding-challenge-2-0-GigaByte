import Link from "next/link";
import { Zap, ShieldCheck } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-athletic-border bg-athletic-black pt-16 pb-12">
      <div className="container mx-auto px-4 sm:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
          {/* Brand info */}
          <div className="space-y-4 md:col-span-1">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-md bg-athletic-lime text-athletic-black font-black">
                <Zap className="h-5 w-5 stroke-[3]" />
              </div>
              <span className="text-xl font-black italic tracking-tight text-white uppercase">
                ATHLIX
              </span>
            </div>
            <p className="text-xs text-athletic-textMuted leading-relaxed">
              The high-performance multi-tenant operating system for sports academies, coaching staff, and talent discovery networks worldwide.
            </p>
            <div className="flex items-center gap-2 text-[11px] font-semibold text-emerald-400">
              <ShieldCheck className="h-4 w-4" />
              <span>Multi-Tenant Enterprise Isolation</span>
            </div>
          </div>

          {/* Platform */}
          <div className="space-y-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-white">Platform</h4>
            <ul className="space-y-2 text-xs text-athletic-textMuted">
              <li>
                <Link href="#features" className="hover:text-athletic-lime transition-colors">
                  Academy Management
                </Link>
              </li>
              <li>
                <Link href="#scouting" className="hover:text-athletic-lime transition-colors">
                  Talent Trial Engine
                </Link>
              </li>
              <li>
                <Link href="#features" className="hover:text-athletic-lime transition-colors">
                  Practice Attendance
                </Link>
              </li>
              <li>
                <Link href="#features" className="hover:text-athletic-lime transition-colors">
                  Match Performance
                </Link>
              </li>
            </ul>
          </div>

          {/* Roles */}
          <div className="space-y-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-white">Role Workspaces</h4>
            <ul className="space-y-2 text-xs text-athletic-textMuted">
              <li>Academy Owner Dashboard</li>
              <li>Coach Practice & Match Sheet</li>
              <li>Dedicated Scout Directory</li>
              <li>Player Personal Portal</li>
              <li>Platform Super Admin</li>
            </ul>
          </div>

          {/* Quick Access */}
          <div className="space-y-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-white">Get Started</h4>
            <p className="text-xs text-athletic-textMuted">
              Digitize your academy operations today and put your talent on the scout radar.
            </p>
            <div className="pt-2">
              <Link
                href="/register-academy"
                className="inline-block text-xs font-bold uppercase tracking-wider text-athletic-lime hover:underline"
              >
                Register Your Academy &rarr;
              </Link>
            </div>
          </div>
        </div>

        <div className="border-t border-athletic-border/50 pt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-neutral-500 gap-4">
          <p>© {new Date().getFullYear()} Athlix Technologies Inc. All rights reserved.</p>
          <div className="flex gap-6">
            <span className="hover:text-neutral-400 cursor-pointer">Privacy Policy</span>
            <span className="hover:text-neutral-400 cursor-pointer">Terms of Service</span>
            <span className="hover:text-neutral-400 cursor-pointer">Security Standards</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
