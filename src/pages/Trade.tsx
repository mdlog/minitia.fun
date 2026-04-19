import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { ArrowDown, ArrowUp, ExternalLink, Info, Loader2, RefreshCcw, Wallet, Zap } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import { useInitiaAccount } from "@/hooks/useInitiaAccount";
import { useAppchainBalance } from "@/hooks/useAppchainBalance";
import { useAppchainFaucet } from "@/hooks/useAppchainFaucet";
import { usePoolState, useUserHolding } from "@/hooks/usePoolState";
import { useTradeAction } from "@/hooks/useTradeAction";
import { useRecentTrades } from "@/hooks/useRecentTrades";
import { APPCHAIN } from "@/lib/initia";
import { cn } from "@/lib/cn";

const SLIPPAGE_OPTIONS = [0.5, 1, 1.5, 3] as const;
const GRADUATION_THRESHOLD_INIT = 5_000_000_000n; // 5,000 MIN in micro-units

function formatMin(microUnits: bigint, digits = 4): string {
  if (microUnits === 0n) return "0.0000";
  const whole = microUnits / 1_000_000n;
  const frac = microUnits % 1_000_000n;
  const fracStr = String(frac).padStart(6, "0").slice(0, digits);
  return `${whole.toLocaleString()}.${fracStr}`;
}

function shortAddr(s: string): string {
  if (!s) return "";
  return s.length > 14 ? `${s.slice(0, 8)}…${s.slice(-6)}` : s;
}

function relativeTime(height: number, latestHeight: number, blockTimeMs = 1000): string {
  const diff = (latestHeight - height) * blockTimeMs;
  if (diff < 5_000) return "just now";
  if (diff < 60_000) return `${Math.round(diff / 1000)}s ago`;
  if (diff < 3_600_000) return `${Math.round(diff / 60_000)}m ago`;
  return `${Math.round(diff / 3_600_000)}h ago`;
}

export default function Trade() {
  const { symbol = "MOVE" } = useParams();
  const ticker = symbol.toUpperCase();
  const { isConnected, openConnect, initiaAddress } = useInitiaAccount();
  const pool = usePoolState(ticker);
  const holding = useUserHolding(initiaAddress, ticker);
  const wallet = useAppchainBalance(initiaAddress);
  const trades = useRecentTrades(ticker, 25);
  const { drip, isPending: isDripping } = useAppchainFaucet();
  const { submit, isPending: isTrading } = useTradeAction();

  const [side, setSide] = useState<"BUY" | "SELL">("BUY");
  const [amount, setAmount] = useState("0.5");
  const [slippage, setSlippage] = useState<number>(1);

  // Convert amount string to micro units for the side
  const amountMicro = useMemo(() => {
    const n = parseFloat(amount || "0");
    if (Number.isNaN(n) || n <= 0) return 0n;
    // Buy: amount is in MIN, multiply by 1e6
    // Sell: amount is in tokens (we treat 1 token = 1 micro-unit)
    if (side === "BUY") return BigInt(Math.floor(n * 1_000_000));
    return BigInt(Math.floor(n));
  }, [amount, side]);

  // Estimate output
  const expectedOut = useMemo(() => {
    if (!pool.data || !pool.data.exists || amountMicro === 0n) return 0n;
    const spot = pool.data.spotPrice; // micro-INIT per token
    if (spot === 0n) return 0n;
    const feeBps = 50n;
    if (side === "BUY") {
      const net = (amountMicro * (10000n - feeBps)) / 10000n;
      return (net * 1_000_000n) / spot;
    }
    // SELL
    const gross = (amountMicro * spot) / 1_000_000n;
    return (gross * (10000n - feeBps)) / 10000n;
  }, [pool.data, amountMicro, side]);

  const minOut = useMemo(() => {
    return (expectedOut * BigInt(Math.floor((100 - slippage) * 100))) / 10000n;
  }, [expectedOut, slippage]);

  // Reset amount when switching side
  useEffect(() => {
    setAmount(side === "BUY" ? "0.5" : "100");
  }, [side]);

  const onSubmit = async () => {
    if (amountMicro === 0n) return;
    await submit({ ticker, side, amount: amountMicro, minOut });
    pool.refetch();
    holding.refetch();
    wallet.refetch();
    trades.refetch();
  };

  const graduationProgress = pool.data
    ? Math.min(100, Number((pool.data.initReserve * 100n) / GRADUATION_THRESHOLD_INIT))
    : 0;

  const noPool = pool.data && !pool.data.exists;
  const latestHeight = trades.data?.[0]?.height ?? 0;

  return (
    <div className="flex flex-col gap-8 pb-6">
      {/* Header */}
      <section className="flex flex-wrap items-center gap-5">
        <Avatar symbol={ticker} size="xl" />
        <div className="min-w-0 flex-1">
          <h1 className="flex items-baseline gap-3 text-[clamp(2rem,4.5vw,3.25rem)] leading-[0.95] text-editorial-ink">
            <span className="font-editorial italic text-editorial">{ticker.toLowerCase()}</span>
            <span className="font-mono text-title-md font-normal text-on-surface-variant">
              / MIN
            </span>
          </h1>
          <p className="mt-1.5 font-mono text-body-sm text-on-surface-muted tracking-wide">
            {APPCHAIN.deployedAddress.slice(0, 10)}…{APPCHAIN.deployedAddress.slice(-6)} · bonding_curve
          </p>
        </div>
        <div className="flex min-w-[260px] flex-col items-end gap-2">
          <ProgressBar value={graduationProgress} tone="graduation" size="sm" />
          <span className="font-mono text-[0.62rem] uppercase tracking-[0.22em] text-on-surface-muted">
            {graduationProgress.toFixed(1)}% to graduation · 5,000 MIN
          </span>
        </div>
      </section>

      {/* No pool state */}
      {noPool && (
        <Card tier="base" padded="lg" className="flex flex-col gap-3">
          <div className="flex items-center gap-2 text-on-surface-variant">
            <Info className="h-4 w-4" />
            <span className="font-mono text-[0.68rem] uppercase tracking-[0.22em]">
              No bonding curve pool exists for ${ticker}
            </span>
          </div>
          <p className="text-body-md text-on-surface-variant max-w-2xl">
            The token was launched via <code>token_factory</code> but no <code>bonding_curve</code> pool
            has been initialised. The creator must call <code>create_pool</code> on this rollup before
            trading is enabled. The MOVE token has a pool already as a reference.
          </p>
        </Card>
      )}

      {/* Live stats + order panel */}
      {pool.data?.exists && (
        <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="flex flex-col gap-5">
            {/* Stat strip */}
            <Card tier="base" padded="lg">
              <div className="grid gap-6 md:grid-cols-4">
                <Stat
                  label="spot price"
                  value={`${formatMin(pool.data.spotPrice, 6)}`}
                  unit="MIN/token"
                  accent="text-editorial"
                />
                <Stat
                  label="liquidity"
                  value={`${formatMin(pool.data.initReserve, 2)}`}
                  unit="MIN"
                />
                <Stat
                  label="supply"
                  value={Number(pool.data.tokenSupply).toLocaleString()}
                  unit={`$${ticker}`}
                />
                <Stat
                  label="trades"
                  value={pool.data.tradeCount.toLocaleString()}
                  unit="all-time"
                />
              </div>
              <div className="mt-5 flex items-center justify-between gap-4 text-body-sm text-on-surface-variant">
                <span className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-secondary animate-pulse" />
                  on-chain · auto-refresh 8s
                </span>
                <button
                  type="button"
                  onClick={() => {
                    pool.refetch();
                    holding.refetch();
                    trades.refetch();
                  }}
                  className="inline-flex items-center gap-1.5 font-mono text-[0.62rem] uppercase tracking-[0.22em] text-on-surface-muted hover:text-editorial-ink snappy"
                >
                  <RefreshCcw className={cn("h-3 w-3", (pool.isFetching || trades.isFetching) && "animate-spin")} />
                  Refresh
                </button>
              </div>
            </Card>

            {/* Recent trades */}
            <Card tier="base" padded="md" className="flex flex-col gap-4">
              <div className="flex items-end gap-3">
                <span className="font-mono text-[0.62rem] uppercase tracking-[0.3em] text-editorial">
                  § tape
                </span>
                <h2 className="text-headline-sm font-editorial italic text-editorial-ink">
                  Recent trades
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-body-md">
                  <thead>
                    <tr className="text-left font-mono text-[0.62rem] uppercase tracking-[0.2em] text-on-surface-muted">
                      <th className="px-3 py-2">Side</th>
                      <th className="px-3 py-2">Trader</th>
                      <th className="px-3 py-2 text-right">Amount</th>
                      <th className="px-3 py-2 text-right">MIN</th>
                      <th className="px-3 py-2 text-right">Height</th>
                      <th className="px-3 py-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {trades.data && trades.data.length > 0 ? (
                      trades.data.map((t) => (
                        <tr key={t.hash} className="text-on-surface hover:bg-white/[0.03] snappy">
                          <td className="px-3 py-2.5">
                            <Chip tone={t.side === "BUY" ? "success" : "danger"} dense leading={t.side === "BUY" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}>
                              {t.side}
                            </Chip>
                          </td>
                          <td className="px-3 py-2.5 font-mono text-body-sm text-on-surface-variant">
                            {shortAddr(t.trader)}
                          </td>
                          <td className="px-3 py-2.5 text-right font-mono">
                            {Number(t.tokenAmount).toLocaleString()}
                          </td>
                          <td className="px-3 py-2.5 text-right font-mono">
                            {formatMin(t.initAmount, 4)}
                          </td>
                          <td className="px-3 py-2.5 text-right font-mono text-on-surface-muted">
                            {latestHeight ? relativeTime(t.height, latestHeight) : `#${t.height}`}
                          </td>
                          <td className="px-3 py-2.5">
                            <a
                              href={`${APPCHAIN.rpc}/tx?hash=0x${t.hash}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-on-surface-muted hover:text-secondary"
                              aria-label="View tx"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="px-3 py-6 text-center text-body-sm text-on-surface-muted">
                          {trades.isFetching ? "Loading…" : "No trades yet — be the first."}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>

          {/* Order panel */}
          <Card tier="base" padded="md" className="flex flex-col gap-5 h-fit">
            <Tabs value={side} onValueChange={(v) => setSide(v as "BUY" | "SELL")}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="BUY">Buy</TabsTrigger>
                <TabsTrigger value="SELL">Sell</TabsTrigger>
              </TabsList>

              <TabsContent value="BUY" className="mt-5 flex flex-col gap-4">
                <OrderInput
                  side="BUY"
                  ticker={ticker}
                  amount={amount}
                  setAmount={setAmount}
                  walletBalance={wallet.data ?? 0n}
                  holding={holding.data ?? 0n}
                />
              </TabsContent>
              <TabsContent value="SELL" className="mt-5 flex flex-col gap-4">
                <OrderInput
                  side="SELL"
                  ticker={ticker}
                  amount={amount}
                  setAmount={setAmount}
                  walletBalance={wallet.data ?? 0n}
                  holding={holding.data ?? 0n}
                />
              </TabsContent>
            </Tabs>

            {/* Slippage */}
            <div className="flex items-center justify-between gap-3">
              <span className="font-mono text-[0.62rem] uppercase tracking-[0.22em] text-on-surface-muted">
                slippage tolerance
              </span>
              <div className="flex gap-1">
                {SLIPPAGE_OPTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSlippage(s)}
                    className={cn(
                      "rounded-lg px-2.5 py-1 font-mono text-[0.62rem]",
                      slippage === s
                        ? "bg-primary text-primary-on"
                        : "bg-white/[0.04] text-on-surface-variant hover:text-on-surface",
                    )}
                  >
                    {s}%
                  </button>
                ))}
              </div>
            </div>

            {/* Receipt */}
            <div className="flex flex-col gap-2 rounded-2xl bg-white/[0.03] px-3 py-3 text-body-sm">
              <div className="flex items-baseline justify-between">
                <span className="text-on-surface-muted">Spot price</span>
                <span className="font-mono text-on-surface">
                  {formatMin(pool.data.spotPrice, 6)} MIN
                </span>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-on-surface-muted">Expected {side === "BUY" ? "tokens" : "MIN"}</span>
                <span className="font-mono text-editorial-ink">
                  {side === "BUY"
                    ? Number(expectedOut).toLocaleString()
                    : formatMin(expectedOut, 4)}
                </span>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-on-surface-muted">Min received ({slippage}%)</span>
                <span className="font-mono text-on-surface">
                  {side === "BUY"
                    ? Number(minOut).toLocaleString()
                    : formatMin(minOut, 4)}
                </span>
              </div>
              <div className="flex items-baseline justify-between border-t border-editorial/15 pt-2">
                <span className="font-mono text-[0.62rem] uppercase tracking-[0.22em] text-on-surface-muted">
                  fee · 0.5%
                </span>
                <span className="font-mono text-on-surface-variant">retained to appchain</span>
              </div>
            </div>

            {/* CTA */}
            {isConnected ? (
              <Button
                variant={side === "BUY" ? "hyperglow" : "danger"}
                size="lg"
                fullWidth
                disabled={amountMicro === 0n || isTrading || pool.data.graduated}
                leading={isTrading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
                onClick={onSubmit}
              >
                {pool.data.graduated
                  ? "Graduated · trade on InitiaDEX"
                  : isTrading
                    ? "Broadcasting…"
                    : `${side === "BUY" ? "Buy" : "Sell"} $${ticker}`}
              </Button>
            ) : (
              <Button
                variant="primary"
                size="lg"
                fullWidth
                leading={<Wallet className="h-4 w-4" />}
                onClick={openConnect}
              >
                Connect wallet
              </Button>
            )}

            {isConnected && (wallet.data ?? 0n) === 0n && (
              <button
                type="button"
                onClick={() => drip().then(() => wallet.refetch())}
                disabled={isDripping}
                className="inline-flex items-center justify-center gap-1.5 rounded-full bg-secondary-container/70 py-2 font-mono text-[0.62rem] uppercase tracking-[0.2em] text-secondary hover:bg-secondary-container snappy disabled:opacity-50"
              >
                {isDripping ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                {isDripping ? "Dripping…" : "Get 10 MIN from faucet"}
              </button>
            )}

            <span className="text-center font-mono text-[0.58rem] uppercase tracking-[0.22em] text-on-surface-muted">
              all values are real, on-chain · {APPCHAIN.chainId}
            </span>
          </Card>
        </section>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  unit,
  accent,
}: {
  label: string;
  value: string;
  unit?: string;
  accent?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5 border-l border-editorial/20 pl-4">
      <span className="font-mono text-[0.62rem] uppercase tracking-[0.22em] text-on-surface-muted">
        {label}
      </span>
      <span className="flex items-baseline gap-2">
        <span className={cn("font-editorial text-[1.6rem] leading-none", accent ?? "text-editorial-ink")}>
          {value}
        </span>
        {unit && (
          <span className="font-mono text-[0.62rem] uppercase tracking-[0.2em] text-on-surface-muted">
            {unit}
          </span>
        )}
      </span>
    </div>
  );
}

function OrderInput({
  side,
  ticker,
  amount,
  setAmount,
  walletBalance,
  holding,
}: {
  side: "BUY" | "SELL";
  ticker: string;
  amount: string;
  setAmount: (v: string) => void;
  walletBalance: bigint;
  holding: bigint;
}) {
  const balanceLabel =
    side === "BUY"
      ? `${formatMin(walletBalance, 4)} MIN`
      : `${Number(holding).toLocaleString()} ${ticker}`;
  const unit = side === "BUY" ? "MIN" : ticker;

  const setPercent = (pct: number) => {
    if (side === "BUY") {
      const min = Number(walletBalance) / 1_000_000;
      const value = (min * pct) / 100;
      setAmount(value.toFixed(4));
    } else {
      const tokens = Number(holding);
      const value = (tokens * pct) / 100;
      setAmount(String(Math.floor(value)));
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-3">
        <span className="font-mono text-[0.62rem] uppercase tracking-[0.22em] text-on-surface-muted">
          amount ({unit})
        </span>
        <span className="font-mono text-[0.62rem] uppercase tracking-[0.22em] text-on-surface-muted">
          balance {balanceLabel}
        </span>
      </div>
      <div className="rounded-2xl bg-white/[0.04] px-3 py-3 ghost-border flex items-center gap-2">
        <input
          type="number"
          inputMode="decimal"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="flex-1 bg-transparent font-mono text-title-lg text-on-surface outline-none placeholder:text-on-surface-muted min-w-0"
          placeholder="0.00"
        />
        <div className="flex gap-1 shrink-0">
          {[25, 50, 100].map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPercent(p)}
              className="rounded-lg bg-white/[0.04] px-2 py-1 font-mono text-[0.58rem] uppercase tracking-[0.2em] text-on-surface-variant hover:text-editorial-ink snappy"
            >
              {p === 100 ? "MAX" : `${p}%`}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
