import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowRight, ExternalLink, Flame, GraduationCap, Loader2, Lock, Rocket, Trophy } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { useInitiaAccount } from "@/hooks/useInitiaAccount";
import { useAllLaunchedTokens, graduationProgress } from "@/hooks/useAllLaunchedTokens";
import { useClaimFeesAction } from "@/hooks/useClaimFeesAction";
import { useGraduationEvent } from "@/hooks/useGraduationEvent";
import { useHolderLeaderboard } from "@/hooks/useHolderLeaderboard";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { usePoolState } from "@/hooks/usePoolState";
import { usePromotionStage, useRecordRollupAction, useStagePromotionAction } from "@/hooks/usePromotionStage";
import { APPCHAIN } from "@/lib/initia";

function formatMin(umin: bigint, digits = 4): string {
  if (umin === 0n) return "0";
  const whole = umin / 1_000_000n;
  const frac = umin % 1_000_000n;
  const fracStr = frac.toString().padStart(6, "0").slice(0, digits);
  return `${whole.toLocaleString("en-US")}${digits > 0 ? "." + fracStr : ""}`;
}

function shortAddr(addr: string, chars = 6): string {
  if (!addr) return "";
  return addr.length > 14 ? `${addr.slice(0, chars + 2)}…${addr.slice(-chars)}` : addr;
}

function addrEq(a: string, b: string): boolean {
  const na = a.toLowerCase().replace(/^0x/, "").padStart(40, "0");
  const nb = b.toLowerCase().replace(/^0x/, "").padStart(40, "0");
  return na === nb;
}

function blocksAgo(blockHeight: number, latestHeight: number): string {
  if (!blockHeight || !latestHeight) return "—";
  const diff = latestHeight - blockHeight;
  if (diff <= 0) return "just now";
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3_600) return `${Math.round(diff / 60)}m ago`;
  if (diff < 86_400) return `${Math.round(diff / 3_600)}h ago`;
  return `${Math.round(diff / 86_400)}d ago`;
}

export default function Graduation() {
  const { symbol = "MOVE" } = useParams();
  const ticker = symbol.toUpperCase();
  const { hexAddress } = useInitiaAccount();
  const pool = usePoolState(ticker);
  const event = useGraduationEvent(ticker);
  const holders = useHolderLeaderboard(ticker, 10);
  const network = useNetworkStatus();
  const tokens = useAllLaunchedTokens(50);
  const { claim, isPending: isClaiming } = useClaimFeesAction();
  const promotion = usePromotionStage(ticker);
  const { stage: stagePromotion, isPending: isStaging } = useStagePromotionAction();
  const { record: recordRollup, isPending: isRecording } = useRecordRollupAction();
  const [recordOpen, setRecordOpen] = useState(false);
  const [recordChainId, setRecordChainId] = useState(`${ticker.toLowerCase()}-fun-1`);
  const [recordRpc, setRecordRpc] = useState("http://localhost:26657");
  const [recordFirstTx, setRecordFirstTx] = useState("genesis");

  const tokenMeta = useMemo(
    () => (tokens.data ?? []).find((t) => t.ticker === ticker),
    [tokens.data, ticker],
  );
  const isCreator = useMemo(
    () => Boolean(hexAddress && tokenMeta?.creator && addrEq(tokenMeta.creator, hexAddress)),
    [hexAddress, tokenMeta],
  );

  const latestHeight = network.data?.blockHeight ?? 0;
  const isGraduated = Boolean(pool.data?.graduated);
  const poolExists = Boolean(pool.data?.exists);
  const unclaimedFees = pool.data?.feeAccumulated ?? 0n;
  const progressPct = pool.data ? graduationProgress(pool.data.initReserve) : 0;

  // --- Empty / negative states ----------------------------------------------
  if (pool.isLoading || tokens.isLoading) {
    return (
      <div className="page-shell">
        <Card tier="base" padded="lg" className="flex items-center justify-center gap-3">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          <span className="font-mono text-[0.68rem] uppercase tracking-[0.22em] text-on-surface-variant">
            Loading ${ticker}…
          </span>
        </Card>
      </div>
    );
  }

  if (!poolExists) {
    return (
      <div className="page-shell">
        <Card tier="base" padded="lg" className="flex flex-col items-center gap-3 text-center">
          <span className="font-editorial italic text-title-md text-editorial-ink">
            ${ticker} has no bonding-curve pool
          </span>
          <p className="max-w-xl text-body-sm text-on-surface-variant">
            Either the ticker was never launched or its pool was never opened.
            Graduation only applies to tokens that traded on a curve.
          </p>
          <Button asChild variant="glass" size="sm" trailing={<ArrowRight className="h-4 w-4" />}>
            <Link to={`/trade/${ticker}`}>Open trade page</Link>
          </Button>
        </Card>
      </div>
    );
  }

  if (!isGraduated) {
    return (
      <div className="page-shell flex flex-col gap-6">
        <Card tier="base" padded="lg" className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <Avatar symbol={ticker} size="lg" />
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline gap-3">
                <h1 className="font-editorial italic text-[clamp(2rem,5vw,3.5rem)] leading-none text-editorial-ink">
                  {ticker.toLowerCase()}
                </h1>
                <Chip tone="info" dense>not graduated yet</Chip>
              </div>
              <p className="mt-1 text-body-sm text-on-surface-variant">
                Pool still trading. Graduation triggers automatically when reserve passes
                {" "}{formatMin(10_000_000n, 0)} MIN.
              </p>
            </div>
          </div>
          <div className="flex items-center justify-between text-body-sm">
            <span className="font-mono text-[0.6rem] uppercase tracking-[0.2em] text-on-surface-muted">
              progress
            </span>
            <span className="font-mono tabular-nums text-on-surface">
              {progressPct.toFixed(1)}% · {formatMin(pool.data?.initReserve ?? 0n, 2)} / 10 MIN
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-editorial to-primary transition-all"
              style={{ width: `${Math.max(2, progressPct)}%` }}
            />
          </div>
          <Button asChild variant="hyperglow" size="md" leading={<Rocket className="h-4 w-4" />}>
            <Link to={`/trade/${ticker}`}>Trade to push graduation</Link>
          </Button>
        </Card>
      </div>
    );
  }

  // --- Graduated state ------------------------------------------------------
  return (
    <div className="page-shell flex flex-col gap-6">
      {/* Hero */}
      <section className="page-hero grain dotgrid px-6 py-10 md:px-10 md:py-12">
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px] xl:items-end">
          <div className="flex flex-col gap-5">
            <Chip tone="glow" className="self-start animate-pulse-glow" leading={<GraduationCap className="h-3.5 w-3.5" />}>
              Graduated · curve sealed
            </Chip>
            <h1 className="text-[clamp(3rem,8vw,6rem)] leading-[0.9] text-editorial-ink">
              <span className="font-mono text-title-md font-normal text-on-surface-variant">${ticker}</span>{" "}
              <span className="font-editorial italic text-editorial">graduated</span>
              <span className="font-display text-secondary">.</span>
            </h1>
            {tokenMeta && (
              <p className="text-body-md text-on-surface-variant">
                <span className="text-editorial-ink">{tokenMeta.name}</span> · launched by{" "}
                <Link
                  to={`/u/${tokenMeta.creator}`}
                  className="font-mono text-on-surface-muted hover:text-editorial-ink"
                >
                  {shortAddr(tokenMeta.creator)}
                </Link>
                {" "}· launch #{tokenMeta.launchIndex}
              </p>
            )}
            {event.data ? (
              <div className="flex flex-wrap items-center gap-3 text-body-sm text-on-surface-variant">
                <span className="font-mono text-[0.62rem] uppercase tracking-[0.22em] text-secondary">
                  sealed {blocksAgo(event.data.blockHeight, latestHeight)}
                </span>
                <span className="text-on-surface-muted">·</span>
                <a
                  href={`${APPCHAIN.rpc}/tx?hash=0x${event.data.txHash}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 font-mono text-[0.62rem] uppercase tracking-[0.22em] text-on-surface-muted hover:text-editorial-ink"
                >
                  #{event.data.blockHeight} <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            ) : event.isLoading ? (
              <span className="font-mono text-[0.62rem] uppercase tracking-[0.22em] text-on-surface-muted">
                indexing Graduated event…
              </span>
            ) : null}
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
            <div className="metric-card px-5 py-5">
              <span className="text-[0.62rem] font-mono uppercase tracking-[0.24em] text-on-surface-muted">
                final reserve
              </span>
              <div className="mt-2 font-editorial italic text-[2.4rem] leading-none text-editorial">
                {formatMin(pool.data?.initReserve ?? 0n, 2)}
              </div>
              <div className="mt-1 font-mono text-[0.62rem] uppercase tracking-[0.2em] text-on-surface-muted">
                MIN locked in vault
              </div>
            </div>
            <div className="metric-card px-5 py-5">
              <span className="text-[0.62rem] font-mono uppercase tracking-[0.24em] text-on-surface-muted">
                final supply
              </span>
              <div className="mt-2 font-editorial italic text-[2.4rem] leading-none text-editorial-ink">
                {Number(pool.data?.tokenSupply ?? 0n).toLocaleString()}
              </div>
              <div className="mt-1 font-mono text-[0.62rem] uppercase tracking-[0.2em] text-on-surface-muted">
                ${ticker} issued · frozen
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Creator earnings */}
      <section className="section-panel flex flex-col gap-5 px-6 py-6 md:px-7">
        <div className="flex items-center gap-3 font-mono text-[0.62rem] uppercase tracking-[0.3em] text-editorial">
          <span>§ creator</span>
          <span className="h-px flex-1 hairline" />
        </div>
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div className="flex flex-col gap-1.5">
            <span className="font-mono text-[0.62rem] uppercase tracking-[0.22em] text-on-surface-muted">
              unclaimed trading fees
            </span>
            <span className="font-editorial italic text-[clamp(2.5rem,5vw,3.5rem)] leading-none text-editorial-ink">
              {formatMin(unclaimedFees, 4)}{" "}
              <span className="font-mono text-title-md font-normal text-on-surface-muted">MIN</span>
            </span>
            <span className="font-mono text-[0.6rem] uppercase tracking-[0.22em] text-on-surface-muted">
              {pool.data?.tradeCount ?? 0} trades · 0.5% fee/trade
            </span>
          </div>
          {isCreator ? (
            <Button
              variant="hyperglow"
              size="lg"
              leading={isClaiming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Flame className="h-4 w-4" />}
              disabled={unclaimedFees === 0n || isClaiming}
              onClick={() => claim(ticker)}
            >
              {unclaimedFees === 0n
                ? "Nothing to claim"
                : isClaiming
                  ? "Claiming…"
                  : `Claim ${formatMin(unclaimedFees, 2)} MIN`}
            </Button>
          ) : (
            <span className="font-mono text-[0.62rem] uppercase tracking-[0.22em] text-on-surface-muted">
              only creator can claim
            </span>
          )}
        </div>
      </section>

      {/* Top holders (locked) */}
      <section className="section-panel flex flex-col gap-4 px-6 py-6 md:px-7">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 font-mono text-[0.62rem] uppercase tracking-[0.3em] text-editorial">
            <span>§ holders · locked</span>
            <span className="h-px flex-1 hairline" />
          </div>
          <span className="inline-flex items-center gap-1.5 font-mono text-[0.58rem] uppercase tracking-[0.2em] text-on-surface-muted">
            <Lock className="h-3 w-3" /> sells blocked
          </span>
        </div>
        {holders.isLoading ? (
          <div className="py-6 text-center font-mono text-[0.62rem] uppercase tracking-[0.22em] text-on-surface-muted">
            Aggregating balances…
          </div>
        ) : !holders.data || holders.data.length === 0 ? (
          <div className="py-6 text-center text-body-sm text-on-surface-muted">
            No holders recorded for this ticker.
          </div>
        ) : (
          <div className="flex flex-col divide-y divide-editorial/15">
            {holders.data.map((h, i) => {
              const isPodium = i < 3;
              return (
                <Link
                  key={h.address}
                  to={`/u/${h.address}`}
                  className="flex items-center gap-3 py-2.5 rounded-md px-2 -mx-2 hover:bg-white/[0.03] snappy"
                >
                  <span
                    className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-mono text-[0.7rem] font-semibold ${
                      i === 0
                        ? "bg-amber-400/25 text-amber-300"
                        : isPodium
                          ? "bg-editorial/20 text-editorial"
                          : "bg-white/[0.04] text-on-surface-variant"
                    }`}
                  >
                    {isPodium ? <Trophy className="h-3.5 w-3.5" /> : i + 1}
                  </span>
                  <Avatar symbol={h.address.slice(2, 6).toUpperCase()} size="sm" />
                  <div className="min-w-0 flex-1">
                    <div className="font-mono text-body-sm text-on-surface">
                      {shortAddr(h.address)}
                    </div>
                    <div className="font-mono text-[0.62rem] uppercase tracking-[0.2em] text-on-surface-muted">
                      {h.trades} trade{h.trades === 1 ? "" : "s"} · {formatMin(h.bought, 2)} MIN in
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
      </section>

      {/* Appchain promotion -- real state machine */}
      <section className="section-panel flex flex-col gap-4 px-6 py-6 md:px-7">
        <div className="flex items-center gap-3 font-mono text-[0.62rem] uppercase tracking-[0.3em] text-editorial">
          <span>§ appchain promotion</span>
          <span className="h-px flex-1 hairline" />
        </div>

        {/* Stage CTA (pre-stage) */}
        {!promotion.data?.exists && (
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <p className="max-w-2xl text-body-md leading-[1.6] text-on-surface-variant">
              Stage this graduation for rollup spawn. Emits{" "}
              <code className="font-mono text-editorial-ink">liquidity_migrator::PromotionStaged</code>
              {" "}— the promoter daemon (scripts/promoter.mjs) picks it up, prepares a
              <code className="ml-1 font-mono text-editorial-ink">weave rollup launch</code>
              {" "}config, and spawns <span className="text-editorial-ink">{ticker.toLowerCase()}-fun-1</span>.
            </p>
            {isCreator ? (
              <Button
                variant="hyperglow"
                size="lg"
                leading={isStaging ? <Loader2 className="h-4 w-4 animate-spin" /> : <Rocket className="h-4 w-4" />}
                disabled={isStaging}
                onClick={async () => {
                  const ok = await stagePromotion(ticker);
                  if (ok) setTimeout(() => promotion.refetch(), 1500);
                }}
              >
                {isStaging ? "Staging…" : "Stage promotion"}
              </Button>
            ) : (
              <span className="font-mono text-[0.62rem] uppercase tracking-[0.22em] text-on-surface-muted">
                only pool creator can stage
              </span>
            )}
          </div>
        )}

        {/* Staged (awaiting spawn) */}
        {promotion.data?.exists && promotion.data.status === 0 && (
          <div className="flex flex-col gap-3 rounded-xl bg-amber-400/10 p-4 ghost-border">
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-amber-300" />
              <span className="font-mono text-[0.62rem] uppercase tracking-[0.22em] text-amber-300">
                staged · waiting for promoter daemon
              </span>
            </div>
            <p className="text-body-sm leading-[1.6] text-on-surface-variant">
              Event on-chain. Promoter akan generate
              <code className="mx-1 font-mono text-editorial-ink">
                rollup-{ticker.toLowerCase()}.json
              </code>
              dan jalankan <code className="font-mono text-editorial-ink">weave rollup launch --with-config</code>.
              Begitu rollup live, <code className="font-mono text-editorial-ink">record_rollup</code> akan dipanggil
              dan card ini jadi hijau.
            </p>
            <div className="grid gap-2 font-mono text-[0.6rem] md:grid-cols-3">
              <span>
                <span className="text-on-surface-muted">final_reserve</span>{" "}
                <span className="text-on-surface">{formatMin(promotion.data.finalReserve, 4)} MIN</span>
              </span>
              <span>
                <span className="text-on-surface-muted">final_supply</span>{" "}
                <span className="text-on-surface">
                  {Number(promotion.data.finalSupply).toLocaleString()}
                </span>
              </span>
              <span>
                <span className="text-on-surface-muted">chain_id</span>{" "}
                <span className="text-editorial-ink">{ticker.toLowerCase()}-fun-1</span>
              </span>
            </div>

            {/* Creator can record the live rollup once promoter daemon has spawned it. */}
            {isCreator && (
              <div className="mt-2 flex flex-col gap-2 border-t border-amber-400/30 pt-3">
                {!recordOpen ? (
                  <button
                    type="button"
                    onClick={() => setRecordOpen(true)}
                    className="self-start inline-flex items-center gap-1.5 rounded-full bg-amber-400/20 px-3 py-1.5 font-mono text-[0.62rem] uppercase tracking-[0.22em] text-amber-200 hover:bg-amber-400/30 snappy"
                  >
                    Rollup ready? Record it <ArrowRight className="h-3 w-3" />
                  </button>
                ) : (
                  <div className="flex flex-col gap-2">
                    <label className="flex flex-col gap-1">
                      <span className="font-mono text-[0.58rem] uppercase tracking-[0.22em] text-on-surface-muted">
                        chain_id
                      </span>
                      <input
                        value={recordChainId}
                        onChange={(e) => setRecordChainId(e.target.value)}
                        className="rounded-lg bg-white/[0.06] px-3 py-1.5 font-mono text-body-sm text-on-surface ghost-border focus:outline-none"
                        placeholder="spx-fun-1"
                      />
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className="font-mono text-[0.58rem] uppercase tracking-[0.22em] text-on-surface-muted">
                        rollup_rpc
                      </span>
                      <input
                        value={recordRpc}
                        onChange={(e) => setRecordRpc(e.target.value)}
                        className="rounded-lg bg-white/[0.06] px-3 py-1.5 font-mono text-body-sm text-on-surface ghost-border focus:outline-none"
                        placeholder="http://localhost:26657"
                      />
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className="font-mono text-[0.58rem] uppercase tracking-[0.22em] text-on-surface-muted">
                        first_block_tx (or "genesis")
                      </span>
                      <input
                        value={recordFirstTx}
                        onChange={(e) => setRecordFirstTx(e.target.value)}
                        className="rounded-lg bg-white/[0.06] px-3 py-1.5 font-mono text-body-sm text-on-surface ghost-border focus:outline-none"
                        placeholder="genesis"
                      />
                    </label>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="hyperglow"
                        leading={
                          isRecording ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Rocket className="h-3.5 w-3.5" />
                        }
                        disabled={isRecording || !recordChainId || !recordRpc || !recordFirstTx}
                        onClick={async () => {
                          const ok = await recordRollup(ticker, recordChainId, recordRpc, recordFirstTx);
                          if (ok) {
                            setRecordOpen(false);
                            setTimeout(() => promotion.refetch(), 1500);
                          }
                        }}
                      >
                        {isRecording ? "Recording…" : "Sign + record"}
                      </Button>
                      <Button size="sm" variant="glass" onClick={() => setRecordOpen(false)} disabled={isRecording}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Live (rollup spawned) */}
        {promotion.data?.exists && promotion.data.status === 1 && (
          <div className="flex flex-col gap-3 rounded-xl bg-emerald-400/10 p-4 ghost-border">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
              </span>
              <span className="font-mono text-[0.62rem] uppercase tracking-[0.22em] text-emerald-300">
                appchain live
              </span>
            </div>
            <div className="flex items-baseline gap-2 break-all">
              <span className="font-mono text-[0.6rem] uppercase tracking-[0.22em] text-on-surface-muted">
                chain_id
              </span>
              <span className="font-editorial italic text-title-md text-editorial-ink">
                {promotion.data.rollupChainId}
              </span>
            </div>
            {promotion.data.rollupRpc && (
              <a
                href={promotion.data.rollupRpc}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 font-mono text-body-sm text-secondary hover:text-editorial-ink"
              >
                {promotion.data.rollupRpc} <ExternalLink className="h-3 w-3" />
              </a>
            )}
            {promotion.data.firstBlockTx && (
              <span className="font-mono text-[0.6rem] uppercase tracking-[0.22em] text-on-surface-muted break-all">
                first_block_tx · {promotion.data.firstBlockTx}
              </span>
            )}
          </div>
        )}

        {/* Pipeline status grid */}
        <div className="grid gap-3 md:grid-cols-2">
          <PromotionItem tone="done" title="Curve frozen" detail="buy/sell reject with E_GRADUATED" />
          <PromotionItem tone="done" title="Reserve custodied" detail="real umin in vault object" />
          <PromotionItem
            tone={promotion.data?.exists ? "done" : "idle"}
            title="Promotion staged"
            detail="liquidity_migrator::PromotionStaged emitted"
          />
          <PromotionItem
            tone={promotion.data?.status === 1 ? "done" : "idle"}
            title="Rollup live"
            detail="weave rollup launch + record_rollup"
          />
        </div>
      </section>
    </div>
  );
}

function PromotionItem({
  tone,
  title,
  detail,
}: {
  tone: "done" | "idle" | "next";
  title: string;
  detail: string;
}) {
  const chipTone = tone === "done" ? "success" : tone === "idle" ? "neutral" : "warning";
  const chipLabel = tone === "done" ? "done" : tone === "idle" ? "idle" : "next";
  return (
    <div className="metric-card flex items-start gap-3 px-4 py-3">
      <Chip tone={chipTone} dense>
        {chipLabel}
      </Chip>
      <div>
        <div className="text-body-sm text-on-surface">{title}</div>
        <div className="font-mono text-[0.6rem] uppercase tracking-[0.22em] text-on-surface-muted">
          {detail}
        </div>
      </div>
    </div>
  );
}
