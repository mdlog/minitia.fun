import { useQuery } from "@tanstack/react-query";
import { APPCHAIN, APPCHAIN_RPC_AVAILABLE } from "@/lib/initia";

export interface PoolState {
  ticker: string;
  exists: boolean;
  initReserve: bigint;
  tokenSupply: bigint;
  basePrice: bigint;
  slope: bigint;
  feeAccumulated: bigint;
  tradeCount: number;
  graduated: boolean;
  /** micro-INIT per token */
  spotPrice: bigint;
}

const VIEW_BASE = "/initia/move/v1/view/json";

async function moveView<T = unknown>(
  moduleAddr: string,
  moduleName: string,
  functionName: string,
  args: string[],
): Promise<T | undefined> {
  if (!APPCHAIN.rest) return undefined;
  const body = {
    address: moduleAddr,
    module_name: moduleName,
    function_name: functionName,
    type_args: [],
    args,
  };
  const res = await fetch(`${APPCHAIN.rest}${VIEW_BASE}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(6000),
  });
  if (!res.ok) return undefined;
  const json = (await res.json()) as { data?: string };
  if (!json.data) return undefined;
  try {
    return JSON.parse(json.data) as T;
  } catch {
    return undefined;
  }
}

function spotPriceMicroInit(supply: bigint, basePrice: bigint, slope: bigint): bigint {
  // base + (supply * slope) / 1_000_000  (matches the Move math)
  return basePrice + (supply * slope) / 1_000_000n;
}

async function fetchPool(ticker: string): Promise<PoolState | undefined> {
  if (!APPCHAIN_RPC_AVAILABLE || !ticker) return undefined;
  const tickerArg = JSON.stringify(ticker);
  const exists = await moveView<boolean>(
    APPCHAIN.deployedAddress,
    "bonding_curve",
    "pool_exists",
    [`"${APPCHAIN.deployedAddress}"`, tickerArg],
  );
  if (exists === false || exists === undefined) {
    return {
      ticker,
      exists: false,
      initReserve: 0n,
      tokenSupply: 0n,
      basePrice: 0n,
      slope: 0n,
      feeAccumulated: 0n,
      tradeCount: 0,
      graduated: false,
      spotPrice: 0n,
    };
  }
  const tuple = await moveView<string[]>(
    APPCHAIN.deployedAddress,
    "bonding_curve",
    "pool_state",
    [`"${APPCHAIN.deployedAddress}"`, tickerArg],
  );
  if (!tuple || tuple.length < 7) return undefined;
  const [reserve, supply, base, slope, fee, count, graduated] = tuple.map((s) => BigInt(s));
  return {
    ticker,
    exists: true,
    initReserve: reserve,
    tokenSupply: supply,
    basePrice: base,
    slope,
    feeAccumulated: fee,
    tradeCount: Number(count),
    graduated: graduated === 1n,
    spotPrice: spotPriceMicroInit(supply, base, slope),
  };
}

export function usePoolState(ticker: string, pollMs = 8_000) {
  return useQuery({
    queryKey: ["poolState", APPCHAIN.rest, ticker],
    queryFn: () => fetchPool(ticker),
    enabled: APPCHAIN_RPC_AVAILABLE && Boolean(ticker),
    refetchInterval: pollMs,
    staleTime: 3_000,
    retry: 1,
  });
}

export async function fetchUserHolding(holder: string, ticker: string): Promise<bigint> {
  if (!APPCHAIN.rest || !holder || !ticker) return 0n;
  const result = await moveView<string>(
    APPCHAIN.deployedAddress,
    "bonding_curve",
    "balance_of",
    [`"${APPCHAIN.deployedAddress}"`, `"${holder}"`, JSON.stringify(ticker)],
  );
  return result ? BigInt(result) : 0n;
}

export function useUserHolding(holder: string | undefined, ticker: string, pollMs = 10_000) {
  return useQuery({
    queryKey: ["userHolding", holder, ticker, APPCHAIN.rest],
    queryFn: () => fetchUserHolding(holder ?? "", ticker),
    enabled: APPCHAIN_RPC_AVAILABLE && Boolean(holder) && Boolean(ticker),
    refetchInterval: pollMs,
    staleTime: 3_000,
    retry: 1,
  });
}
