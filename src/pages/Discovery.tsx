import { Link } from "react-router-dom";
import { ArrowUpRight, Flame } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { GhostNumeral } from "@/components/ui/GhostNumeral";
import { Marquee } from "@/components/ui/Marquee";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { VolumeChart } from "@/components/ui/VolumeChart";
import { marketStats, networkStatus, trendingTokens } from "@/data/mock";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { formatCompact, formatNumber, formatPercent, formatPrice } from "@/lib/format";
import { APPCHAIN } from "@/lib/initia";

const tickerItems = [
  <span key="blocks" className="font-mono text-body-sm text-on-surface-variant">
    BLOCK TIME <span className="text-editorial">{APPCHAIN.blockTimeMs}ms</span>
  </span>,
  <span key="tps" className="font-mono text-body-sm text-on-surface-variant">
    TPS TARGET <span className="text-secondary">{formatNumber(APPCHAIN.targetTps)}</span>
  </span>,
  <span key="fee" className="font-mono text-body-sm text-on-surface-variant">
    TRADE FEE <span className="text-tertiary">0.5%</span>
  </span>,
  <span key="vm" className="font-mono text-body-sm text-on-surface-variant">
    VM <span className="text-editorial">move</span>
  </span>,
  <span key="vol" className="font-mono text-body-sm text-on-surface-variant">
    24H VOL <span className="text-secondary">420,069 INIT</span>
  </span>,
  <span key="grad" className="font-mono text-body-sm text-on-surface-variant">
    GRADUATED <span className="text-tertiary">412</span>
  </span>,
  <span key="vip" className="font-mono text-body-sm text-on-surface-variant">
    VIP REWARDS <span className="text-editorial">esINIT</span>
  </span>,
  <span key="quote" className="font-editorial italic text-body-sm text-editorial-ink">
    "speed is the only alpha"
  </span>,
];

export default function Discovery() {
  const network = useNetworkStatus();
  const isLive = network.data?.healthy === true;
  const liveChainId = network.data?.chainId;
  return (
    <div className="flex flex-col gap-14 pb-6">
      {/* ── Marquee ticker ───────────────────────────── */}
      <div className="-mx-6 border-y border-editorial/20 bg-surface-container-lowest/60 py-3 md:-mx-10 animate-fade-in">
        <Marquee items={tickerItems} />
      </div>

      {/* ── Hero — editorial asymmetric ──────────────── */}
      <section className="relative grain dotgrid rounded-[28px] surface-section px-6 py-14 md:px-10 md:py-20 overflow-hidden">
        {/* Hero headline — editorial */}
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <h1
            className="reveal text-on-surface"
            style={{ ["--d" as string]: "80ms" }}
          >
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

        {/* Numeric footer — editorial stat strip */}
        <div
          className="reveal mt-16 grid grid-cols-2 gap-x-10 gap-y-8 md:grid-cols-4 md:gap-x-14"
          style={{ ["--d" as string]: "420ms" }}
        >
          {[
            { label: "block time", value: `${APPCHAIN.blockTimeMs}`, unit: "ms", accent: "text-editorial" },
            { label: "target tps", value: formatCompact(APPCHAIN.targetTps), unit: "peak", accent: "text-secondary" },
            { label: "trade fee", value: "0.5", unit: "%", accent: "text-tertiary" },
            { label: "graduated", value: "412", unit: "total", accent: "text-editorial-ink" },
          ].map((s) => (
            <div key={s.label} className="flex flex-col gap-1.5 border-l border-editorial/20 pl-4">
              <span className="text-[0.62rem] font-mono uppercase tracking-[0.28em] text-on-surface-muted">
                {s.label}
              </span>
              <span className="flex items-baseline gap-2">
                <span className={`font-editorial text-[2.6rem] leading-[0.9] ${s.accent}`}>
                  {s.value}
                </span>
                <span className="font-mono text-[0.68rem] uppercase tracking-[0.2em] text-on-surface-muted">
                  {s.unit}
                </span>
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* ── Trending — editorial list with ghost numerals ─ */}
      <section className="relative flex flex-col gap-8">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div className="flex items-end gap-4">
            <span className="font-mono text-[0.62rem] uppercase tracking-[0.3em] text-editorial">
              § 01
            </span>
            <h2 className="text-[clamp(1.75rem,3.5vw,2.75rem)] font-editorial italic leading-[1] text-editorial-ink">
              Trending launches
            </h2>
          </div>
          <Link
            to="/launchpad"
            className="group inline-flex items-center gap-2 font-mono text-[0.75rem] uppercase tracking-[0.2em] text-on-surface-variant hover:text-editorial snappy"
          >
            View all
            <ArrowUpRight className="h-4 w-4 snappy group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </Link>
        </div>

        <div className="h-px hairline" />

        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {trendingTokens.map((token, i) => {
            const statusTone =
              token.status === "graduated" ? "success" : token.status === "hot" ? "glow" : "info";
            const ctaHref =
              token.status === "graduated"
                ? `/graduation/${token.symbol}`
                : `/trade/${token.symbol}`;
            return (
              <Card
                key={token.symbol}
                tier="base"
                interactive
                padded="md"
                className="reveal relative flex h-full flex-col gap-5"
                style={{ ["--d" as string]: `${i * 120}ms` }}
              >
                {/* Ghost numeral top-right */}
                <GhostNumeral
                  index={i + 1}
                  className="absolute right-3 top-0 text-[6rem]"
                />

                <div className="flex items-center gap-3">
                  <Avatar symbol={token.symbol} size="lg" />
                  <div className="min-w-0">
                    <div className="flex items-baseline gap-2">
                      <span className="truncate font-editorial italic text-[1.6rem] leading-none text-editorial-ink">
                        {token.symbol.toLowerCase()}
                      </span>
                      <span className="font-mono text-label-sm uppercase tracking-widest text-on-surface-muted">
                        ${token.symbol}
                      </span>
                    </div>
                    <p className="mt-1 truncate text-body-sm text-on-surface-variant">{token.name}</p>
                  </div>
                </div>

                <div className="flex items-baseline justify-between">
                  <span className="font-mono text-title-lg text-on-surface">
                    ${formatPrice(token.price)}
                  </span>
                  <Chip tone={token.change24h >= 0 ? "success" : "danger"} dense>
                    {formatPercent(token.change24h)}
                  </Chip>
                </div>

                <ProgressBar
                  value={token.graduation}
                  tone={token.status === "graduated" ? "graduation" : "primary"}
                  size="sm"
                />

                <div className="flex items-center justify-between pt-1">
                  <Chip tone={statusTone} dense>
                    {token.status}
                  </Chip>
                  <Button
                    asChild
                    variant={token.primaryAction.tone}
                    size="sm"
                    trailing={<ArrowUpRight className="h-3.5 w-3.5" />}
                  >
                    <Link to={ctaHref}>{token.primaryAction.label}</Link>
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      </section>

      {/* ── Market Pulsar + Network ───────────────────── */}
      <section className="relative flex flex-col gap-8">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div className="flex items-end gap-4">
            <span className="font-mono text-[0.62rem] uppercase tracking-[0.3em] text-editorial">
              § 02
            </span>
            <h2 className="text-[clamp(1.75rem,3.5vw,2.75rem)] font-editorial italic leading-[1] text-editorial-ink">
              Market pulsar
            </h2>
          </div>
          <span className="font-mono text-[0.68rem] uppercase tracking-[0.22em] text-on-surface-muted">
            Last 12 hours
          </span>
        </div>

        <div className="h-px hairline" />

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_340px]">
          <Card tier="base" padded="lg" className="flex flex-col gap-8">
            <div className="flex flex-wrap items-baseline justify-between gap-6">
              <div className="flex items-baseline gap-4">
                <span className="font-editorial text-[3.5rem] leading-none text-editorial">
                  {formatCompact(marketStats.totalVolume)}
                </span>
                <span className="font-mono text-body-sm uppercase tracking-[0.2em] text-on-surface-muted">
                  INIT · 24h vol
                </span>
              </div>
              <div className="flex items-baseline gap-4">
                <span className="font-editorial italic text-[2rem] leading-none text-secondary">
                  +18.4%
                </span>
                <span className="font-mono text-body-sm uppercase tracking-[0.2em] text-on-surface-muted">
                  vs prev
                </span>
              </div>
            </div>
            <VolumeChart data={marketStats.volumeSeries} height={180} />
          </Card>

          <Card tier="base" padded="lg" className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
              <span className="font-editorial italic text-title-lg text-editorial-ink">
                Network
              </span>
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.62rem] font-mono uppercase tracking-[0.2em] ${
                  isLive
                    ? "bg-secondary-container/70 text-secondary"
                    : "bg-error-container/50 text-error"
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    isLive ? "bg-secondary animate-pulse" : "bg-error"
                  }`}
                />
                {network.isLoading ? "Syncing" : isLive ? "Live" : "Offline"}
              </span>
            </div>

            <div className="flex flex-col gap-5">
              {[
                {
                  k: "block",
                  v: network.data ? `#${formatNumber(network.data.blockHeight)}` : "—",
                  unit: liveChainId ?? "initia",
                },
                { k: "target tps", v: formatNumber(APPCHAIN.targetTps), unit: "spec" },
                { k: "avg gas", v: `${networkStatus.avgGas.toFixed(4)}`, unit: "init" },
              ].map((row) => (
                <div key={row.k} className="flex items-baseline justify-between border-b border-editorial/10 pb-3 last:border-none last:pb-0">
                  <span className="font-mono text-[0.68rem] uppercase tracking-[0.28em] text-on-surface-muted">
                    {row.k}
                  </span>
                  <span className="flex items-baseline gap-2">
                    <span className="font-editorial text-[1.8rem] leading-none text-editorial-ink">
                      {row.v}
                    </span>
                    <span className="font-mono text-[0.62rem] uppercase tracking-[0.2em] text-on-surface-muted">
                      {row.unit}
                    </span>
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </section>

      {/* ── Protocol architecture (Hub & Spoke) ───────── */}
      <section className="relative flex flex-col gap-8">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div className="flex items-end gap-4">
            <span className="font-mono text-[0.62rem] uppercase tracking-[0.3em] text-editorial">
              § 03
            </span>
            <h2 className="text-[clamp(1.75rem,3.5vw,2.75rem)] font-editorial italic leading-[1] text-editorial-ink">
              Hub &amp; Spoke
            </h2>
          </div>
          <span className="font-mono text-[0.68rem] uppercase tracking-[0.22em] text-on-surface-muted">
            Interwoven stack · Move VM
          </span>
        </div>

        <div className="h-px hairline" />

        <div className="grid gap-5 md:grid-cols-2">
          {/* L1 Hub */}
          <Card tier="base" padded="lg" className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <span className="font-mono text-[0.62rem] uppercase tracking-[0.28em] text-editorial">
                Layer 1 · Hub
              </span>
              <span className="h-px flex-1 bg-editorial/20" />
            </div>
            <h3 className="text-headline-sm font-editorial italic text-editorial-ink">
              Initia Coordination Hub
            </h3>
            <ul className="flex flex-col gap-2.5 text-body-sm text-on-surface-variant">
              <li className="flex items-start gap-3">
                <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-secondary shrink-0" />
                <span>
                  <span className="text-on-surface">Settlement layer.</span> Anchors finality and
                  security for every L2 trade.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                <span>
                  <span className="text-on-surface">InitiaDEX.</span> Destination for graduated
                  liquidity via OPinit bots.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-tertiary shrink-0" />
                <span>
                  <span className="text-on-surface">Enshrined Liquidity.</span> Graduated tokens
                  become staking-eligible on L1.
                </span>
              </li>
            </ul>
          </Card>

          {/* L2 Spoke */}
          <Card tier="base" padded="lg" className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <span className="font-mono text-[0.62rem] uppercase tracking-[0.28em] text-editorial">
                Layer 2 · Spoke
              </span>
              <span className="h-px flex-1 bg-editorial/20" />
              <Chip tone="glow" dense>
                {APPCHAIN.chainId}
              </Chip>
            </div>
            <h3 className="text-headline-sm font-editorial italic text-editorial-ink">
              Minitia.fun Launcher Chain
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {APPCHAIN.modules.map((mod, i) => (
                <div
                  key={mod}
                  className="rounded-2xl bg-white/[0.03] px-3 py-3 ghost-border"
                >
                  <div className="font-mono text-[0.58rem] uppercase tracking-[0.22em] text-editorial">
                    module · 0{i + 1}
                  </div>
                  <div className="mt-1 font-mono text-body-sm text-on-surface">{mod}</div>
                </div>
              ))}
              <div className="rounded-2xl bg-white/[0.03] px-3 py-3 ghost-border">
                <div className="font-mono text-[0.58rem] uppercase tracking-[0.22em] text-secondary">
                  vm
                </div>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="font-editorial italic text-title-lg text-secondary">
                    move
                  </span>
                  <span className="font-mono text-[0.58rem] uppercase tracking-[0.2em] text-on-surface-muted">
                    object-centric
                  </span>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </section>

    </div>
  );
}
