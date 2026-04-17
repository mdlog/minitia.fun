import { Gift, Loader2 } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { airdrops, type Airdrop } from "@/data/mock";
import { useTxAction } from "@/hooks/useTxAction";
import { formatNumber } from "@/lib/format";

export default function Airdrops() {
  const { execute, isPending } = useTxAction();
  const totalClaimable = airdrops
    .filter((a) => a.claimable)
    .reduce((sum, a) => sum + a.amount, 0);
  const claimableCount = airdrops.filter((a) => a.claimable).length;

  const claim = (a: Airdrop) =>
    execute({
      kind: "claim",
      summary: `Claim $${a.token} airdrop`,
      memoAction: "airdrop_claim",
      metadata: { token: a.token, amount: a.amount },
    });

  const claimAll = async () => {
    const claimable = airdrops.filter((a) => a.claimable);
    await execute({
      kind: "claim",
      summary: `Claim all (${claimable.length})`,
      memoAction: "airdrop_claim_all",
      metadata: {
        tokens: claimable.map((a) => a.token),
        total: claimable.reduce((s, a) => s + a.amount, 0),
      },
    });
  };

  return (
    <div className="flex flex-col gap-10 pb-6">
      {/* Header */}
      <section className="flex flex-col gap-3 max-w-2xl">
        <div className="flex items-center gap-3 font-mono text-[0.62rem] uppercase tracking-[0.3em] text-editorial">
          <span>§ rewards</span>
          <span className="h-px flex-1 hairline" />
        </div>
        <h1 className="text-[clamp(2.5rem,6vw,4.5rem)] leading-[0.98] text-editorial-ink">
          <span className="font-editorial italic text-editorial">claim</span>{" "}
          <span className="font-display font-medium tracking-tight">your rewards</span>
          <span className="text-secondary">.</span>
        </h1>
      </section>

      {/* Summary */}
      <Card tier="base" padded="lg" className="flex flex-wrap items-center justify-between gap-6">
        <div className="flex flex-col gap-1">
          <span className="font-mono text-[0.62rem] uppercase tracking-[0.28em] text-on-surface-muted">
            Total claimable · {claimableCount} active
          </span>
          <span className="flex items-baseline gap-3">
            <span className="font-editorial italic text-[3.5rem] leading-none text-editorial">
              {formatNumber(totalClaimable)}
            </span>
            <span className="font-mono text-body-sm uppercase tracking-[0.2em] text-on-surface-muted">
              tokens
            </span>
          </span>
        </div>
        <Button
          variant="hyperglow"
          size="lg"
          leading={isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Gift className="h-5 w-5" />}
          disabled={claimableCount === 0 || isPending}
          onClick={claimAll}
        >
          {isPending ? "Broadcasting…" : "Claim all"}
        </Button>
      </Card>

      {/* Grid */}
      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {airdrops.map((a) => (
          <Card key={a.token} tier="base" padded="md" className="flex h-full flex-col gap-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <Avatar symbol={a.token} size="md" />
                <div className="min-w-0">
                  <div className="flex items-baseline gap-2">
                    <span className="truncate font-editorial italic text-[1.4rem] leading-none text-editorial-ink">
                      {a.token.toLowerCase()}
                    </span>
                    <span className="font-mono text-label-sm uppercase tracking-widest text-on-surface-muted">
                      ${a.token}
                    </span>
                  </div>
                  <div className="mt-1 font-mono text-body-sm text-on-surface-variant">
                    {a.claimable ? `Ends in ${a.ends}` : a.ends}
                  </div>
                </div>
              </div>
              <Chip tone={a.claimable ? "success" : "neutral"} dense>
                {a.claimable ? "open" : "settled"}
              </Chip>
            </div>

            <div className="flex items-baseline justify-between border-b border-editorial/15 pb-3">
              <span className="font-mono text-[0.62rem] uppercase tracking-[0.22em] text-on-surface-muted">
                Amount
              </span>
              <span className="font-editorial italic text-headline-md leading-none text-editorial-ink">
                {formatNumber(a.amount)}
              </span>
            </div>

            <Button
              variant={a.claimable ? "primary" : "glass"}
              size="md"
              fullWidth
              disabled={!a.claimable || isPending}
              onClick={() => a.claimable && claim(a)}
              className="mt-auto"
            >
              {a.claimable ? "Claim" : "Claimed"}
            </Button>
          </Card>
        ))}
      </section>
    </div>
  );
}
