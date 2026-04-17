import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export interface SectionHeaderProps {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  trailing?: ReactNode;
  align?: "left" | "center";
  className?: string;
}

export function SectionHeader({
  eyebrow,
  title,
  description,
  trailing,
  align = "left",
  className,
}: SectionHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-end justify-between gap-6",
        align === "center" && "justify-center text-center",
        className,
      )}
    >
      <div className="max-w-3xl">
        {eyebrow && (
          <span className="inline-flex rounded-full bg-white/[0.04] px-3 py-1 text-[0.68rem] font-mono uppercase tracking-[0.22em] text-secondary">
            {eyebrow}
          </span>
        )}
        <h2 className={cn("mt-3 text-headline-lg font-display leading-tight text-on-surface")}>
          {title}
        </h2>
        {description && (
          <p className="mt-3 max-w-2xl text-body-lg leading-relaxed text-on-surface-variant">
            {description}
          </p>
        )}
      </div>
      {trailing && <div className="flex items-center gap-3">{trailing}</div>}
    </div>
  );
}
