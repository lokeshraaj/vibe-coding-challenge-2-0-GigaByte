"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Navbar() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-[#DCE1E3] bg-white/90 backdrop-blur-md">
      <div className="container mx-auto flex h-18 items-center justify-between px-4 sm:px-8 py-3">
        {/* Athletic Brand Logo */}
        <Link href="/" className="flex items-center gap-3 group">
          <img
            src="/images/logo.png"
            alt="ATHLIX"
            className="h-8 w-auto object-contain group-hover:opacity-90 transition-opacity"
          />
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
