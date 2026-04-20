import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export interface SectionHeaderProps {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  trailing?: ReactNode;
  action?: ReactNode;
  align?: "left" | "center";
  className?: string;
}

export function SectionHeader({
  eyebrow,
  title,
  description,
  trailing,
  action,
  align = "left",
  className,
}: SectionHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-end justify-between gap-4",
        align === "center" && "justify-center text-center",
        className,
      )}
    >
      <div className="flex flex-col gap-1 min-w-0">
        {eyebrow && (
          <span className="text-[10.5px] font-medium uppercase tracking-[0.08em] text-on-surface-muted">
            {eyebrow}
          </span>
        )}
        <h2 className="text-[17px] font-semibold tracking-tight text-on-surface">{title}</h2>
        {description && (
          <p className="text-[13px] text-on-surface-variant">{description}</p>
        )}
      </div>
      {(trailing || action) && (
        <div className="flex items-center gap-2">{action ?? trailing}</div>
      )}
    </div>
  );
}
