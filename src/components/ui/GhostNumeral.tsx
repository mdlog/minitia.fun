import { cn } from "@/lib/cn";

export function GhostNumeral({
  index,
  className,
}: {
  index: number | string;
  className?: string;
}) {
  const label = typeof index === "number" ? String(index).padStart(2, "0") : index;
  return (
    <span
      aria-hidden
      className={cn(
        "font-editorial italic text-[8rem] leading-none select-none pointer-events-none",
        "text-transparent [-webkit-text-stroke:1px_rgba(240,185,72,0.22)]",
        className,
      )}
    >
      {label}
    </span>
  );
}
