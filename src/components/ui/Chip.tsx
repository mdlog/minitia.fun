import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

type Tone = "neutral" | "muted" | "success" | "warning" | "danger" | "info" | "glow";

export interface ChipProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
  leading?: ReactNode;
  dense?: boolean;
  dot?: boolean;
}

const toneStyles: Record<Tone, string> = {
  neutral: "bg-white/[0.05] text-on-surface-variant",
  muted: "bg-white/[0.03] text-on-surface-muted",
  success: "bg-[#10B981]/10 text-[#34D399]",
  info: "bg-[#2563EB]/12 text-[#60A5FA]",
  danger: "bg-[#E11D48]/10 text-[#FB7185]",
  warning: "bg-[#F59E0B]/10 text-[#FBBF24]",
  glow: "bg-[#2563EB]/12 text-[#60A5FA]",
};

const dotStyles: Record<Tone, string> = {
  neutral: "bg-on-surface-muted",
  muted: "bg-[#52525B]",
  success: "bg-secondary",
  info: "bg-[#3B82F6]",
  danger: "bg-error",
  warning: "bg-[#F59E0B]",
  glow: "bg-[#3B82F6]",
};

export function Chip({
  tone = "neutral",
  leading,
  dense,
  dot,
  className,
  children,
  ...rest
}: ChipProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md font-mono font-medium tracking-[0.04em]",
        dense ? "px-1.5 py-[2px] text-[10px]" : "px-2 py-[3px] text-[10.5px]",
        toneStyles[tone],
        className,
      )}
      {...rest}
    >
      {dot && <span className={cn("h-1.5 w-1.5 rounded-full", dotStyles[tone])} />}
      {leading}
      {children}
    </span>
  );
}
