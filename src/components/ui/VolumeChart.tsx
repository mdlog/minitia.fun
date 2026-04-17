import { cn } from "@/lib/cn";

export function VolumeChart({
  data,
  className,
  height = 140,
}: {
  data: number[];
  className?: string;
  height?: number;
}) {
  const max = Math.max(...data, 1);
  return (
    <div
      className={cn("flex items-end gap-1.5 w-full", className)}
      style={{ height }}
      aria-label="Volume chart"
    >
      {data.map((v, i) => {
        const h = (v / max) * 100;
        const isPeak = v === max;
        return (
          <div
            key={i}
            className={cn(
              "flex-1 rounded-sm snappy transition-all duration-500",
              isPeak
                ? "bg-gradient-hyperglow shadow-glow-secondary"
                : "bg-primary-container hover:bg-primary-dim",
            )}
            style={{ height: `${h}%`, minHeight: 4 }}
          />
        );
      })}
    </div>
  );
}
