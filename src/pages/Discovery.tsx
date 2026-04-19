import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, ExternalLink, Flame } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { GhostNumeral } from "@/components/ui/GhostNumeral";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { useAppchainStats } from "@/hooks/useAppchainStats";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import {
  useAllLaunchedTokens,
  graduationProgress,
  type LaunchedToken,
} from "@/hooks/useAllLaunchedTokens";
import { APPCHAIN } from "@/lib/initia";
import { cn } from "@/lib/cn";
import { formatNumber } from "@/lib/format";

type FilterKey = "all" | "active" | "graduated" | "no_pool";

const FILTERS: Array<{ key: FilterKey; label: string }> = [
  { key: "all", label: "All" },
  { key: "active", label: "Trading" },
  { key: "graduated", label: "Graduated" },
  { key: "no_pool", label: "No pool" },
];

function shortAddr(addr: string, chars = 4): string {
  if (!addr) return "—";
  return addr.length <= chars * 2 + 2 ? addr : `${addr.slice(0, chars + 2)}…${addr.slice(-chars)}`;
}

function formatInitFromUmin(umin: bigint, digits = 2): string {
  if (umin === 0n) return "0";
  const whole = umin / 1_000_000n;
  const frac = umin % 1_000_000n;
  const fracStr = frac.toString().padStart(6, "0").slice(0, digits);
  return `${whole.toLocaleString("en-US")}${digits > 0 ? "." + fracStr : ""}`;
}

function tokenStatus(t: LaunchedToken): { tone: "success" | "glow" | "info" | "warning"; label: string } {
  if (!t.poolExists) return { tone: "warning", label: "no pool" };
  if (t.graduated) return { tone: "success", label: "graduated" };
  const pct = graduationProgress(t.initReserve);
  if (pct >= 50) return { tone: "glow", label: "hot" };
  return { tone: "info", label: "trading" };
}

export default function Discovery() {
  const network = useNetworkStatus();
  const stats = useAppchainStats();
  const tokens = useAllLaunchedTokens(50);
  const [filter, setFilter] = useState<FilterKey>("all");

  const liveOnRollup = network.data?.source === "appchain" && network.data?.healthy;

  const filtered = useMemo(() => {
    const list = tokens.data ?? [];
    if (filter === "all") return list;
    if (filter === "graduated") return list.filter((t) => t.graduated);
    if (filter === "no_pool") return list.filter((t) => !t.poolExists);
    return list.filter((t) => t.poolExists && !t.graduated);
  }, [tokens.data, filter]);

  return (
    <div className="flex flex-col gap-14 pb-6">
      {/* ── Hero ──────────────────────────────────────── */}
      <section className="relative grain dotgrid rounded-[28px] surface-section px-6 py-14 md:px-10 md:py-20 overflow-hidden">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <h1 className="reveal text-on-surface" style={{ ["--d" as string]: "80ms" }}>
            <span className="block text-[clamp(3rem,9vw,7rem)] font-editorial italic leading-[0.95] text-editorial-ink">
              Launch
            </span>
            <span className="block text-[clamp(2.25rem,6.5vw,5.25rem)] font-display font-medium leading-[0.98] tracking-tight">
              anything. <span className="text-on-surface-variant">Graduate</span>
            </span>
            <span className="block text-[clamp(2.25rem,6.5vw,5.25rem)] font-display font-medium leading-[0.98] tracking-tight">
              <span className="font-editorial italic font-normal text-editorial">fast</span>
              <span className="text-secondary">.</span>
            </span>
          </h1>

          <div
            className="reveal flex flex-col gap-5 lg:w-[300px]"
            style={{ ["--d" as string]: "240ms" }}
          >
            <p className="text-body-lg leading-[1.55] text-on-surface-variant">
              A sovereign launchpad for the Initia stack. Deploy a token, trade it on-curve, then
              promote it to its own appchain — all in one cockpit.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="hyperglow" size="md" leading={<Flame className="h-4 w-4" />}>
                <Link to="/launchpad">Launch token</Link>
              </Button>
              <Button asChild variant="glass" size="md" trailing={<ArrowUpRight className="h-4 w-4" />}>
                <Link to="/trade/MOVE">Open market</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ── Live feed — every token launched on the rollup ─ */}
      <section className="relative flex flex-col gap-8">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div className="flex items-end gap-4">
            <span className="font-mono text-[0.62rem] uppercase tracking-[0.3em] text-editorial">
              § 01
            </span>
            <h2 className="text-[clamp(1.75rem,3.5vw,2.75rem)] font-editorial italic leading-[1] text-editorial-ink">
              Launched on Minitia.fun
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-mono text-[0.6rem] uppercase tracking-[0.2em] ${
                tokens.isFetching
                  ? "bg-secondary-container/70 text-secondary"
                  : "bg-white/[0.04] text-on-surface-variant"
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  tokens.isFetching ? "bg-secondary animate-pulse" : "bg-on-surface-muted"
                }`}
              />
              {tokens.isFetching ? "syncing" : "live"}
            </span>
            <span className="font-mono text-[0.68rem] uppercase tracking-[0.22em] text-on-surface-muted">
              {tokens.data?.length ?? 0} tokens
            </span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => {
            const active = filter === f.key;
            const count =
              f.key === "all"
                ? tokens.data?.length ?? 0
                : f.key === "graduated"
                  ? tokens.data?.filter((t) => t.graduated).length ?? 0
                  : f.key === "no_pool"
                    ? tokens.data?.filter((t) => !t.poolExists).length ?? 0
                    : tokens.data?.filter((t) => t.poolExists && !t.graduated).length ?? 0;
            return (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`rounded-full px-3 py-1.5 font-mono text-[0.68rem] uppercase tracking-[0.2em] snappy ${
                  active
                    ? "bg-editorial-ink text-surface"
                    : "bg-white/[0.04] text-on-surface-variant hover:bg-white/[0.08]"
                }`}
              >
                {f.label}
                <span className="ml-1.5 text-on-surface-muted">{count}</span>
              </button>
            );
          })}
        </div>

        <div className="h-px hairline" />

        {tokens.isLoading ? (
          <Card tier="base" padded="lg" className="text-center text-on-surface-variant">
            <span className="font-mono text-label-sm uppercase tracking-[0.2em]">
              Scanning rollup for launches…
            </span>
          </Card>
        ) : filtered.length === 0 ? (
          <Card tier="base" padded="lg" className="flex flex-col items-center gap-3 text-center">
            <span className="font-editorial italic text-title-md text-editorial-ink">
              {tokens.data?.length === 0 ? "No tokens launched yet" : "Nothing matches this filter"}
            </span>
            <span className="text-body-sm text-on-surface-variant">
              {tokens.data?.length === 0
                ? "Be the first to seed a ticker on the curve."
                : "Try another filter, or launch something new."}
            </span>
            <Button asChild variant="hyperglow" size="sm" leading={<Flame className="h-4 w-4" />}>
              <Link to="/launchpad">Launch a token</Link>
            </Button>
          </Card>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((t, i) => {
              const status = tokenStatus(t);
              const gradPct = graduationProgress(t.initReserve);
              const ctaHref = t.graduated ? `/graduation/${t.ticker}` : `/trade/${t.ticker}`;
              const ctaLabel = !t.poolExists
                ? "View token"
                : t.graduated
                  ? "Claim"
                  : `Trade $${t.ticker}`;
              const ctaTone: "primary" | "hyperglow" | "secondary" = t.graduated
                ? "hyperglow"
                : "primary";
              const heat = gradPct >= 50 || t.tradeCount >= 3;
              return (
                <Card
                  key={t.ticker}
                  tier="base"
                  interactive
                  padded={false}
                  className="reveal group relative flex h-full flex-col overflow-hidden"
                  style={{ ["--d" as string]: `${Math.min(i * 80, 480)}ms` }}
                >
                  {/* Hero art — giant ticker letter as decorative cover */}
                  <div className="relative h-32 overflow-hidden bg-gradient-to-br from-editorial/25 via-primary-container/30 to-tertiary-container/30">
                    <div className="grain absolute inset-0 opacity-40" />
                    <div className="dotgrid absolute inset-0 opacity-50" />
                    <span
                      className="absolute inset-0 flex items-center justify-center font-editorial italic leading-none text-editorial-ink/85 mix-blend-overlay select-none"
                      style={{ fontSize: "9.5rem" }}
                    >
                      {t.ticker.charAt(0).toLowerCase()}
                    </span>
                    <div className="absolute left-4 top-4 flex items-center gap-1.5">
                      <span className="rounded-full bg-surface/80 px-2 py-0.5 font-mono text-[0.58rem] uppercase tracking-[0.24em] text-on-surface backdrop-blur-glass">
                        #{t.launchIndex || i + 1}
                      </span>
                      {heat && !t.graduated && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-400/20 px-2 py-0.5 font-mono text-[0.58rem] uppercase tracking-[0.22em] text-amber-300 backdrop-blur-glass">
                          <Flame className="h-3 w-3" /> hot
                        </span>
                      )}
                    </div>
                    <GhostNumeral
                      index={t.launchIndex || i + 1}
                      className="absolute right-3 bottom-1 text-[4.5rem] opacity-50"
                    />
                  </div>

                  <div className="flex flex-1 flex-col gap-4 px-5 pb-5 pt-4">
                    {/* Identity */}
                    <div className="flex items-start gap-3">
                      <Avatar symbol={t.ticker} size="md" className="-mt-8 ring-4 ring-surface" />
                      <div className="min-w-0 flex-1 pt-1">
                        <div className="flex items-baseline gap-2">
                          <span className="truncate font-editorial italic text-[1.6rem] leading-none text-editorial-ink">
                            {t.ticker.toLowerCase()}
                          </span>
                          <span className="font-mono text-label-sm uppercase tracking-widest text-on-surface-muted">
                            ${t.ticker}
                          </span>
                        </div>
                        <p className="mt-1 truncate text-body-sm text-on-surface-variant">
                          {t.name}
                        </p>
                      </div>
                    </div>

                    {/* Stats row */}
                    <div className="grid grid-cols-3 gap-2 text-body-sm">
                      <div className="flex flex-col gap-0.5 border-l border-editorial/25 pl-2.5">
                        <span className="font-mono text-[0.56rem] uppercase tracking-[0.2em] text-on-surface-muted">
                          liq
                        </span>
                        <span className="font-mono tabular-nums text-on-surface">
                          {formatInitFromUmin(t.initReserve, 2)}
                        </span>
                      </div>
                      <div className="flex flex-col gap-0.5 border-l border-editorial/25 pl-2.5">
                        <span className="font-mono text-[0.56rem] uppercase tracking-[0.2em] text-on-surface-muted">
                          trades
                        </span>
                        <span className="font-mono tabular-nums text-on-surface">
                          {formatNumber(t.tradeCount)}
                        </span>
                      </div>
                      <div className="flex flex-col gap-0.5 border-l border-editorial/25 pl-2.5">
                        <span className="font-mono text-[0.56rem] uppercase tracking-[0.2em] text-on-surface-muted">
                          grad
                        </span>
                        <span className="font-mono tabular-nums text-on-surface">
                          {gradPct.toFixed(0)}%
                        </span>
                      </div>
                    </div>

                    {/* Flame gauge — progress bar with burn tone */}
                    <div className="flex flex-col gap-1">
                      <div
                        className="relative h-1.5 overflow-hidden rounded-full bg-white/[0.06]"
                        aria-label={`Graduation ${gradPct.toFixed(1)}%`}
                      >
                        <div
                          className={cn(
                            "absolute inset-y-0 left-0 rounded-full transition-all duration-500",
                            t.graduated
                              ? "bg-gradient-to-r from-amber-400 via-amber-300 to-amber-200"
                              : gradPct >= 75
                                ? "bg-gradient-to-r from-red-400 via-amber-400 to-amber-300"
                                : gradPct >= 50
                                  ? "bg-gradient-to-r from-orange-500 to-amber-400"
                                  : gradPct >= 25
                                    ? "bg-gradient-to-r from-primary to-tertiary"
                                    : "bg-gradient-to-r from-editorial to-primary",
                          )}
                          style={{ width: `${Math.max(2, gradPct)}%` }}
                        />
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="mt-auto flex items-center justify-between pt-1">
                      <div className="flex min-w-0 items-center gap-2">
                        <Chip tone={status.tone} dense>
                          {status.label}
                        </Chip>
                        <Link
                          to={`/u/${t.creator}`}
                          className="truncate font-mono text-[0.6rem] uppercase tracking-[0.2em] text-on-surface-muted hover:text-editorial-ink snappy"
                          title={t.creator}
                        >
                          by {shortAddr(t.creator)}
                        </Link>
                      </div>
                      <Button
                        asChild
                        variant={ctaTone}
                        size="sm"
                        trailing={<ArrowUpRight className="h-3.5 w-3.5" />}
                      >
                        <Link to={ctaHref}>{ctaLabel}</Link>
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      {/* ── Live rollup — real on-chain state via public tunnel ─ */}
      {network.data && (
        <section className="relative flex flex-col gap-8">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div className="flex items-end gap-4">
              <span className="font-mono text-[0.62rem] uppercase tracking-[0.3em] text-editorial">
                § live
              </span>
              <h2 className="text-[clamp(1.75rem,3.5vw,2.75rem)] font-editorial italic leading-[1] text-editorial-ink">
                Our rollup, live
              </h2>
            </div>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-mono text-[0.62rem] uppercase tracking-[0.2em] ${
                liveOnRollup
                  ? "bg-secondary-container/70 text-secondary"
                  : "bg-white/[0.04] text-on-surface-variant"
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  liveOnRollup ? "bg-secondary animate-pulse" : "bg-on-surface-muted"
                }`}
              />
              {network.isLoading ? "Syncing" : liveOnRollup ? "Live" : network.data.source}
            </span>
          </div>

          <div className="h-px hairline" />

          <Card tier="base" padded="lg" className="flex flex-col gap-6">
            <div className="grid gap-6 md:grid-cols-4">
              <div className="flex flex-col gap-1.5 border-l border-editorial/20 pl-4">
                <span className="font-mono text-[0.62rem] uppercase tracking-[0.22em] text-on-surface-muted">
                  chain
                </span>
                <span className="font-editorial italic text-title-lg text-editorial">
                  {network.data.chainId}
                </span>
              </div>
              <div className="flex flex-col gap-1.5 border-l border-editorial/20 pl-4">
                <span className="font-mono text-[0.62rem] uppercase tracking-[0.22em] text-on-surface-muted">
                  block height
                </span>
                <span className="font-editorial text-[2rem] leading-none text-editorial-ink">
                  #{formatNumber(network.data.blockHeight)}
                </span>
              </div>
              <div className="flex flex-col gap-1.5 border-l border-editorial/20 pl-4">
                <span className="font-mono text-[0.62rem] uppercase tracking-[0.22em] text-on-surface-muted">
                  tokens launched
                </span>
                <span className="font-editorial text-[2rem] leading-none text-secondary">
                  {stats.data?.enabled
                    ? formatNumber(stats.data.launchesOnChain)
                    : "—"}
                </span>
              </div>
              <div className="flex flex-col gap-1.5 border-l border-editorial/20 pl-4">
                <span className="font-mono text-[0.62rem] uppercase tracking-[0.22em] text-on-surface-muted">
                  move txs
                </span>
                <span className="font-editorial text-[2rem] leading-none text-tertiary">
                  {stats.data?.enabled
                    ? formatNumber(stats.data.msgExecuteCount)
                    : "—"}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-editorial/15 pt-5 text-body-sm text-on-surface-variant">
              <div className="flex flex-col gap-0.5">
                <span className="font-mono text-[0.62rem] uppercase tracking-[0.22em] text-on-surface-muted">
                  token_factory module
                </span>
                <code className="font-mono text-body-sm text-editorial-ink break-all">
                  {APPCHAIN.deployedAddress}
                </code>
              </div>
              {APPCHAIN.rpc && (
                <a
                  href={`${APPCHAIN.rpc}/status`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 font-mono text-[0.62rem] uppercase tracking-[0.2em] text-secondary hover:text-editorial-ink"
                >
                  Verify on RPC <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          </Card>
        </section>
      )}
    </div>
  );
}
