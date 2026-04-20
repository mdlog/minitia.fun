import { useQuery } from "@tanstack/react-query";
import { APPCHAIN, APPCHAIN_RPC_AVAILABLE } from "@/lib/initia";

export interface BlockMeta {
  height: number;
  hash: string;
  time: string;
  numTxs: number;
  proposerAddress: string;
}

async function fetchStatus(): Promise<{ latestHeight: number }> {
  const res = await fetch(`${APPCHAIN.rpc}/status`, { signal: AbortSignal.timeout(5000) });
  const json = await res.json();
  return { latestHeight: Number(json?.result?.sync_info?.latest_block_height ?? 0) };
}

async function fetchBlocks(count: number): Promise<BlockMeta[]> {
  if (!APPCHAIN_RPC_AVAILABLE) return [];

  const { latestHeight } = await fetchStatus();
  if (latestHeight <= 0) return [];

  const minHeight = Math.max(1, latestHeight - count + 1);
  const url = `${APPCHAIN.rpc}/blockchain?minHeight=${minHeight}&maxHeight=${latestHeight}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
  if (!res.ok) throw new Error(`blockchain ${res.status}`);
  const json = (await res.json()) as {
    result?: {
      block_metas?: Array<{
        block_id?: { hash?: string };
        header?: {
          height?: string;
          time?: string;
          num_txs?: string;
          proposer_address?: string;
        };
        num_txs?: string;
      }>;
    };
  };
  const metas = json.result?.block_metas ?? [];
  return metas.map((m) => ({
    height: Number(m.header?.height ?? 0),
    hash: m.block_id?.hash ?? "",
    time: m.header?.time ?? "",
    numTxs: Number(m.num_txs ?? m.header?.num_txs ?? 0),
    proposerAddress: m.header?.proposer_address ?? "",
  }));
}

/**
 * Initial fetch of the last N blocks via `/blockchain`. Realtime updates
 * are pushed into this cache by `useNetworkStatus`, which owns the single
 * WebSocket subscription to Tendermint's `NewBlock` event.
 */
export function useRecentBlocks(count = 15, pollMs = 15_000) {
  return useQuery({
    queryKey: ["recentBlocks", APPCHAIN.rpc, count],
    queryFn: () => fetchBlocks(count),
    refetchInterval: pollMs,
    staleTime: 1_000,
    retry: 1,
    enabled: APPCHAIN_RPC_AVAILABLE,
  });
}
