import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowDown, ArrowUp, ExternalLink, Flame, Info, Loader2, MessageCircle, RefreshCcw, Send, Trophy, Users, Wallet, Zap } from "lucide-react";
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
import { useComments, useCommentPost } from "@/hooks/useComments";
import { useHolderLeaderboard } from "@/hooks/useHolderLeaderboard";
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
  const { isConnected, openConnect, initiaAddress, hexAddress } = useInitiaAccount();
  const pool = usePoolState(ticker);
  const holding = useUserHolding(hexAddress, ticker);
  const wallet = useAppchainBalance(initiaAddress);
  const trades = useRecentTrades(ticker, 25);
  const { drip, isPending: isDripping } = useAppchainFaucet();
  const { submit, isPending: isTrading } = useTradeAction();
  const comments = useComments(ticker, 30);
  const { post: postComment, isPending: isPosting } = useCommentPost();
  const holders = useHolderLeaderboard(ticker, 10);
  const [commentBody, setCommentBody] = useState("");

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
  const lastTrade = trades.data?.[0];

  // Price flash: compare current vs previous spot price; toggle flash class.
  const prevSpotRef = useRef<bigint | null>(null);
  const [flashTone, setFlashTone] = useState<"up" | "down" | null>(null);
  useEffect(() => {
    const spot = pool.data?.spotPrice;
    if (spot === undefined) return;
    const prev = prevSpotRef.current;
    if (prev !== null && spot !== prev) {
      setFlashTone(spot > prev ? "up" : "down");
      const t = setTimeout(() => setFlashTone(null), 900);
      prevSpotRef.current = spot;
      return () => clearTimeout(t);
    }
    prevSpotRef.current = spot;
  }, [pool.data?.spotPrice]);

  // Social microstats: velocity (trades in last 15 min) + unique traders.
  const { velocity15m, uniqueTraders, isHot } = useMemo(() => {
    const list = trades.data ?? [];
    if (list.length === 0 || latestHeight === 0) {
      return { velocity15m: 0, uniqueTraders: 0, isHot: false };
    }
    // ~1 block/s. 15 min = 900 blocks.
    const cutoff = latestHeight - 900;
    const recent = list.filter((t) => t.height >= cutoff);
    const traders = new Set(list.map((t) => t.trader));
    return {
      velocity15m: recent.length,
      uniqueTraders: traders.size,
      isHot: recent.length >= 3,
    };
  }, [trades.data, latestHeight]);

  return (
    <div className="flex flex-col gap-8 pb-6">
      {/* Hero — pump.fun-scale ticker + live price */}
      <section className="relative grain dotgrid rounded-[28px] surface-section overflow-hidden">
        <div className="relative px-6 py-8 md:px-10 md:py-10">
          <div className="flex flex-wrap items-start gap-6">
            <Avatar symbol={ticker} size="xl" className="shrink-0" />
            <div className="flex min-w-0 flex-1 flex-col gap-3">
              {/* Massive editorial ticker */}
              <h1
                className="flex items-end gap-4 leading-[0.82] text-editorial-ink"
                style={{ fontSize: "clamp(3.5rem, 11vw, 9rem)" }}
              >
                <span className="font-editorial italic text-editorial truncate">
                  {ticker.toLowerCase()}
                </span>
                <span className="pb-3 font-mono text-[clamp(0.9rem,1.2vw,1.1rem)] font-normal uppercase tracking-[0.28em] text-on-surface-muted">
                  / MIN
                </span>
              </h1>

              {/* Microstat badges */}
              <div className="flex flex-wrap items-center gap-2">
                {isHot && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-400/15 px-2.5 py-1 font-mono text-[0.62rem] font-medium uppercase tracking-[0.22em] text-amber-300">
                    <Flame className="h-3 w-3" /> Hot · {velocity15m} trades / 15m
                  </span>
                )}
                {!isHot && velocity15m > 0 && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.04] px-2.5 py-1 font-mono text-[0.62rem] font-medium uppercase tracking-[0.22em] text-on-surface-variant">
                    {velocity15m} trade{velocity15m === 1 ? "" : "s"} / 15m
                  </span>
                )}
                {uniqueTraders > 0 && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.04] px-2.5 py-1 font-mono text-[0.62rem] font-medium uppercase tracking-[0.22em] text-on-surface-variant">
                    <Users className="h-3 w-3" /> {uniqueTraders} trader
                    {uniqueTraders === 1 ? "" : "s"}
                  </span>
                )}
                <a
                  href={`${APPCHAIN.rpc}/tx?hash=0x${lastTrade?.hash ?? ""}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.04] px-2.5 py-1 font-mono text-[0.62rem] font-medium uppercase tracking-[0.22em] text-on-surface-variant hover:text-editorial-ink"
                >
                  {APPCHAIN.deployedAddress.slice(0, 8)}…{APPCHAIN.deployedAddress.slice(-4)} · bonding_curve
                </a>
              </div>
            </div>

            {/* Live price slab — right rail */}
            {pool.data?.exists && (
              <div className="flex shrink-0 flex-col items-end gap-3 lg:min-w-[320px]">
                <div className="flex flex-col items-end gap-1">
                  <span className="font-mono text-[0.6rem] uppercase tracking-[0.28em] text-on-surface-muted">
                    spot · live
                  </span>
                  <span
                    className={cn(
                      "font-editorial italic text-[clamp(2.5rem,6vw,4.5rem)] leading-none tabular-nums text-editorial-ink",
                      flashTone === "up" && "animate-flash-up",
                      flashTone === "down" && "animate-flash-down",
                    )}
                  >
                    {formatMin(pool.data.spotPrice, 6)}
                  </span>
                  <span className="font-mono text-[0.62rem] uppercase tracking-[0.22em] text-on-surface-muted">
                    MIN / token
                  </span>
                </div>
                <div className="w-full max-w-[320px] flex flex-col gap-1.5">
                  <ProgressBar value={graduationProgress} tone="graduation" size="sm" />
                  <span className="font-mono text-[0.6rem] uppercase tracking-[0.22em] text-on-surface-muted">
                    {graduationProgress.toFixed(1)}% to graduation · 5,000 MIN
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Last trade banner */}
          {lastTrade && (
            <div className="mt-6 flex flex-wrap items-center gap-2 rounded-xl bg-white/[0.03] px-4 py-2.5 hairline">
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-mono text-[0.58rem] font-medium uppercase tracking-[0.22em]",
                  lastTrade.side === "BUY"
                    ? "bg-secondary-container/70 text-secondary"
                    : "bg-red-500/15 text-red-300",
                )}
              >
                {lastTrade.side === "BUY" ? (
                  <ArrowUp className="h-3 w-3" />
                ) : (
                  <ArrowDown className="h-3 w-3" />
                )}
                {lastTrade.side}
              </span>
              <Link
                to={`/u/${lastTrade.trader}`}
                className="font-mono text-body-sm text-on-surface-variant hover:text-editorial-ink snappy"
              >
                {shortAddr(lastTrade.trader)}
              </Link>
              <span className="font-mono text-body-sm text-on-surface-variant">
                {lastTrade.side === "BUY" ? "bought" : "sold"}
              </span>
              <span className="font-mono text-body-sm font-semibold text-on-surface tabular-nums">
                {Number(lastTrade.tokenAmount).toLocaleString()}
              </span>
              <span className="font-editorial italic text-body-sm text-editorial">${ticker}</span>
              <span className="font-mono text-body-sm text-on-surface-muted">·</span>
              <span className="font-mono text-body-sm text-on-surface tabular-nums">
                {formatMin(lastTrade.initAmount, 4)} MIN
              </span>
              <span className="ml-auto font-mono text-[0.6rem] uppercase tracking-[0.22em] text-on-surface-muted">
                {relativeTime(lastTrade.height, latestHeight)} · #{lastTrade.height}
              </span>
            </div>
          )}
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
                            <Link
                              to={`/u/${t.trader}`}
                              className="hover:text-editorial-ink snappy"
                            >
                              {shortAddr(t.trader)}
                            </Link>
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

            {/* Holders leaderboard */}
            <Card tier="base" padded="md" className="flex flex-col gap-4">
              <div className="flex items-end justify-between gap-3">
                <div className="flex items-end gap-3">
                  <span className="font-mono text-[0.62rem] uppercase tracking-[0.3em] text-editorial">
                    § leaderboard
                  </span>
                  <h2 className="text-headline-sm font-editorial italic text-editorial-ink">
                    Top holders
                  </h2>
                </div>
                <span className="font-mono text-[0.58rem] uppercase tracking-[0.2em] text-on-surface-muted">
                  {holders.data?.length ?? 0} on curve
                </span>
              </div>
              {holders.isLoading ? (
                <div className="py-6 text-center font-mono text-[0.62rem] uppercase tracking-[0.22em] text-on-surface-muted">
                  Aggregating…
                </div>
              ) : !holders.data || holders.data.length === 0 ? (
                <div className="py-6 text-center text-body-sm text-on-surface-muted">
                  No holders yet. Be the first trader.
                </div>
              ) : (
                <div className="flex flex-col divide-y divide-editorial/15">
                  {holders.data.map((h, i) => {
                    const isFirst = i === 0;
                    const isPodium = i < 3;
                    return (
                      <Link
                        to={`/u/${h.address.replace(/^0x/, "0x")}`}
                        key={h.address}
                        className="group flex items-center gap-3 py-2.5 hover:bg-white/[0.03] snappy -mx-2 px-2 rounded-md"
                      >
                        <span
                          className={cn(
                            "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-mono text-[0.7rem] font-semibold",
                            isFirst
                              ? "bg-amber-400/25 text-amber-300"
                              : isPodium
                                ? "bg-editorial/20 text-editorial"
                                : "bg-white/[0.04] text-on-surface-variant",
                          )}
                        >
                          {isPodium ? <Trophy className="h-3.5 w-3.5" /> : i + 1}
                        </span>
                        <Avatar symbol={h.address.slice(2, 6).toUpperCase()} size="sm" />
                        <div className="min-w-0 flex-1">
                          <div className="font-mono text-body-sm text-on-surface">
                            {shortAddr(h.address)}
                          </div>
                          <div className="font-mono text-[0.62rem] uppercase tracking-[0.2em] text-on-surface-muted">
                            {h.trades} trade{h.trades === 1 ? "" : "s"}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-mono text-body-sm text-on-surface tabular-nums">
                            {Number(h.balance).toLocaleString()}
                          </div>
                          <div className="font-mono text-[0.62rem] uppercase tracking-[0.2em] text-on-surface-muted">
                            ${ticker}
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </Card>

            {/* Comments */}
            <Card tier="base" padded="md" className="flex flex-col gap-4">
              <div className="flex items-end justify-between gap-3">
                <div className="flex items-end gap-3">
                  <span className="font-mono text-[0.62rem] uppercase tracking-[0.3em] text-editorial">
                    § feed
                  </span>
                  <h2 className="text-headline-sm font-editorial italic text-editorial-ink">
                    Comments
                  </h2>
                </div>
                <span className="font-mono text-[0.58rem] uppercase tracking-[0.2em] text-on-surface-muted">
                  {comments.data?.length ?? 0} on-chain
                </span>
              </div>
              {/* Composer */}
              <div className="flex flex-col gap-2 rounded-xl bg-white/[0.03] p-3 hairline">
                <textarea
                  value={commentBody}
                  onChange={(e) => setCommentBody(e.target.value.slice(0, 280))}
                  placeholder={
                    isConnected
                      ? `What's your take on $${ticker}?`
                      : "Connect a wallet to post on-chain"
                  }
                  disabled={!isConnected || isPosting}
                  rows={2}
                  className="w-full resize-none bg-transparent text-body-md text-on-surface placeholder:text-on-surface-muted focus:outline-none disabled:cursor-not-allowed"
                />
                <div className="flex items-center justify-between gap-3">
                  <span
                    className={cn(
                      "font-mono text-[0.6rem] uppercase tracking-[0.2em]",
                      commentBody.length > 260 ? "text-amber-300" : "text-on-surface-muted",
                    )}
                  >
                    {commentBody.length}/280 · on-chain · immutable
                  </span>
                  <Button
                    size="sm"
                    variant="primary"
                    leading={isPosting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                    disabled={!isConnected || !commentBody.trim() || isPosting}
                    onClick={async () => {
                      const ok = await postComment(ticker, commentBody);
                      if (ok) {
                        setCommentBody("");
                        setTimeout(() => comments.refetch(), 1200);
                      }
                    }}
                  >
                    {isPosting ? "Posting…" : "Post"}
                  </Button>
                </div>
              </div>
              {/* Feed */}
              {comments.isLoading ? (
                <div className="py-6 text-center font-mono text-[0.62rem] uppercase tracking-[0.22em] text-on-surface-muted">
                  Loading feed…
                </div>
              ) : !comments.data || comments.data.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-8 text-center">
                  <MessageCircle className="h-6 w-6 text-on-surface-muted" />
                  <span className="text-body-sm text-on-surface-muted">
                    No comments yet. Start the thread.
                  </span>
                </div>
              ) : (
                <div className="flex flex-col divide-y divide-editorial/15">
                  {comments.data.map((c) => (
                    <div key={`${c.hash}-${c.index}`} className="flex gap-3 py-3">
                      <Avatar symbol={c.author.slice(2, 6).toUpperCase()} size="sm" />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <Link
                            to={`/u/${c.author}`}
                            className="font-mono text-body-sm text-on-surface hover:text-editorial-ink"
                          >
                            {shortAddr(c.author)}
                          </Link>
                          <span className="font-mono text-[0.58rem] uppercase tracking-[0.2em] text-on-surface-muted">
                            · {latestHeight ? relativeTime(c.blockHeight, latestHeight) : `#${c.blockHeight}`}
                          </span>
                          <a
                            href={`${APPCHAIN.rpc}/tx?hash=0x${c.hash}`}
                            target="_blank"
                            rel="noreferrer"
                            className="ml-auto text-on-surface-muted hover:text-secondary"
                            aria-label="View tx"
                          >
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>
                        <p className="mt-1 whitespace-pre-wrap break-words text-body-md text-on-surface-variant">
                          {c.body}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
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
