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
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="text-[11px] font-medium text-on-surface-variant">
          {label}
        </label>
      )}
      <textarea
        ref={ref}
        id={inputId}
        className={cn(
          "min-h-[96px] w-full resize-none rounded-lg bg-[#0F0F11] ghost-border px-3 py-2.5 text-[13.5px] text-on-surface outline-none placeholder:text-[#52525B] focus:ring-1 focus:ring-primary/50",
          error && "ring-1 ring-error/50",
          className,
        )}
        {...rest}
      />
      {(hint || error) && (
        <span className={cn("text-[11px]", error ? "text-[#FB7185]" : "text-[#52525B]")}>
          {error ?? hint}
        </span>
      )}
    </div>
  );
});
