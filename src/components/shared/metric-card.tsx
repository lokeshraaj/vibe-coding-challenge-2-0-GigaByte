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
        "relative overflow-hidden transition-all bg-white border border-[#DCE1E3] shadow-sm hover:border-[#8B969E]/50",
        highlight && "border-l-4 border-l-[#C6F432]"
      )}
    >
      <CardContent className="p-6">
        <div className="flex items-center justify-between pb-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-[#8B969E]">
            {title}
          </span>
          {icon && (
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-[#F4F3EE] text-[#101820]">
              {icon}
            </div>
          )}
        </div>

        <div className="space-y-1">
          <div className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#101820]">
            {value}
          </div>
          {subtitle && <p className="text-xs text-[#8B969E]">{subtitle}</p>}
        </div>

        {trend && (
          <div className="mt-3 flex items-center gap-1.5 text-xs font-semibold">
            <span className={trend.isPositive ? "text-emerald-600" : "text-rose-600"}>
              {trend.value}
            </span>
            <span className="text-[#8B969E]">vs last period</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
