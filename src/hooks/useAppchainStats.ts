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

const VIEW_URL = `${APPCHAIN.rest}/initia/move/v1/view/json`;

async function moveView<T>(
  moduleName: string,
  functionName: string,
  args: string[],
): Promise<T | undefined> {
  if (!APPCHAIN.rest) return undefined;
  try {
    const res = await fetch(VIEW_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        address: APPCHAIN.deployedAddress,
        module_name: moduleName,
        function_name: functionName,
        type_args: [],
        args,
      }),
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return undefined;
    const json = (await res.json()) as { data?: string };
    if (!json.data) return undefined;
    return JSON.parse(json.data) as T;
  } catch {
    return undefined;
  }
}

async function countTxs(typeUrl: string): Promise<number> {
  const q = encodeURIComponent(`"message.action='${typeUrl}'"`);
  const res = await fetch(`${APPCHAIN.rpc}/tx_search?query=${q}&per_page=1`, {
    signal: AbortSignal.timeout(6000),
  });
  if (!res.ok) return 0;
  const json = (await res.json()) as { result?: { total_count?: string } };
  return Number(json.result?.total_count ?? 0);
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

  // Authoritative count straight from the module registry.
  const countStr = await moveView<string>("token_factory", "count", [
    `"${APPCHAIN.deployedAddress}"`,
  ]);
  const launchesOnChain = countStr ? Number(countStr) : 0;

  // Total Move tx volume = classic MsgExecute + the JSON variant (which is
  // what the UI + most wallets use now). Use tx_search's total_count so we
  // don't cap at per_page.
  const [legacyCount, jsonCount] = await Promise.all([
    countTxs("/initia.move.v1.MsgExecute"),
    countTxs("/initia.move.v1.MsgExecuteJSON"),
  ]);

  return {
    launchesOnChain,
    msgExecuteCount: legacyCount + jsonCount,
    registryInitialized: launchesOnChain > 0 || legacyCount + jsonCount > 0,
    deployedAddress: APPCHAIN.deployedAddress,
    chainId: APPCHAIN.chainId,
    enabled: true,
  };
}

/**
 * Live stats from the Minitia.fun rollup. Uses token_factory::count for
 * the authoritative launch count (the RPC tx_search approach missed every
 * MsgExecuteJSON-based launch since the UI switched to it). msgExecuteCount
 * is the sum across both MsgExecute + MsgExecuteJSON via tx_search
 * total_count so we never truncate.
 */
export function useAppchainStats(pollMs = 15_000) {
  return useQuery({
    queryKey: ["appchainStats", APPCHAIN.rpc, APPCHAIN.rest],
    queryFn: fetchStats,
    refetchInterval: pollMs,
    staleTime: 5_000,
    retry: 1,
    enabled: APPCHAIN_RPC_AVAILABLE,
  });
}
