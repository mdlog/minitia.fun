import { cn } from "@/lib/cn";

export interface DeltaProps {
  value: number;
  className?: string;
}

export function Delta({ value, className }: DeltaProps) {
  const pos = value >= 0;
  return (
    <span
      className={cn(
        "font-mono text-[12px] font-medium tabular-nums",
        pos ? "text-[#34D399]" : "text-[#FB7185]",
        className,
      )}
    >
      {pos ? "+" : ""}
      {value.toFixed(2)}%
    </span>
  );
}
