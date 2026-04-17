import { cn } from "@/lib/cn";

export function Logo({ className, showSub = true }: { className?: string; showSub?: boolean }) {
  return (
    <div className={cn("flex items-baseline gap-1 leading-none select-none", className)}>
      <span className="font-editorial italic text-[1.9rem] tracking-tight text-editorial-ink">
        minitia
      </span>
      <span className="font-mono text-title-md font-medium text-secondary">.fun</span>
      {showSub && (
        <span className="ml-2 hidden text-[0.58rem] font-mono uppercase tracking-[0.28em] text-on-surface-muted md:inline">
          /sovereign
        </span>
      )}
    </div>
  );
}
