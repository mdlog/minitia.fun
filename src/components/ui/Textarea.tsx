import { forwardRef, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  hint?: string;
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, hint, error, className, id, ...rest },
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
          "relative rounded-2xl surface-nested ghost-border transition-all duration-200",
          "focus-within:-translate-y-0.5 focus-within:shadow-[0_0_0_1px_rgba(91,140,255,0.28),0_0_0_6px_rgba(91,140,255,0.1)]",
          error && "shadow-[0_0_0_1px_rgba(255,84,112,0.35),0_0_0_6px_rgba(255,84,112,0.08)]",
        )}
      >
        <textarea
          ref={ref}
          id={inputId}
          className={cn(
            "min-h-[132px] w-full resize-none bg-transparent px-4 py-3 text-body-md text-on-surface outline-none placeholder:text-on-surface-muted",
            className,
          )}
          {...rest}
        />
      </div>
      {(hint || error) && (
        <p className={cn("text-body-sm", error ? "text-error" : "text-on-surface-muted")}>
          {error ?? hint}
        </p>
      )}
    </div>
  );
});
