import {
  cloneElement,
  forwardRef,
  isValidElement,
  type ButtonHTMLAttributes,
  type ReactElement,
  type ReactNode,
} from "react";
import { cn } from "@/lib/cn";

type Variant =
  | "primary"
  | "secondary"
  | "neutral"
  | "ghost"
  | "outline"
  | "danger"
  | "glass"
  | "tertiary"
  | "hyperglow";

type Size = "xs" | "sm" | "md" | "lg";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  leading?: ReactNode;
  trailing?: ReactNode;
  fullWidth?: boolean;
  asChild?: boolean;
}

const variantStyles: Record<Variant, string> = {
  primary: "bg-primary text-white hover:bg-primary-dim active:bg-[#1E40AF]",
  secondary: "bg-secondary text-white hover:bg-secondary-dim",
  neutral: "bg-white/[0.06] text-on-surface hover:bg-white/[0.10] ghost-border",
  ghost: "bg-transparent text-on-surface-variant hover:bg-white/[0.04] hover:text-on-surface",
  outline: "bg-transparent text-on-surface ghost-border hover:bg-white/[0.04]",
  danger: "bg-error text-white hover:brightness-110",
  // Aliases for backwards compatibility
  glass: "bg-white/[0.06] text-on-surface hover:bg-white/[0.10] ghost-border",
  tertiary: "bg-transparent text-on-surface-variant hover:bg-white/[0.04] hover:text-on-surface",
  hyperglow: "bg-primary text-white hover:bg-primary-dim",
};

const sizeStyles: Record<Size, string> = {
  xs: "h-7 px-2.5 text-[12px] rounded-md",
  sm: "h-8 px-3 text-[12.5px] rounded-md",
  md: "h-9 px-3.5 text-[13px] rounded-lg",
  lg: "h-10 px-4 text-[13.5px] rounded-lg",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = "primary",
    size = "md",
    leading,
    trailing,
    fullWidth,
    asChild = false,
    className,
    children,
    ...rest
  },
  ref,
) {
  const buttonClassName = cn(
    "inline-flex items-center justify-center gap-1.5 whitespace-nowrap font-medium snappy transition-colors duration-150",
    "disabled:cursor-not-allowed disabled:opacity-40",
    "active:scale-[0.99] focus-ring",
    variantStyles[variant],
    sizeStyles[size],
    fullWidth && "w-full",
    className,
  );

  const content = (
    <>
      {leading}
      {asChild && isValidElement(children)
        ? (children as ReactElement<{ children?: ReactNode }>).props.children
        : children}
      {trailing}
    </>
  );

  if (asChild) {
    if (!isValidElement(children)) return null;
    const child = children as ReactElement<{ className?: string; children?: ReactNode }>;
    return cloneElement(child, {
      className: cn(buttonClassName, child.props.className),
      children: content,
    });
  }

  return (
    <button ref={ref} type={rest.type ?? "button"} className={buttonClassName} {...rest}>
      {content}
    </button>
  );
});
