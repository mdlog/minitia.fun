import type { Candle } from "@/data/mock";
import { cn } from "@/lib/cn";

export function CandleChart({
  data,
  className,
  height = 320,
}: {
  data: Candle[];
  className?: string;
  height?: number;
}) {
  const allHighs = data.map((d) => d.high);
  const allLows = data.map((d) => d.low);
  const max = Math.max(...allHighs);
  const min = Math.min(...allLows);
  const range = max - min || 1;

  const y = (v: number) => ((max - v) / range) * 100;

  const closes = data.map((d) => d.close);
  const last = closes[closes.length - 1];
  const first = closes[0];
  const trendUp = last >= first;

  return (
    <div
      className={cn("relative w-full surface-nested rounded overflow-hidden", className)}
      style={{ height }}
    >
      {/* Horizontal grid lines (tonal) */}
      <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-px w-full bg-outline-variant/30"
            style={{ opacity: i === 0 || i === 4 ? 0 : 1 }}
          />
        ))}
      </div>

      {/* Trend overlay line (svg polyline) */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="trendGrad" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#5B8CFF" stopOpacity="0.34" />
            <stop offset="100%" stopColor="#5B8CFF" stopOpacity="0" />
          </linearGradient>
        </defs>
        <polyline
          points={data
            .map((d, i) => `${(i / (data.length - 1)) * 100},${y(d.close)}`)
            .join(" ")}
          fill="none"
          stroke="#5B8CFF"
          strokeWidth="0.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
        <polygon
          points={
            `0,100 ${data
              .map((d, i) => `${(i / (data.length - 1)) * 100},${y(d.close)}`)
              .join(" ")} 100,100`
          }
          fill="url(#trendGrad)"
        />
      </svg>

      {/* Candles */}
      <div className="absolute inset-0 flex items-stretch gap-[3px] px-2 py-2">
        {data.map((c, i) => {
          const bullish = c.close >= c.open;
          const bodyTop = y(Math.max(c.open, c.close));
          const bodyBottom = y(Math.min(c.open, c.close));
          const wickTop = y(c.high);
          const wickBottom = y(c.low);
          return (
            <div key={i} className="relative flex-1 h-full">
              {/* Wick */}
              <div
                className={cn(
                  "absolute left-1/2 -translate-x-1/2 w-[2px] rounded-full",
                  bullish ? "bg-secondary/70" : "bg-error/70",
                )}
                style={{
                  top: `${wickTop}%`,
                  height: `${wickBottom - wickTop}%`,
                }}
              />
              {/* Body */}
              <div
                className={cn(
                  "absolute left-0 right-0 rounded-sm",
                  bullish ? "bg-secondary" : "bg-error",
                  bullish && "shadow-[0_0_10px_rgba(47,197,164,0.24)]",
                )}
                style={{
                  top: `${bodyTop}%`,
                  height: `${Math.max(bodyBottom - bodyTop, 1.5)}%`,
                }}
              />
            </div>
          );
        })}
      </div>

      {/* Live price marker */}
      <div
        className="absolute right-0 flex items-center gap-2"
        style={{ top: `${y(last)}%`, transform: "translateY(-50%)" }}
      >
        <div
          className={cn(
            "h-px flex-1 w-20",
            trendUp ? "bg-secondary" : "bg-error",
          )}
        />
        <span
          className={cn(
            "font-mono text-label-sm px-1.5 py-0.5 rounded-sm",
            trendUp ? "bg-secondary text-surface" : "bg-error text-on-error",
          )}
        >
          {last.toFixed(6)}
        </span>
      </div>
    </div>
  );
}
