import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, Copy, RefreshCw } from "lucide-react";
import { ExplorerSearchBar } from "@/components/explorer/SearchBar";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { useAppchainStats } from "@/hooks/useAppchainStats";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { useRecentBlocks } from "@/hooks/useRecentBlocks";
import { useRecentMoveTxs, type MoveTx } from "@/hooks/useRecentMoveTxs";
import { APPCHAIN, APPCHAIN_RPC_AVAILABLE } from "@/lib/initia";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/cn";

type TabKey = "blocks" | "txs";

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
  launch: "info",
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
  launch: "Launch",
  create_pool: "Pool",
  buy: "Buy",
  sell: "Sell",
  claim_fees: "Claim",
  comment: "Comment",
  graduated: "Graduated",
  mark_graduated: "Graduated",
  initialize: "Init",
  deploy: "Deploy",
  other: "Execute",
};

const MODULE_FUNCTIONS = [
  { tone: "muted" as const, label: "initialize" },
  { tone: "info" as const, label: "launch" },
  { tone: "muted" as const, label: "mark_graduated" },
  { tone: "muted" as const, label: "view · count" },
  { tone: "muted" as const, label: "view · info" },
];

export default function Explorer() {
  const network = useNetworkStatus(15_000);
  const stats = useAppchainStats(10_000);
  const blocks = useRecentBlocks(20, 15_000);
  const txs = useRecentMoveTxs(20, 10_000);
  const [tab, setTab] = useState<TabKey>("blocks");
  const [copied, setCopied] = useState(false);

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

  const copyAddr = async () => {
    await navigator.clipboard.writeText(APPCHAIN.deployedAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  const refresh = () => {
    if (tab === "blocks") blocks.refetch();
    else txs.refetch();
  };

  if (!APPCHAIN_RPC_AVAILABLE) {
    return (
      <div className="flex flex-col gap-4 pb-8">
        <Card padded="lg" className="max-w-2xl">
          <h1 className="text-[22px] font-semibold tracking-tight text-on-surface">
            Appchain explorer
          </h1>
          <p className="mt-3 text-[13px] leading-[1.55] text-on-surface-variant">
            Set <code className="font-mono text-[#60A5FA]">VITE_APPCHAIN_RPC</code> in your{" "}
            <code className="font-mono text-[#60A5FA]">.env.local</code> to point at a live rollup
            endpoint. The explorer reads blocks and Move transactions directly from the RPC.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 pb-8">
      {/* Status strip */}
      <section className="grid gap-3 md:grid-cols-4">
        <Card padded="md" className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10.5px] font-medium uppercase tracking-[0.08em] text-on-surface-muted">
              Block height
            </span>
            <Chip tone={live ? "success" : "muted"} dot>
              {live ? "Live" : "Sync"}
            </Chip>
          </div>
          <span className="font-mono text-[22px] font-medium tabular-nums tracking-tight text-on-surface">
            {network.data ? `#${formatNumber(network.data.blockHeight)}` : "—"}
          </span>
          <span className="font-mono text-[11px] text-[#52525B]">
            appchain · {APPCHAIN.chainId}
          </span>
        </Card>
        <Card padded="md" className="flex flex-col gap-1.5">
          <span className="text-[10.5px] font-medium uppercase tracking-[0.08em] text-on-surface-muted">
            Avg block time
          </span>
          <span className="font-mono text-[22px] font-medium tabular-nums tracking-tight text-on-surface">
            {secondsPerBlock ? `${secondsPerBlock.toFixed(2)}s` : "—"}
          </span>
          <span className="font-mono text-[11px] text-[#52525B]">
            target {APPCHAIN.blockTimeMs}ms
          </span>
        </Card>
        <Card padded="md" className="flex flex-col gap-1.5">
          <span className="text-[10.5px] font-medium uppercase tracking-[0.08em] text-on-surface-muted">
            Tokens launched
          </span>
          <span className="font-mono text-[22px] font-medium tabular-nums tracking-tight text-on-surface">
            {stats.data?.enabled ? formatNumber(stats.data.launchesOnChain) : "—"}
          </span>
          <span className="font-mono text-[11px] text-[#52525B]">factory::count</span>
        </Card>
        <Card padded="md" className="flex flex-col gap-1.5">
          <span className="text-[10.5px] font-medium uppercase tracking-[0.08em] text-on-surface-muted">
            Move txs
          </span>
          <span className="font-mono text-[22px] font-medium tabular-nums tracking-tight text-on-surface">
            {stats.data?.enabled ? formatNumber(stats.data.msgExecuteCount) : "—"}
          </span>
          <span className="font-mono text-[11px] text-[#52525B]">MsgExecute</span>
        </Card>
      </section>

      {/* Search */}
      <Card padded="md">
        <ExplorerSearchBar />
      </Card>

      {/* Deployed module */}
      <Card padded="md" className="flex flex-wrap items-center gap-3">
        <Chip tone="success" dot>
          Deployed
        </Chip>
        <span className="text-[11px] font-medium uppercase tracking-[0.06em] text-on-surface-muted">
          Module
        </span>
        <span className="font-mono text-[13px] font-medium text-on-surface">token_factory</span>
        <button
          type="button"
          onClick={copyAddr}
          className="inline-flex items-center gap-1.5 rounded-md bg-[#0F0F11] px-2 py-1 font-mono text-[11px] text-on-surface-variant hover:text-on-surface ghost-border"
        >
          <span className="max-w-[28ch] truncate">{APPCHAIN.deployedAddress}</span>
          <Copy className="h-3 w-3" />
        </button>
        {copied && (
          <span className="font-mono text-[11px] text-[#34D399]">copied</span>
        )}
        <div className="ml-auto flex flex-wrap gap-1.5">
          {MODULE_FUNCTIONS.map((fn) => (
            <Chip key={fn.label} tone={fn.tone}>
              {fn.label}
            </Chip>
          ))}
        </div>
      </Card>

      {/* Tabs */}
      <div className="flex items-center gap-4 border-b border-white/[0.05]">
        {(
          [
            { k: "blocks", label: "Recent blocks" },
            { k: "txs", label: "Move transactions" },
          ] as const
        ).map((t) => (
          <button
            key={t.k}
            type="button"
            onClick={() => setTab(t.k)}
            className={cn(
              "relative py-3 text-[12.5px] font-medium transition-colors",
              tab === t.k
                ? "text-on-surface"
                : "text-on-surface-muted hover:text-on-surface-variant",
            )}
          >
            {t.label}
            {tab === t.k && (
              <span className="absolute -bottom-px left-0 right-0 h-px bg-[#60A5FA]" />
            )}
          </button>
        ))}
        <button
          type="button"
          onClick={refresh}
          className="ml-auto mb-1.5 inline-flex h-7 items-center gap-1.5 rounded-md px-2.5 text-[11px] text-on-surface-variant hover:bg-white/[0.04] hover:text-on-surface"
        >
          <RefreshCw
            className={cn(
              "h-3 w-3",
              (tab === "blocks" ? blocks.isFetching : txs.isFetching) && "animate-spin",
            )}
          />
          Refresh
        </button>
      </div>

      {/* Blocks table */}
      {tab === "blocks" && (
        <Card padded="none" className="overflow-hidden">
          <div className="grid grid-cols-[130px_minmax(0,1fr)_100px_120px_auto] gap-4 border-b border-white/[0.06] px-4 py-2.5 text-[10.5px] font-medium uppercase tracking-[0.06em] text-[#52525B]">
            <span>Height</span>
            <span>Hash</span>
            <span className="text-right">Txs</span>
            <span className="text-right">Age</span>
            <span className="w-[24px]" />
          </div>
          {(blocks.data ?? []).length === 0 ? (
            <div className="px-4 py-8 text-center text-[12.5px] text-on-surface-muted">
              {blocks.isFetching ? "Fetching recent blocks…" : "No blocks yet."}
            </div>
          ) : (
            (blocks.data ?? []).map((b) => (
              <Link
                key={b.height}
                to={`/block/${b.height}`}
                className="grid grid-cols-[130px_minmax(0,1fr)_100px_120px_auto] items-center gap-4 border-b border-white/[0.04] px-4 py-2.5 transition-colors last:border-b-0 hover:bg-white/[0.02]"
              >
                <span className="font-mono text-[13px] tabular-nums text-[#60A5FA]">
                  #{b.height.toLocaleString()}
                </span>
                <span className="truncate font-mono text-[12px] text-on-surface-variant">
                  {shortHash(b.hash, 8)}
                </span>
                <span className="text-right font-mono text-[12px] tabular-nums text-on-surface-variant">
                  {b.numTxs} tx
                </span>
                <span className="text-right font-mono text-[11.5px] text-on-surface-muted">
                  {relativeTime(b.time)}
                </span>
                <ArrowUpRight className="h-3.5 w-3.5 text-[#52525B]" />
              </Link>
            ))
          )}
        </Card>
      )}

      {/* Txs table */}
      {tab === "txs" && (
        <Card padded="none" className="overflow-hidden">
          <div className="grid grid-cols-[100px_minmax(0,1fr)_120px_100px_80px_auto] gap-4 border-b border-white/[0.06] px-4 py-2.5 text-[10.5px] font-medium uppercase tracking-[0.06em] text-[#52525B]">
            <span>Action</span>
            <span>Tx hash</span>
            <span className="text-right">Height</span>
            <span className="text-right">Gas</span>
            <span className="text-right">Status</span>
            <span className="w-[24px]" />
          </div>
          {(txs.data ?? []).length === 0 ? (
            <div className="px-4 py-8 text-center text-[12.5px] text-on-surface-muted">
              {txs.isFetching
                ? "Fetching Move txs…"
                : "No Move transactions yet. Deploy a token from the Launchpad."}
            </div>
          ) : (
            (txs.data ?? []).map((t) => (
              <Link
                key={t.hash}
                to={`/tx/${t.hash}`}
                className="grid grid-cols-[100px_minmax(0,1fr)_120px_100px_80px_auto] items-center gap-4 border-b border-white/[0.04] px-4 py-2.5 transition-colors last:border-b-0 hover:bg-white/[0.02]"
              >
                <Chip tone={actionTone[t.action]}>{actionLabel[t.action]}</Chip>
                <span className="truncate font-mono text-[12.5px] text-on-surface">
                  0x{shortHash(t.hash, 10)}
                </span>
                <span className="text-right font-mono text-[12px] tabular-nums text-on-surface-variant">
                  #{formatNumber(t.height)}
                </span>
                <span className="text-right font-mono text-[12px] tabular-nums text-on-surface-muted">
                  {formatNumber(Number(t.gasUsed))}
                </span>
                <span
                  className={cn(
                    "text-right font-mono text-[11px] uppercase tracking-[0.04em]",
                    t.code === 0 ? "text-[#34D399]" : "text-[#FB7185]",
                  )}
                >
                  {t.code === 0 ? "ok" : `err ${t.code}`}
                </span>
                <ArrowUpRight className="h-3.5 w-3.5 text-[#52525B]" />
              </Link>
            ))
          )}
        </Card>
      )}
    </div>
  );
}
