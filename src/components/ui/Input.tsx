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
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="text-[11px] font-medium text-on-surface-variant">
          {label}
        </label>
      )}
      <div
        className={cn(
          "relative flex items-center rounded-lg bg-[#0F0F11] ghost-border transition-all",
          "focus-within:ring-1 focus-within:ring-primary/50",
          error && "ring-1 ring-error/50",
        )}
      >
        {leading && (
          <span className="pl-3 font-mono text-[13px] text-on-surface-muted">{leading}</span>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            "w-full bg-transparent px-3 py-2.5 text-[13.5px] text-on-surface outline-none placeholder:text-[#52525B]",
            leading && "pl-2",
            trailing && "pr-2",
            className,
          )}
          {...rest}
        />
        {trailing && <span className="pr-3 text-on-surface-variant">{trailing}</span>}
      </div>
      {(hint || error) && (
        <span className={cn("text-[11px]", error ? "text-[#FB7185]" : "text-[#52525B]")}>
          {error ?? hint}
        </span>
      )}
    </div>
  );
});
