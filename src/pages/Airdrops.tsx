import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Flame, Gift, Loader2 } from "lucide-react";
import { useInterwovenKit } from "@initia/interwovenkit-react";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { useAllLaunchedTokens, type LaunchedToken } from "@/hooks/useAllLaunchedTokens";
import { useClaimFeesAction } from "@/hooks/useClaimFeesAction";

function formatInit(umin: bigint, digits = 4): string {
  if (umin === 0n) return "0";
  const whole = umin / 1_000_000n;
  const frac = umin % 1_000_000n;
  const fracStr = frac.toString().padStart(6, "0").slice(0, digits);
  return `${whole.toLocaleString("en-US")}${digits > 0 ? "." + fracStr : ""}`;
}

function matchesHex(creatorHex: string, userHex: string | undefined): boolean {
  if (!userHex) return false;
  const a = creatorHex.toLowerCase().replace(/^0x/, "");
  const b = userHex.toLowerCase().replace(/^0x/, "");
  // pad to 40 chars (20-byte eth-style address) to match formatting differences
  return a.padStart(40, "0") === b.padStart(40, "0");
}

export default function Airdrops() {
  const kit = useInterwovenKit();
  const tokens = useAllLaunchedTokens(50);
  const { claim, isPending } = useClaimFeesAction();

  const myPools = useMemo<LaunchedToken[]>(() => {
    const all = tokens.data ?? [];
    if (!kit.hexAddress) return [];
    return all.filter((t) => matchesHex(t.creator, kit.hexAddress));
  }, [tokens.data, kit.hexAddress]);

  const totalUnclaimed = myPools.reduce((sum, t) => sum + t.feeAccumulated, 0n);
  const claimableCount = myPools.filter((t) => t.feeAccumulated > 0n).length;
  const connected = Boolean(kit.isConnected && kit.hexAddress);

  return (
    <div className="flex flex-col gap-10 pb-6">
      {/* Header */}
      <section className="flex flex-col gap-3 max-w-2xl">
        <div className="flex items-center gap-3 font-mono text-[0.62rem] uppercase tracking-[0.3em] text-editorial">
          <span>§ creator rewards</span>
          <span className="h-px flex-1 hairline" />
        </div>
        <h1 className="text-[clamp(2.5rem,6vw,4.5rem)] leading-[0.98] text-editorial-ink">
          <span className="font-editorial italic text-editorial">claim</span>{" "}
          <span className="font-display font-medium tracking-tight">your fees</span>
          <span className="text-secondary">.</span>
        </h1>
        <p className="text-body-lg leading-[1.5] text-on-surface-variant">
          Every trade on your pool pays a 0.5% fee into <code className="font-mono text-editorial-ink">fee_accumulated</code>.
          As the pool creator you can drain it any time. Phase 1 is accounting-only — fees are
          recognized on-chain and event-emitted; full umin custody unlocks on Phase 2 / graduation.
        </p>
      </section>

      {/* Summary */}
      <Card tier="base" padded="lg" className="flex flex-wrap items-center justify-between gap-6">
        <div className="flex flex-col gap-1">
          <span className="font-mono text-[0.62rem] uppercase tracking-[0.28em] text-on-surface-muted">
            Unclaimed · {claimableCount} of {myPools.length} pools
          </span>
          <span className="flex items-baseline gap-3">
            <span className="font-editorial italic text-[3.5rem] leading-none text-editorial">
              {formatInit(totalUnclaimed, 4)}
            </span>
            <span className="font-mono text-body-sm uppercase tracking-[0.2em] text-on-surface-muted">
              MIN
            </span>
          </span>
        </div>
        {!connected ? (
          <Button variant="primary" size="lg" onClick={() => kit.openConnect()}>
            Connect wallet
          </Button>
        ) : null}
      </Card>

      {/* Grid */}
      {!connected ? (
        <Card tier="base" padded="lg" className="text-center text-on-surface-variant">
          <span className="font-mono text-label-sm uppercase tracking-[0.2em]">
            Connect a wallet to see your pools
          </span>
        </Card>
      ) : tokens.isLoading ? (
        <Card tier="base" padded="lg" className="text-center text-on-surface-variant">
          <span className="font-mono text-label-sm uppercase tracking-[0.2em]">
            Scanning your launches…
          </span>
        </Card>
      ) : myPools.length === 0 ? (
        <Card tier="base" padded="lg" className="flex flex-col items-center gap-3 text-center">
          <span className="font-editorial italic text-title-md text-editorial-ink">
            You haven't launched any pools yet
          </span>
          <span className="text-body-sm text-on-surface-variant">
            Creator rewards accrue to the signer who called{" "}
            <code className="font-mono text-editorial-ink">create_pool</code>.
          </span>
          <Button asChild variant="hyperglow" size="sm" leading={<Flame className="h-4 w-4" />}>
            <Link to="/launchpad">Launch a token</Link>
          </Button>
        </Card>
      ) : (
        <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {myPools.map((t) => {
            const hasFees = t.feeAccumulated > 0n;
            return (
              <Card
                key={t.ticker}
                tier="base"
                padded="md"
                className="flex h-full flex-col gap-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar symbol={t.ticker} size="md" />
                    <div className="min-w-0">
                      <div className="flex items-baseline gap-2">
                        <span className="truncate font-editorial italic text-[1.4rem] leading-none text-editorial-ink">
                          {t.ticker.toLowerCase()}
                        </span>
                        <span className="font-mono text-label-sm uppercase tracking-widest text-on-surface-muted">
                          ${t.ticker}
                        </span>
                      </div>
                      <div className="mt-1 font-mono text-body-sm text-on-surface-variant">
                        {t.tradeCount} trade{t.tradeCount === 1 ? "" : "s"} · #{t.launchHeight}
                      </div>
                    </div>
                  </div>
                  <Chip tone={hasFees ? "success" : "neutral"} dense>
                    {hasFees ? "ready" : "idle"}
                  </Chip>
                </div>

                <div className="grid grid-cols-2 gap-3 border-y border-editorial/15 py-3">
                  <div className="flex flex-col gap-0.5 pl-0">
                    <span className="font-mono text-[0.58rem] uppercase tracking-[0.2em] text-on-surface-muted">
                      unclaimed
                    </span>
                    <span className="font-editorial italic text-headline-sm leading-none text-editorial-ink">
                      {formatInit(t.feeAccumulated, 4)}
                    </span>
                  </div>
                  <div className="flex flex-col gap-0.5 border-l border-editorial/20 pl-3">
                    <span className="font-mono text-[0.58rem] uppercase tracking-[0.2em] text-on-surface-muted">
                      pool reserve
                    </span>
                    <span className="font-mono text-body-sm text-on-surface">
                      {formatInit(t.initReserve, 2)}{" "}
                      <span className="text-on-surface-muted">MIN</span>
                    </span>
                  </div>
                </div>

                <Button
                  variant={hasFees ? "primary" : "glass"}
                  size="md"
                  fullWidth
                  disabled={!hasFees || isPending}
                  onClick={() => hasFees && claim(t.ticker)}
                  className="mt-auto"
                  leading={
                    isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Gift className="h-4 w-4" />
                  }
                >
                  {hasFees ? `Claim ${formatInit(t.feeAccumulated, 2)} MIN` : "Nothing to claim"}
                </Button>
              </Card>
            );
          })}
        </section>
      )}
    </div>
  );
}
