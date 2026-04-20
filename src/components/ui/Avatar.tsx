import { cn } from "@/lib/cn";

export interface AvatarProps {
  symbol: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  variant?: "gradient-1" | "gradient-2" | "gradient-3" | "auto";
  className?: string;
}

const sizeMap: Record<NonNullable<AvatarProps["size"]>, string> = {
  xs: "h-6 w-6 text-[10px]",
  sm: "h-8 w-8 text-[11px]",
  md: "h-9 w-9 text-[12px]",
  lg: "h-11 w-11 text-[13px]",
  xl: "h-14 w-14 text-[16px]",
};

const SWATCHES = [
  { bg: "#1E3A8A", fg: "#93C5FD" },
  { bg: "#064E3B", fg: "#6EE7B7" },
  { bg: "#1E293B", fg: "#CBD5E1" },
  { bg: "#3F3F46", fg: "#E4E4E7" },
  { bg: "#4C1D95", fg: "#C4B5FD" },
  { bg: "#3F1D38", fg: "#F5D0FE" },
];

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h << 5) - h + s.charCodeAt(i);
  return Math.abs(h);
}

export function Avatar({ symbol, size = "md", className }: AvatarProps) {
  const sw = SWATCHES[hash(symbol) % SWATCHES.length];
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-md font-mono font-semibold ghost-border",
        sizeMap[size],
        className,
      )}
      style={{ background: sw.bg, color: sw.fg }}
    >
      {symbol.slice(0, 2).toUpperCase()}
    </div>
  );
}
