import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowDown,
  ArrowUp,
  Copy,
  ExternalLink,
  Flame,
  Info,
  Loader2,
  MessageCircle,
  RefreshCw,
  Send,
  Trophy,
  Users,
  Wallet,
  Zap,
} from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { CandleChart } from "@/components/ui/CandleChart";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { CurveDepthChart } from "@/components/ui/CurveDepthChart";
import { Delta } from "@/components/ui/Delta";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Segmented } from "@/components/ui/Segmented";
import { Stat } from "@/components/ui/Stat";
import { useInitiaAccount } from "@/hooks/useInitiaAccount";
import { useAppchainBalance } from "@/hooks/useAppchainBalance";
import { useAppchainFaucet } from "@/hooks/useAppchainFaucet";
import { usePoolState, useUserHolding } from "@/hooks/usePoolState";
import { useTradeAction } from "@/hooks/useTradeAction";
import { useRecentTrades } from "@/hooks/useRecentTrades";
import { useComments, useCommentPost } from "@/hooks/useComments";
import { useCreatePoolAction } from "@/hooks/useCreatePoolAction";
import { useHolderLeaderboard } from "@/hooks/useHolderLeaderboard";
import { useAllLaunchedTokens } from "@/hooks/useAllLaunchedTokens";
import { usePriceSeries, type Timeframe } from "@/hooks/usePriceSeries";
import { APPCHAIN } from "@/lib/initia";
import { cn } from "@/lib/cn";

const SLIPPAGE_OPTIONS = [0.5, 1, 1.5, 3] as const;
const GRADUATION_THRESHOLD_INIT = 10_000_000n;

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

function bigintSqrt(n: bigint): bigint {
  if (n < 2n) return n;
  let x = n;
  let y = (x + 1n) / 2n;
  while (y < x) {
    x = y;
    y = (x + n / x) / 2n;
  }
  return x;
}

function relativeTime(height: number, latestHeight: number, blockTimeMs = 1000): string {
  const diff = (latestHeight - height) * blockTimeMs;
  if (diff < 5_000) return "just now";
  if (diff < 60_000) return `${Math.round(diff / 1000)}s ago`;
  if (diff < 3_600_000) return `${Math.round(diff / 60_000)}m ago`;
  return `${Math.round(diff / 3_600_000)}h ago`;
}

function addrEq(a: string, b: string): boolean {
  const na = a.toLowerCase().replace(/^0x/, "").padStart(40, "0");
  const nb = b.toLowerCase().replace(/^0x/, "").padStart(40, "0");
  return na === nb;
}

export default function Trade() {
  const { symbol = "MOVE" } = useParams();
  const ticker = symbol.toUpperCase();
  const { isConnected, openConnect, initiaAddress, hexAddress } = useInitiaAccount();
  const pool = usePoolState(ticker);
  const tokensIndex = useAllLaunchedTokens(50);
  const launcherAddr = useMemo(
    () => tokensIndex.data?.find((t) => t.ticker === ticker)?.creator ?? "",
    [tokensIndex.data, ticker],
  );
  const isLauncher = useMemo(
    () => Boolean(hexAddress && launcherAddr && addrEq(launcherAddr, hexAddress)),
    [hexAddress, launcherAddr],
  );
  const holding = useUserHolding(hexAddress, ticker);
  const wallet = useAppchainBalance(initiaAddress);
  const trades = useRecentTrades(ticker, 25);
  const { drip, isPending: isDripping } = useAppchainFaucet();
  const { submit, isPending: isTrading } = useTradeAction();
  const comments = useComments(ticker, 30);
  const { post: postComment, isPending: isPosting } = useCommentPost();
  const holders = useHolderLeaderboard(ticker, 10);
  const { create: createPool, isPending: isCreatingPool } = useCreatePoolAction();
  const [commentBody, setCommentBody] = useState("");

  const [side, setSide] = useState<"BUY" | "SELL">("BUY");
  const [amount, setAmount] = useState("0.5");
  const [slippage, setSlippage] = useState<number>(1);
  const [tab, setTab] = useState<"trades" | "holders" | "comments" | "depth">("trades");
  const [timeframe, setTimeframe] = useState<Timeframe>("1H");

  const priceSeries = usePriceSeries(ticker, timeframe, pool.data?.spotPrice);

  const marketCapMicroInit = useMemo(() => {
    if (!pool.data?.exists) return 0n;
    // spotPrice (umin/token) * supply (whole tokens) = umin market cap
    return pool.data.spotPrice * pool.data.tokenSupply;
  }, [pool.data]);

  const amountMicro = useMemo(() => {
    const n = parseFloat(amount || "0");
    if (Number.isNaN(n) || n <= 0) return 0n;
    if (side === "BUY") return BigInt(Math.floor(n * 1_000_000));
    return BigInt(Math.floor(n));
  }, [amount, side]);

  const expectedOut = useMemo(() => {
    if (!pool.data || !pool.data.exists || amountMicro === 0n) return 0n;
    const base = pool.data.basePrice;
    const slope = pool.data.slope;
    const s0 = pool.data.tokenSupply;
    const feeBps = 50n;
    const spotScaled = base * 1_000_000n + slope * s0;

    if (side === "BUY") {
      const net = (amountMicro * (10000n - feeBps)) / 10000n;
      if (slope === 0n) {
        return base === 0n ? net : (net * 1_000_000n) / base;
      }
      const disc = spotScaled * spotScaled + 2n * slope * 1_000_000n * net;
      const root = bigintSqrt(disc);
      if (root <= spotScaled) return 0n;
      return (root - spotScaled) / slope;
    }

    const burn = amountMicro;
    let gross: bigint;
    if (slope === 0n) {
      gross = (burn * base) / 1_000_000n;
    } else {
      const a = 2n * spotScaled * burn;
      const b = slope * burn * burn;
      gross = b >= a ? 0n : (a - b) / 2_000_000n;
    }
    if (gross > pool.data.initReserve) gross = pool.data.initReserve;
    return (gross * (10000n - feeBps)) / 10000n;
  }, [pool.data, amountMicro, side]);

  const minOut = useMemo(() => {
    return (expectedOut * BigInt(Math.floor((100 - slippage) * 100))) / 10000n;
  }, [expectedOut, slippage]);

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

  const { velocity15m, uniqueTraders, isHot } = useMemo(() => {
    const list = trades.data ?? [];
    if (list.length === 0 || latestHeight === 0) {
      return { velocity15m: 0, uniqueTraders: 0, isHot: false };
    }
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
    <div className="flex flex-col gap-4 pb-8">
      {/* Token header strip */}
      <Card padded="md">
        <div className="flex flex-wrap items-center gap-6">
          <div className="flex items-center gap-3">
            <Avatar symbol={ticker} size="lg" />
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-[17px] font-semibold tracking-tight text-on-surface">
                  ${ticker}
                </span>
                <span className="text-[12px] text-on-surface-muted">/ MIN</span>
              </div>
              <div className="mt-0.5 flex items-center gap-1.5">
                <span className="font-mono text-[11px] text-[#52525B]">
                  {APPCHAIN.deployedAddress.slice(0, 8)}…{APPCHAIN.deployedAddress.slice(-4)}
                </span>
                <button
                  type="button"
                  onClick={() => navigator.clipboard.writeText(APPCHAIN.deployedAddress)}
                  className="text-[#52525B] hover:text-on-surface-variant"
                  aria-label="Copy module address"
                >
                  <Copy className="h-3 w-3" />
                </button>
              </div>
            </div>
          </div>
          <div className="hidden h-8 w-px bg-white/[0.06] md:block" />
          {pool.data?.exists && (
            <>
              <Stat
                label="Price"
                value={
                  <span
                    className={cn(
                      flashTone === "up" && "animate-flash-up",
                      flashTone === "down" && "animate-flash-down",
                    )}
                  >
                    {formatMin(pool.data.spotPrice, 6)}
                  </span>
                }
                unit="MIN"
                tone="info"
              />
              <div className="flex flex-col gap-1">
                <span className="text-[10.5px] font-medium uppercase tracking-[0.08em] text-on-surface-muted">
                  24h
                </span>
                <span className="flex items-baseline">
                  {priceSeries.priceChange24hPct !== null ? (
                    <Delta value={priceSeries.priceChange24hPct} className="text-[18px]" />
                  ) : (
                    <span className="font-mono text-[18px] text-on-surface-muted tabular-nums">
                      —
                    </span>
                  )}
                </span>
              </div>
              <Stat
                label="24h Vol"
                value={formatMin(priceSeries.vol24h, 2)}
                unit="MIN"
              />
              <Stat
                label="Mkt cap"
                value={formatMin(marketCapMicroInit / 1_000_000n, 2)}
                unit="MIN"
              />
              <div className="ml-auto flex min-w-[200px] flex-col items-end gap-1.5">
                <div className="flex items-center gap-2 text-[11px]">
                  <span className="text-on-surface-muted">Graduation</span>
                  <span className="font-mono tabular-nums text-on-surface">
                    {graduationProgress.toFixed(1)}%
                  </span>
                </div>
                <ProgressBar value={graduationProgress} tone="primary" size="sm" />
                <span className="font-mono text-[10.5px] text-[#52525B]">
                  {formatMin(pool.data.initReserve, 2)} /{" "}
                  {formatMin(GRADUATION_THRESHOLD_INIT, 0)} MIN
                </span>
              </div>
            </>
          )}
        </div>

        {(isHot || velocity15m > 0 || uniqueTraders > 0) && (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {isHot && (
              <Chip tone="warning" leading={<Flame className="h-3 w-3" />}>
                Hot · {velocity15m}/15m
              </Chip>
            )}
            {!isHot && velocity15m > 0 && (
              <Chip tone="neutral">
                {velocity15m} trade{velocity15m === 1 ? "" : "s"} / 15m
              </Chip>
            )}
            {uniqueTraders > 0 && (
              <Chip tone="muted" leading={<Users className="h-3 w-3" />}>
                {uniqueTraders} trader{uniqueTraders === 1 ? "" : "s"}
              </Chip>
            )}
          </div>
        )}
      </Card>

      {noPool && (
        <Card padded="lg" className="flex flex-col gap-3">
          <div className="flex items-center gap-2 text-on-surface-variant">
            <Info className="h-4 w-4" />
            <span className="text-[13px] font-medium">
              No bonding curve pool exists for ${ticker}
            </span>
          </div>
          <p className="max-w-2xl text-[12.5px] leading-[1.55] text-on-surface-variant">
            This ticker was launched via <code className="font-mono">token_factory</code> but
            its bonding-curve pool hasn't been opened yet. Whoever opens the pool becomes the
            pool creator — they'll receive the 0.5% trading fees and own the appchain
            promotion flow. To keep ownership aligned, this button is gated to the original
            launcher's wallet.
          </p>
          {launcherAddr && (
            <div className="flex flex-wrap items-center gap-2 text-[11.5px]">
              <span className="text-on-surface-muted">Launcher wallet:</span>
              <Link
                to={`/u/${launcherAddr}`}
                className="font-mono text-[#60A5FA] hover:text-on-surface"
                title={launcherAddr}
              >
                {shortAddr(launcherAddr)}
              </Link>
              {isLauncher && <Chip tone="success" dot>Connected</Chip>}
            </div>
          )}
          <div>
            {isLauncher || !launcherAddr ? (
              <Button
                variant="primary"
                leading={
                  isCreatingPool ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Zap className="h-3.5 w-3.5" />
                  )
                }
                disabled={isCreatingPool || !isConnected}
                onClick={async () => {
                  if (!isConnected) return openConnect();
                  const hash = await createPool(ticker);
                  if (hash) setTimeout(() => pool.refetch(), 1500);
                }}
              >
                {isCreatingPool ? "Opening curve…" : `Open curve for $${ticker}`}
              </Button>
            ) : (
              <Button variant="neutral" disabled>
                Only the launcher can open this curve
              </Button>
            )}
          </div>
        </Card>
      )}

      {pool.data?.exists && (
        <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="flex min-w-0 flex-col gap-4">
            {/* Chart card */}
            <Card padded="md" className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <Segmented
                  value={timeframe}
                  onChange={(v) => setTimeframe(v as Timeframe)}
                  options={[
                    { value: "5m", label: "5m" },
                    { value: "1H", label: "1H" },
                    { value: "4H", label: "4H" },
                    { value: "1D", label: "1D" },
                    { value: "1W", label: "1W" },
                  ]}
                  size="xs"
                />
                <div className="flex items-center gap-3 text-[11px]">
                  <span className="text-on-surface-muted">
                    {priceSeries.candles.length} candle
                    {priceSeries.candles.length === 1 ? "" : "s"}
                  </span>
                  {priceSeries.isFetching && (
                    <Loader2 className="h-3 w-3 animate-spin text-on-surface-muted" />
                  )}
                </div>
              </div>
              <CandleChart data={priceSeries.candles} height={320} />
            </Card>

            {/* Tabs card: trades / holders / comments / depth */}
            <Card padded="none" className="overflow-hidden">
              <div className="flex items-center gap-4 border-b border-white/[0.05] px-4">
                {(
                  [
                    { k: "trades", label: "Recent trades" },
                    { k: "holders", label: "Holders" },
                    { k: "comments", label: "Comments" },
                    { k: "depth", label: "Curve depth" },
                  ] as const
                ).map((t) => (
                  <button
                    key={t.k}
                    type="button"
                    onClick={() => setTab(t.k)}
                    className={cn(
                      "relative py-3 text-[12.5px] font-medium transition-colors",
                      tab === t.k
                        ? "text-on-surface"
                        : "text-on-surface-muted hover:text-on-surface-variant",
                    )}
                  >
                    {t.label}
                    {tab === t.k && (
                      <span className="absolute -bottom-px left-0 right-0 h-px bg-[#60A5FA]" />
                    )}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    pool.refetch();
                    holding.refetch();
                    trades.refetch();
                    holders.refetch();
                    comments.refetch();
                  }}
                  className="ml-auto flex items-center gap-1.5 py-3 text-[11px] text-on-surface-muted hover:text-on-surface"
                >
                  <RefreshCw
                    className={cn(
                      "h-3 w-3",
                      (pool.isFetching || trades.isFetching) && "animate-spin",
                    )}
                  />
                  Refresh
                </button>
              </div>
              <div className="p-4">
                {tab === "trades" && (
                  <div className="flex flex-col gap-1">
                    <div className="grid grid-cols-[60px_minmax(140px,1fr)_1fr_1fr_1fr_32px] gap-2 pb-1.5 text-[10.5px] text-[#52525B]">
                      <span>Side</span>
                      <span>Trader</span>
                      <span className="text-right">Amount</span>
                      <span className="text-right">MIN</span>
                      <span className="text-right">Height</span>
                      <span />
                    </div>
                    {trades.data && trades.data.length > 0 ? (
                      trades.data.map((t) => (
                        <div
                          key={t.hash}
                          className="grid grid-cols-[60px_minmax(140px,1fr)_1fr_1fr_1fr_32px] items-center gap-2 border-b border-white/[0.03] py-1.5 text-[12px] font-mono tabular-nums last:border-b-0"
                        >
                          <span
                            className={
                              t.side === "BUY" ? "text-[#34D399]" : "text-[#FB7185]"
                            }
                          >
                            {t.side}
                          </span>
                          <Link
                            to={`/u/${t.trader}`}
                            className="truncate text-on-surface-variant hover:text-on-surface"
                          >
                            {shortAddr(t.trader)}
                          </Link>
                          <span className="text-right text-on-surface-variant">
                            {Number(t.tokenAmount).toLocaleString()}
                          </span>
                          <span className="text-right text-on-surface-variant">
                            {formatMin(t.initAmount, 4)}
                          </span>
                          <span className="text-right text-on-surface-muted">
                            {latestHeight ? relativeTime(t.height, latestHeight) : `#${t.height}`}
                          </span>
                          <a
                            href={`${APPCHAIN.rpc}/tx?hash=0x${t.hash}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-on-surface-muted hover:text-on-surface"
                            aria-label="View tx"
                          >
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>
                      ))
                    ) : (
                      <div className="py-6 text-center text-[12.5px] text-on-surface-muted">
                        {trades.isFetching ? "Loading…" : "No trades yet — be the first."}
                      </div>
                    )}
                  </div>
                )}
                {tab === "holders" && (
                  <div className="flex flex-col divide-y divide-white/[0.05]">
                    {holders.isLoading ? (
                      <div className="py-6 text-center text-[11.5px] text-on-surface-muted">
                        Aggregating…
                      </div>
                    ) : !holders.data || holders.data.length === 0 ? (
                      <div className="py-6 text-center text-[12.5px] text-on-surface-muted">
                        No holders yet.
                      </div>
                    ) : (
                      holders.data.map((h, i) => (
                        <Link
                          to={`/u/${h.address}`}
                          key={h.address}
                          className="-mx-2 flex items-center gap-3 rounded-md px-2 py-2 hover:bg-white/[0.02]"
                        >
                          <span
                            className={cn(
                              "inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full font-mono text-[11px] font-semibold",
                              i === 0
                                ? "bg-[#F59E0B]/20 text-[#FBBF24]"
                                : i < 3
                                  ? "bg-[#2563EB]/15 text-[#60A5FA]"
                                  : "bg-white/[0.04] text-on-surface-variant",
                            )}
                          >
                            {i < 3 ? <Trophy className="h-3 w-3" /> : i + 1}
                          </span>
                          <Avatar symbol={h.address.slice(2, 6).toUpperCase()} size="sm" />
                          <div className="min-w-0 flex-1">
                            <div className="truncate font-mono text-[12.5px] text-on-surface">
                              {shortAddr(h.address)}
                            </div>
                            <div className="font-mono text-[10.5px] text-on-surface-muted">
                              {h.trades} trade{h.trades === 1 ? "" : "s"}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-mono text-[12.5px] tabular-nums text-on-surface">
                              {Number(h.balance).toLocaleString()}
                            </div>
                            <div className="font-mono text-[10.5px] text-on-surface-muted">
                              ${ticker}
                            </div>
                          </div>
                        </Link>
                      ))
                    )}
                  </div>
                )}
                {tab === "comments" && (
                  <div className="flex flex-col gap-3">
                    <div className="flex flex-col gap-2 rounded-lg bg-[#0F0F11] p-3 ghost-border">
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
                        className="w-full resize-none bg-transparent text-[13px] text-on-surface outline-none placeholder:text-[#52525B] disabled:cursor-not-allowed"
                      />
                      <div className="flex items-center justify-between">
                        <span
                          className={cn(
                            "font-mono text-[10.5px]",
                            commentBody.length > 260 ? "text-[#FBBF24]" : "text-[#52525B]",
                          )}
                        >
                          {commentBody.length}/280 · on-chain
                        </span>
                        <Button
                          size="sm"
                          variant="primary"
                          leading={
                            isPosting ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Send className="h-3 w-3" />
                            )
                          }
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

                    {comments.isLoading ? (
                      <div className="py-6 text-center text-[11.5px] text-on-surface-muted">
                        Loading feed…
                      </div>
                    ) : !comments.data || comments.data.length === 0 ? (
                      <div className="flex flex-col items-center gap-2 py-6 text-center">
                        <MessageCircle className="h-5 w-5 text-on-surface-muted" />
                        <span className="text-[12.5px] text-on-surface-muted">
                          No comments yet. Start the thread.
                        </span>
                      </div>
                    ) : (
                      <div className="flex flex-col divide-y divide-white/[0.05]">
                        {comments.data.map((c) => (
                          <div key={`${c.hash}-${c.index}`} className="flex gap-3 py-3">
                            <Avatar symbol={c.author.slice(2, 6).toUpperCase()} size="sm" />
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <Link
                                  to={`/u/${c.author}`}
                                  className="font-mono text-[12px] text-on-surface hover:text-on-surface-variant"
                                >
                                  {shortAddr(c.author)}
                                </Link>
                                <span className="font-mono text-[10.5px] text-on-surface-muted">
                                  ·{" "}
                                  {latestHeight
                                    ? relativeTime(c.blockHeight, latestHeight)
                                    : `#${c.blockHeight}`}
                                </span>
                                <a
                                  href={`${APPCHAIN.rpc}/tx?hash=0x${c.hash}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="ml-auto text-on-surface-muted hover:text-on-surface"
                                  aria-label="View tx"
                                >
                                  <ExternalLink className="h-3 w-3" />
                                </a>
                              </div>
                              <p className="mt-1 whitespace-pre-wrap break-words text-[12.5px] text-on-surface-variant">
                                {c.body}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                {tab === "depth" && (
                  <div className="flex flex-col gap-3">
                    <CurveDepthChart
                      basePriceMicroInit={pool.data.basePrice}
                      slopeMicroInit={pool.data.slope}
                      currentSupply={pool.data.tokenSupply}
                      currentReserveMicroInit={pool.data.initReserve}
                      graduationTargetMicroInit={GRADUATION_THRESHOLD_INIT}
                      height={280}
                    />
                    <p className="text-[12px] leading-[1.55] text-on-surface-variant">
                      Bonding curve pools have no orderbook — price is a deterministic function
                      of token supply:{" "}
                      <code className="font-mono text-on-surface">
                        spot = base + (supply × slope) / 1e6
                      </code>
                      . The blue line shows that function across the full supply range; the
                      yellow marker is current supply, the green marker is approximate supply
                      at graduation.
                    </p>
                    <div className="grid grid-cols-3 gap-3 border-t border-white/[0.05] pt-3 text-[11px]">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-on-surface-muted">Base price</span>
                        <span className="font-mono tabular-nums text-on-surface">
                          {formatMin(pool.data.basePrice, 6)} MIN
                        </span>
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-on-surface-muted">Slope</span>
                        <span className="font-mono tabular-nums text-on-surface">
                          {formatMin(pool.data.slope, 6)} MIN/token
                        </span>
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-on-surface-muted">Reserve custody</span>
                        <span className="font-mono tabular-nums text-on-surface">
                          {formatMin(pool.data.initReserve, 2)} MIN
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* Order panel */}
          <Card padded="md" className="sticky top-3 flex h-fit flex-col gap-4">
            <div className="grid grid-cols-2 gap-0.5 rounded-lg bg-[#0F0F11] p-0.5 ghost-border">
              {(["BUY", "SELL"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSide(s)}
                  className={cn(
                    "h-8 rounded-md text-[12.5px] font-semibold uppercase tracking-[0.04em] transition-colors",
                    side === s
                      ? s === "BUY"
                        ? "bg-secondary text-white"
                        : "bg-error text-white"
                      : "text-on-surface-muted hover:text-on-surface",
                  )}
                >
                  {s}
                </button>
              ))}
            </div>

            <div className="flex flex-col gap-3">
              <OrderInput
                side={side}
                ticker={ticker}
                amount={amount}
                setAmount={setAmount}
                walletBalance={wallet.data ?? 0n}
                holding={holding.data ?? 0n}
              />

              <div className="flex items-center justify-between">
                <label className="text-[11px] font-medium text-on-surface-variant">Slippage</label>
                <div className="flex gap-1">
                  {SLIPPAGE_OPTIONS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setSlippage(s)}
                      className={cn(
                        "h-6 rounded-md px-2 font-mono text-[10.5px]",
                        slippage === s
                          ? "bg-white/[0.08] text-on-surface ghost-border"
                          : "text-on-surface-muted hover:text-on-surface",
                      )}
                    >
                      {s}%
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-2 rounded-lg bg-[#0A0A0C] p-3 text-[12px] ghost-border">
                <div className="flex justify-between">
                  <span className="text-on-surface-muted">Spot price</span>
                  <span className="font-mono tabular-nums text-on-surface">
                    {formatMin(pool.data.spotPrice, 6)} MIN
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-on-surface-muted">
                    Expected {side === "BUY" ? "tokens" : "MIN"}
                  </span>
                  <span className="font-mono tabular-nums text-on-surface">
                    {side === "BUY"
                      ? Number(expectedOut).toLocaleString()
                      : formatMin(expectedOut, 4)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-on-surface-muted">Min received</span>
                  <span className="font-mono tabular-nums text-on-surface-variant">
                    {side === "BUY" ? Number(minOut).toLocaleString() : formatMin(minOut, 4)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-on-surface-muted">Fee (0.5%)</span>
                  <span className="font-mono tabular-nums text-on-surface-variant">
                    retained to appchain
                  </span>
                </div>
              </div>

              {isConnected ? (
                <Button
                  variant={side === "BUY" ? "secondary" : "danger"}
                  size="lg"
                  fullWidth
                  disabled={amountMicro === 0n || isTrading || pool.data.graduated}
                  leading={
                    isTrading ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Zap className="h-3.5 w-3.5" />
                    )
                  }
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
                  leading={<Wallet className="h-3.5 w-3.5" />}
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
                  className="inline-flex items-center justify-center gap-1.5 rounded-md bg-[#10B981]/10 py-2 font-mono text-[11px] text-[#34D399] transition-colors hover:bg-[#10B981]/15 disabled:opacity-50"
                >
                  {isDripping ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                  {isDripping ? "Dripping…" : "Get 10 MIN from faucet"}
                </button>
              )}

              <div className="flex items-center justify-center gap-1.5 text-[10.5px] text-[#52525B]">
                <Zap className="h-3 w-3 text-secondary" />
                <span className="font-mono">
                  Auto-signed · {APPCHAIN.chainId}
                </span>
              </div>
            </div>
          </Card>
        </section>
      )}
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
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <label className="text-[11px] font-medium text-on-surface-variant">
          Amount ({unit})
        </label>
        <span className="font-mono text-[11px] text-on-surface-muted">
          Bal: <span className="text-on-surface-variant">{balanceLabel}</span>
        </span>
      </div>
      <div className="flex items-center gap-2 rounded-lg bg-[#0F0F11] px-3 py-2.5 ghost-border focus-within:ring-1 focus-within:ring-primary/50">
        <input
          type="number"
          inputMode="decimal"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="min-w-0 flex-1 bg-transparent font-mono text-[15px] tabular-nums text-on-surface outline-none"
          placeholder="0.00"
        />
        <span className="font-mono text-[11px] text-on-surface-muted">{unit}</span>
      </div>
      <div className="grid grid-cols-4 gap-1">
        {[25, 50, 75, 100].map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setPercent(p)}
            className="h-7 rounded-md bg-[#0F0F11] font-mono text-[10.5px] text-on-surface-variant ghost-border hover:bg-white/[0.04] hover:text-on-surface"
          >
            {p === 100 ? "MAX" : `${p}%`}
          </button>
        ))}
      </div>
    </div>
  );
}
