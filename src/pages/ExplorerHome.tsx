import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, Copy, RefreshCcw } from "lucide-react";
import { ExplorerSearchBar } from "@/components/explorer/SearchBar";
import { Chip } from "@/components/ui/Chip";
import { useAppchainStats } from "@/hooks/useAppchainStats";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { useRecentBlocks } from "@/hooks/useRecentBlocks";
import { useRecentMoveTxs, type MoveTx } from "@/hooks/useRecentMoveTxs";
import { APPCHAIN, APPCHAIN_RPC_AVAILABLE } from "@/lib/initia";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/cn";

/**
 * Compact landing for the standalone explorer at explorer.minitia.fun.
 * Unlike the main-app Explorer page (which has its own marketing hero +
 * 4-card stat strip inside the AppShell topbar), this one assumes the
 * ExplorerShell header already handles branding, so the body is just
 * search + live feeds. Minimal chrome, maximum signal density.
 */
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

const actionTone: Record<
  MoveTx["action"],
  "success" | "info" | "warning" | "glow" | "neutral" | "danger"
> = {
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

export default function ExplorerHome() {
  const network = useNetworkStatus(15_000);
  const stats = useAppchainStats(20_000);
  const blocks = useRecentBlocks(20, 10_000);
  const txs = useRecentMoveTxs(20, 10_000);
  const [copied, setCopied] = useState<string | null>(null);

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
        <div className="rounded-2xl surface-card ghost-border p-6 md:p-8">
          <h1 className="font-editorial italic text-headline-md text-editorial-ink">
            Explorer offline.
          </h1>
          <p className="mt-2 text-body-md text-on-surface-variant">
            Set <code className="font-mono text-editorial">VITE_APPCHAIN_RPC</code> in{" "}
            <code className="font-mono text-editorial">.env.local</code> and reload.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Search */}
      <div className="rounded-2xl surface-card ghost-border p-4 md:p-5">
        <ExplorerSearchBar />
      </div>

      {/* Stat strip — four compact cells, one row */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCell
          label="height"
          value={network.data ? `#${formatNumber(network.data.blockHeight)}` : "—"}
          sub={live ? "live" : "syncing"}
          tone={live ? "secondary" : "muted"}
        />
        <StatCell
          label="avg block time"
          value={secondsPerBlock ? `${secondsPerBlock.toFixed(2)}s` : "—"}
          sub={`target ${APPCHAIN.blockTimeMs}ms`}
        />
        <StatCell
          label="tokens"
          value={stats.data?.enabled ? formatNumber(stats.data.launchesOnChain) : "—"}
          sub="factory::count"
        />
        <StatCell
          label="move txs"
          value={stats.data?.enabled ? formatNumber(stats.data.msgExecuteCount) : "—"}
          sub="MsgExecute + JSON"
        />
      </div>

      {/* Deployed module — one-liner */}
      <div className="flex flex-wrap items-center gap-3 rounded-2xl surface-card ghost-border px-4 py-3">
        <Chip tone="success" dense>
          live
        </Chip>
        <span className="font-mono text-[0.58rem] uppercase tracking-[0.24em] text-on-surface-muted">
          module addr
        </span>
        <button
          type="button"
          onClick={() => copy(APPCHAIN.deployedAddress)}
          className="group inline-flex items-center gap-1.5 rounded-md bg-white/[0.04] px-2 py-1 font-mono text-body-sm text-on-surface-variant hover:text-editorial-ink snappy"
          title="Copy address"
        >
          <span className="truncate max-w-[44ch]">{APPCHAIN.deployedAddress}</span>
          <Copy className="h-3 w-3 opacity-60 group-hover:opacity-100" />
        </button>
        {copied === APPCHAIN.deployedAddress && (
          <span className="font-mono text-[0.58rem] uppercase tracking-[0.22em] text-secondary">
            copied
          </span>
        )}
        <span className="ml-auto font-mono text-[0.58rem] uppercase tracking-[0.22em] text-on-surface-muted">
          {APPCHAIN.modules.join(" · ")}
        </span>
      </div>

      {/* Feeds */}
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)]">
        {/* Blocks */}
        <div className="flex flex-col gap-3 rounded-2xl surface-card ghost-border p-4">
          <FeedHeader title="Blocks" onRefresh={() => blocks.refetch()} spinning={blocks.isFetching} />
          <div className="divide-y divide-editorial/10 overflow-hidden rounded-lg surface-nested ghost-border">
            {(blocks.data ?? []).slice(0, 18).map((b) => (
              <Link
                key={b.height}
                to={`/block/${b.height}`}
                className="flex items-center gap-3 px-3 py-2 snappy transition-colors hover:bg-white/[0.04]"
              >
                <span className="font-mono text-body-sm tabular-nums text-editorial-ink">
                  #{formatNumber(b.height)}
                </span>
                <span className="truncate flex-1 font-mono text-[0.68rem] text-on-surface-muted">
                  {shortHash(b.hash, 6)}
                </span>
                <span
                  className={cn(
                    "font-mono text-[0.58rem] uppercase tracking-[0.22em] tabular-nums",
                    b.numTxs > 0 ? "text-secondary" : "text-on-surface-muted",
                  )}
                >
                  {b.numTxs}tx
                </span>
                <span className="w-[5.5rem] text-right font-mono text-[0.62rem] text-on-surface-muted">
                  {relativeTime(b.time)}
                </span>
              </Link>
            ))}
            {(blocks.data ?? []).length === 0 && (
              <div className="px-3 py-6 text-center font-mono text-[0.62rem] uppercase tracking-[0.22em] text-on-surface-muted">
                {blocks.isFetching ? "syncing blocks…" : "no blocks"}
              </div>
            )}
          </div>
        </div>

        {/* Txs */}
        <div className="flex flex-col gap-3 rounded-2xl surface-card ghost-border p-4">
          <FeedHeader
            title="Move transactions"
            onRefresh={() => txs.refetch()}
            spinning={txs.isFetching}
          />
          <div className="flex flex-col gap-1.5">
            {(txs.data ?? []).slice(0, 18).map((t) => (
              <Link
                key={t.hash}
                to={`/tx/${t.hash}`}
                className="group flex items-center gap-3 rounded-lg surface-nested ghost-border px-3 py-2 snappy transition-colors hover:bg-white/[0.04]"
              >
                <Chip tone={actionTone[t.action]} dense>
                  {actionLabel[t.action]}
                </Chip>
                <span className="truncate flex-1 font-mono text-body-sm text-on-surface">
                  0x{shortHash(t.hash, 6)}
                </span>
                <span className="font-mono text-[0.58rem] uppercase tracking-[0.22em] text-on-surface-muted">
                  #{formatNumber(t.height)}
                </span>
                <span
                  className={cn(
                    "font-mono text-[0.58rem] uppercase tracking-[0.22em]",
                    t.code === 0 ? "text-secondary" : "text-error",
                  )}
                >
                  {t.code === 0 ? "ok" : `err ${t.code}`}
                </span>
                <ArrowUpRight className="h-3 w-3 text-on-surface-muted transition-opacity opacity-0 group-hover:opacity-100" />
              </Link>
            ))}
            {(txs.data ?? []).length === 0 && (
              <div className="px-3 py-6 text-center font-mono text-[0.62rem] uppercase tracking-[0.22em] text-on-surface-muted">
                {txs.isFetching ? "fetching txs…" : "no move transactions yet"}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCell({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "secondary" | "muted";
}) {
  return (
    <div className="rounded-2xl surface-card ghost-border px-4 py-3.5">
      <div className="font-mono text-[0.56rem] uppercase tracking-[0.24em] text-on-surface-muted">
        {label}
      </div>
      <div className="mt-1 font-editorial italic text-[1.6rem] leading-none tabular-nums text-editorial-ink">
        {value}
      </div>
      {sub && (
        <div
          className={cn(
            "mt-1 font-mono text-[0.56rem] uppercase tracking-[0.22em]",
            tone === "secondary" ? "text-secondary" : "text-on-surface-muted",
          )}
        >
          {sub}
        </div>
      )}
    </div>
  );
}

function FeedHeader({
  title,
  onRefresh,
  spinning,
}: {
  title: string;
  onRefresh: () => void;
  spinning: boolean;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="font-mono text-[0.58rem] uppercase tracking-[0.28em] text-editorial">
        §
      </span>
      <h2 className="font-editorial italic text-title-md text-editorial-ink">{title}</h2>
      <span className="h-px flex-1 hairline" />
      <button
        type="button"
        onClick={onRefresh}
        aria-label="Refresh"
        className="rounded-md bg-white/[0.04] p-1.5 text-on-surface-muted snappy hover:text-editorial-ink"
      >
        <RefreshCcw className={cn("h-3 w-3", spinning && "animate-spin")} />
      </button>
    </div>
  );
}
