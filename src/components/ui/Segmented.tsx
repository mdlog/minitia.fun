import { cn } from "@/lib/cn";

export interface SegmentedOption<T extends string = string> {
  value: T;
  label: string;
}

export interface SegmentedProps<T extends string = string> {
  value: T;
  onChange: (value: T) => void;
  options: Array<T | SegmentedOption<T>>;
  size?: "xs" | "sm";
  className?: string;
}

export function Segmented<T extends string = string>({
  value,
  onChange,
  options,
  size = "sm",
  className,
}: SegmentedProps<T>) {
  const sz =
    size === "xs" ? "h-7 text-[11px] px-2.5" : "h-8 text-[12px] px-3";

  return (
    <div className={cn("inline-flex rounded-lg bg-[#0F0F11] p-0.5 ghost-border", className)}>
      {options.map((opt) => {
        const v = (typeof opt === "string" ? opt : opt.value) as T;
        const label = typeof opt === "string" ? opt : opt.label;
        const active = value === v;
        return (
          <button
            key={v}
            type="button"
            onClick={() => onChange(v)}
            className={cn(
              "flex items-center justify-center rounded-md font-medium transition-colors duration-150",
              sz,
              active
                ? "bg-white/[0.08] text-on-surface ghost-border"
                : "text-on-surface-variant hover:text-on-surface",
            )}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
