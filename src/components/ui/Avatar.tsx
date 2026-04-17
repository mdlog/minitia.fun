import { cn } from "@/lib/cn";

export interface AvatarProps {
  symbol: string;
  size?: "sm" | "md" | "lg" | "xl";
  variant?: "gradient-1" | "gradient-2" | "gradient-3" | "auto";
  className?: string;
}

const sizeMap = {
  sm: "h-9 w-9 text-body-sm",
  md: "h-11 w-11 text-body-md",
  lg: "h-14 w-14 text-title-lg",
  xl: "h-20 w-20 text-headline-sm",
};

const gradientMap: Record<string, string> = {
  "gradient-1": "bg-[conic-gradient(from_120deg,#BA9EFF,#FF59E3,#00EEFC,#BA9EFF)]",
  "gradient-2": "bg-[conic-gradient(from_0deg,#FF59E3,#8455EF,#00EEFC,#FF59E3)]",
  "gradient-3": "bg-[conic-gradient(from_240deg,#00EEFC,#BA9EFF,#FF59E3,#00EEFC)]",
};

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h << 5) - h + s.charCodeAt(i);
  return Math.abs(h);
}

export function Avatar({ symbol, size = "md", variant = "auto", className }: AvatarProps) {
  const key = variant === "auto" ? `gradient-${(hash(symbol) % 3) + 1}` : variant;

  return (
    <div
      className={cn(
        "relative flex shrink-0 items-center justify-center rounded-full font-mono font-bold text-surface shadow-[0_16px_28px_rgba(0,0,0,0.22)] ring-1 ring-white/10",
        "before:absolute before:inset-[1px] before:rounded-full before:bg-[radial-gradient(circle_at_30%_25%,rgba(255,255,255,0.24),rgba(255,255,255,0)_45%)] before:content-['']",
        sizeMap[size],
        gradientMap[key],
        className,
      )}
    >
      <span className="relative z-10 drop-shadow-sm">{symbol.slice(0, 1).toUpperCase()}</span>
    </div>
  );
}
