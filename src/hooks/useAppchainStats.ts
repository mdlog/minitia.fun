import { useQuery } from "@tanstack/react-query";
import { APPCHAIN, APPCHAIN_RPC_AVAILABLE } from "@/lib/initia";

export interface AppchainStats {
  launchesOnChain: number;
  msgExecuteCount: number;
  registryInitialized: boolean;
  deployedAddress: string;
  chainId: string;
  enabled: boolean;
}

async function fetchStats(): Promise<AppchainStats> {
  if (!APPCHAIN_RPC_AVAILABLE) {
    return {
      launchesOnChain: 0,
      msgExecuteCount: 0,
      registryInitialized: false,
      deployedAddress: APPCHAIN.deployedAddress,
      chainId: APPCHAIN.chainId,
      enabled: false,
    };
  }

  // Every MsgExecute against our rollup — initialize + launch + mark_graduated.
  const execUrl = `${APPCHAIN.rpc}/tx_search?query=${encodeURIComponent(
    `"message.action='/initia.move.v1.MsgExecute'"`,
  )}&per_page=100`;
  const execRes = await fetch(execUrl, { signal: AbortSignal.timeout(6000) });
  if (!execRes.ok) throw new Error(`rollup tx_search ${execRes.status}`);
  const execJson = (await execRes.json()) as {
    result?: { txs?: Array<{ tx_result?: { code?: number; log?: string; events?: unknown[] } }> };
  };
  const execTxs = execJson.result?.txs ?? [];

  // Filter successful txs only, then classify by function_name event attribute.
  const successful = execTxs.filter((t) => (t.tx_result?.code ?? 0) === 0);
  let launches = 0;
  let inits = 0;
  for (const t of successful) {
    const log = t.tx_result?.log ?? "";
    if (log.includes("launch") || log.includes("TokenLaunched")) launches += 1;
    else if (log.includes("initialize")) inits += 1;
  }
  // If we can't classify from log, fall back to heuristic: first tx = initialize, rest = launches.
  if (launches === 0 && successful.length > 1) {
    launches = successful.length - 1;
    inits = 1;
  }

  return {
    launchesOnChain: launches,
    msgExecuteCount: successful.length,
    registryInitialized: inits > 0 || successful.length > 0,
    deployedAddress: APPCHAIN.deployedAddress,
    chainId: APPCHAIN.chainId,
    enabled: true,
  };
}

/**
 * Live stats from the Minitia.fun rollup via its public RPC tunnel.
 * Returns enabled=false when no VITE_APPCHAIN_RPC is configured — UI then
 * falls back to mock data.
 */
export function useAppchainStats(pollMs = 15_000) {
  return useQuery({
    queryKey: ["appchainStats", APPCHAIN.rpc],
    queryFn: fetchStats,
    refetchInterval: pollMs,
    staleTime: 5_000,
    retry: 1,
    enabled: APPCHAIN_RPC_AVAILABLE,
  });
}
