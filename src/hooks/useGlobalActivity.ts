import { useQuery } from "@tanstack/react-query";
import { APPCHAIN, APPCHAIN_RPC_AVAILABLE } from "@/lib/initia";

export interface ActivityEvent {
  hash: string;
  height: number;
  kind: "buy" | "sell" | "launch" | "pool_created" | "graduated" | "claim";
  ticker: string;
  actor: string;
  // Denominated in umin (6 decimals). For buys/sells this is init_amount;
  // for launches it's 0.
  initAmount: bigint;
  tokenAmount: bigint;
}

interface MoveEventAttr {
  key?: string;
  value?: string;
}
interface MoveEvent {
  type?: string;
  attributes?: MoveEventAttr[];
}

function parseEvent(type_tag: string, data: Record<string, unknown>, hash: string, height: number): ActivityEvent | null {
  if (type_tag.endsWith("::bonding_curve::Trade")) {
    const sideNum = Number(data.side ?? -1);
    return {
      hash,
      height,
      kind: sideNum === 0 ? "buy" : "sell",
      ticker: String(data.ticker ?? ""),
      actor: String(data.trader ?? ""),
      initAmount: BigInt(String(data.init_amount ?? "0")),
      tokenAmount: BigInt(String(data.token_amount ?? "0")),
    };
  }
  if (type_tag.endsWith("::token_factory::TokenLaunched")) {
    return {
      hash,
      height,
      kind: "launch",
      ticker: String(data.ticker ?? ""),
      actor: String(data.creator ?? ""),
      initAmount: 0n,
      tokenAmount: 0n,
    };
  }
  if (type_tag.endsWith("::bonding_curve::PoolCreated")) {
    return {
      hash,
      height,
      kind: "pool_created",
      ticker: String(data.ticker ?? ""),
      actor: String(data.creator ?? ""),
      initAmount: 0n,
      tokenAmount: 0n,
    };
  }
  if (type_tag.endsWith("::bonding_curve::Graduated")) {
    return {
      hash,
      height,
      kind: "graduated",
      ticker: String(data.ticker ?? ""),
      actor: "",
      initAmount: BigInt(String(data.final_reserve ?? "0")),
      tokenAmount: BigInt(String(data.final_supply ?? "0")),
    };
  }
  if (type_tag.endsWith("::bonding_curve::FeesClaimed")) {
    return {
      hash,
      height,
      kind: "claim",
      ticker: String(data.ticker ?? ""),
      actor: String(data.creator ?? ""),
      initAmount: BigInt(String(data.amount ?? "0")),
      tokenAmount: 0n,
    };
  }
  return null;
}

type TxRow = {
  hash?: string;
  height?: string;
  tx_result?: { code?: number; events?: MoveEvent[] };
};

async function fetchByAction(action: string, perPage: number): Promise<TxRow[]> {
  const query = encodeURIComponent(`"message.action='${action}'"`);
  const url = `${APPCHAIN.rpc}/tx_search?query=${query}&per_page=${perPage}&order_by=%22desc%22`;
  const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) return [];
  const json = (await res.json()) as { result?: { txs?: TxRow[] } };
  return json.result?.txs ?? [];
}

async function fetchActivity(limit: number): Promise<ActivityEvent[]> {
  if (!APPCHAIN_RPC_AVAILABLE) return [];
  const perPage = Math.max(50, limit * 3);
  // Direct MsgExecuteJSON (wallet signs each tx) + authz MsgExec (auto-sign).
  const [direct, wrapped] = await Promise.all([
    fetchByAction("/initia.move.v1.MsgExecuteJSON", perPage),
    fetchByAction("/cosmos.authz.v1beta1.MsgExec", perPage),
  ]);
  const txs = [...direct, ...wrapped].sort(
    (a, b) => Number(b.height ?? 0) - Number(a.height ?? 0),
  );
  const out: ActivityEvent[] = [];
  for (const tx of txs) {
    if ((tx.tx_result?.code ?? 1) !== 0) continue;
    const events = tx.tx_result?.events ?? [];
    const height = Number(tx.height ?? 0);
    const hash = tx.hash ?? "";
    for (const ev of events) {
      if (ev.type !== "move") continue;
      const attrs: Record<string, string> = {};
      for (const a of ev.attributes ?? []) {
        if (a.key && a.value !== undefined) attrs[a.key] = a.value;
      }
      const typeTag = attrs.type_tag ?? "";
      if (!typeTag) continue;
      let data: Record<string, unknown> = {};
      try {
        data = JSON.parse(attrs.data ?? "{}") as Record<string, unknown>;
      } catch {
        continue;
      }
      const parsed = parseEvent(typeTag, data, hash, height);
      if (parsed) {
        out.push(parsed);
        if (out.length >= limit) return out;
      }
    }
  }
  return out;
}

/**
 * Polls the rollup for the most recent social signals across ALL tokens
 * (buys, sells, launches, pool creations, graduations, fee claims).
 * Drives the sticky global activity ticker.
 */
export function useGlobalActivity(limit = 30, pollMs = 10_000) {
  return useQuery({
    queryKey: ["globalActivity", APPCHAIN.rpc, limit],
    queryFn: () => fetchActivity(limit),
    enabled: APPCHAIN_RPC_AVAILABLE,
    refetchInterval: pollMs,
    staleTime: 4_000,
    retry: 1,
  });
}
