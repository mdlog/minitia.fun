import { Link } from "react-router-dom";
import { ArrowUpRight, Flame } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { GhostNumeral } from "@/components/ui/GhostNumeral";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { VolumeChart } from "@/components/ui/VolumeChart";
import { marketStats, trendingTokens } from "@/data/mock";
import { formatCompact, formatPercent, formatPrice } from "@/lib/format";

export default function Discovery() {
  return (
    <div className="flex flex-col gap-14 pb-6">
      {/* ── Hero — editorial asymmetric ──────────────── */}
      <section className="relative grain dotgrid rounded-[28px] surface-section px-6 py-14 md:px-10 md:py-20 overflow-hidden">
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

      {/* ── Market Pulsar — single full-width ──────────── */}
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
      </section>
    </div>
  );
}
