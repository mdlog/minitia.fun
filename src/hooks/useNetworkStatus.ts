import { useQuery } from "@tanstack/react-query";
import { INITIA } from "@/lib/initia";

export interface NetworkStatus {
  blockHeight: number;
  blockTimeMs: number;
  chainId: string;
  healthy: boolean;
}

async function fetchStatus(): Promise<NetworkStatus> {
  // RPC `/status` on CometBFT returns sync_info.latest_block_height and latest_block_time.
  const res = await fetch(`${INITIA.rpc}/status`, { signal: AbortSignal.timeout(5000) });
  if (!res.ok) throw new Error(`rpc status ${res.status}`);
  const json = (await res.json()) as {
    result?: {
      sync_info?: {
        latest_block_height?: string;
        latest_block_time?: string;
      };
      node_info?: { network?: string };
    };
  };
  const sync = json.result?.sync_info;
  const height = Number(sync?.latest_block_height ?? 0);
  const blockTime = sync?.latest_block_time ? new Date(sync.latest_block_time).getTime() : 0;
  const healthy = height > 0 && Date.now() - blockTime < 120_000; // fresh within 2 min

  return {
    blockHeight: height,
    blockTimeMs: blockTime,
    chainId: json.result?.node_info?.network ?? INITIA.chainId,
    healthy,
  };
}

/**
 * Polls the Initia RPC `/status` endpoint for live block height + health.
 * Falls back silently; surfaces `undefined` data on failure, never throws.
 */
export function useNetworkStatus(pollMs = 5_000) {
  return useQuery({
    queryKey: ["initiaStatus", INITIA.rpc],
    queryFn: fetchStatus,
    refetchInterval: pollMs,
    staleTime: 2_000,
    retry: 1,
  });
}
