import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowDown,
  ArrowUp,
  Bell,
  Check,
  ExternalLink,
  Flame,
  GraduationCap,
  Rocket,
} from "lucide-react";
import {
  useNotifications,
  type NotificationItem,
  type NotificationReason,
} from "@/hooks/useNotifications";
import { APPCHAIN } from "@/lib/initia";
import { cn } from "@/lib/cn";

function formatMin(micro: bigint, digits = 2): string {
  if (micro === 0n) return "0";
  const whole = micro / 1_000_000n;
  const frac = micro % 1_000_000n;
  const fracStr = String(frac).padStart(6, "0").slice(0, digits);
  return `${whole.toLocaleString()}.${fracStr}`;
}

function relativeTime(ms: number): string {
  const diff = Date.now() - ms;
  if (diff < 45_000) return "just now";
  if (diff < 3_600_000) return `${Math.round(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.round(diff / 3_600_000)}h ago`;
  return `${Math.round(diff / 86_400_000)}d ago`;
}

function reasonMeta(reason: NotificationReason) {
  switch (reason) {
    case "own_trade":
      return { tone: "bg-[#2563EB]/15 text-[#60A5FA]", label: "Your trade" };
    case "own_launch":
      return { tone: "bg-[#10B981]/15 text-[#34D399]", label: "Your launch" };
    case "own_claim":
      return { tone: "bg-[#10B981]/15 text-[#34D399]", label: "Fees claimed" };
    case "pool_trade":
      return { tone: "bg-[#F59E0B]/15 text-[#FBBF24]", label: "Pool trade" };
    case "pool_graduated":
      return { tone: "bg-[#10B981]/20 text-[#34D399]", label: "Pool graduated" };
    case "watched_graduated":
    default:
      return { tone: "bg-white/[0.05] text-on-surface-variant", label: "Graduated" };
  }
}

function eventIcon(item: NotificationItem) {
  const k = item.event.kind;
  if (k === "buy") return <ArrowUp className="h-3.5 w-3.5 text-[#34D399]" />;
  if (k === "sell") return <ArrowDown className="h-3.5 w-3.5 text-[#FB7185]" />;
  if (k === "launch" || k === "pool_created")
    return <Rocket className="h-3.5 w-3.5 text-[#60A5FA]" />;
  if (k === "graduated") return <GraduationCap className="h-3.5 w-3.5 text-[#34D399]" />;
  if (k === "claim") return <Flame className="h-3.5 w-3.5 text-[#FBBF24]" />;
  return <Bell className="h-3.5 w-3.5 text-on-surface-muted" />;
}

function titleFor(item: NotificationItem): string {
  const { event } = item;
  const amt = formatMin(event.initAmount, 2);
  switch (item.reason) {
    case "own_trade":
      return `You ${event.kind === "buy" ? "bought" : "sold"} $${event.ticker} · ${amt} MIN`;
    case "own_launch":
      return event.kind === "launch"
        ? `You launched $${event.ticker}`
        : `Pool created for $${event.ticker}`;
    case "own_claim":
      return `You claimed ${amt} MIN from $${event.ticker}`;
    case "pool_trade":
      return `Someone ${event.kind === "buy" ? "bought" : "sold"} $${event.ticker} · ${amt} MIN`;
    case "pool_graduated":
      return `Your $${event.ticker} graduated · ${formatMin(event.initAmount, 2)} MIN raised`;
    case "watched_graduated":
    default:
      return `$${event.ticker} graduated · ${formatMin(event.initAmount, 2)} MIN raised`;
  }
}

function linkFor(item: NotificationItem): string {
  const { event } = item;
  if (event.kind === "graduated" || item.reason === "pool_graduated")
    return `/graduation/${event.ticker}`;
  return `/trade/${event.ticker}`;
}

export function NotificationsMenu({ variant = "topbar" }: { variant?: "topbar" | "sidebar" }) {
  const [open, setOpen] = useState(false);
  const { items, unreadCount, isLoading, markAllRead, markRead } = useNotifications();
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!wrapperRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const t = setTimeout(() => document.addEventListener("mousedown", onClick), 0);
    document.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(t);
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const toggle = () => setOpen((o) => !o);

  const trigger =
    variant === "sidebar" ? (
      <button
        type="button"
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount})` : ""}`}
        onClick={toggle}
        className="relative flex h-8 flex-1 items-center justify-center rounded-md text-on-surface-muted hover:bg-white/[0.04] hover:text-on-surface"
      >
        <Bell className="h-3.5 w-3.5" />
        {unreadCount > 0 && (
          <span className="absolute right-2 top-1.5 inline-flex h-3.5 min-w-[14px] items-center justify-center rounded-full bg-primary px-1 text-[9px] font-mono font-semibold text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>
    ) : (
      <button
        type="button"
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount})` : ""}`}
        onClick={toggle}
        className="relative flex h-8 w-8 items-center justify-center rounded-md text-on-surface-variant hover:bg-white/[0.04] hover:text-on-surface"
      >
        <Bell className="h-3.5 w-3.5" />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-primary px-1 text-[9px] font-mono font-semibold text-white ring-2 ring-surface-container-low">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>
    );

  return (
    <div ref={wrapperRef} className="relative">
      {trigger}

      {open && (
        <div
          className={cn(
            "absolute z-50 w-[340px] rounded-xl bg-surface-container ghost-border py-2 shadow-ambient-lg animate-fade-in",
            variant === "sidebar"
              ? "bottom-[calc(100%+8px)] left-0"
              : "right-0 top-[calc(100%+6px)]",
          )}
        >
          <div className="flex items-center justify-between px-4 pb-2 pt-1">
            <div className="flex items-baseline gap-2">
              <span className="text-[13px] font-semibold text-on-surface">Notifications</span>
              {unreadCount > 0 && (
                <span className="font-mono text-[11px] text-on-surface-muted">
                  {unreadCount} new
                </span>
              )}
            </div>
            {items.length > 0 && (
              <button
                type="button"
                onClick={markAllRead}
                disabled={unreadCount === 0}
                className="inline-flex items-center gap-1 text-[11px] text-on-surface-variant hover:text-on-surface disabled:opacity-40"
              >
                <Check className="h-3 w-3" /> Mark all read
              </button>
            )}
          </div>

          <div className="h-px bg-white/[0.05]" />

          <div className="max-h-[420px] overflow-y-auto">
            {isLoading && items.length === 0 ? (
              <div className="px-4 py-6 text-center text-[12px] text-on-surface-muted">
                Loading activity…
              </div>
            ) : items.length === 0 ? (
              <div className="flex flex-col items-center gap-1 px-4 py-8 text-center">
                <Bell className="h-5 w-5 text-on-surface-muted" />
                <span className="text-[12.5px] text-on-surface-variant">No notifications yet</span>
                <span className="text-[11px] text-[#52525B]">
                  Your trades, launches, and pool activity will show here.
                </span>
              </div>
            ) : (
              <ul className="flex flex-col">
                {items.map((item) => {
                  const meta = reasonMeta(item.reason);
                  return (
                    <li key={item.id}>
                      <Link
                        to={linkFor(item)}
                        onClick={() => {
                          markRead(item.id);
                          setOpen(false);
                        }}
                        className={cn(
                          "group flex gap-3 px-4 py-3 text-left transition-colors hover:bg-white/[0.03]",
                          !item.read && "bg-white/[0.02]",
                        )}
                      >
                        <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-white/[0.04]">
                          {eventIcon(item)}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span
                              className={cn(
                                "inline-flex rounded-md px-1.5 py-[2px] font-mono text-[9.5px] font-medium uppercase tracking-[0.04em]",
                                meta.tone,
                              )}
                            >
                              {meta.label}
                            </span>
                            {!item.read && (
                              <span className="h-1.5 w-1.5 rounded-full bg-[#60A5FA]" />
                            )}
                            <span className="ml-auto font-mono text-[10.5px] text-on-surface-muted">
                              #{item.event.height}
                            </span>
                          </div>
                          <div className="mt-1 truncate text-[12.5px] font-medium text-on-surface">
                            {titleFor(item)}
                          </div>
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {APPCHAIN.rpc && items.length > 0 && (
            <>
              <div className="h-px bg-white/[0.05]" />
              <a
                href={`${APPCHAIN.rpc}/status`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center gap-1.5 py-2 text-[11px] text-on-surface-muted hover:text-on-surface"
              >
                Polling {APPCHAIN.chainId} <ExternalLink className="h-3 w-3" />
              </a>
            </>
          )}
        </div>
      )}
    </div>
  );
}
