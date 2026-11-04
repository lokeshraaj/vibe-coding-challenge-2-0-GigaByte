"use client";

import Link from "next/link";
import { Zap, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Navbar() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-[#DCE1E3] bg-white/90 backdrop-blur-md">
      <div className="container mx-auto flex h-18 items-center justify-between px-4 sm:px-8 py-3">
        {/* Athletic Brand Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#C6F432] text-[#101820] font-black italic tracking-tighter shadow-xs group-hover:scale-102 transition-transform">
            <Zap className="h-5 w-5 stroke-[2.5]" />
          </div>
          <div className="flex flex-col">
            <span className="text-xl font-black italic tracking-tight text-[#101820] uppercase">
              ATHLIX
            </span>
            <span className="text-[9px] font-bold tracking-widest text-[#8B969E] uppercase -mt-1">
              SPORTS ACADEMY OS
            </span>
          </div>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-7">
          <Link
            href="/#features"
            className="text-xs font-semibold uppercase tracking-wider text-[#8B969E] hover:text-[#101820] transition-colors"
          >
            Features
          </Link>
          <Link
            href="/#scouting"
            className="text-xs font-semibold uppercase tracking-wider text-[#8B969E] hover:text-[#101820] transition-colors"
          >
            Scouting Engine
          </Link>
          <Link
            href="/#how-it-works"
            className="text-xs font-semibold uppercase tracking-wider text-[#8B969E] hover:text-[#101820] transition-colors"
          >
            How It Works
          </Link>
          <Link
            href="/#sports"
            className="text-xs font-semibold uppercase tracking-wider text-[#8B969E] hover:text-[#101820] transition-colors"
          >
            Disciplines
          </Link>
        </nav>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <Link href="/login">
            <Button variant="ghost" size="sm" className="text-xs font-bold text-[#101820]">
              Sign In
            </Button>
          </Link>
          <Link href="/register-academy">
            <Button variant="athletic" size="sm" className="flex items-center gap-2 text-xs">
              <span>Register Academy</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>
      </div>
    </header>
  );
}
