import { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: ReactNode;
  trend?: {
    value: string;
    isPositive?: boolean;
  };
  highlight?: boolean;
}

export function MetricCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  highlight = false,
}: MetricCardProps) {
  return (
    <Card
      className={cn(
        "relative overflow-hidden transition-all duration-300 hover:border-athletic-lime/50",
        highlight && "border-athletic-lime/60 shadow-[0_0_20px_rgba(163,255,0,0.15)]"
      )}
    >
      {/* Corner neon diagonal accent if highlighted */}
      {highlight && (
        <div className="absolute top-0 right-0 w-16 h-16 overflow-hidden pointer-events-none">
          <div className="absolute top-0 right-0 transform translate-x-8 -translate-y-8 rotate-45 bg-athletic-lime w-16 h-4 shadow-[0_0_10px_#A3FF00]"></div>
        </div>
      )}

      <CardContent className="p-6">
        <div className="flex items-center justify-between pb-3">
          <span className="text-xs font-bold uppercase tracking-wider text-athletic-textMuted">
            {title}
          </span>
          {icon && (
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-athletic-elevated text-athletic-lime">
              {icon}
            </div>
          )}
        </div>

        <div className="space-y-1">
          <div className="text-3xl sm:text-4xl font-black italic tracking-tight text-white">
            {value}
          </div>
          {subtitle && <p className="text-xs text-athletic-textMuted">{subtitle}</p>}
        </div>

        {trend && (
          <div className="mt-3 flex items-center gap-1.5 text-xs font-bold">
            <span className={trend.isPositive ? "text-emerald-400" : "text-rose-400"}>
              {trend.value}
            </span>
            <span className="text-neutral-500">vs last period</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
