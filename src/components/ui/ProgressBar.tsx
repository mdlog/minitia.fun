import { cn } from "@/lib/cn";

export interface ProgressBarProps {
  value: number;
  max?: number;
  label?: string;
  showValue?: boolean;
  tone?: "graduation" | "primary" | "neutral";
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function ProgressBar({
  value,
  max = 100,
  label,
  showValue = false,
  tone = "graduation",
  size = "md",
  className,
}: ProgressBarProps) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  const heights = { sm: "h-1", md: "h-2", lg: "h-3" } as const;
  const fillClass =
    tone === "graduation"
      ? "progress-graduation"
      : tone === "primary"
        ? "bg-gradient-primary"
        : "bg-on-surface-variant";

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {(label || showValue) && (
        <div className="flex items-baseline justify-between">
          {label && (
            <span className="text-label-md uppercase text-on-surface-variant">{label}</span>
          )}
          {showValue && (
            <span className="text-body-sm font-mono text-on-surface">{pct.toFixed(0)}%</span>
          )}
        </div>
      )}
      <div className={cn("w-full surface-nested rounded-full overflow-hidden", heights[size])}>
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
