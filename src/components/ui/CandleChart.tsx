import { useMemo } from "react";
import { cn } from "@/lib/cn";
import type { Candle } from "@/hooks/usePriceSeries";

function formatPrice(microInit: number): string {
  if (microInit === 0) return "0.000000";
  const init = microInit / 1_000_000;
  // keep 6 significant decimals for micro-priced tokens
  if (init < 0.0001) return init.toFixed(8);
  if (init < 0.1) return init.toFixed(6);
  if (init < 100) return init.toFixed(4);
  return init.toFixed(2);
}

export function CandleChart({
  data,
  height = 340,
  className,
}: {
  data: Candle[];
  height?: number;
  className?: string;
}) {
  const { max, min, range } = useMemo(() => {
    if (data.length === 0) return { max: 1, min: 0, range: 1 };
    let hi = -Infinity;
    let lo = Infinity;
    for (const c of data) {
      if (c.high > hi) hi = c.high;
      if (c.low < lo) lo = c.low;
    }
    const r = hi - lo || hi * 0.05 || 1;
    // Pad 5% top/bottom for breathing room.
    return { max: hi + r * 0.05, min: Math.max(0, lo - r * 0.05), range: r * 1.1 };
  }, [data]);

  const y = (v: number) => ((max - v) / range) * 100;

  if (data.length === 0) {
    return (
      <div
        className={cn(
          "relative w-full overflow-hidden rounded-lg bg-[#0A0A0C] ghost-border flex items-center justify-center",
          className,
        )}
        style={{ height }}
      >
        <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-on-surface-muted">
          No trades in this window
        </span>
      </div>
    );
  }

  const axisLabels = [0, 0.25, 0.5, 0.75, 1].map((f) => max - f * range);

  return (
    <div
      className={cn(
        "relative w-full overflow-hidden rounded-lg bg-[#0A0A0C] ghost-border",
        className,
      )}
      style={{ height }}
    >
      {/* Grid */}
      <svg
        className="pointer-events-none absolute inset-0 h-full w-full"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        {[20, 40, 60, 80].map((gy) => (
          <line
            key={gy}
            x1="0"
            y1={gy}
            x2="100"
            y2={gy}
            stroke="rgba(255,255,255,0.04)"
            strokeWidth="0.2"
            vectorEffect="non-scaling-stroke"
          />
        ))}
        <defs>
          <linearGradient id="trendGrad" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#10B981" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#10B981" stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon
          points={`0,100 ${data
            .map((c, i) => `${(i / Math.max(1, data.length - 1)) * 100},${y(c.close)}`)
            .join(" ")} 100,100`}
          fill="url(#trendGrad)"
        />
      </svg>

      {/* Candles */}
      <div className="absolute inset-0 flex items-stretch gap-[3px] px-3 py-3 pr-14">
        {data.map((c, i) => {
          const bull = c.close >= c.open;
          const bt = y(Math.max(c.open, c.close));
          const bb = y(Math.min(c.open, c.close));
          const wt = y(c.high);
          const wb = y(c.low);
          return (
            <div key={i} className="relative h-full flex-1">
              <div
                className={cn(
                  "absolute left-1/2 w-[1.5px] -translate-x-1/2",
                  bull ? "bg-[#10B981]" : "bg-[#E11D48]",
                )}
                style={{ top: `${wt}%`, height: `${wb - wt}%`, opacity: 0.6 }}
              />
              <div
                className={cn(
                  "absolute left-0 right-0 rounded-[1px]",
                  bull ? "bg-[#10B981]" : "bg-[#E11D48]",
                )}
                style={{ top: `${bt}%`, height: `${Math.max(bb - bt, 1.5)}%` }}
              />
            </div>
          );
        })}
      </div>

      {/* Price axis */}
      <div className="pointer-events-none absolute right-0 top-0 flex h-full w-12 flex-col justify-between py-3 pr-2 text-right">
        {axisLabels.map((p, i) => (
          <span key={i} className="font-mono text-[10px] tabular-nums text-[#52525B]">
            {formatPrice(p)}
          </span>
        ))}
      </div>
    </div>
  );
}
