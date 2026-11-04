import * as React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "success" | "warning" | "destructive" | "outline" | "neon";
}

export function Badge({ className, variant = "default", ...props }: BadgeProps) {
  const base =
    "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider transition-colors";

  const variants = {
    default: "bg-athletic-elevated text-athletic-textMuted border border-athletic-border",
    success: "bg-emerald-950/80 text-emerald-400 border border-emerald-800/50",
    warning: "bg-amber-950/80 text-amber-400 border border-amber-800/50",
    destructive: "bg-rose-950/80 text-rose-400 border border-rose-800/50",
    outline: "border border-athletic-border text-white",
    neon: "bg-athletic-lime/15 text-athletic-lime border border-athletic-lime/40 shadow-[0_0_12px_rgba(163,255,0,0.2)]",
  };

  return <div className={cn(base, variants[variant], className)} {...props} />;
}
