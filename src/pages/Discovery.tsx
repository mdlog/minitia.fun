import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, Rocket } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { Delta } from "@/components/ui/Delta";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Segmented } from "@/components/ui/Segmented";
import { Stat } from "@/components/ui/Stat";
import { useAppchainStats } from "@/hooks/useAppchainStats";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import {
  useAllLaunchedTokens,
  graduationProgress,
  type LaunchedToken,
} from "@/hooks/useAllLaunchedTokens";
import { formatNumber } from "@/lib/format";

type FilterKey = "All" | "Trading" | "Graduated" | "No pool";

const FILTERS: Array<{ value: FilterKey; label: string }> = [
  { value: "All", label: "All" },
  { value: "Trading", label: "Trading" },
  { value: "Graduated", label: "Graduated" },
  { value: "No pool", label: "No pool" },
];

function formatInitFromUmin(umin: bigint, digits = 2): string {
  if (umin === 0n) return "0";
  const whole = umin / 1_000_000n;
  const frac = umin % 1_000_000n;
  const fracStr = frac.toString().padStart(6, "0").slice(0, digits);
  return `${whole.toLocaleString("en-US")}${digits > 0 ? "." + fracStr : ""}`;
}

function tokenStatusChip(t: LaunchedToken) {
  if (!t.poolExists) return <Chip tone="warning" dot>No pool</Chip>;
  if (t.graduated) return <Chip tone="success" dot>Graduated</Chip>;
  return <Chip tone="neutral" dot>Active</Chip>;
}

export default function Discovery() {
  const network = useNetworkStatus();
  const stats = useAppchainStats();
  const tokens = useAllLaunchedTokens(50);
  const [filter, setFilter] = useState<FilterKey>("All");

  const liveOnRollup = network.data?.source === "appchain" && network.data?.healthy;

  const filtered = useMemo(() => {
    const list = tokens.data ?? [];
    if (filter === "All") return list;
    if (filter === "Graduated") return list.filter((t) => t.graduated);
    if (filter === "No pool") return list.filter((t) => !t.poolExists);
    return list.filter((t) => t.poolExists && !t.graduated);
  }, [tokens.data, filter]);

  return (
    <div className="flex flex-col gap-6 pb-8">
      {/* Hero + metrics */}
      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Card padded="lg" className="flex flex-col justify-between gap-6 overflow-hidden">
          <div className="flex max-w-xl flex-col gap-3">
            <Chip tone={liveOnRollup ? "success" : "info"} dot>
              {liveOnRollup ? "Appchain healthy" : "Protocol stable"}
            </Chip>
            <h1 className="text-[30px] font-semibold leading-[1.1] tracking-tight text-on-surface">
              Launch anything. <span className="text-on-surface-muted">Graduate fast.</span>
            </h1>
            <p className="text-[13.5px] leading-[1.55] text-on-surface-variant">
              A sovereign launchpad on Initia. Deploy a token, trade on-curve, then promote to its
              own appchain — in a single cockpit.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button asChild variant="primary" leading={<Rocket className="h-3.5 w-3.5" />}>
              <Link to="/launchpad">Launch token</Link>
            </Button>
            <Button asChild variant="outline" trailing={<ArrowUpRight className="h-3.5 w-3.5" />}>
              <Link to="/trade/MOVE">Open market</Link>
            </Button>
          </div>
        </Card>

        <Card padded="md" className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-on-surface-variant">Protocol metrics</span>
            <Chip tone="muted">Live</Chip>
          </div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-4">
            <Stat
              label="Chain"
              value={
                <span className="text-[13px]">{network.data?.chainId ?? "—"}</span>
              }
              tone="info"
            />
            <Stat
              label="Block"
              value={network.data?.blockHeight ? `#${formatNumber(network.data.blockHeight)}` : "—"}
            />
            <Stat
              label="Launched"
              value={stats.data?.enabled ? formatNumber(stats.data.launchesOnChain) : "—"}
              unit="total"
              tone="success"
            />
            <Stat
              label="Move txs"
              value={stats.data?.enabled ? formatNumber(stats.data.msgExecuteCount) : "—"}
            />
          </div>
        </Card>
      </section>

      {/* Trending table */}
      <section className="flex flex-col gap-3">
        <SectionHeader
          title="Launched on Minitia.fun"
          description="Tokens ranked by recent on-curve activity."
          action={
            <div className="flex items-center gap-2">
              <Segmented value={filter} onChange={setFilter} options={FILTERS} />
              <span className="font-mono text-[11px] text-on-surface-muted">
                {tokens.data?.length ?? 0} tokens
              </span>
            </div>
          }
        />

        {tokens.isLoading ? (
          <Card padded="lg" className="text-center">
            <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-on-surface-variant">
              Scanning rollup for launches…
            </span>
          </Card>
        ) : filtered.length === 0 ? (
          <Card padded="lg" className="flex flex-col items-center gap-3 text-center">
            <span className="text-[15px] font-semibold text-on-surface">
              {tokens.data?.length === 0 ? "No tokens launched yet" : "Nothing matches this filter"}
            </span>
            <span className="text-[12.5px] text-on-surface-variant">
              {tokens.data?.length === 0
                ? "Be the first to seed a ticker on the curve."
                : "Try another filter, or launch something new."}
            </span>
            <Button asChild variant="primary" size="sm" leading={<Rocket className="h-3.5 w-3.5" />}>
              <Link to="/launchpad">Launch a token</Link>
            </Button>
          </Card>
        ) : (
          <Card padded="none" className="overflow-hidden">
            <div className="grid grid-cols-[minmax(180px,1.5fr)_1fr_1fr_1fr_1.2fr_0.8fr_auto] gap-4 border-b border-white/[0.06] px-4 py-2.5 text-[10.5px] font-medium uppercase tracking-[0.06em] text-[#52525B]">
              <span>Token</span>
              <span className="text-right">Liq (INIT)</span>
              <span className="text-right">Trades</span>
              <span className="text-right">Volume</span>
              <span>Graduation</span>
              <span>Status</span>
              <span className="w-[60px]" />
            </div>
            {filtered.map((t, i) => {
              const gradPct = graduationProgress(t.initReserve);
              const href = t.graduated ? `/graduation/${t.ticker}` : `/trade/${t.ticker}`;
              return (
                <Link
                  key={t.ticker}
                  to={href}
                  className="grid grid-cols-[minmax(180px,1.5fr)_1fr_1fr_1fr_1.2fr_0.8fr_auto] items-center gap-4 border-b border-white/[0.04] px-4 py-3 transition-colors last:border-b-0 hover:bg-white/[0.02]"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="w-5 font-mono text-[11px] tabular-nums text-[#52525B]">
                      {String(t.launchIndex || i + 1).padStart(2, "0")}
                    </span>
                    <Avatar symbol={t.ticker} size="sm" src={t.imageUri} />
                    <div className="flex min-w-0 flex-col">
                      <span className="truncate text-[13px] font-medium text-on-surface">
                        {t.name}
                      </span>
                      <span className="font-mono text-[11px] text-on-surface-muted">
                        ${t.ticker}
                      </span>
                    </div>
                  </div>
                  <span className="text-right font-mono text-[13px] tabular-nums text-on-surface">
                    {formatInitFromUmin(t.initReserve, 2)}
                  </span>
                  <span className="text-right font-mono text-[13px] tabular-nums text-on-surface-variant">
                    {formatNumber(t.tradeCount)}
                  </span>
                  <span className="text-right font-mono text-[13px] tabular-nums text-on-surface-variant">
                    {t.tradeCount > 0 ? <Delta value={0} /> : "—"}
                  </span>
                  <div className="flex items-center gap-2">
                    <ProgressBar
                      value={gradPct}
                      tone={t.graduated ? "secondary" : "primary"}
                      size="sm"
                      className="max-w-[120px] flex-1"
                    />
                    <span className="w-10 text-right font-mono text-[11px] tabular-nums text-on-surface-muted">
                      {gradPct.toFixed(0)}%
                    </span>
                  </div>
                  <div>{tokenStatusChip(t)}</div>
                  <Button
                    variant="neutral"
                    size="xs"
                    trailing={<ArrowUpRight className="h-3 w-3" />}
                  >
                    {t.graduated ? "View" : "Trade"}
                  </Button>
                </Link>
              );
            })}
          </Card>
        )}
      </section>


    </div>
  );
}
