"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Zap, ShieldCheck, ArrowRight, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Navbar() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-athletic-border/70 bg-athletic-black/90 backdrop-blur-md">
      <div className="container mx-auto flex h-20 items-center justify-between px-4 sm:px-8">
        {/* Athletic Logo */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-athletic-lime text-athletic-black font-black italic tracking-tighter shadow-[0_0_20px_rgba(163,255,0,0.4)] group-hover:scale-105 transition-transform">
            <Zap className="h-6 w-6 stroke-[3]" />
          </div>
          <div className="flex flex-col">
            <span className="text-2xl font-black italic tracking-tight text-white uppercase group-hover:text-athletic-lime transition-colors">
              ATHLIX
            </span>
            <span className="text-[10px] font-bold tracking-widest text-athletic-textMuted uppercase -mt-1">
              ACADEMY & SCOUTING OS
            </span>
          </div>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-8">
          <Link
            href="/#features"
            className="text-xs font-bold uppercase tracking-wider text-athletic-textMuted hover:text-athletic-lime transition-colors"
          >
            Features
          </Link>
          <Link
            href="/#scouting"
            className="text-xs font-bold uppercase tracking-wider text-athletic-textMuted hover:text-athletic-lime transition-colors"
          >
            Scouting Engine
          </Link>
          <Link
            href="/#how-it-works"
            className="text-xs font-bold uppercase tracking-wider text-athletic-textMuted hover:text-athletic-lime transition-colors"
          >
            How It Works
          </Link>
          <Link
            href="/#sports"
            className="text-xs font-bold uppercase tracking-wider text-athletic-textMuted hover:text-athletic-lime transition-colors"
          >
            Sports
          </Link>
        </nav>

        {/* Action Buttons */}
        <div className="flex items-center gap-4">
          <Link href="/login">
            <Button variant="ghost" size="sm" className="hidden sm:inline-flex text-xs font-bold">
              Sign In
            </Button>
          </Link>
          <Link href="/register-academy">
            <Button variant="athletic" size="sm" className="flex items-center gap-2">
              <span>Register Academy</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    </header>
  );
}
