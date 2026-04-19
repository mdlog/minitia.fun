import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowDown, ArrowUp, ExternalLink, Flame, Rocket } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { useAllLaunchedTokens } from "@/hooks/useAllLaunchedTokens";
import { useGlobalActivity } from "@/hooks/useGlobalActivity";
import { APPCHAIN } from "@/lib/initia";
import { addressEq, hexToBech32, shortAddress, toCanonicalHex } from "@/lib/address";
import { cn } from "@/lib/cn";

function formatInitFromUmin(umin: bigint, digits = 2): string {
  if (umin === 0n) return "0";
  const whole = umin / 1_000_000n;
  const frac = umin % 1_000_000n;
  const fracStr = frac.toString().padStart(6, "0").slice(0, digits);
  return `${whole.toLocaleString("en-US")}${digits > 0 ? "." + fracStr : ""}`;
}

function relativeBlocks(height: number, latestHeight: number): string {
  if (!latestHeight || !height) return `#${height}`;
  const diff = latestHeight - height;
  if (diff <= 0) return "just now";
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3_600) return `${Math.round(diff / 60)}m ago`;
  return `${Math.round(diff / 3_600)}h ago`;
}

export default function UserProfile() {
  const { address = "" } = useParams();
  // Accept either `0x…` hex or `init1…` bech32; canonicalise for matching.
  const userHex = toCanonicalHex(address) ?? "";
  const userBech32 = userHex ? hexToBech32(userHex) : null;
  const tokens = useAllLaunchedTokens(50);
  const activity = useGlobalActivity(80);

  const launched = useMemo(
    () => (tokens.data ?? []).filter((t) => addressEq(t.creator, userHex)),
    [tokens.data, userHex],
  );
  const userActivity = useMemo(
    () => (activity.data ?? []).filter((ev) => ev.actor && addressEq(ev.actor, userHex)),
    [activity.data, userHex],
  );
  const latestHeight = (activity.data ?? []).reduce((m, e) => (e.height > m ? e.height : m), 0);

  // Aggregate stats
  const stats = useMemo(() => {
    const list = userActivity;
    let bought = 0n;
    let sold = 0n;
    let buyCount = 0;
    let sellCount = 0;
    let claimed = 0n;
    for (const ev of list) {
      if (ev.kind === "buy") {
        bought += ev.initAmount;
        buyCount += 1;
      } else if (ev.kind === "sell") {
        sold += ev.initAmount;
        sellCount += 1;
      } else if (ev.kind === "claim") {
        claimed += ev.initAmount;
      }
    }
    return { bought, sold, buyCount, sellCount, claimed };
  }, [userActivity]);

  return (
    <div className="page-shell">
      <section className="page-hero grain dotgrid px-6 py-10 md:px-10 md:py-12">
        <div className="flex flex-wrap items-center gap-5">
          <Avatar symbol={userHex.slice(2, 6).toUpperCase() || "USER"} size="xl" />
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <span className="font-mono text-[0.62rem] uppercase tracking-[0.3em] text-editorial">
              § profile
            </span>
            <h1
              className="font-editorial italic leading-[0.9] text-editorial-ink break-all"
              style={{ fontSize: "clamp(2rem, 5vw, 3.75rem)" }}
            >
              {shortAddress(userHex)}
            </h1>
            {userBech32 && (
              <p className="font-mono text-[0.68rem] text-on-surface-muted break-all">
                bech32 · <span className="text-editorial-ink">{userBech32}</span>
              </p>
            )}
            <p className="font-mono text-body-sm text-on-surface-muted">
              Creator · trader · on <span className="text-editorial-ink">{APPCHAIN.chainId}</span>
            </p>
          </div>
          <Chip tone={launched.length > 0 ? "success" : "neutral"} dense>
            {launched.length === 0
              ? "trader"
              : launched.length === 1
                ? "1 launch"
                : `${launched.length} launches`}
          </Chip>
        </div>

        <div className="mt-8 grid gap-6 md:grid-cols-4">
          <div className="flex flex-col gap-1.5 border-l border-editorial/20 pl-4">
            <span className="font-mono text-[0.6rem] uppercase tracking-[0.22em] text-on-surface-muted">
              launched
            </span>
            <span className="font-editorial text-[2rem] leading-none text-secondary">
              {launched.length}
            </span>
          </div>
          <div className="flex flex-col gap-1.5 border-l border-editorial/20 pl-4">
            <span className="font-mono text-[0.6rem] uppercase tracking-[0.22em] text-on-surface-muted">
              bought · sold
            </span>
            <span className="font-editorial text-[2rem] leading-none text-editorial-ink">
              {stats.buyCount} / {stats.sellCount}
            </span>
          </div>
          <div className="flex flex-col gap-1.5 border-l border-editorial/20 pl-4">
            <span className="font-mono text-[0.6rem] uppercase tracking-[0.22em] text-on-surface-muted">
              MIN spent
            </span>
            <span className="font-editorial text-[2rem] leading-none text-editorial-ink">
              {formatInitFromUmin(stats.bought, 2)}
            </span>
          </div>
          <div className="flex flex-col gap-1.5 border-l border-editorial/20 pl-4">
            <span className="font-mono text-[0.6rem] uppercase tracking-[0.22em] text-on-surface-muted">
              MIN sold · claimed
            </span>
            <span className="font-editorial text-[2rem] leading-none text-tertiary">
              {formatInitFromUmin(stats.sold + stats.claimed, 2)}
            </span>
          </div>
        </div>
      </section>

      <section className="relative flex flex-col gap-6">
        <div className="flex items-end gap-3">
          <span className="font-mono text-[0.62rem] uppercase tracking-[0.3em] text-editorial">
            § launches
          </span>
          <h2 className="text-[clamp(1.5rem,3vw,2.25rem)] font-editorial italic leading-[1] text-editorial-ink">
            Tokens created
          </h2>
        </div>
        <div className="h-px hairline" />
        {launched.length === 0 ? (
          <Card tier="base" padded="lg" className="flex flex-col items-center gap-3 text-center">
            <Rocket className="h-6 w-6 text-on-surface-muted" />
            <span className="text-body-sm text-on-surface-variant">
              This wallet hasn't launched any tokens on the rollup yet.
            </span>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {launched.map((t) => (
              <Card
                key={t.ticker}
                tier="base"
                interactive
                padded="md"
                className="flex flex-col gap-4"
              >
                <div className="flex items-center gap-3">
                  <Avatar symbol={t.ticker} size="md" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-2">
                      <span className="truncate font-editorial italic text-[1.4rem] leading-none text-editorial-ink">
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
                  <Chip
                    tone={!t.poolExists ? "warning" : t.graduated ? "success" : "info"}
                    dense
                  >
                    {!t.poolExists ? "no pool" : t.graduated ? "graduated" : "live"}
                  </Chip>
                </div>
                <div className="flex items-center justify-between pt-1">
                  <div className="font-mono text-[0.62rem] uppercase tracking-[0.2em] text-on-surface-muted">
                    {formatInitFromUmin(t.initReserve, 2)} MIN · {t.tradeCount} trades
                  </div>
                  <Button
                    asChild
                    size="sm"
                    variant={t.graduated ? "hyperglow" : "primary"}
                  >
                    <Link to={t.graduated ? `/graduation/${t.ticker}` : `/trade/${t.ticker}`}>
                      {t.graduated ? "Claim" : "Trade"}
                    </Link>
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section className="relative flex flex-col gap-6">
        <div className="flex items-end gap-3">
          <span className="font-mono text-[0.62rem] uppercase tracking-[0.3em] text-editorial">
            § activity
          </span>
          <h2 className="text-[clamp(1.5rem,3vw,2.25rem)] font-editorial italic leading-[1] text-editorial-ink">
            Recent moves
          </h2>
        </div>
        <div className="h-px hairline" />
        {userActivity.length === 0 ? (
          <Card tier="base" padded="lg" className="text-center text-body-sm text-on-surface-muted">
            {activity.isLoading ? "Loading…" : "No recent activity on the rollup."}
          </Card>
        ) : (
          <Card tier="base" padded="md" className="flex flex-col divide-y divide-editorial/15">
            {userActivity.slice(0, 20).map((ev) => {
              const isBuy = ev.kind === "buy";
              const isSell = ev.kind === "sell";
              const isTrade = isBuy || isSell;
              const tone = isBuy
                ? "success"
                : isSell
                  ? "danger"
                  : ev.kind === "launch"
                    ? "info"
                    : ev.kind === "claim"
                      ? "success"
                      : "neutral";
              const verb =
                ev.kind === "buy"
                  ? "bought"
                  : ev.kind === "sell"
                    ? "sold"
                    : ev.kind === "launch"
                      ? "launched"
                      : ev.kind === "pool_created"
                        ? "opened curve"
                        : ev.kind === "graduated"
                          ? "graduated"
                          : "claimed fees on";
              return (
                <Link
                  key={`${ev.hash}-${ev.kind}`}
                  to={`/trade/${ev.ticker}`}
                  className="flex items-center gap-3 py-3 hover:bg-white/[0.03] snappy -mx-2 px-2 rounded-md"
                >
                  <Chip
                    tone={tone}
                    dense
                    leading={
                      isBuy ? (
                        <ArrowUp className="h-3 w-3" />
                      ) : isSell ? (
                        <ArrowDown className="h-3 w-3" />
                      ) : ev.kind === "claim" ? (
                        <Flame className="h-3 w-3" />
                      ) : (
                        <Rocket className="h-3 w-3" />
                      )
                    }
                  >
                    {ev.kind.toUpperCase()}
                  </Chip>
                  <span className="text-body-sm text-on-surface-variant">{verb}</span>
                  <span className="font-editorial italic text-body-md text-editorial">
                    ${ev.ticker}
                  </span>
                  {isTrade && (
                    <span
                      className={cn(
                        "font-mono text-body-sm tabular-nums",
                        "text-on-surface",
                      )}
                    >
                      {formatInitFromUmin(ev.initAmount, 4)} MIN
                    </span>
                  )}
                  <span className="ml-auto font-mono text-[0.6rem] uppercase tracking-[0.2em] text-on-surface-muted">
                    {relativeBlocks(ev.height, latestHeight)}
                  </span>
                  <a
                    href={`${APPCHAIN.rpc}/tx?hash=0x${ev.hash}`}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="text-on-surface-muted hover:text-secondary"
                  >
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </Link>
              );
            })}
          </Card>
        )}
      </section>
    </div>
  );
}
