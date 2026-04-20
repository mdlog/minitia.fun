import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Gift, Loader2, Rocket } from "lucide-react";
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
    <div className="flex flex-col gap-5 pb-8">
      <Card padded="lg" className="flex flex-wrap items-center justify-between gap-6">
        <div className="flex flex-col gap-1.5">
          <span className="text-[11px] font-medium text-on-surface-variant">
            Total claimable · {claimableCount} of {myPools.length} pools
          </span>
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-[36px] font-medium tabular-nums tracking-tight text-on-surface">
              {formatInit(totalUnclaimed, 4)}
            </span>
            <span className="font-mono text-[12px] text-on-surface-muted">MIN</span>
          </div>
          <span className="text-[12px] text-[#52525B]">
            Every trade on your pool pays a 0.5% creator fee.
          </span>
        </div>
        {!connected && (
          <Button
            variant="primary"
            size="lg"
            leading={<Gift className="h-3.5 w-3.5" />}
            onClick={() => kit.openConnect()}
          >
            Connect wallet
          </Button>
        )}
      </Card>

      {!connected ? (
        <Card padded="lg" className="text-center">
          <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-on-surface-variant">
            Connect a wallet to see your pools
          </span>
        </Card>
      ) : tokens.isLoading ? (
        <Card padded="lg" className="text-center">
          <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-on-surface-variant">
            Scanning your launches…
          </span>
        </Card>
      ) : myPools.length === 0 ? (
        <Card padded="lg" className="flex flex-col items-center gap-3 text-center">
          <span className="text-[15px] font-semibold text-on-surface">
            You haven't launched any pools yet
          </span>
          <span className="text-[12.5px] text-on-surface-variant">
            Creator rewards accrue to the signer who called{" "}
            <code className="font-mono">create_pool</code>.
          </span>
          <Button asChild variant="primary" size="sm" leading={<Rocket className="h-3.5 w-3.5" />}>
            <Link to="/launchpad">Launch a token</Link>
          </Button>
        </Card>
      ) : (
        <Card padded="none" className="overflow-hidden">
          <div className="grid grid-cols-[minmax(180px,1.5fr)_1fr_1fr_1fr_auto] gap-4 border-b border-white/[0.06] px-4 py-2.5 text-[10.5px] font-medium uppercase tracking-[0.06em] text-[#52525B]">
            <span>Token</span>
            <span>Trades</span>
            <span className="text-right">Reserve (MIN)</span>
            <span className="text-right">Unclaimed (MIN)</span>
            <span className="w-[120px]" />
          </div>
          {myPools.map((t) => {
            const hasFees = t.feeAccumulated > 0n;
            return (
              <div
                key={t.ticker}
                className="grid grid-cols-[minmax(180px,1.5fr)_1fr_1fr_1fr_auto] items-center gap-4 border-b border-white/[0.04] px-4 py-3 last:border-b-0 hover:bg-white/[0.02]"
              >
                <div className="flex items-center gap-3">
                  <Avatar symbol={t.ticker} size="sm" src={t.imageUri} />
                  <div>
                    <div className="text-[13px] font-medium text-on-surface">${t.ticker}</div>
                    <div className="font-mono text-[11px] text-on-surface-muted">
                      {t.ticker.toLowerCase()}.fun.init
                    </div>
                  </div>
                </div>
                <span className="text-[12.5px] text-on-surface-variant">
                  {t.tradeCount} trade{t.tradeCount === 1 ? "" : "s"}
                </span>
                <span className="text-right font-mono text-[13px] tabular-nums text-on-surface-variant">
                  {formatInit(t.initReserve, 2)}
                </span>
                <span className="text-right font-mono text-[13px] tabular-nums text-on-surface">
                  {formatInit(t.feeAccumulated, 4)}
                </span>
                <div className="flex items-center justify-end gap-2">
                  <Chip tone={hasFees ? "success" : "muted"} dot>
                    {hasFees ? "Ready" : "Idle"}
                  </Chip>
                  <Button
                    variant={hasFees ? "primary" : "neutral"}
                    size="sm"
                    disabled={!hasFees || isPending}
                    onClick={() => hasFees && claim(t.ticker)}
                    leading={
                      isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : undefined
                    }
                  >
                    {hasFees ? "Claim" : "Settled"}
                  </Button>
                </div>
              </div>
            );
          })}
        </Card>
      )}
    </div>
  );
}
