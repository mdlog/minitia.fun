import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowRight,
  CheckCircle2,
  Circle,
  ExternalLink,
  Flame,
  GraduationCap,
  Loader2,
  Lock,
  Rocket,
  Trophy,
} from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Stat } from "@/components/ui/Stat";
import { useInitiaAccount } from "@/hooks/useInitiaAccount";
import { useAllLaunchedTokens, graduationProgress } from "@/hooks/useAllLaunchedTokens";
import { useClaimFeesAction } from "@/hooks/useClaimFeesAction";
import { useGraduationEvent } from "@/hooks/useGraduationEvent";
import { useHolderLeaderboard } from "@/hooks/useHolderLeaderboard";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { usePoolState } from "@/hooks/usePoolState";
import {
  usePromotionStage,
  useRecordRollupAction,
  useStagePromotionAction,
} from "@/hooks/usePromotionStage";
import { APPCHAIN } from "@/lib/initia";
import { cn } from "@/lib/cn";

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

  if (pool.isLoading || tokens.isLoading) {
    return (
      <div className="flex flex-col gap-4 pb-8">
        <Card padded="lg" className="flex items-center justify-center gap-3">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-on-surface-variant">
            Loading ${ticker}…
          </span>
        </Card>
      </div>
    );
  }

  if (!poolExists) {
    return (
      <div className="flex flex-col gap-4 pb-8">
        <Card padded="lg" className="flex flex-col items-center gap-3 text-center">
          <span className="text-[15px] font-semibold text-on-surface">
            ${ticker} has no bonding-curve pool
          </span>
          <p className="max-w-xl text-[12.5px] text-on-surface-variant">
            Either the ticker was never launched or its pool was never opened. Graduation only
            applies to tokens that traded on a curve.
          </p>
          <Button asChild variant="neutral" size="sm" trailing={<ArrowRight className="h-3.5 w-3.5" />}>
            <Link to={`/trade/${ticker}`}>Open trade page</Link>
          </Button>
        </Card>
      </div>
    );
  }

  if (!isGraduated) {
    return (
      <div className="flex flex-col gap-4 pb-8">
        <Card padded="lg" className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <Avatar symbol={ticker} size="lg" />
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline gap-3">
                <h1 className="text-[24px] font-semibold tracking-tight text-on-surface">
                  ${ticker}
                </h1>
                <Chip tone="info" dot>
                  Not graduated yet
                </Chip>
              </div>
              <p className="mt-1 text-[12.5px] text-on-surface-variant">
                Pool still trading. Graduation triggers automatically when reserve passes 10 MIN.
              </p>
            </div>
          </div>
          <div className="flex items-center justify-between text-[12px]">
            <span className="text-[10.5px] font-medium uppercase tracking-[0.08em] text-on-surface-muted">
              progress
            </span>
            <span className="font-mono tabular-nums text-on-surface">
              {progressPct.toFixed(1)}% · {formatMin(pool.data?.initReserve ?? 0n, 2)} / 10 MIN
            </span>
          </div>
          <ProgressBar value={progressPct} tone="primary" size="md" />
          <Button asChild variant="primary" size="md" leading={<Rocket className="h-3.5 w-3.5" />}>
            <Link to={`/trade/${ticker}`}>Trade to push graduation</Link>
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 pb-8">
      {/* Hero */}
      <Card padded="lg">
        <div className="flex flex-wrap items-center justify-between gap-5">
          <div className="flex max-w-xl flex-col gap-3">
            <Chip tone="success" dot>
              <GraduationCap className="h-3 w-3" /> Curve sealed · graduated
            </Chip>
            <h1 className="text-[28px] font-semibold leading-[1.15] tracking-tight text-on-surface">
              ${ticker} has graduated.
            </h1>
            <p className="text-[13px] leading-[1.55] text-on-surface-variant">
              {tokenMeta && (
                <>
                  <span className="text-on-surface">{tokenMeta.name}</span> · launched by{" "}
                  <Link
                    to={`/u/${tokenMeta.creator}`}
                    className="font-mono text-on-surface-variant hover:text-on-surface"
                  >
                    {shortAddr(tokenMeta.creator)}
                  </Link>
                  {" · "}
                </>
              )}
              Liquidity migrated to InitiaDEX. Ready to promote into a sovereign L2 appchain.
            </p>
            {event.data && (
              <div className="flex flex-wrap items-center gap-2 text-[11px]">
                <span className="font-mono text-[#34D399]">
                  sealed {blocksAgo(event.data.blockHeight, latestHeight)}
                </span>
                <span className="text-on-surface-muted">·</span>
                <a
                  href={`${APPCHAIN.rpc}/tx?hash=0x${event.data.txHash}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 font-mono text-on-surface-muted hover:text-on-surface"
                >
                  #{event.data.blockHeight} <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            )}
          </div>
          <div className="grid grid-cols-3 gap-8 pr-2">
            <Stat
              label="Raised"
              value={formatMin(pool.data?.initReserve ?? 0n, 2)}
              unit="MIN"
              tone="info"
            />
            <Stat
              label="Holders"
              value={(holders.data?.length ?? 0).toLocaleString()}
            />
            <Stat
              label="Supply"
              value={Number(pool.data?.tokenSupply ?? 0n).toLocaleString()}
              unit={`$${ticker}`}
              tone="success"
            />
          </div>
        </div>
      </Card>

      {/* Creator earnings */}
      <Card padded="lg">
        <SectionHeader
          eyebrow="Creator"
          title="Unclaimed trading fees"
          description={`${pool.data?.tradeCount ?? 0} trades · 0.5% fee/trade`}
          action={
            isCreator ? (
              <Button
                variant="primary"
                size="md"
                leading={
                  isClaiming ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Flame className="h-3.5 w-3.5" />
                  )
                }
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
              <span className="text-[11px] font-medium text-on-surface-muted">
                only creator can claim
              </span>
            )
          }
        />
        <div className="mt-4 flex items-baseline gap-2">
          <span className="font-mono text-[32px] font-medium tabular-nums text-on-surface">
            {formatMin(unclaimedFees, 4)}
          </span>
          <span className="font-mono text-[13px] text-on-surface-muted">MIN</span>
        </div>
      </Card>

      {/* Deploy templates */}
      <section className="flex flex-col gap-3">
        <SectionHeader
          title="Deploy your appchain"
          description="Choose a runtime template. Your token becomes native to a sovereign L2."
        />
        <div className="grid gap-4 md:grid-cols-2">
          {[
            {
              k: "minimove",
              t: "MiniMove",
              tag: "Move VM",
              desc: "Move VM's resource-oriented model — safer by default, optimized for high-throughput DeFi.",
              features: ["Native Move contracts", "Resource-safe by default", "~120ms block time"],
            },
            {
              k: "minievm",
              t: "MiniEVM",
              tag: "EVM compatible",
              desc: "Port Solidity contracts and Ethereum tooling directly. Deploy Hardhat/Foundry projects unchanged.",
              features: ["Solidity 0.8.x support", "EIP-1559 fee market", "Metamask-compatible"],
            },
          ].map((tpl) => (
            <Card key={tpl.k} padded="md" interactive className="flex flex-col gap-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-md bg-white/[0.04] text-[#60A5FA]">
                    <Rocket className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-[15px] font-semibold text-on-surface">{tpl.t}</div>
                    <div className="font-mono text-[11px] text-on-surface-muted">{tpl.tag}</div>
                  </div>
                </div>
                <Chip tone="muted">Template</Chip>
              </div>
              <p className="text-[12.5px] leading-[1.6] text-on-surface-variant">{tpl.desc}</p>
              <ul className="flex flex-col gap-1.5">
                {tpl.features.map((f) => (
                  <li
                    key={f}
                    className="flex items-center gap-2 text-[12px] text-on-surface-variant"
                  >
                    <CheckCircle2 className="h-3 w-3 text-[#34D399]" />
                    {f}
                  </li>
                ))}
              </ul>
              <Button
                variant="primary"
                size="md"
                fullWidth
                leading={<Rocket className="h-3.5 w-3.5" />}
              >
                Deploy with {tpl.t}
              </Button>
            </Card>
          ))}
        </div>
      </section>

      {/* Top holders (locked) */}
      <Card padded="lg" className="flex flex-col gap-4">
        <SectionHeader
          title="Holders · locked"
          description="All sells blocked post-graduation until migration completes."
          action={
            <Chip tone="muted" leading={<Lock className="h-3 w-3" />}>
              Sells blocked
            </Chip>
          }
        />
        {holders.isLoading ? (
          <div className="py-6 text-center text-[11.5px] text-on-surface-muted">
            Aggregating balances…
          </div>
        ) : !holders.data || holders.data.length === 0 ? (
          <div className="py-6 text-center text-[12.5px] text-on-surface-muted">
            No holders recorded for this ticker.
          </div>
        ) : (
          <div className="flex flex-col divide-y divide-white/[0.05]">
            {holders.data.map((h, i) => (
              <Link
                key={h.address}
                to={`/u/${h.address}`}
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
                    {h.trades} trade{h.trades === 1 ? "" : "s"} · {formatMin(h.bought, 2)} MIN in
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-mono text-[12.5px] tabular-nums text-on-surface">
                    {Number(h.balance).toLocaleString()}
                  </div>
                  <div className="font-mono text-[10.5px] text-on-surface-muted">${ticker}</div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </Card>

      {/* Appchain promotion */}
      <Card padded="lg" className="flex flex-col gap-4">
        <SectionHeader
          title="Appchain promotion"
          description="Stage, spawn, and record the rollup for this graduated ticker."
        />

        {!promotion.data?.exists && (
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <p className="max-w-2xl text-[12.5px] leading-[1.6] text-on-surface-variant">
              Stage this graduation for rollup spawn. Emits{" "}
              <code className="font-mono text-on-surface">
                liquidity_migrator::PromotionStaged
              </code>
              — the promoter daemon picks it up and spawns{" "}
              <span className="text-on-surface">{ticker.toLowerCase()}-fun-1</span>.
            </p>
            {isCreator ? (
              <Button
                variant="primary"
                size="md"
                leading={
                  isStaging ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Rocket className="h-3.5 w-3.5" />
                  )
                }
                disabled={isStaging}
                onClick={async () => {
                  const ok = await stagePromotion(ticker);
                  if (ok) setTimeout(() => promotion.refetch(), 1500);
                }}
              >
                {isStaging ? "Staging…" : "Stage promotion"}
              </Button>
            ) : (
              <span className="text-[11px] font-medium text-on-surface-muted">
                only pool creator can stage
              </span>
            )}
          </div>
        )}

        {promotion.data?.exists && promotion.data.status === 0 && (
          <div className="flex flex-col gap-3 rounded-lg bg-[#F59E0B]/10 p-4 ghost-border">
            <div className="flex items-center gap-2 text-[#FBBF24]">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              <span className="text-[11px] font-medium uppercase tracking-[0.08em]">
                Staged · waiting for promoter daemon
              </span>
            </div>
            <p className="text-[12px] leading-[1.6] text-on-surface-variant">
              Event on-chain. Promoter will generate{" "}
              <code className="font-mono text-on-surface">
                rollup-{ticker.toLowerCase()}.json
              </code>{" "}
              and run <code className="font-mono text-on-surface">weave rollup launch</code>.
            </p>
            <div className="grid gap-2 font-mono text-[10.5px] md:grid-cols-3">
              <span>
                <span className="text-on-surface-muted">final_reserve</span>{" "}
                <span className="text-on-surface">
                  {formatMin(promotion.data.finalReserve, 4)} MIN
                </span>
              </span>
              <span>
                <span className="text-on-surface-muted">final_supply</span>{" "}
                <span className="text-on-surface">
                  {Number(promotion.data.finalSupply).toLocaleString()}
                </span>
              </span>
              <span>
                <span className="text-on-surface-muted">chain_id</span>{" "}
                <span className="text-on-surface">{ticker.toLowerCase()}-fun-1</span>
              </span>
            </div>

            {isCreator && (
              <div className="mt-2 border-t border-white/[0.05] pt-3">
                {!recordOpen ? (
                  <button
                    type="button"
                    onClick={() => setRecordOpen(true)}
                    className="inline-flex items-center gap-1.5 rounded-md bg-[#F59E0B]/15 px-3 py-1.5 font-mono text-[11px] text-[#FBBF24] hover:bg-[#F59E0B]/20"
                  >
                    Rollup ready? Record it <ArrowRight className="h-3 w-3" />
                  </button>
                ) : (
                  <div className="flex flex-col gap-2">
                    <RecordField label="chain_id" value={recordChainId} onChange={setRecordChainId} placeholder="spx-fun-1" />
                    <RecordField label="rollup_rpc" value={recordRpc} onChange={setRecordRpc} placeholder="http://localhost:26657" />
                    <RecordField label={'first_block_tx (or "genesis")'} value={recordFirstTx} onChange={setRecordFirstTx} placeholder="genesis" />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="primary"
                        leading={
                          isRecording ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Rocket className="h-3 w-3" />
                          )
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
                      <Button
                        size="sm"
                        variant="neutral"
                        onClick={() => setRecordOpen(false)}
                        disabled={isRecording}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {promotion.data?.exists && promotion.data.status === 1 && (
          <div className="flex flex-col gap-3 rounded-lg bg-[#10B981]/10 p-4 ghost-border">
            <div className="flex items-center gap-2 text-[#34D399]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#10B981] animate-pulse" />
              <span className="text-[11px] font-medium uppercase tracking-[0.08em]">
                Appchain live
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-[10.5px] font-medium uppercase tracking-[0.08em] text-on-surface-muted">
                chain_id
              </span>
              <span className="font-mono text-[14px] text-on-surface">
                {promotion.data.rollupChainId}
              </span>
            </div>
            {promotion.data.rollupRpc && (
              <a
                href={promotion.data.rollupRpc}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 break-all font-mono text-[12px] text-secondary hover:text-on-surface"
              >
                {promotion.data.rollupRpc} <ExternalLink className="h-3 w-3 shrink-0" />
              </a>
            )}
          </div>
        )}

        <div className="grid gap-3 md:grid-cols-2">
          <PromotionItem done title="Curve frozen" detail="buy/sell reject with E_GRADUATED" />
          <PromotionItem done title="Reserve custodied" detail="real umin in vault object" />
          <PromotionItem
            done={Boolean(promotion.data?.exists)}
            title="Promotion staged"
            detail="liquidity_migrator::PromotionStaged emitted"
          />
          <PromotionItem
            done={promotion.data?.status === 1}
            title="Rollup live"
            detail="weave rollup launch + record_rollup"
          />
        </div>
      </Card>
    </div>
  );
}

function RecordField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[10.5px] font-medium uppercase tracking-[0.08em] text-on-surface-muted">
        {label}
      </span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="rounded-md bg-[#0A0A0C] px-3 py-1.5 font-mono text-[12.5px] text-on-surface outline-none ghost-border focus:ring-1 focus:ring-primary/50"
      />
    </label>
  );
}

function PromotionItem({
  done,
  title,
  detail,
}: {
  done?: boolean;
  title: string;
  detail: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-lg bg-[#0F0F11] p-3 ghost-border">
      {done ? (
        <CheckCircle2 className="h-4 w-4 shrink-0 text-[#34D399]" />
      ) : (
        <Circle className="h-4 w-4 shrink-0 text-on-surface-muted" />
      )}
      <div>
        <div className="text-[13px] font-medium text-on-surface">{title}</div>
        <div className="text-[11px] text-on-surface-muted">{detail}</div>
      </div>
    </div>
  );
}
