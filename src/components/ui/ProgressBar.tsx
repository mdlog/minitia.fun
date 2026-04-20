import { cn } from "@/lib/cn";

export interface ProgressBarProps {
  value: number;
  max?: number;
  label?: string;
  showValue?: boolean;
  tone?: "graduation" | "primary" | "secondary" | "neutral";
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function ProgressBar({
  value,
  max = 100,
  label,
  showValue = false,
  tone = "primary",
  size = "md",
  className,
}: ProgressBarProps) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  const heights = { sm: "h-1", md: "h-1.5", lg: "h-2" } as const;

  const fillClass =
    tone === "secondary"
      ? "bg-secondary"
      : tone === "neutral"
        ? "bg-white/25"
        : "bg-primary";

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {(label || showValue) && (
        <div className="flex items-baseline justify-between">
          {label && (
            <span className="text-[10.5px] font-medium uppercase tracking-[0.08em] text-on-surface-muted">
              {label}
            </span>
          )}
          {showValue && (
            <span className="font-mono text-[11px] tabular-nums text-on-surface">
              {pct.toFixed(0)}%
            </span>
          )}
        </div>
      )}
      <div
        className={cn(
          "w-full overflow-hidden rounded-full bg-white/[0.06]",
          heights[size],
        )}
      >
        <div
          role="progressbar"
          aria-valuenow={value}
          aria-valuemax={max}
          className={cn("h-full rounded-full transition-all duration-500 ease-snappy", fillClass)}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
