import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export interface StatProps {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  trend?: "up" | "down" | "flat";
  emphasis?: "display" | "headline" | "title";
  className?: string;
}

export function Stat({ label, value, sub, trend, emphasis = "headline", className }: StatProps) {
  const trendColor =
    trend === "up"
      ? "text-secondary"
      : trend === "down"
        ? "text-error"
        : "text-on-surface-variant";

  const valueClass =
    emphasis === "display"
      ? "text-display-sm font-display tracking-tight"
      : emphasis === "headline"
        ? "text-headline-md font-display tracking-tight"
        : "text-title-lg font-display tracking-tight";

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <span className="text-[0.68rem] font-mono uppercase tracking-[0.22em] text-on-surface-variant">
        {label}
      </span>
      <span className={cn(valueClass, "text-on-surface font-mono")}>{value}</span>
      {sub && (
        <span
          className={cn(
            "text-body-sm leading-relaxed",
            trend ? trendColor : "text-on-surface-muted",
          )}
        >
          {sub}
        </span>
      )}
    </div>
  );
}
