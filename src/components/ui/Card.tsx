import { forwardRef, type HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type Tier = "low" | "base" | "high" | "highest";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  tier?: Tier;
  interactive?: boolean;
  glass?: boolean;
  padded?: boolean | "none" | "sm" | "md" | "lg";
}

const tierStyles: Record<Tier, string> = {
  low: "bg-surface-container-low",
  base: "bg-surface-container",
  high: "bg-surface-container-high",
  highest: "bg-surface-container-highest",
};

const padStyles: Record<"none" | "sm" | "md" | "lg", string> = {
  none: "",
  sm: "p-4",
  md: "p-5",
  lg: "p-6",
};

export const Card = forwardRef<HTMLDivElement, CardProps>(function Card(
  { tier = "base", interactive = false, glass = false, padded = "md", className, children, ...rest },
  ref,
) {
  const padClass =
    padded === true
      ? padStyles.md
      : padded === false
        ? ""
        : padStyles[padded];

  return (
    <div
      ref={ref}
      className={cn(
        "relative rounded-xl ghost-border transition-colors duration-150",
        glass ? tierStyles.low : tierStyles[tier],
        interactive && "cursor-pointer hover:bg-surface-container-high",
        padClass,
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
});
