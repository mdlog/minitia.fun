import { useQuery } from "@tanstack/react-query";
import { APPCHAIN, APPCHAIN_RPC_AVAILABLE } from "@/lib/initia";

export interface TxEventAttr {
  key: string;
  value: string;
  index?: boolean;
}
export interface TxEvent {
  type: string;
  attributes: TxEventAttr[];
}

export interface TxDetail {
  hash: string;
  height: number;
  index: number;
  code: number;
  codespace: string;
  log: string;
  gasUsed: string;
  gasWanted: string;
  events: TxEvent[];
  txBase64: string;
  timestamp: string;
}

export function normalizeTxHash(h: string): string {
  return (h ?? "").replace(/^0x/i, "").toUpperCase();
}

async function fetchTxDetail(hash: string): Promise<TxDetail | null> {
  if (!APPCHAIN_RPC_AVAILABLE) return null;
  const clean = normalizeTxHash(hash);
  if (!/^[0-9A-F]{64}$/.test(clean)) throw new Error("tx hash must be 64 hex chars");

  const txRes = await fetch(`${APPCHAIN.rpc}/tx?hash=0x${clean}`, {
    signal: AbortSignal.timeout(7000),
  });
  if (!txRes.ok) throw new Error(`tx rpc ${txRes.status}`);
  const txJson = (await txRes.json()) as {
    result?: {
      hash?: string;
      height?: string;
      index?: number;
      tx_result?: {
        code?: number;
        codespace?: string;
        log?: string;
        gas_wanted?: string;
        gas_used?: string;
        events?: Array<{
          type?: string;
          attributes?: Array<{ key?: string; value?: string; index?: boolean }>;
        }>;
      };
      tx?: string;
    };
    error?: { data?: string; message?: string };
  };

  if (txJson.error) {
    throw new Error(txJson.error.message ?? txJson.error.data ?? "tx not found");
  }
  const r = txJson.result;
  if (!r) return null;

  const height = Number(r.height ?? 0);
  let timestamp = "";
  if (height > 0) {
    try {
      const blockRes = await fetch(`${APPCHAIN.rpc}/block?height=${height}`, {
        signal: AbortSignal.timeout(5000),
      });
      if (blockRes.ok) {
        const blockJson = (await blockRes.json()) as {
          result?: { block?: { header?: { time?: string } } };
        };
        timestamp = blockJson.result?.block?.header?.time ?? "";
      }
    } catch {
      /* timestamp is optional */
    }
  }

  return {
    hash: r.hash ?? clean,
    height,
    index: r.index ?? 0,
    code: r.tx_result?.code ?? 0,
    codespace: r.tx_result?.codespace ?? "",
    log: r.tx_result?.log ?? "",
    gasUsed: r.tx_result?.gas_used ?? "0",
    gasWanted: r.tx_result?.gas_wanted ?? "0",
    events: (r.tx_result?.events ?? []).map((e) => ({
      type: e.type ?? "",
      attributes: (e.attributes ?? []).map((a) => ({
        key: a.key ?? "",
        value: a.value ?? "",
        index: a.index,
      })),
    })),
    txBase64: r.tx ?? "",
    timestamp,
  };
}

export function useTxDetail(hash: string) {
  return useQuery({
    queryKey: ["txDetail", APPCHAIN.rpc, normalizeTxHash(hash)],
    queryFn: () => fetchTxDetail(hash),
    enabled: APPCHAIN_RPC_AVAILABLE && !!hash,
    staleTime: 60_000,
    retry: 1,
  });
}
