import { useQuery } from "@tanstack/react-query";
import { APPCHAIN, APPCHAIN_RPC_AVAILABLE } from "@/lib/initia";

export interface GraduationEvent {
  ticker: string;
  finalReserve: bigint;
  finalSupply: bigint;
  blockHeight: number;
  txHash: string;
}

interface MoveEventAttr {
  key?: string;
  value?: string;
}
interface MoveEvent {
  type?: string;
  attributes?: MoveEventAttr[];
}

type TxRow = {
  hash?: string;
  height?: string;
  tx_result?: { code?: number; events?: MoveEvent[] };
};

async function fetchByAction(action: string): Promise<TxRow[]> {
  const query = encodeURIComponent(`"message.action='${action}'"`);
  const url = `${APPCHAIN.rpc}/tx_search?query=${query}&per_page=200&order_by=%22desc%22`;
  const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) return [];
  const json = (await res.json()) as { result?: { txs?: TxRow[] } };
  return json.result?.txs ?? [];
}

async function fetchGraduationEvent(ticker: string): Promise<GraduationEvent | null> {
  if (!APPCHAIN_RPC_AVAILABLE || !ticker) return null;
  // Direct MsgExecuteJSON + authz MsgExec (auto-sign wrapper).
  const [direct, wrapped] = await Promise.all([
    fetchByAction("/initia.move.v1.MsgExecuteJSON"),
    fetchByAction("/cosmos.authz.v1beta1.MsgExec"),
  ]);
  const txs = [...direct, ...wrapped].sort(
    (a, b) => Number(b.height ?? 0) - Number(a.height ?? 0),
  );
  const upper = ticker.toUpperCase();
  for (const tx of txs) {
    if ((tx.tx_result?.code ?? 1) !== 0) continue;
    for (const ev of tx.tx_result?.events ?? []) {
      if (ev.type !== "move") continue;
      const attrs: Record<string, string> = {};
      for (const a of ev.attributes ?? []) {
        if (a.key && a.value !== undefined) attrs[a.key] = a.value;
      }
      if (!attrs.type_tag?.endsWith("::bonding_curve::Graduated")) continue;
      let data: Record<string, unknown> = {};
      try {
        data = JSON.parse(attrs.data ?? "{}") as Record<string, unknown>;
      } catch {
        continue;
      }
      if (String(data.ticker ?? "").toUpperCase() !== upper) continue;
      return {
        ticker: upper,
        finalReserve: BigInt(String(data.final_reserve ?? "0")),
        finalSupply: BigInt(String(data.final_supply ?? "0")),
        blockHeight: Number(tx.height ?? 0),
        txHash: tx.hash ?? "",
      };
    }
  }
  return null;
}

/** Scans recent tx_search for the Graduated event for a given ticker. */
export function useGraduationEvent(ticker: string, pollMs = 30_000) {
  return useQuery({
    queryKey: ["graduationEvent", APPCHAIN.rpc, ticker],
    queryFn: () => fetchGraduationEvent(ticker),
    enabled: APPCHAIN_RPC_AVAILABLE && Boolean(ticker),
    refetchInterval: pollMs,
    staleTime: 20_000,
    retry: 1,
  });
}
