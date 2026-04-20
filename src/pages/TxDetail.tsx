import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Check, Copy, ExternalLink, X } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { APPCHAIN } from "@/lib/initia";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/cn";
import { useTxDetail, normalizeTxHash, type TxEvent } from "@/hooks/useTxDetail";

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

function findAttr(ev: TxEvent, key: string): string | undefined {
  return ev.attributes.find((a) => a.key === key)?.value;
}

function groupByType(events: TxEvent[]): Array<{ type: string; events: TxEvent[] }> {
  const groups = new Map<string, TxEvent[]>();
  for (const ev of events) {
    const list = groups.get(ev.type) ?? [];
    list.push(ev);
    groups.set(ev.type, list);
  }
  return [...groups.entries()].map(([type, events]) => ({ type, events }));
}

function tryParseJson(raw: string): unknown | null {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
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

function humanizeAttrValue(key: string, raw: string): { display: string; pretty?: string } {
  if (!raw) return { display: raw };
  if (key === "data" || raw.startsWith("{") || raw.startsWith("[")) {
    const parsed = tryParseJson(raw);
    if (parsed !== null) {
      return { display: raw, pretty: JSON.stringify(parsed, null, 2) };
    }
  }
  return { display: raw };
}

export default function TxDetail() {
  const { hash: rawHash = "" } = useParams<{ hash: string }>();
  const hash = useMemo(() => normalizeTxHash(rawHash), [rawHash]);
  const { data: tx, error, isFetching } = useTxDetail(hash);

  const derived = useMemo(() => {
    if (!tx) return null;
    const events = tx.events;
    let action: string | undefined;
    let sender: string | undefined;
    let fee: string | undefined;
    const moveEvents: Array<{ typeTag: string; data: unknown | string }> = [];

    for (const e of events) {
      if (e.type === "message") {
        action ??= findAttr(e, "action");
        sender ??= findAttr(e, "sender");
      }
      if (e.type === "tx") {
        fee ??= findAttr(e, "fee");
      }
      if (e.type === "move") {
        const typeTag = findAttr(e, "type_tag") ?? "";
        const dataRaw = findAttr(e, "data") ?? "";
        const parsed = tryParseJson(dataRaw);
        moveEvents.push({ typeTag, data: parsed ?? dataRaw });
      }
    }
    return { action, sender, fee, moveEvents };
  }, [tx]);

  const gasRatio =
    tx && Number(tx.gasWanted) > 0 ? Number(tx.gasUsed) / Number(tx.gasWanted) : 0;

  const success = tx && tx.code === 0;

  if (!/^[0-9A-F]{64}$/.test(hash)) {
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
            Invalid tx hash.
          </h1>
          <p className="mt-3 text-body-lg text-on-surface-variant">
            Expected 64 hex characters (optionally 0x-prefixed). Got{" "}
            <code className="font-mono text-editorial">{rawHash || "(empty)"}</code>.
          </p>
        </section>
      </div>
    );
  }

  return (
    <div className="page-shell">
      <Link
        to="/explorer"
        className="inline-flex items-center gap-2 text-body-sm text-on-surface-variant hover:text-editorial-ink"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> back to explorer
      </Link>

      <section className="page-hero px-6 py-8 md:px-8 md:py-9">
        <div className="flex items-center gap-3 font-mono text-[0.62rem] uppercase tracking-[0.3em] text-editorial">
          <span>§ transaction</span>
          <span className="h-px flex-1 hairline" />
          {tx ? (
            success ? (
              <Chip tone="success" dense>
                <Check className="h-3 w-3" /> success
              </Chip>
            ) : (
              <Chip tone="danger" dense>
                <X className="h-3 w-3" /> failed · code {tx.code}
              </Chip>
            )
          ) : (
            <Chip tone="neutral" dense>
              {isFetching ? "loading…" : "—"}
            </Chip>
          )}
        </div>

        <h1 className="mt-3 text-[clamp(1.75rem,5vw,3rem)] leading-[1.04]">
          <span className="font-editorial italic text-editorial">0x{shortHash(hash, 10)}</span>
          <span className="text-secondary">.</span>
        </h1>

        <div className="mt-3 flex flex-wrap items-center gap-3 font-mono text-body-sm text-on-surface-variant">
          <span className="break-all">0x{hash}</span>
          <CopyButton value={`0x${hash}`} label="copy hash" />
          <a
            href={`${APPCHAIN.rpc}/tx?hash=0x${hash}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-on-surface-muted hover:text-editorial-ink"
          >
            raw RPC <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </section>

      {error && (
        <Card tier="base" padded="lg">
          <div className="flex flex-col gap-2">
            <Chip tone="danger" dense>
              error
            </Chip>
            <p className="font-mono text-body-sm text-error">
              {(error as Error).message || "failed to load transaction"}
            </p>
            <p className="text-body-sm text-on-surface-variant">
              If the tx was just broadcast, it may not be indexed yet — try again in a few seconds.
            </p>
          </div>
        </Card>
      )}

      {tx && (
        <>
          <section className="grid gap-4 md:grid-cols-4">
            <Card padded="md">
              <span className="text-[0.62rem] font-mono uppercase tracking-[0.24em] text-on-surface-muted">
                Block
              </span>
              <div className="mt-2 font-editorial italic text-[2rem] leading-none text-editorial-ink">
                #{formatNumber(tx.height)}
              </div>
              <Link
                to={`/block/${tx.height}`}
                className="mt-2 inline-flex items-center gap-1 font-mono text-[0.62rem] uppercase tracking-[0.2em] text-secondary hover:text-editorial-ink"
              >
                open block <ExternalLink className="h-3 w-3" />
              </Link>
            </Card>

            <Card padded="md">
              <span className="text-[0.62rem] font-mono uppercase tracking-[0.24em] text-on-surface-muted">
                Timestamp
              </span>
              <div className="mt-2 text-title-md text-on-surface">
                {relativeTime(tx.timestamp) || "—"}
              </div>
              <div className="mt-1 font-mono text-[0.62rem] uppercase tracking-[0.18em] text-on-surface-muted">
                {formatAbsoluteTime(tx.timestamp)}
              </div>
            </Card>

            <Card padded="md">
              <span className="text-[0.62rem] font-mono uppercase tracking-[0.24em] text-on-surface-muted">
                Gas used / wanted
              </span>
              <div className="mt-2 text-title-md text-on-surface">
                {formatNumber(Number(tx.gasUsed))} / {formatNumber(Number(tx.gasWanted))}
              </div>
              <div className="mt-1 font-mono text-[0.62rem] uppercase tracking-[0.2em] text-secondary">
                {gasRatio ? `${(gasRatio * 100).toFixed(1)}%` : "—"}
              </div>
            </Card>

            <Card padded="md">
              <span className="text-[0.62rem] font-mono uppercase tracking-[0.24em] text-on-surface-muted">
                Tx index
              </span>
              <div className="mt-2 text-title-md text-on-surface">{tx.index}</div>
              <div className="mt-1 font-mono text-[0.62rem] uppercase tracking-[0.2em] text-on-surface-muted">
                position in block
              </div>
            </Card>
          </section>

          {derived && (derived.action || derived.sender || derived.fee) && (
            <Card tier="base" padded="lg" className="flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <span className="font-mono text-[0.62rem] uppercase tracking-[0.3em] text-editorial">
                  § message
                </span>
                <span className="h-px flex-1 hairline" />
              </div>
              <dl className="grid gap-3 text-body-sm sm:grid-cols-[140px_minmax(0,1fr)]">
                {derived.action && (
                  <>
                    <dt className="font-mono text-[0.62rem] uppercase tracking-[0.22em] text-on-surface-muted">
                      action
                    </dt>
                    <dd className="font-mono text-editorial-ink break-all">{derived.action}</dd>
                  </>
                )}
                {derived.sender && (
                  <>
                    <dt className="font-mono text-[0.62rem] uppercase tracking-[0.22em] text-on-surface-muted">
                      sender
                    </dt>
                    <dd className="flex items-center gap-2">
                      <Link
                        to={`/u/${derived.sender}`}
                        className="font-mono text-editorial break-all hover:text-editorial-ink"
                      >
                        {derived.sender}
                      </Link>
                      <CopyButton value={derived.sender} />
                    </dd>
                  </>
                )}
                {derived.fee && (
                  <>
                    <dt className="font-mono text-[0.62rem] uppercase tracking-[0.22em] text-on-surface-muted">
                      fee
                    </dt>
                    <dd className="font-mono text-on-surface break-all">{derived.fee}</dd>
                  </>
                )}
              </dl>
            </Card>
          )}

          {derived && derived.moveEvents.length > 0 && (
            <Card tier="base" padded="lg" className="flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <span className="font-mono text-[0.62rem] uppercase tracking-[0.3em] text-editorial">
                  § move events
                </span>
                <span className="h-px flex-1 hairline" />
                <span className="font-mono text-[0.58rem] uppercase tracking-[0.2em] text-on-surface-muted">
                  {derived.moveEvents.length} emitted
                </span>
              </div>
              <div className="flex flex-col gap-3">
                {derived.moveEvents.map((ev, i) => (
                  <div
                    key={i}
                    className="rounded-xl surface-nested ghost-border px-4 py-3 flex flex-col gap-2"
                  >
                    <div className="font-mono text-body-sm text-editorial break-all">
                      {ev.typeTag}
                    </div>
                    {typeof ev.data === "string" ? (
                      <pre className="font-mono text-body-sm text-on-surface-variant break-all whitespace-pre-wrap">
                        {ev.data}
                      </pre>
                    ) : (
                      <pre className="font-mono text-body-sm text-on-surface-variant overflow-x-auto">
                        {JSON.stringify(ev.data, null, 2)}
                      </pre>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          )}

          {!success && tx.log && (
            <Card tier="base" padded="lg" className="flex flex-col gap-2">
              <div className="flex items-center gap-3">
                <span className="font-mono text-[0.62rem] uppercase tracking-[0.3em] text-error">
                  § error log
                </span>
                <span className="h-px flex-1 hairline" />
                {tx.codespace && (
                  <span className="font-mono text-[0.58rem] uppercase tracking-[0.2em] text-on-surface-muted">
                    codespace {tx.codespace}
                  </span>
                )}
              </div>
              <pre className="rounded-lg surface-nested ghost-border px-4 py-3 font-mono text-body-sm text-on-surface-variant whitespace-pre-wrap break-words">
                {tx.log}
              </pre>
            </Card>
          )}

          <Card tier="base" padded="lg" className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <span className="font-mono text-[0.62rem] uppercase tracking-[0.3em] text-editorial">
                § events
              </span>
              <span className="h-px flex-1 hairline" />
              <span className="font-mono text-[0.58rem] uppercase tracking-[0.2em] text-on-surface-muted">
                {tx.events.length} total
              </span>
            </div>
            {tx.events.length === 0 ? (
              <p className="text-body-sm text-on-surface-muted">No events emitted.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {groupByType(tx.events).map((group) => (
                  <details
                    key={group.type}
                    className="group rounded-xl surface-nested ghost-border"
                  >
                    <summary className="flex cursor-pointer items-center gap-3 px-4 py-2.5 font-mono text-body-sm text-editorial-ink snappy">
                      <span
                        className={cn(
                          "inline-block h-1.5 w-1.5 rounded-full",
                          group.type.startsWith("move") ? "bg-secondary" : "bg-editorial/50",
                        )}
                      />
                      <span className="flex-1 truncate">{group.type}</span>
                      <span className="font-mono text-[0.58rem] uppercase tracking-[0.2em] text-on-surface-muted">
                        {group.events.length}×
                      </span>
                    </summary>
                    <div className="flex flex-col gap-2 border-t border-editorial/10 px-4 py-3">
                      {group.events.map((ev, i) => (
                        <div
                          key={i}
                          className="grid gap-1 text-body-sm sm:grid-cols-[140px_minmax(0,1fr)]"
                        >
                          {ev.attributes.map((a, j) => {
                            const h = humanizeAttrValue(a.key, a.value);
                            return (
                              <div key={j} className="contents">
                                <span className="font-mono text-[0.62rem] uppercase tracking-[0.22em] text-on-surface-muted">
                                  {a.key}
                                </span>
                                {h.pretty ? (
                                  <pre className="font-mono text-on-surface-variant overflow-x-auto whitespace-pre-wrap break-words">
                                    {h.pretty}
                                  </pre>
                                ) : (
                                  <span className="font-mono text-on-surface-variant break-all">
                                    {h.display}
                                  </span>
                                )}
                              </div>
                            );
                          })}
                          {i < group.events.length - 1 && (
                            <div className="col-span-full my-1 h-px bg-editorial/10" />
                          )}
                        </div>
                      ))}
                    </div>
                  </details>
                ))}
              </div>
            )}
          </Card>

          <details className="rounded-xl surface-nested ghost-border">
            <summary className="cursor-pointer px-4 py-2.5 font-mono text-[0.62rem] uppercase tracking-[0.24em] text-on-surface-variant hover:text-editorial-ink">
              raw rpc response
            </summary>
            <pre className="px-4 py-3 font-mono text-body-sm text-on-surface-variant overflow-x-auto">
              {JSON.stringify(tx, null, 2)}
            </pre>
          </details>
        </>
      )}
    </div>
  );
}
