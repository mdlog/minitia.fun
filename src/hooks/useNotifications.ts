import { useCallback, useEffect, useMemo, useState } from "react";
import { useInitiaAccount } from "@/hooks/useInitiaAccount";
import { useAllLaunchedTokens } from "@/hooks/useAllLaunchedTokens";
import { useGlobalActivity, type ActivityEvent } from "@/hooks/useGlobalActivity";

const READ_KEY = "minitia.notifications.read.v1";
const MAX_KEEP = 30;

export type NotificationReason =
  | "own_trade"
  | "own_launch"
  | "own_claim"
  | "pool_trade"
  | "pool_graduated"
  | "watched_graduated";

export interface NotificationItem {
  id: string;
  event: ActivityEvent;
  reason: NotificationReason;
  read: boolean;
}

function scopedKey(address: string | null | undefined) {
  return address ? `${READ_KEY}:${address.toLowerCase()}` : READ_KEY;
}

function loadRead(address?: string | null): Set<string> {
  try {
    const raw = localStorage.getItem(scopedKey(address));
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return new Set(Array.isArray(parsed) ? (parsed as string[]) : []);
  } catch {
    return new Set();
  }
}

function saveRead(address: string | null | undefined, ids: Set<string>) {
  try {
    localStorage.setItem(scopedKey(address), JSON.stringify([...ids].slice(0, MAX_KEEP * 4)));
  } catch {
    /* quota — drop */
  }
}

function normalizeAddr(addr: string | null | undefined): string {
  if (!addr) return "";
  return addr.toLowerCase().replace(/^0x/, "").padStart(40, "0");
}

function addrEq(a: string, b: string): boolean {
  return normalizeAddr(a) === normalizeAddr(b);
}

function notifId(event: ActivityEvent): string {
  return `${event.hash}:${event.kind}:${event.ticker}`;
}

/**
 * Filters the global on-chain activity stream down to events that are
 * meaningful to the connected wallet:
 *  - user is the actor (trade / launch / claim by self)
 *  - event targets a ticker the user created (someone traded / graduated the user's pool)
 *
 * Read-state is persisted per-address in localStorage.
 */
export function useNotifications() {
  const { hexAddress, isConnected } = useInitiaAccount();
  const activity = useGlobalActivity(60, 10_000);
  const tokens = useAllLaunchedTokens(50);

  const [readIds, setReadIds] = useState<Set<string>>(() => loadRead(hexAddress));

  useEffect(() => {
    setReadIds(loadRead(hexAddress));
  }, [hexAddress]);

  const myTickers = useMemo<Set<string>>(() => {
    if (!hexAddress || !tokens.data) return new Set();
    return new Set(
      tokens.data.filter((t) => addrEq(t.creator, hexAddress)).map((t) => t.ticker),
    );
  }, [hexAddress, tokens.data]);

  const items = useMemo<NotificationItem[]>(() => {
    const events = activity.data ?? [];
    if (!isConnected || !hexAddress) {
      return events
        .filter((e) => e.kind === "graduated")
        .slice(0, MAX_KEEP)
        .map((event) => ({
          id: notifId(event),
          event,
          reason: "watched_graduated" as const,
          read: readIds.has(notifId(event)),
        }));
    }

    const out: NotificationItem[] = [];
    for (const event of events) {
      const isOwn = event.actor && addrEq(event.actor, hexAddress);
      const ownsTicker = myTickers.has(event.ticker);
      let reason: NotificationReason | null = null;

      if (isOwn) {
        if (event.kind === "buy" || event.kind === "sell") reason = "own_trade";
        else if (event.kind === "launch" || event.kind === "pool_created") reason = "own_launch";
        else if (event.kind === "claim") reason = "own_claim";
      } else if (ownsTicker) {
        if (event.kind === "buy" || event.kind === "sell") reason = "pool_trade";
        else if (event.kind === "graduated") reason = "pool_graduated";
      } else if (event.kind === "graduated") {
        reason = "watched_graduated";
      }

      if (!reason) continue;
      const id = notifId(event);
      out.push({ id, event, reason, read: readIds.has(id) });
      if (out.length >= MAX_KEEP) break;
    }
    return out;
  }, [activity.data, isConnected, hexAddress, myTickers, readIds]);

  const unreadCount = useMemo(() => items.filter((i) => !i.read).length, [items]);

  const markAllRead = useCallback(() => {
    setReadIds((prev) => {
      const next = new Set(prev);
      for (const item of items) next.add(item.id);
      saveRead(hexAddress, next);
      return next;
    });
  }, [items, hexAddress]);

  const markRead = useCallback(
    (id: string) => {
      setReadIds((prev) => {
        if (prev.has(id)) return prev;
        const next = new Set(prev);
        next.add(id);
        saveRead(hexAddress, next);
        return next;
      });
    },
    [hexAddress],
  );

  return {
    items,
    unreadCount,
    isLoading: activity.isLoading,
    isFetching: activity.isFetching,
    markAllRead,
    markRead,
  };
}
