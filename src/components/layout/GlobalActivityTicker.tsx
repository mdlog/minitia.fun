import type { ReactElement } from "react";
import { Link } from "react-router-dom";
import { ArrowDown, ArrowUp, Flame, GraduationCap, Rocket, Sparkles } from "lucide-react";
import { useGlobalActivity, type ActivityEvent } from "@/hooks/useGlobalActivity";
import { cn } from "@/lib/cn";

function shortAddr(addr: string, chars = 3): string {
  if (!addr || !addr.startsWith("0x")) return addr.slice(0, 8);
  return `0x${addr.slice(2, 2 + chars)}…${addr.slice(-chars)}`;
}

function formatMinCompact(umin: bigint): string {
  if (umin === 0n) return "0";
  const whole = umin / 1_000_000n;
  const frac = umin % 1_000_000n;
  const fracStr = frac.toString().padStart(6, "0").slice(0, 2);
  const w = Number(whole);
  if (w >= 1000) return `${(w / 1000).toFixed(1)}k`;
  return `${w}.${fracStr}`;
}

function formatTokenCompact(n: bigint): string {
  if (n === 0n) return "0";
  const num = Number(n);
  if (num >= 1_000_000_000) return `${(num / 1_000_000_000).toFixed(1)}B`;
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}k`;
  return num.toLocaleString("en-US");
}

function eventStyles(kind: ActivityEvent["kind"]): { chip: string; text: string; icon: ReactElement; label: string } {
  switch (kind) {
    case "buy":
      return {
        chip: "bg-secondary-container/70 text-secondary",
        text: "text-secondary",
        icon: <ArrowUp className="h-3 w-3" />,
        label: "BUY",
      };
    case "sell":
      return {
        chip: "bg-red-500/15 text-red-300",
        text: "text-red-300",
        icon: <ArrowDown className="h-3 w-3" />,
        label: "SELL",
      };
    case "launch":
      return {
        chip: "bg-primary-container/60 text-primary",
        text: "text-primary",
        icon: <Rocket className="h-3 w-3" />,
        label: "LAUNCH",
      };
    case "pool_created":
      return {
        chip: "bg-tertiary-container/60 text-tertiary",
        text: "text-tertiary",
        icon: <Sparkles className="h-3 w-3" />,
        label: "POOL",
      };
    case "graduated":
      return {
        chip: "bg-amber-400/15 text-amber-300",
        text: "text-amber-300",
        icon: <GraduationCap className="h-3 w-3" />,
        label: "GRAD",
      };
    case "claim":
      return {
        chip: "bg-emerald-400/15 text-emerald-300",
        text: "text-emerald-300",
        icon: <Flame className="h-3 w-3" />,
        label: "CLAIM",
      };
  }
}

function EventPill({ ev }: { ev: ActivityEvent }) {
  const s = eventStyles(ev.kind);
  const body = (() => {
    if (ev.kind === "buy" || ev.kind === "sell") {
      return (
        <>
          <span className="text-on-surface-muted">{shortAddr(ev.actor)}</span>
          <span className="text-on-surface-variant">
            {ev.kind === "buy" ? "bought" : "sold"}
          </span>
          <span className="font-semibold text-on-surface">
            {formatTokenCompact(ev.tokenAmount)}
          </span>
          <span className={cn("font-editorial italic", s.text)}>${ev.ticker}</span>
          <span className="text-on-surface-muted">·</span>
          <span className="text-on-surface">{formatMinCompact(ev.initAmount)} MIN</span>
        </>
      );
    }
    if (ev.kind === "launch") {
      return (
        <>
          <span className="text-on-surface-muted">{shortAddr(ev.actor)}</span>
          <span className="text-on-surface-variant">launched</span>
          <span className={cn("font-editorial italic", s.text)}>${ev.ticker}</span>
        </>
      );
    }
    if (ev.kind === "pool_created") {
      return (
        <>
          <span className="text-on-surface-muted">{shortAddr(ev.actor)}</span>
          <span className="text-on-surface-variant">opened curve for</span>
          <span className={cn("font-editorial italic", s.text)}>${ev.ticker}</span>
        </>
      );
    }
    if (ev.kind === "graduated") {
      return (
        <>
          <span className={cn("font-editorial italic", s.text)}>${ev.ticker}</span>
          <span className="text-on-surface-variant">graduated ·</span>
          <span className="font-semibold text-on-surface">
            {formatMinCompact(ev.initAmount)} MIN
          </span>
          <span className="text-on-surface-muted">reserve</span>
        </>
      );
    }
    // claim
    return (
      <>
        <span className="text-on-surface-muted">{shortAddr(ev.actor)}</span>
        <span className="text-on-surface-variant">claimed</span>
        <span className="font-semibold text-on-surface">
          {formatMinCompact(ev.initAmount)} MIN
        </span>
        <span className="text-on-surface-muted">from</span>
        <span className={cn("font-editorial italic", s.text)}>${ev.ticker}</span>
      </>
    );
  })();

  return (
    <Link
      to={`/trade/${ev.ticker}`}
      className="group inline-flex shrink-0 items-center gap-2 rounded-full bg-white/[0.03] px-3 py-1.5 hairline transition hover:bg-white/[0.07]"
      title={`Block #${ev.height}`}
    >
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 font-mono text-[0.56rem] font-medium uppercase tracking-[0.18em]",
          s.chip,
        )}
      >
        {s.icon}
        {s.label}
      </span>
      <span className="flex items-center gap-1.5 font-mono text-[0.72rem] tabular-nums">
        {body}
      </span>
    </Link>
  );
}

export function GlobalActivityTicker() {
  const { data, isLoading } = useGlobalActivity(30);

  if (isLoading && !data) {
    return (
      <div className="flex h-10 items-center gap-3 overflow-hidden rounded-xl surface-section ghost-border px-4">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-secondary" />
        <span className="font-mono text-[0.62rem] uppercase tracking-[0.22em] text-on-surface-muted">
          Scanning rollup…
        </span>
      </div>
    );
  }

  const events = data ?? [];
  if (events.length === 0) {
    return (
      <div className="flex h-10 items-center gap-3 overflow-hidden rounded-xl surface-section ghost-border px-4">
        <span className="h-1.5 w-1.5 rounded-full bg-on-surface-muted" />
        <span className="font-mono text-[0.62rem] uppercase tracking-[0.22em] text-on-surface-muted">
          No activity yet — launch something
        </span>
      </div>
    );
  }

  // Duplicate to create a seamless marquee loop.
  const loop = [...events, ...events];

  return (
    <div
      className="group relative flex h-10 items-center overflow-hidden rounded-xl surface-section ghost-border"
      role="region"
      aria-label="Global activity ticker"
    >
      <div className="sticky left-0 z-10 flex h-full shrink-0 items-center gap-2 bg-gradient-to-r from-surface via-surface to-transparent pl-4 pr-6">
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-secondary opacity-60" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-secondary" />
        </span>
        <span className="font-mono text-[0.56rem] uppercase tracking-[0.26em] text-editorial-ink">
          Tape
        </span>
      </div>
      <div className="relative flex-1 overflow-hidden">
        <div className="flex animate-ticker-scroll gap-2 whitespace-nowrap pr-8 group-hover:[animation-play-state:paused]">
          {loop.map((ev, i) => (
            <EventPill key={`${ev.hash}-${ev.kind}-${i}`} ev={ev} />
          ))}
        </div>
        <div className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-surface to-transparent" />
      </div>
    </div>
  );
}
