import { useQuery } from "@tanstack/react-query";
import { APPCHAIN, APPCHAIN_RPC_AVAILABLE } from "@/lib/initia";

export interface MoveTx {
  hash: string;
  height: number;
  code: number;
  gasUsed: string;
  gasWanted: string;
  action:
    | "initialize"
    | "launch"
    | "create_pool"
    | "buy"
    | "sell"
    | "claim_fees"
    | "comment"
    | "graduated"
    | "mark_graduated"
    | "deploy"
    | "other";
  log: string;
}

interface MoveEventAttr {
  key?: string;
  value?: string;
}
interface MoveEvent {
  type?: string;
  attributes?: MoveEventAttr[];
}

/** Inspect the tx's move events to classify by emitted event type_tag. */
function classifyByEvents(events: MoveEvent[]): MoveTx["action"] {
  for (const ev of events ?? []) {
    if (ev.type !== "move") continue;
    for (const a of ev.attributes ?? []) {
      if (a.key !== "type_tag" || !a.value) continue;
      const t = a.value;
      if (t.endsWith("::bonding_curve::Trade")) {
        // side 0 = buy, 1 = sell -- need data to refine
        const dataAttr = ev.attributes?.find((x) => x.key === "data")?.value;
        if (dataAttr) {
          try {
            const d = JSON.parse(dataAttr) as { side?: number | string };
            return Number(d.side ?? -1) === 0 ? "buy" : "sell";
          } catch {
            /* fall through */
          }
        }
        return "buy";
      }
      if (t.endsWith("::bonding_curve::PoolCreated")) return "create_pool";
      if (t.endsWith("::bonding_curve::Graduated")) return "graduated";
      if (t.endsWith("::bonding_curve::FeesClaimed")) return "claim_fees";
      if (t.endsWith("::token_factory::TokenLaunched")) return "launch";
      if (t.endsWith("::token_factory::TokenGraduated")) return "mark_graduated";
      if (t.endsWith("::comments::CommentPosted")) return "comment";
    }
  }
  return "other";
}

/** Fallback classifier when move events are absent (rare). */
function classifyByLog(log: string): MoveTx["action"] {
  if (log.includes("token_factory::launch") || log.includes("TokenLaunched")) return "launch";
  if (log.includes("bonding_curve::create_pool") || log.includes("PoolCreated")) return "create_pool";
  if (log.includes("bonding_curve::buy")) return "buy";
  if (log.includes("bonding_curve::sell")) return "sell";
  if (log.includes("bonding_curve::claim_fees")) return "claim_fees";
  if (log.includes("comments::post") || log.includes("CommentPosted")) return "comment";
  if (log.includes("mark_graduated") || log.includes("TokenGraduated")) return "mark_graduated";
  if (log.includes("token_factory::initialize")) return "initialize";
  if (log.includes("MsgPublish")) return "deploy";
  return "other";
}

async function fetchByTypeUrl(
  typeUrl: string,
  count: number,
): Promise<MoveTx[]> {
  const query = encodeURIComponent(`"message.action='${typeUrl}'"`);
  const url = `${APPCHAIN.rpc}/tx_search?query=${query}&per_page=${count}&order_by=%22desc%22`;
  const res = await fetch(url, { signal: AbortSignal.timeout(7000) });
  if (!res.ok) return [];
  const json = (await res.json()) as {
    result?: {
      txs?: Array<{
        hash?: string;
        height?: string;
        tx_result?: {
          code?: number;
          log?: string;
          gas_used?: string;
          gas_wanted?: string;
          events?: MoveEvent[];
        };
      }>;
    };
  };
  const txs = json.result?.txs ?? [];
  return txs.map((t) => {
    const events = t.tx_result?.events ?? [];
    const log = t.tx_result?.log ?? "";
    const byEv = classifyByEvents(events);
    return {
      hash: t.hash ?? "",
      height: Number(t.height ?? 0),
      code: t.tx_result?.code ?? 0,
      gasUsed: t.tx_result?.gas_used ?? "0",
      gasWanted: t.tx_result?.gas_wanted ?? "0",
      action: byEv !== "other" ? byEv : classifyByLog(log),
      log,
    };
  });
}

async function fetchMoveTxs(count: number): Promise<MoveTx[]> {
  if (!APPCHAIN_RPC_AVAILABLE) return [];
  // The UI + wallets drive MsgExecuteJSON; legacy CLI tests use MsgExecute.
  // Pull both, dedupe by hash, sort by height desc, trim to `count`.
  const [legacy, jsonForm] = await Promise.all([
    fetchByTypeUrl("/initia.move.v1.MsgExecute", count),
    fetchByTypeUrl("/initia.move.v1.MsgExecuteJSON", count),
  ]);
  const byHash = new Map<string, MoveTx>();
  for (const t of [...legacy, ...jsonForm]) {
    if (!t.hash) continue;
    const existing = byHash.get(t.hash);
    if (!existing || existing.height < t.height) byHash.set(t.hash, t);
  }
  return [...byHash.values()].sort((a, b) => b.height - a.height).slice(0, count);
}

export function useRecentMoveTxs(count = 20, pollMs = 10_000) {
  return useQuery({
    queryKey: ["recentMoveTxs", APPCHAIN.rpc, count],
    queryFn: () => fetchMoveTxs(count),
    refetchInterval: pollMs,
    staleTime: 3_000,
    retry: 1,
    enabled: APPCHAIN_RPC_AVAILABLE,
  });
}
