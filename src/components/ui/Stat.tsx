import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export interface StatProps {
  label: string;
  value: ReactNode;
  unit?: ReactNode;
  sub?: ReactNode;
  trend?: "up" | "down" | "flat";
  tone?: "default" | "success" | "danger" | "info";
  emphasis?: "display" | "headline" | "title";
  className?: string;
}

export function Stat({
  label,
  value,
  unit,
  sub,
  trend,
  tone,
  className,
}: StatProps) {
  const trendTone =
    trend === "up" ? "success" : trend === "down" ? "danger" : undefined;
  const resolvedTone = tone ?? trendTone ?? "default";

  const valueColor = {
    default: "text-on-surface",
    success: "text-[#34D399]",
    danger: "text-[#FB7185]",
    info: "text-[#60A5FA]",
  }[resolvedTone];

  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <span className="text-[10.5px] font-medium uppercase tracking-[0.08em] text-on-surface-muted">
        {label}
      </span>
      <span className="flex items-baseline gap-1.5">
        <span
          className={cn(
            "font-mono text-[20px] font-medium tabular-nums tracking-tight",
            valueColor,
          )}
        >
          {value}
        </span>
        {unit && <span className="font-mono text-[11px] text-on-surface-muted">{unit}</span>}
      </span>
      {sub && (
        <span
          className={cn(
            "text-[11.5px] leading-relaxed",
            resolvedTone === "default" ? "text-on-surface-muted" : valueColor,
          )}
        >
          {sub}
        </span>
      )}
    </div>
  );
}
