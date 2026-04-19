import { useQuery } from "@tanstack/react-query";
import { APPCHAIN, APPCHAIN_RPC_AVAILABLE } from "@/lib/initia";

export interface MoveTx {
  hash: string;
  height: number;
  code: number;
  gasUsed: string;
  gasWanted: string;
  action: "initialize" | "launch" | "mark_graduated" | "deploy" | "other";
  log: string;
}

function classifyTx(log: string): MoveTx["action"] {
  if (log.includes("token_factory::launch") || log.includes("TokenLaunched") || log.includes("\"launch\"")) return "launch";
  if (log.includes("token_factory::initialize") || log.includes("\"initialize\"")) return "initialize";
  if (log.includes("mark_graduated") || log.includes("TokenGraduated")) return "mark_graduated";
  if (log.includes("MsgPublish")) return "deploy";
  return "other";
}

async function fetchMoveTxs(count: number): Promise<MoveTx[]> {
  if (!APPCHAIN_RPC_AVAILABLE) return [];

  const query = encodeURIComponent(`"message.action='/initia.move.v1.MsgExecute'"`);
  const url = `${APPCHAIN.rpc}/tx_search?query=${query}&per_page=${count}&order_by=%22desc%22`;
  const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
  if (!res.ok) throw new Error(`tx_search ${res.status}`);
  const json = (await res.json()) as {
    result?: {
      txs?: Array<{
        hash?: string;
        height?: string;
        tx_result?: { code?: number; log?: string; gas_used?: string; gas_wanted?: string };
      }>;
    };
  };
  const txs = json.result?.txs ?? [];
  return txs.map((t) => {
    const log = t.tx_result?.log ?? "";
    return {
      hash: t.hash ?? "",
      height: Number(t.height ?? 0),
      code: t.tx_result?.code ?? 0,
      gasUsed: t.tx_result?.gas_used ?? "0",
      gasWanted: t.tx_result?.gas_wanted ?? "0",
      action: classifyTx(log),
      log,
    };
  });
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
