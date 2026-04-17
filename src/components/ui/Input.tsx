import { forwardRef, type InputHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/cn";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
  leading?: ReactNode;
  trailing?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, hint, error, leading, trailing, className, id, ...rest },
  ref,
) {
  const inputId = id ?? rest.name;

  return (
    <div className="flex flex-col gap-2.5">
      {label && (
        <label
          htmlFor={inputId}
          className="text-[0.68rem] font-mono uppercase tracking-[0.22em] text-on-surface-variant"
        >
          {label}
        </label>
      )}
      <div
        className={cn(
          "relative flex items-center rounded-2xl surface-nested ghost-border px-1 transition-all duration-200",
          "focus-within:-translate-y-0.5 focus-within:shadow-[0_0_0_1px_rgba(186,158,255,0.28),0_0_0_6px_rgba(186,158,255,0.08)]",
          error && "shadow-[0_0_0_1px_rgba(255,84,112,0.35),0_0_0_6px_rgba(255,84,112,0.08)]",
        )}
      >
        {leading && <span className="pl-3 text-on-surface-variant">{leading}</span>}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            "w-full bg-transparent px-3 py-3 text-body-md text-on-surface outline-none placeholder:text-on-surface-muted",
            leading && "pl-2",
            trailing && "pr-2",
            className,
          )}
          {...rest}
        />
        {trailing && <span className="pr-3 text-on-surface-variant">{trailing}</span>}
      </div>
      {(hint || error) && (
        <p className={cn("text-body-sm", error ? "text-error" : "text-on-surface-muted")}>
          {error ?? hint}
        </p>
      )}
    </div>
  );
});
