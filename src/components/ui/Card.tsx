import { forwardRef, type HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type Tier = "low" | "base" | "high" | "highest";
type Interactive = boolean;

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  tier?: Tier;
  interactive?: Interactive;
  glass?: boolean;
  padded?: boolean | "sm" | "md" | "lg";
}

const tierStyles: Record<Tier, string> = {
  low: "surface-section",
  base: "surface-card",
  high: "surface-card-high",
  highest: "surface-nested",
};

const padStyles: Record<"sm" | "md" | "lg", string> = {
  sm: "p-5",
  md: "p-6",
  lg: "p-7 md:p-8",
};

export const Card = forwardRef<HTMLDivElement, CardProps>(function Card(
  { tier = "base", interactive = false, glass = false, padded = "md", className, children, ...rest },
  ref,
) {
  const padClass = padded === true ? padStyles.md : padded ? padStyles[padded] : "";

  return (
    <div
      ref={ref}
      className={cn(
        "relative rounded-2xl ghost-border transition-all duration-200",
        glass ? "glass" : tierStyles[tier],
        interactive &&
          "cursor-pointer hover:surface-card-high hover:shadow-ambient hover:scale-[1.005]",
        padClass,
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
});
