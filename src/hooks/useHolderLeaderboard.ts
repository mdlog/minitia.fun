import { useQuery } from "@tanstack/react-query";
import { APPCHAIN, APPCHAIN_RPC_AVAILABLE } from "@/lib/initia";

export interface HolderRow {
  address: string;
  /** Net balance held on the curve (micro-units, u128). */
  balance: bigint;
  /** Trade count for this holder. */
  trades: number;
  /** Total MIN spent buying (gross, umin) — excludes fee rebates on sells. */
  bought: bigint;
  /** Total MIN received from sells (umin). */
  sold: bigint;
}

interface MoveEventAttr {
  key?: string;
  value?: string;
}
interface MoveEvent {
  type?: string;
  attributes?: MoveEventAttr[];
}

/** Aggregates Trade events for a ticker into a holder leaderboard.
 *  Source of truth is `bonding_curve::Trade.new_holder_balance` which is
 *  emitted for every buy/sell, so we can derive the LATEST balance per
 *  trader without re-summing tokens. */
async function fetchLeaderboard(ticker: string, limit: number): Promise<HolderRow[]> {
  if (!APPCHAIN_RPC_AVAILABLE || !ticker) return [];
  const query = encodeURIComponent(`"message.action='/initia.move.v1.MsgExecuteJSON'"`);
  const url = `${APPCHAIN.rpc}/tx_search?query=${query}&per_page=200&order_by=%22desc%22`;
  const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) return [];
  const json = (await res.json()) as {
    result?: {
      txs?: Array<{
        hash?: string;
        height?: string;
        tx_result?: { code?: number; events?: MoveEvent[] };
      }>;
    };
  };
  const txs = json.result?.txs ?? [];
  const seen = new Map<string, HolderRow>();
  // Iterate newest → oldest. First Trade event per trader gives current balance.
  for (const tx of txs) {
    if ((tx.tx_result?.code ?? 1) !== 0) continue;
    const events = tx.tx_result?.events ?? [];
    for (const ev of events) {
      if (ev.type !== "move") continue;
      const attrs: Record<string, string> = {};
      for (const a of ev.attributes ?? []) {
        if (a.key && a.value !== undefined) attrs[a.key] = a.value;
      }
      if (!attrs.type_tag?.endsWith("::bonding_curve::Trade")) continue;
      let data: Record<string, unknown> = {};
      try {
        data = JSON.parse(attrs.data ?? "{}") as Record<string, unknown>;
      } catch {
        continue;
      }
      const evTicker = String(data.ticker ?? "").toUpperCase();
      if (evTicker !== ticker.toUpperCase()) continue;
      const trader = String(data.trader ?? "");
      if (!trader) continue;
      const sideNum = Number(data.side ?? -1);
      const initAmount = BigInt(String(data.init_amount ?? "0"));
      const newBalance = BigInt(String(data.new_holder_balance ?? "0"));

      const existing = seen.get(trader);
      if (existing) {
        existing.trades += 1;
        if (sideNum === 0) existing.bought += initAmount;
        else existing.sold += initAmount;
      } else {
        seen.set(trader, {
          address: trader,
          balance: newBalance,
          trades: 1,
          bought: sideNum === 0 ? initAmount : 0n,
          sold: sideNum === 1 ? initAmount : 0n,
        });
      }
    }
  }
  const rows = [...seen.values()].filter((r) => r.balance > 0n || r.trades > 0);
  rows.sort((a, b) => (b.balance > a.balance ? 1 : b.balance < a.balance ? -1 : 0));
  return rows.slice(0, limit);
}

export function useHolderLeaderboard(ticker: string, limit = 10, pollMs = 15_000) {
  return useQuery({
    queryKey: ["holderLeaderboard", APPCHAIN.rpc, ticker, limit],
    queryFn: () => fetchLeaderboard(ticker, limit),
    enabled: APPCHAIN_RPC_AVAILABLE && Boolean(ticker),
    refetchInterval: pollMs,
    staleTime: 8_000,
    retry: 1,
  });
}
