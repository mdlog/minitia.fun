import { cn } from "@/lib/cn";

export function Logo({
  className,
  showSub = true,
  size = "md",
  onDark = true,
}: {
  className?: string;
  showSub?: boolean;
  size?: "sm" | "md" | "lg";
  onDark?: boolean;
}) {
  const imgClass = size === "sm" ? "h-14" : size === "lg" ? "h-28" : "h-20";
  const funClass =
    size === "sm" ? "text-title-lg" : size === "lg" ? "text-headline-lg" : "text-headline-md";
  const funPullClass = size === "sm" ? "-ml-3" : size === "lg" ? "-ml-6" : "-ml-5";

  return (
    <div className={cn("flex items-center gap-0 leading-none select-none", className)}>
      <img
        src="/minitia-logo.png"
        alt="Minitia.fun"
        className={cn(
          imgClass,
          "w-auto shrink-0 object-contain",
          onDark && "[filter:invert(1)_hue-rotate(180deg)]",
        )}
        draggable={false}
      />
      <span className={cn("font-mono font-medium text-secondary", funClass, funPullClass)}>.fun</span>
      {showSub && (
        <span className="ml-1 hidden text-[0.58rem] font-mono uppercase tracking-[0.28em] text-on-surface-muted md:inline">
          /sovereign
        </span>
      )}
    </div>
  );
}
