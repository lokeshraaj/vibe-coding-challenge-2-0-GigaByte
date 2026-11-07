"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-[#DCE1E3] bg-white/95 backdrop-blur-md">
      <div className="container mx-auto flex h-16 sm:h-18 items-center justify-between px-3 sm:px-8 py-2.5 sm:py-3 gap-2">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-2.5 shrink-0 group">
          <img
            src="/images/logo.png"
            alt="ATHLIX"
            className="h-7 sm:h-8 w-auto object-contain group-hover:opacity-90 transition-opacity"
          />
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-6 lg:gap-7">
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

        {/* Action Buttons & Mobile Hamburger */}
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          <Link href="/login">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 sm:h-9 px-2 sm:px-3 text-xs font-bold text-[#101820]"
            >
              Sign In
            </Button>
          </Link>
          <Link href="/register-academy">
            <Button
              variant="athletic"
              size="sm"
              className="h-8 sm:h-9 px-2.5 sm:px-3.5 flex items-center gap-1.5 sm:gap-2 text-xs"
            >
              <span>Register<span className="hidden sm:inline"> Academy</span></span>
              <ArrowRight className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
            </Button>
          </Link>

          {/* Mobile Menu Toggle Button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden flex items-center justify-center h-8 w-8 rounded-lg border border-[#DCE1E3] text-[#101820] hover:bg-[#F4F3EE] transition-colors ml-1 shrink-0"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Mobile Dropdown Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-[#DCE1E3] bg-white px-4 py-4 space-y-3 animate-in fade-in slide-in-from-top-2 duration-150">
          <Link
            href="/#features"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-xs font-bold uppercase tracking-wider text-[#202A32] hover:text-[#101820] py-1.5"
          >
            Features
          </Link>
          <Link
            href="/#how-it-works"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-xs font-bold uppercase tracking-wider text-[#202A32] hover:text-[#101820] py-1.5"
          >
            How It Works
          </Link>
          <Link
            href="/#sports"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-xs font-bold uppercase tracking-wider text-[#202A32] hover:text-[#101820] py-1.5"
          >
            Disciplines
          </Link>
        </div>
      )}
    </header>
  );
}
