import { useQuery } from "@tanstack/react-query";
import { APPCHAIN, APPCHAIN_RPC_AVAILABLE } from "@/lib/initia";

export interface BlockTxSummary {
  hash: string;
  code: number;
  gasUsed: string;
  gasWanted: string;
  messageType: string;
}

export interface BlockDetail {
  height: number;
  hash: string;
  time: string;
  chainId: string;
  proposerAddress: string;
  numTxs: number;
  dataHash: string;
  lastBlockHash: string;
  appHash: string;
  txs: BlockTxSummary[];
}

async function fetchBlockMeta(height: number): Promise<Omit<BlockDetail, "txs">> {
  const res = await fetch(`${APPCHAIN.rpc}/block?height=${height}`, {
    signal: AbortSignal.timeout(7000),
  });
  if (!res.ok) throw new Error(`block rpc ${res.status}`);
  const json = (await res.json()) as {
    result?: {
      block_id?: { hash?: string };
      block?: {
        header?: {
          height?: string;
          time?: string;
          chain_id?: string;
          proposer_address?: string;
          data_hash?: string;
          last_block_id?: { hash?: string };
          app_hash?: string;
        };
        data?: { txs?: string[] };
      };
    };
  };
  const r = json.result;
  const h = r?.block?.header;
  if (!h?.height) throw new Error("block not found");
  return {
    height: Number(h.height),
    hash: r?.block_id?.hash ?? "",
    time: h.time ?? "",
    chainId: h.chain_id ?? "",
    proposerAddress: h.proposer_address ?? "",
    numTxs: r?.block?.data?.txs?.length ?? 0,
    dataHash: h.data_hash ?? "",
    lastBlockHash: h.last_block_id?.hash ?? "",
    appHash: h.app_hash ?? "",
  };
}

async function fetchBlockTxs(height: number): Promise<BlockTxSummary[]> {
  const query = encodeURIComponent(`"tx.height=${height}"`);
  const url = `${APPCHAIN.rpc}/tx_search?query=${query}&per_page=100&order_by=%22asc%22`;
  const res = await fetch(url, { signal: AbortSignal.timeout(7000) });
  if (!res.ok) return [];
  const json = (await res.json()) as {
    result?: {
      txs?: Array<{
        hash?: string;
        tx_result?: {
          code?: number;
          gas_used?: string;
          gas_wanted?: string;
          events?: Array<{
            type?: string;
            attributes?: Array<{ key?: string; value?: string }>;
          }>;
        };
      }>;
    };
  };
  const txs = json.result?.txs ?? [];
  return txs.map((t) => {
    const events = t.tx_result?.events ?? [];
    let messageType = "";
    for (const e of events) {
      if (e.type === "message") {
        const action = e.attributes?.find((a) => a.key === "action")?.value;
        if (action) {
          messageType = action;
          break;
        }
      }
    }
    return {
      hash: t.hash ?? "",
      code: t.tx_result?.code ?? 0,
      gasUsed: t.tx_result?.gas_used ?? "0",
      gasWanted: t.tx_result?.gas_wanted ?? "0",
      messageType,
    };
  });
}

async function fetchBlockDetail(height: number): Promise<BlockDetail | null> {
  if (!APPCHAIN_RPC_AVAILABLE) return null;
  if (!Number.isInteger(height) || height < 1) throw new Error("invalid block height");
  const [meta, txs] = await Promise.all([fetchBlockMeta(height), fetchBlockTxs(height)]);
  return { ...meta, txs };
}

export function useBlockDetail(height: number) {
  return useQuery({
    queryKey: ["blockDetail", APPCHAIN.rpc, height],
    queryFn: () => fetchBlockDetail(height),
    enabled: APPCHAIN_RPC_AVAILABLE && Number.isInteger(height) && height > 0,
    staleTime: 60_000,
    retry: 1,
  });
}
