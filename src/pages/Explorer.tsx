import { ArrowUpRight, Copy, RefreshCcw } from "lucide-react";
import { useMemo, useState } from "react";
import { ExplorerSearchBar } from "@/components/explorer/SearchBar";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { Stat } from "@/components/ui/Stat";
import { useAppchainStats } from "@/hooks/useAppchainStats";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { useRecentBlocks } from "@/hooks/useRecentBlocks";
import { useRecentMoveTxs, type MoveTx } from "@/hooks/useRecentMoveTxs";
import { APPCHAIN, APPCHAIN_RPC_AVAILABLE } from "@/lib/initia";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/cn";

function shortHash(s: string, chars = 6): string {
  if (!s) return "";
  return s.length > chars * 2 + 2 ? `${s.slice(0, chars)}…${s.slice(-chars)}` : s;
}

function relativeTime(iso: string): string {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 2_000) return "just now";
  if (diff < 60_000) return `${Math.round(diff / 1000)}s ago`;
  if (diff < 3_600_000) return `${Math.round(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.round(diff / 3_600_000)}h ago`;
  return `${Math.round(diff / 86_400_000)}d ago`;
}

const actionTone: Record<MoveTx["action"], "success" | "info" | "warning" | "glow" | "neutral" | "danger"> = {
  launch: "glow",
  create_pool: "info",
  buy: "success",
  sell: "danger",
  claim_fees: "success",
  comment: "info",
  graduated: "warning",
  mark_graduated: "warning",
  initialize: "info",
  deploy: "success",
  other: "neutral",
};

const actionLabel: Record<MoveTx["action"], string> = {
  launch: "launch",
  create_pool: "pool",
  buy: "buy",
  sell: "sell",
  claim_fees: "claim",
  comment: "comment",
  graduated: "graduated",
  mark_graduated: "graduated",
  initialize: "init",
  deploy: "deploy",
  other: "execute",
};

export default function Explorer() {
  const network = useNetworkStatus(3_000);
  const stats = useAppchainStats(10_000);
  const blocks = useRecentBlocks(15, 3_000);
  const txs = useRecentMoveTxs(20, 10_000);
  const [copied, setCopied] = useState<string | null>(null);

  const rpcBase = APPCHAIN.rpc;
  const live = network.data?.source === "appchain" && network.data?.healthy;

  const secondsPerBlock = useMemo(() => {
    const list = blocks.data ?? [];
    if (list.length < 2) return null;
    const first = new Date(list[0].time).getTime();
    const last = new Date(list[list.length - 1].time).getTime();
    const dh = list[0].height - list[list.length - 1].height;
    if (!dh || !first || !last) return null;
    return Math.abs(first - last) / dh / 1000;
  }, [blocks.data]);

  const copy = async (txt: string) => {
    await navigator.clipboard.writeText(txt);
    setCopied(txt);
    setTimeout(() => setCopied(null), 1200);
  };

  if (!APPCHAIN_RPC_AVAILABLE) {
    return (
      <div className="page-shell">
        <section className="max-w-2xl">
          <h1 className="text-[clamp(2rem,5vw,3.5rem)] font-editorial italic leading-[1.04] text-editorial-ink">
            Appchain explorer.
          </h1>
          <p className="mt-4 text-body-lg text-on-surface-variant">
            Set <code className="font-mono text-editorial">VITE_APPCHAIN_RPC</code> in your{" "}
            <code className="font-mono text-editorial">.env.local</code> to point at a live rollup
            endpoint. The explorer reads blocks and Move transactions directly from the RPC.
          </p>
        </section>
      </div>
    );
  }

  return (
    <div className="page-shell">
      <section className="page-hero px-6 py-8 md:px-8 md:py-9">
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px] xl:items-end">
          <div className="max-w-3xl">
            <div className="flex items-center gap-3 font-mono text-[0.62rem] uppercase tracking-[0.3em] text-editorial">
              <span>§ explorer</span>
              <span className="h-px flex-1 hairline" />
            </div>
            <h1 className="mt-3 text-[clamp(2.5rem,6vw,4.5rem)] leading-[0.98] text-editorial-ink">
              <span className="font-editorial italic text-editorial">{APPCHAIN.chainId}</span>{" "}
              <span className="font-display font-medium tracking-tight">explorer</span>
              <span className="text-secondary">.</span>
            </h1>
            <p className="mt-4 text-body-lg leading-[1.6] text-on-surface-variant">
              Live view of the Minitia.fun rollup. Blocks refresh every 3 seconds, Move transactions
              every 10 seconds. All data fetched directly from{" "}
              <a
                href={`${rpcBase}/status`}
                target="_blank"
                rel="noreferrer"
                className="font-mono text-secondary hover:text-editorial-ink"
              >
                {rpcBase}
              </a>
              .
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
            <div className="metric-card px-5 py-5">
              <span className="text-[0.62rem] font-mono uppercase tracking-[0.24em] text-on-surface-muted">
                chain status
              </span>
              <div className="mt-2 text-title-lg text-on-surface">
                {live ? "Live on appchain" : "Syncing"}
              </div>
              <div className="mt-1 font-mono text-[0.62rem] uppercase tracking-[0.2em] text-secondary">
                #{network.data ? formatNumber(network.data.blockHeight) : "—"}
              </div>
            </div>

            <div className="metric-card px-5 py-5">
              <span className="text-[0.62rem] font-mono uppercase tracking-[0.24em] text-on-surface-muted">
                avg block time
              </span>
              <div className="mt-2 font-editorial italic text-[2.2rem] leading-none text-editorial-ink">
                {secondsPerBlock ? `${secondsPerBlock.toFixed(2)}s` : "—"}
              </div>
              <div className="mt-1 font-mono text-[0.62rem] uppercase tracking-[0.2em] text-on-surface-muted">
                target {APPCHAIN.blockTimeMs}ms
              </div>
            </div>
          </div>
        </div>
      </section>

      <Card tier="base" padded="md" className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <span className="font-mono text-[0.62rem] uppercase tracking-[0.3em] text-editorial">
            § search
          </span>
          <span className="h-px flex-1 hairline" />
          <span className="font-mono text-[0.58rem] uppercase tracking-[0.2em] text-on-surface-muted">
            tx · block · address · ticker
          </span>
        </div>
        <ExplorerSearchBar />
      </Card>

      <section className="grid gap-4 md:grid-cols-4">
        <Card padded="md">
          <div className="flex items-center justify-between">
            <Stat
              label="Block height"
              value={network.data ? `#${formatNumber(network.data.blockHeight)}` : "—"}
              sub={live ? "Live · appchain" : "Syncing"}
              trend={live ? "up" : "flat"}
              emphasis="headline"
            />
          </div>
        </Card>
        <Card padded="md">
          <Stat
            label="Avg block time"
            value={secondsPerBlock ? `${secondsPerBlock.toFixed(2)}s` : "—"}
            sub={`Target ${APPCHAIN.blockTimeMs}ms`}
            emphasis="headline"
          />
        </Card>
        <Card padded="md">
          <Stat
            label="Tokens launched"
            value={stats.data?.enabled ? formatNumber(stats.data.launchesOnChain) : "—"}
            sub="token_factory registry"
            emphasis="headline"
          />
        </Card>
        <Card padded="md">
          <Stat
            label="Move txs"
            value={stats.data?.enabled ? formatNumber(stats.data.msgExecuteCount) : "—"}
            sub="/initia.move.v1.MsgExecute"
            emphasis="headline"
          />
        </Card>
      </section>

      <Card tier="base" padded="lg" className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <span className="font-mono text-[0.62rem] uppercase tracking-[0.24em] text-editorial">
              Deployed module
            </span>
            <Chip tone="success" dense>
              Live
            </Chip>
          </div>
          <span className="font-mono text-[0.62rem] uppercase tracking-[0.22em] text-on-surface-muted">
            Move VM · v1.1.11
          </span>
        </div>
        <div className="flex flex-wrap items-baseline gap-3">
          <span className="font-editorial italic text-headline-md text-editorial-ink">
            token_factory
          </span>
          <button
            type="button"
            onClick={() => copy(APPCHAIN.deployedAddress)}
            className="group inline-flex items-center gap-1.5 rounded-lg bg-white/[0.03] px-2.5 py-1 font-mono text-body-sm text-on-surface-variant hover:text-editorial-ink snappy"
          >
            <span className="truncate max-w-[60ch]">{APPCHAIN.deployedAddress}</span>
            <Copy className="h-3 w-3 opacity-60 group-hover:opacity-100" />
          </button>
          {copied === APPCHAIN.deployedAddress && (
            <span className="text-body-sm text-secondary">copied</span>
          )}
        </div>
        <div className="flex flex-wrap gap-2 text-[0.62rem] font-mono uppercase tracking-[0.22em]">
          <span className="rounded-full bg-white/[0.03] px-3 py-1 text-on-surface-muted">
            entry · initialize
          </span>
          <span className="rounded-full bg-secondary-container/60 px-3 py-1 text-secondary">
            entry · launch(registry_addr, ticker, name, description)
          </span>
          <span className="rounded-full bg-white/[0.03] px-3 py-1 text-on-surface-muted">
            entry · mark_graduated
          </span>
          <span className="rounded-full bg-white/[0.03] px-3 py-1 text-on-surface-muted">
            view · count
          </span>
          <span className="rounded-full bg-white/[0.03] px-3 py-1 text-on-surface-muted">
            view · info
          </span>
        </div>
      </Card>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)]">
        {/* Recent blocks */}
        <Card tier="base" padded="md" className="flex flex-col gap-4">
          <div className="flex items-end justify-between gap-3">
            <div className="flex items-end gap-3">
              <span className="font-mono text-[0.62rem] uppercase tracking-[0.3em] text-editorial">
                § blocks
              </span>
              <h2 className="text-headline-sm font-editorial italic text-editorial-ink">
                Recent blocks
              </h2>
            </div>
            <button
              type="button"
              onClick={() => blocks.refetch()}
              aria-label="Refresh"
              className="rounded-lg bg-white/[0.03] p-1.5 text-on-surface-variant hover:text-editorial-ink snappy"
            >
              <RefreshCcw className={cn("h-3.5 w-3.5", blocks.isFetching && "animate-spin")} />
            </button>
          </div>

          <div className="divide-y divide-editorial/10 rounded-xl surface-nested ghost-border overflow-hidden">
            {(blocks.data ?? []).slice(0, 15).map((b) => (
              <a
                key={b.height}
                href={`${rpcBase}/block?height=${b.height}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-3 px-3 py-2.5 snappy transition-colors hover:bg-white/[0.04]"
              >
                <span className="font-editorial italic text-title-md text-editorial">
                  #{b.height}
                </span>
                <span className="font-mono text-body-sm text-on-surface-variant truncate flex-1">
                  {shortHash(b.hash, 8)}
                </span>
                <span className="font-mono text-[0.62rem] uppercase tracking-[0.2em] text-on-surface-muted">
                  {b.numTxs} tx
                </span>
                <span className="font-mono text-body-sm text-on-surface-muted w-[6.5rem] text-right">
                  {relativeTime(b.time)}
                </span>
              </a>
            ))}
            {(blocks.data ?? []).length === 0 && !blocks.isFetching && (
              <div className="px-4 py-6 text-center text-body-sm text-on-surface-muted">
                No blocks yet.
              </div>
            )}
            {blocks.isFetching && (blocks.data ?? []).length === 0 && (
              <div className="px-4 py-6 text-center text-body-sm text-on-surface-muted">
                Fetching recent blocks…
              </div>
            )}
          </div>
        </Card>

        {/* Recent Move txs */}
        <Card tier="base" padded="md" className="flex flex-col gap-4">
          <div className="flex items-end justify-between gap-3">
            <div className="flex items-end gap-3">
              <span className="font-mono text-[0.62rem] uppercase tracking-[0.3em] text-editorial">
                § move txs
              </span>
              <h2 className="text-headline-sm font-editorial italic text-editorial-ink">
                Latest MsgExecute
              </h2>
            </div>
            <button
              type="button"
              onClick={() => txs.refetch()}
              aria-label="Refresh"
              className="rounded-lg bg-white/[0.03] p-1.5 text-on-surface-variant hover:text-editorial-ink snappy"
            >
              <RefreshCcw className={cn("h-3.5 w-3.5", txs.isFetching && "animate-spin")} />
            </button>
          </div>

          <div className="flex flex-col gap-2.5">
            {(txs.data ?? []).map((t) => (
              <div
                key={t.hash}
                className="flex flex-col gap-2 rounded-xl surface-nested ghost-border px-3 py-3"
              >
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-2">
                    <Chip tone={actionTone[t.action]} dense>
                      {actionLabel[t.action]}
                    </Chip>
                    <span className="font-mono text-[0.62rem] uppercase tracking-[0.2em] text-on-surface-muted">
                      height #{formatNumber(t.height)}
                    </span>
                    <span
                      className={cn(
                        "font-mono text-[0.62rem] uppercase tracking-[0.2em]",
                        t.code === 0 ? "text-secondary" : "text-error",
                      )}
                    >
                      {t.code === 0 ? "success" : `code ${t.code}`}
                    </span>
                  </div>
                  <span className="font-mono text-[0.62rem] uppercase tracking-[0.2em] text-on-surface-muted">
                    gas {formatNumber(Number(t.gasUsed))}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href={`${rpcBase}/tx?hash=0x${t.hash}`}
                    target="_blank"
                    rel="noreferrer"
                    className="group flex-1 truncate font-mono text-body-sm text-editorial-ink hover:text-editorial snappy"
                  >
                    0x{shortHash(t.hash, 10)}
                    <ArrowUpRight className="ml-1 inline h-3 w-3 opacity-60 group-hover:opacity-100" />
                  </a>
                  <button
                    type="button"
                    onClick={() => copy(t.hash)}
                    aria-label="Copy hash"
                    className="text-on-surface-muted hover:text-editorial-ink snappy"
                  >
                    <Copy className="h-3 w-3" />
                  </button>
                </div>
                {copied === t.hash && (
                  <span className="text-body-sm text-secondary">copied</span>
                )}
              </div>
            ))}
            {(txs.data ?? []).length === 0 && !txs.isFetching && (
              <div className="px-4 py-6 text-center text-body-sm text-on-surface-muted">
                No Move transactions yet. Deploy a token from the Launchpad.
              </div>
            )}
          </div>
        </Card>
      </section>

    </div>
  );
}
