import { useMemo } from "react";
import { cn } from "@/lib/cn";

/**
 * Visualizes the bonding curve price function `price = base + slope * supply / 1e6`
 * across the token's live supply range. Marks:
 *  - current supply + spot price
 *  - graduation target (reserve-based; shown on a secondary axis as a vertical band)
 *
 * All inputs are the raw umin / whole-token bigints emitted by the Move
 * contract.
 */
export function CurveDepthChart({
  basePriceMicroInit,
  slopeMicroInit,
  currentSupply,
  maxSupply,
  currentReserveMicroInit,
  graduationTargetMicroInit,
  height = 340,
  className,
}: {
  basePriceMicroInit: bigint;
  slopeMicroInit: bigint;
  currentSupply: bigint;
  /** Hard cap on circulating supply (v2). 0n renders no cap marker. */
  maxSupply?: bigint;
  currentReserveMicroInit: bigint;
  graduationTargetMicroInit: bigint;
  height?: number;
  className?: string;
}) {
  const { points, supplyAtGraduation, xMaxDomain, maxPrice, pctComplete, supplyCap } =
    useMemo(() => {
      const base = Number(basePriceMicroInit);
      const slope = Number(slopeMicroInit);
      const curSupply = Number(currentSupply);

      // Approximate supply at graduation. Under a linear curve, integrated
      // reserve = base * supply + slope * supply^2 / (2 * 1e6). Solve for
      // supply given target reserve (umin):
      //   slope/2e6 * S^2 + base * S - targetReserve = 0
      // Use quadratic formula; fall back to a sensible bound when slope=0.
      const target = Number(graduationTargetMicroInit);
      let supplyGrad: number;
      if (slope === 0) {
        supplyGrad = base > 0 ? target / base : curSupply * 2 + 1;
      } else {
        const a = slope / 2_000_000;
        const b = base;
        const c = -target;
        const disc = b * b - 4 * a * c;
        supplyGrad = Math.max(curSupply, (-b + Math.sqrt(Math.max(disc, 0))) / (2 * a));
      }

      // X axis domain: 0 → max(supplyGrad, maxSupply) × 1.1 (show a bit beyond target).
      const capNum = maxSupply ? Number(maxSupply) : 0;
      const xMax = Math.max(supplyGrad * 1.1, curSupply * 1.1, capNum * 1.02, 1);
      const steps = 80;
      const pts: Array<{ x: number; y: number }> = [];
      let yMax = 0;
      for (let i = 0; i <= steps; i++) {
        const s = (i / steps) * xMax;
        const price = base + (s * slope) / 1_000_000;
        pts.push({ x: s, y: price });
        if (price > yMax) yMax = price;
      }
      if (yMax === 0) yMax = 1;

      const pct = target > 0
        ? Math.min(100, (Number(currentReserveMicroInit) / target) * 100)
        : 0;

      return {
        points: pts,
        supplyAtGraduation: supplyGrad,
        xMaxDomain: xMax,
        maxPrice: yMax,
        pctComplete: pct,
        supplyCap: capNum,
      };
    }, [
      basePriceMicroInit,
      slopeMicroInit,
      currentSupply,
      currentReserveMicroInit,
      graduationTargetMicroInit,
      maxSupply,
    ]);

  const xScale = (x: number) => (x / xMaxDomain) * 100;
  const yScale = (y: number) => 100 - (y / maxPrice) * 100;

  const curSupplyNum = Number(currentSupply);
  const curX = xScale(curSupplyNum);
  const gradX = xScale(supplyAtGraduation);
  const capX = supplyCap > 0 ? xScale(supplyCap) : null;

  const curve = points.map((p) => `${xScale(p.x)},${yScale(p.y)}`).join(" ");
  const area = `${curve} ${xScale(xMaxDomain)},100 0,100`;

  return (
    <div
      className={cn(
        "relative w-full overflow-hidden rounded-lg bg-[#0A0A0C] ghost-border",
        className,
      )}
      style={{ height }}
    >
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="curveGrad" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#2563EB" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#2563EB" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Grid */}
        {[20, 40, 60, 80].map((g) => (
          <line
            key={g}
            x1="0"
            y1={g}
            x2="100"
            y2={g}
            stroke="rgba(255,255,255,0.04)"
            strokeWidth="0.2"
            vectorEffect="non-scaling-stroke"
          />
        ))}

        {/* Area under curve */}
        <polygon points={area} fill="url(#curveGrad)" />

        {/* Curve line */}
        <polyline
          points={curve}
          fill="none"
          stroke="#60A5FA"
          strokeWidth="0.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />

        {/* Graduation band */}
        <line
          x1={gradX}
          y1="0"
          x2={gradX}
          y2="100"
          stroke="#10B981"
          strokeWidth="0.4"
          strokeDasharray="1 1"
          vectorEffect="non-scaling-stroke"
          opacity="0.7"
        />

        {/* Current supply marker */}
        <line
          x1={curX}
          y1="0"
          x2={curX}
          y2="100"
          stroke="#FBBF24"
          strokeWidth="0.4"
          vectorEffect="non-scaling-stroke"
          opacity="0.7"
        />

        {/* Supply cap (v2) */}
        {capX !== null && (
          <line
            x1={capX}
            y1="0"
            x2={capX}
            y2="100"
            stroke="#FB7185"
            strokeWidth="0.4"
            strokeDasharray="2 1"
            vectorEffect="non-scaling-stroke"
            opacity="0.8"
          />
        )}
      </svg>

      {/* Legend */}
      <div className="absolute left-3 top-3 flex flex-col gap-1 text-[10.5px]">
        <span className="flex items-center gap-1.5 font-mono text-on-surface-variant">
          <span className="inline-block h-[2px] w-3 bg-[#60A5FA]" />
          Bonding curve
        </span>
        <span className="flex items-center gap-1.5 font-mono text-on-surface-variant">
          <span className="inline-block h-[2px] w-3 bg-[#FBBF24]" />
          Now · {curSupplyNum.toLocaleString()}
        </span>
        <span className="flex items-center gap-1.5 font-mono text-on-surface-variant">
          <span className="inline-block h-[2px] w-3 bg-[#10B981]" />
          Graduation target
        </span>
        {capX !== null && (
          <span className="flex items-center gap-1.5 font-mono text-on-surface-variant">
            <span className="inline-block h-[2px] w-3 bg-[#FB7185]" />
            Supply cap · {supplyCap.toLocaleString()}
          </span>
        )}
      </div>

      <div className="absolute bottom-3 right-3 font-mono text-[10.5px] text-on-surface-muted">
        {pctComplete.toFixed(1)}% to graduation
      </div>
    </div>
  );
}
