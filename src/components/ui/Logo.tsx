import { cn } from "@/lib/cn";

export function Logo({
  className,
  showSub: _showSub = true,
  size = "md",
  onDark: _onDark = true,
}: {
  className?: string;
  showSub?: boolean;
  size?: "sm" | "md" | "lg";
  onDark?: boolean;
}) {
  void _showSub;
  void _onDark;

  const sq =
    size === "sm" ? "h-6 w-6" : size === "lg" ? "h-9 w-9" : "h-7 w-7";
  const wm =
    size === "sm" ? "text-[14px]" : size === "lg" ? "text-[17px]" : "text-[15px]";
  const fun =
    size === "sm" ? "text-[11px]" : size === "lg" ? "text-[13px]" : "text-[12px]";

  return (
    <div className={cn("flex items-center gap-2 select-none", className)}>
      <div
        aria-label="Minitia"
        className={cn("shrink-0 bg-no-repeat", sq)}
        style={{
          backgroundImage: "url('/minitia-mark.png')",
          backgroundSize: "200%",
          backgroundPosition: "center 15%",
        }}
      />
      <div className="flex items-baseline gap-0.5">
        <span className={cn("font-semibold tracking-tight text-on-surface", wm)}>minitia</span>
        <span className={cn("font-mono text-on-surface-muted", fun)}>.fun</span>
      </div>
    </div>
  );
}
