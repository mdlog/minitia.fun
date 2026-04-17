import {
  cloneElement,
  forwardRef,
  isValidElement,
  type ButtonHTMLAttributes,
  type ReactElement,
  type ReactNode,
} from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "glass" | "tertiary" | "hyperglow" | "danger";
type Size = "sm" | "md" | "lg";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  leading?: ReactNode;
  trailing?: ReactNode;
  fullWidth?: boolean;
  asChild?: boolean;
}

const variantStyles: Record<Variant, string> = {
  primary:
    "bg-primary text-primary-on shadow-sm hover:bg-primary-dim hover:shadow",
  secondary:
    "bg-secondary text-secondary-on shadow-sm hover:bg-secondary-dim hover:shadow",
  glass:
    "glass-low text-on-surface ghost-border hover:bg-white/[0.08] hover:text-on-surface",
  tertiary:
    "bg-transparent text-on-surface-variant hover:bg-white/[0.04] hover:text-on-surface",
  hyperglow:
    "bg-gradient-hyperglow text-on-primary shadow-sm hover:shadow",
  danger:
    "bg-error text-error-on shadow-sm hover:brightness-110",
};

const sizeStyles: Record<Size, string> = {
  sm: "h-9 rounded-lg px-3.5 text-body-sm",
  md: "h-10 rounded-lg px-4.5 text-body-md",
  lg: "h-11 rounded-lg px-6 text-body-md",
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
    "inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium snappy transition-all duration-200",
    "disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-45 disabled:shadow-none",
    "active:scale-[0.985]",
    "focus-ring",
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
    if (!isValidElement(children)) {
      return null;
    }

    const child = children as ReactElement<{ className?: string; children?: ReactNode }>;
    return cloneElement(child, {
      className: cn(buttonClassName, child.props.className),
      children: content,
    });
  }

  return (
    <button
      ref={ref}
      type={rest.type ?? "button"}
      className={buttonClassName}
      {...rest}
    >
      {content}
    </button>
  );
});
