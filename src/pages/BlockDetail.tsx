import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, Check, Copy, ExternalLink } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { APPCHAIN } from "@/lib/initia";
import { formatNumber } from "@/lib/format";
import { useBlockDetail } from "@/hooks/useBlockDetail";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";

function shortHash(s: string, chars = 8): string {
  if (!s) return "";
  return s.length > chars * 2 + 2 ? `${s.slice(0, chars)}…${s.slice(-chars)}` : s;
}

function relativeTime(iso: string): string {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 2_000) return "just now";
  if (diff < 60_000) return `${Math.round(diff / 1000)}s ago`;
  if (diff < 3_600_000) return `${Math.round(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.round(diff / 3_600_000)}h ago`;
  return `${Math.round(diff / 86_400_000)}d ago`;
}

function formatAbsoluteTime(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toISOString().replace("T", " ").replace(/\.\d+Z$/, " UTC");
}

function CopyButton({ value, label }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 1200);
      }}
      className="inline-flex items-center gap-1 rounded bg-white/[0.04] px-1.5 py-0.5 font-mono text-[0.6rem] uppercase tracking-[0.18em] text-on-surface-variant hover:text-editorial-ink snappy"
      aria-label={label ?? "Copy"}
    >
      {copied ? <Check className="h-3 w-3 text-secondary" /> : <Copy className="h-3 w-3" />}
      {copied ? "copied" : label ?? "copy"}
    </button>
  );
}

function shortMessageType(action: string): string {
  if (!action) return "—";
  const parts = action.split(".");
  const last = parts[parts.length - 1] || action;
  return last.replace(/^Msg/, "");
}

export default function BlockDetail() {
  const { height: rawHeight = "" } = useParams<{ height: string }>();
  const height = useMemo(() => {
    const n = Number(rawHeight);
    return Number.isInteger(n) && n > 0 ? n : 0;
  }, [rawHeight]);

  const { data: block, error, isFetching } = useBlockDetail(height);
  const network = useNetworkStatus(15_000);
  const latestHeight = network.data?.blockHeight ?? 0;
  const hasNext = latestHeight > height;

  if (!height) {
    return (
      <div className="page-shell">
        <section className="max-w-2xl">
          <Link
            to="/explorer"
            className="mb-6 inline-flex items-center gap-2 text-body-sm text-on-surface-variant hover:text-editorial-ink"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> back to explorer
          </Link>
          <h1 className="text-headline-md font-editorial italic text-editorial-ink">
            Invalid block height.
          </h1>
          <p className="mt-3 text-body-lg text-on-surface-variant">
            Expected a positive integer. Got{" "}
            <code className="font-mono text-editorial">{rawHeight || "(empty)"}</code>.
          </p>
        </section>
      </div>
    );
  }

  return (
    <div className="page-shell">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          to="/explorer"
          className="inline-flex items-center gap-2 text-body-sm text-on-surface-variant hover:text-editorial-ink"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> back to explorer
        </Link>
        <div className="flex items-center gap-2">
          {height > 1 && (
            <Link
              to={`/block/${height - 1}`}
              className="inline-flex items-center gap-1 rounded-lg bg-white/[0.04] px-3 py-1.5 font-mono text-[0.62rem] uppercase tracking-[0.22em] text-on-surface-variant hover:text-editorial-ink snappy"
            >
              <ArrowLeft className="h-3 w-3" /> prev
            </Link>
          )}
          {hasNext && (
            <Link
              to={`/block/${height + 1}`}
              className="inline-flex items-center gap-1 rounded-lg bg-white/[0.04] px-3 py-1.5 font-mono text-[0.62rem] uppercase tracking-[0.22em] text-on-surface-variant hover:text-editorial-ink snappy"
            >
              next <ArrowRight className="h-3 w-3" />
            </Link>
          )}
        </div>
      </div>

      <section className="page-hero px-6 py-8 md:px-8 md:py-9">
        <div className="flex items-center gap-3 font-mono text-[0.62rem] uppercase tracking-[0.3em] text-editorial">
          <span>§ block</span>
          <span className="h-px flex-1 hairline" />
          {block ? (
            <Chip tone="success" dense>
              <Check className="h-3 w-3" /> finalized
            </Chip>
          ) : (
            <Chip tone="neutral" dense>
              {isFetching ? "loading…" : "—"}
            </Chip>
          )}
        </div>

        <h1 className="mt-3 text-[clamp(2rem,5vw,3.5rem)] leading-[1.04]">
          <span className="font-editorial italic text-editorial">#{formatNumber(height)}</span>
          <span className="text-secondary">.</span>
        </h1>

        {block && (
          <div className="mt-3 flex flex-wrap items-center gap-3 font-mono text-body-sm text-on-surface-variant">
            <span className="break-all">{block.hash}</span>
            {block.hash && <CopyButton value={block.hash} label="copy hash" />}
            <a
              href={`${APPCHAIN.rpc}/block?height=${height}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-on-surface-muted hover:text-editorial-ink"
            >
              raw RPC <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        )}
      </section>

      {error && (
        <Card tier="base" padded="lg">
          <div className="flex flex-col gap-2">
            <Chip tone="danger" dense>
              error
            </Chip>
            <p className="font-mono text-body-sm text-error">
              {(error as Error).message || "failed to load block"}
            </p>
            <p className="text-body-sm text-on-surface-variant">
              Height may not yet be produced or the RPC may be unreachable.
            </p>
          </div>
        </Card>
      )}

      {block && (
        <>
          <section className="grid gap-4 md:grid-cols-4">
            <Card padded="md">
              <span className="text-[0.62rem] font-mono uppercase tracking-[0.24em] text-on-surface-muted">
                Timestamp
              </span>
              <div className="mt-2 text-title-md text-on-surface">
                {relativeTime(block.time) || "—"}
              </div>
              <div className="mt-1 font-mono text-[0.62rem] uppercase tracking-[0.18em] text-on-surface-muted">
                {formatAbsoluteTime(block.time)}
              </div>
            </Card>

            <Card padded="md">
              <span className="text-[0.62rem] font-mono uppercase tracking-[0.24em] text-on-surface-muted">
                Transactions
              </span>
              <div className="mt-2 font-editorial italic text-[2rem] leading-none text-editorial-ink">
                {block.numTxs}
              </div>
              <div className="mt-1 font-mono text-[0.62rem] uppercase tracking-[0.2em] text-on-surface-muted">
                msgs in block
              </div>
            </Card>

            <Card padded="md">
              <span className="text-[0.62rem] font-mono uppercase tracking-[0.24em] text-on-surface-muted">
                Chain ID
              </span>
              <div className="mt-2 text-title-md text-on-surface break-all">
                {block.chainId || "—"}
              </div>
              <div className="mt-1 font-mono text-[0.62rem] uppercase tracking-[0.2em] text-on-surface-muted">
                network
              </div>
            </Card>

            <Card padded="md">
              <span className="text-[0.62rem] font-mono uppercase tracking-[0.24em] text-on-surface-muted">
                Proposer
              </span>
              <div className="mt-2 font-mono text-body-sm text-on-surface break-all">
                {shortHash(block.proposerAddress, 6)}
              </div>
              <div className="mt-1 font-mono text-[0.62rem] uppercase tracking-[0.2em] text-on-surface-muted">
                validator addr
              </div>
            </Card>
          </section>

          <Card tier="base" padded="lg" className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <span className="font-mono text-[0.62rem] uppercase tracking-[0.3em] text-editorial">
                § hashes
              </span>
              <span className="h-px flex-1 hairline" />
            </div>
            <dl className="grid gap-3 text-body-sm sm:grid-cols-[140px_minmax(0,1fr)]">
              <dt className="font-mono text-[0.62rem] uppercase tracking-[0.22em] text-on-surface-muted">
                block hash
              </dt>
              <dd className="flex items-center gap-2">
                <span className="font-mono text-on-surface break-all">{block.hash || "—"}</span>
                {block.hash && <CopyButton value={block.hash} />}
              </dd>

              <dt className="font-mono text-[0.62rem] uppercase tracking-[0.22em] text-on-surface-muted">
                prev block
              </dt>
              <dd>
                {block.lastBlockHash ? (
                  <Link
                    to={`/block/${height - 1}`}
                    className="font-mono text-editorial break-all hover:text-editorial-ink"
                  >
                    {block.lastBlockHash}
                  </Link>
                ) : (
                  <span className="text-on-surface-muted">genesis</span>
                )}
              </dd>

              <dt className="font-mono text-[0.62rem] uppercase tracking-[0.22em] text-on-surface-muted">
                data hash
              </dt>
              <dd className="font-mono text-on-surface-variant break-all">
                {block.dataHash || "—"}
              </dd>

              <dt className="font-mono text-[0.62rem] uppercase tracking-[0.22em] text-on-surface-muted">
                app hash
              </dt>
              <dd className="font-mono text-on-surface-variant break-all">
                {block.appHash || "—"}
              </dd>

              <dt className="font-mono text-[0.62rem] uppercase tracking-[0.22em] text-on-surface-muted">
                proposer
              </dt>
              <dd className="flex items-center gap-2">
                <span className="font-mono text-on-surface break-all">
                  {block.proposerAddress || "—"}
                </span>
                {block.proposerAddress && <CopyButton value={block.proposerAddress} />}
              </dd>
            </dl>
          </Card>

          <Card tier="base" padded="lg" className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <span className="font-mono text-[0.62rem] uppercase tracking-[0.3em] text-editorial">
                § transactions
              </span>
              <span className="h-px flex-1 hairline" />
              <span className="font-mono text-[0.58rem] uppercase tracking-[0.2em] text-on-surface-muted">
                {block.txs.length} indexed
              </span>
            </div>
            {block.numTxs === 0 ? (
              <p className="text-body-sm text-on-surface-muted">Empty block — no transactions.</p>
            ) : block.txs.length === 0 ? (
              <p className="text-body-sm text-on-surface-muted">
                Block has {block.numTxs} tx(s) but the indexer hasn't returned them yet. Try
                refresh in a moment.
              </p>
            ) : (
              <div className="divide-y divide-editorial/10 rounded-xl surface-nested ghost-border overflow-hidden">
                {block.txs.map((t, i) => (
                  <Link
                    key={t.hash || i}
                    to={`/tx/${t.hash}`}
                    className="flex items-center gap-3 px-3 py-2.5 snappy transition-colors hover:bg-white/[0.04]"
                  >
                    <span className="font-mono text-[0.62rem] uppercase tracking-[0.22em] text-on-surface-muted w-6 text-right">
                      {i}
                    </span>
                    <span className="font-mono text-body-sm text-editorial-ink truncate flex-1">
                      0x{shortHash(t.hash, 10)}
                    </span>
                    <Chip tone={t.code === 0 ? "success" : "danger"} dense>
                      {t.code === 0 ? "ok" : `code ${t.code}`}
                    </Chip>
                    <span className="font-mono text-[0.62rem] uppercase tracking-[0.2em] text-secondary truncate max-w-[14rem]">
                      {shortMessageType(t.messageType)}
                    </span>
                    <span className="font-mono text-body-sm text-on-surface-muted w-[7rem] text-right">
                      gas {formatNumber(Number(t.gasUsed))}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </Card>

          <details className="rounded-xl surface-nested ghost-border">
            <summary className="cursor-pointer px-4 py-2.5 font-mono text-[0.62rem] uppercase tracking-[0.24em] text-on-surface-variant hover:text-editorial-ink">
              raw rpc response
            </summary>
            <pre className="px-4 py-3 font-mono text-body-sm text-on-surface-variant overflow-x-auto">
              {JSON.stringify(block, null, 2)}
            </pre>
          </details>
        </>
      )}
    </div>
  );
}
