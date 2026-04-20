import { useMemo } from "react";
import { useRecentTrades, type TradeEvent } from "@/hooks/useRecentTrades";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { APPCHAIN } from "@/lib/initia";

export type Timeframe = "5m" | "1H" | "4H" | "1D" | "1W";

export interface Candle {
  t: number; // bucket start (ms)
  open: number; // micro-INIT per token (spot price)
  high: number;
  low: number;
  close: number;
  volume: bigint; // sum of initAmount in bucket (umin)
  trades: number;
}

export interface PriceSeries {
  candles: Candle[];
  // 24h aggregates (always computed over actual 24h window regardless of tf)
  vol24h: bigint; // umin
  priceChange24hPct: number | null; // null if no comparison point exists
  // Derived from live pool state (caller passes in)
  isLoading: boolean;
  isFetching: boolean;
}

const TF_MS: Record<Timeframe, number> = {
  "5m": 5 * 60_000,
  "1H": 60 * 60_000,
  "4H": 4 * 60 * 60_000,
  "1D": 24 * 60 * 60_000,
  "1W": 7 * 24 * 60 * 60_000,
};

// Bucket duration picked so each tf shows ~30 candles across its window.
const BUCKET_MS: Record<Timeframe, number> = {
  "5m": 10_000, // 10s buckets
  "1H": 2 * 60_000, // 2m buckets
  "4H": 8 * 60_000, // 8m buckets
  "1D": 48 * 60_000, // 48m buckets
  "1W": 6 * 60 * 60_000, // 6h buckets
};

// Price per trade in umin/token units. Token amount is whole tokens
// (no decimals per the Move contract), init amount is umin.
function tradePriceMicroInit(t: TradeEvent): number {
  const tokens = Number(t.tokenAmount);
  if (tokens === 0) return 0;
  return Number(t.initAmount) / tokens;
}

/**
 * Converts block height to approximate wall-clock ms using the current
 * network tip height as an anchor. Good enough for chart bucketing
 * given a stable block time on the appchain.
 */
function heightToTime(tradeHeight: number, tipHeight: number, blockTimeMs: number, nowMs: number): number {
  const diffBlocks = tipHeight - tradeHeight;
  return nowMs - diffBlocks * blockTimeMs;
}

export function usePriceSeries(
  ticker: string | undefined,
  timeframe: Timeframe,
  spotPriceMicroInit?: bigint,
): PriceSeries {
  // Pull a large window; 400 trades comfortably covers 1W on an active token.
  const trades = useRecentTrades(ticker, 400, 10_000);
  const network = useNetworkStatus(15_000);

  const series = useMemo<PriceSeries>(() => {
    const raw = trades.data ?? [];
    const tipHeight = network.data?.blockHeight ?? 0;
    const blockTimeMs = APPCHAIN.blockTimeMs;
    const now = Date.now();

    // Oldest-first so bucketing is monotonic.
    const sorted = [...raw].sort((a, b) => a.height - b.height);

    // Attach timestamps and prices.
    const enriched = sorted
      .map((t) => {
        const ts = tipHeight
          ? heightToTime(t.height, tipHeight, blockTimeMs, now)
          : now - (raw.length - sorted.indexOf(t)) * 1000;
        const price = tradePriceMicroInit(t);
        return price > 0 ? { ts, price, trade: t } : null;
      })
      .filter(Boolean) as Array<{ ts: number; price: number; trade: TradeEvent }>;

    // Bucket into OHLC
    const bucketMs = BUCKET_MS[timeframe];
    const windowMs = TF_MS[timeframe];
    const cutoff = now - windowMs;

    const windowed = enriched.filter((e) => e.ts >= cutoff);
    const buckets = new Map<number, Candle>();

    for (const e of windowed) {
      const slot = Math.floor(e.ts / bucketMs) * bucketMs;
      const cur = buckets.get(slot);
      if (!cur) {
        buckets.set(slot, {
          t: slot,
          open: e.price,
          high: e.price,
          low: e.price,
          close: e.price,
          volume: e.trade.initAmount,
          trades: 1,
        });
      } else {
        cur.high = Math.max(cur.high, e.price);
        cur.low = Math.min(cur.low, e.price);
        cur.close = e.price;
        cur.volume += e.trade.initAmount;
        cur.trades += 1;
      }
    }

    const candles = [...buckets.values()].sort((a, b) => a.t - b.t);

    // If we have a live spot price, extend the last candle's close (and
    // seed a final candle if none exist in the latest bucket).
    if (spotPriceMicroInit !== undefined && spotPriceMicroInit > 0n) {
      const liveSpot = Number(spotPriceMicroInit);
      const liveSlot = Math.floor(now / bucketMs) * bucketMs;
      const last = candles[candles.length - 1];
      if (last && last.t === liveSlot) {
        last.close = liveSpot;
        last.high = Math.max(last.high, liveSpot);
        last.low = Math.min(last.low, liveSpot);
      } else if (last) {
        // flat connector so chart reaches "now"
        candles.push({
          t: liveSlot,
          open: last.close,
          high: Math.max(last.close, liveSpot),
          low: Math.min(last.close, liveSpot),
          close: liveSpot,
          volume: 0n,
          trades: 0,
        });
      }
    }

    // 24h window (always a real 24h, independent of chart tf).
    const cutoff24 = now - 24 * 60 * 60_000;
    const last24 = enriched.filter((e) => e.ts >= cutoff24);
    const vol24h = last24.reduce((s, e) => s + e.trade.initAmount, 0n);

    // 24h change: earliest price in window vs current spot (or latest trade).
    let priceChange24hPct: number | null = null;
    const baseline = last24[0]?.price;
    const current = spotPriceMicroInit !== undefined && spotPriceMicroInit > 0n
      ? Number(spotPriceMicroInit)
      : enriched[enriched.length - 1]?.price;
    if (baseline && current && baseline > 0) {
      priceChange24hPct = ((current - baseline) / baseline) * 100;
    }

    return {
      candles,
      vol24h,
      priceChange24hPct,
      isLoading: trades.isLoading,
      isFetching: trades.isFetching,
    };
  }, [
    trades.data,
    trades.isLoading,
    trades.isFetching,
    network.data?.blockHeight,
    timeframe,
    spotPriceMicroInit,
  ]);

  return series;
}
