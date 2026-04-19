import { useQuery } from "@tanstack/react-query";
import { APPCHAIN, APPCHAIN_RPC_AVAILABLE, INITIA } from "@/lib/initia";

export interface NetworkStatus {
  blockHeight: number;
  blockTimeMs: number;
  chainId: string;
  healthy: boolean;
  source: "appchain" | "l1";
}

async function fetchStatus(rpc: string, source: "appchain" | "l1"): Promise<NetworkStatus> {
  const res = await fetch(`${rpc}/status`, { signal: AbortSignal.timeout(5000) });
  if (!res.ok) throw new Error(`rpc status ${res.status}`);
  const json = (await res.json()) as {
    result?: {
      sync_info?: { latest_block_height?: string; latest_block_time?: string };
      node_info?: { network?: string };
    };
  };
  const sync = json.result?.sync_info;
  const height = Number(sync?.latest_block_height ?? 0);
  const blockTime = sync?.latest_block_time ? new Date(sync.latest_block_time).getTime() : 0;
  const healthy = height > 0 && Date.now() - blockTime < 120_000;
  return {
    blockHeight: height,
    blockTimeMs: blockTime,
    chainId: json.result?.node_info?.network ?? (source === "appchain" ? APPCHAIN.chainId : INITIA.chainId),
    healthy,
    source,
  };
}

/**
 * Polls the primary network for live block height + health.
 * Prefers the Minitia.fun appchain rollup (when VITE_APPCHAIN_RPC is set)
 * so the Network card reflects OUR own chain; falls back to L1 testnet.
 */
export function useNetworkStatus(pollMs = 5_000) {
  const useAppchain = APPCHAIN_RPC_AVAILABLE;
  const rpc = useAppchain ? APPCHAIN.rpc : INITIA.rpc;
  const source: "appchain" | "l1" = useAppchain ? "appchain" : "l1";

  return useQuery({
    queryKey: ["networkStatus", rpc, source],
    queryFn: () => fetchStatus(rpc, source),
    refetchInterval: pollMs,
    staleTime: 2_000,
    retry: 1,
  });
}
