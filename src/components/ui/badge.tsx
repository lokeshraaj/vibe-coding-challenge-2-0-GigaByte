import * as React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "success" | "warning" | "destructive" | "outline" | "neon";
}

export function Badge({ className, variant = "default", ...props }: BadgeProps) {
  const base =
    "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider transition-colors";

  const variants = {
    default: "bg-[#F4F3EE] text-[#202A32] border border-[#DCE1E3]",
    success: "bg-emerald-50 text-emerald-800 border border-emerald-200",
    warning: "bg-amber-50 text-amber-900 border border-amber-200",
    destructive: "bg-rose-50 text-rose-800 border border-rose-200",
    outline: "border border-[#DCE1E3] text-[#202A32]",
    neon: "bg-[#C6F432]/35 text-[#101820] border border-[#C6F432] font-bold shadow-xs",
  };

  return <div className={cn(base, variants[variant], className)} {...props} />;
}
