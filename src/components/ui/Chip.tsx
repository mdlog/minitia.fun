import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

type Tone = "neutral" | "success" | "warning" | "danger" | "info" | "glow";

export interface ChipProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
  leading?: ReactNode;
  dense?: boolean;
}

const toneStyles: Record<Tone, string> = {
  neutral: "bg-surface-container-high text-on-surface-variant",
  success: "bg-secondary-container text-on-secondary-container",
  warning: "bg-tertiary-container text-on-tertiary-container",
  danger: "bg-error-container text-on-error-container",
  info: "bg-primary-container text-on-primary-container",
  glow: "bg-gradient-hyperglow text-surface",
};

export function Chip({ tone = "neutral", leading, dense, className, children, ...rest }: ChipProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 font-mono font-medium uppercase rounded-sm tracking-wider",
        dense ? "px-1.5 py-0.5 text-[0.625rem]" : "px-2 py-1 text-label-sm",
        toneStyles[tone],
        className,
      )}
      {...rest}
    >
      {leading}
      {children}
    </span>
  );
}
