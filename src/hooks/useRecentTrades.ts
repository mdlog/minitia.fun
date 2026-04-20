import { useQuery } from "@tanstack/react-query";
import { APPCHAIN, APPCHAIN_RPC_AVAILABLE } from "@/lib/initia";

export interface TradeEvent {
  hash: string;
  height: number;
  side: "BUY" | "SELL";
  trader: string;
  ticker: string;
  initAmount: bigint;
  tokenAmount: bigint;
  newSupply: bigint;
  newReserve: bigint;
  fee: bigint;
}

interface MoveEventAttr {
  key?: string;
  value?: string;
}
interface MoveEvent {
  type?: string;
  attributes?: MoveEventAttr[];
}

function parseTrade(eventAttrs: Record<string, string>, hash: string, height: number): TradeEvent | null {
  if (!eventAttrs.type_tag?.includes("::bonding_curve::Trade")) return null;
  const dataStr = eventAttrs.data ?? "{}";
  let data: Record<string, unknown> = {};
  try {
    data = JSON.parse(dataStr) as Record<string, unknown>;
  } catch {
    return null;
  }
  // Move `side: u8` serialises as JSON number (e.g. 0 or 1). Guard for string too.
  const sideNum = Number(data.side ?? -1);
  return {
    hash,
    height,
    side: sideNum === 0 ? "BUY" : "SELL",
    trader: String(data.trader ?? ""),
    ticker: String(data.ticker ?? ""),
    initAmount: BigInt(String(data.init_amount ?? "0")),
    tokenAmount: BigInt(String(data.token_amount ?? "0")),
    newSupply: BigInt(String(data.new_supply ?? "0")),
    newReserve: BigInt(String(data.new_reserve ?? "0")),
    fee: BigInt(String(data.fee ?? "0")),
  };
}

type TxRow = {
  hash?: string;
  height?: string;
  tx_result?: { code?: number; events?: MoveEvent[] };
};

async function fetchByAction(action: string, perPage: number): Promise<TxRow[]> {
  const query = encodeURIComponent(`"message.action='${action}'"`);
  const url = `${APPCHAIN.rpc}/tx_search?query=${query}&per_page=${perPage}&order_by=%22desc%22`;
  const res = await fetch(url, { signal: AbortSignal.timeout(7000) });
  if (!res.ok) return [];
  const json = (await res.json()) as { result?: { txs?: TxRow[] } };
  return json.result?.txs ?? [];
}

async function fetchTrades(ticker: string | undefined, limit: number): Promise<TradeEvent[]> {
  if (!APPCHAIN_RPC_AVAILABLE) return [];
  // Direct MsgExecuteJSON (wallet signs each tx) + authz MsgExec (auto-sign).
  const perPage = limit * 4;
  const [direct, wrapped] = await Promise.all([
    fetchByAction("/initia.move.v1.MsgExecuteJSON", perPage),
    fetchByAction("/cosmos.authz.v1beta1.MsgExec", perPage),
  ]);
  const txs = [...direct, ...wrapped].sort(
    (a, b) => Number(b.height ?? 0) - Number(a.height ?? 0),
  );
  const trades: TradeEvent[] = [];
  for (const tx of txs) {
    if ((tx.tx_result?.code ?? 1) !== 0) continue;
    const events = tx.tx_result?.events ?? [];
    for (const ev of events) {
      if (ev.type !== "move") continue;
      const attrs: Record<string, string> = {};
      for (const a of ev.attributes ?? []) {
        if (a.key && a.value !== undefined) attrs[a.key] = a.value;
      }
      const trade = parseTrade(attrs, tx.hash ?? "", Number(tx.height ?? 0));
      if (trade && (!ticker || trade.ticker.toUpperCase() === ticker.toUpperCase())) {
        trades.push(trade);
        if (trades.length >= limit) return trades;
      }
    }
  }
  return trades;
}

export function useRecentTrades(ticker?: string, limit = 25, pollMs = 8_000) {
  return useQuery({
    queryKey: ["recentTrades", ticker, limit, APPCHAIN.rpc],
    queryFn: () => fetchTrades(ticker, limit),
    enabled: APPCHAIN_RPC_AVAILABLE,
    refetchInterval: pollMs,
    staleTime: 4_000,
    retry: 1,
  });
}
