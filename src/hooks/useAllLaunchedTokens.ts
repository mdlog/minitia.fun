import { useQuery } from "@tanstack/react-query";
import { APPCHAIN, APPCHAIN_RPC_AVAILABLE } from "@/lib/initia";

export interface LaunchedToken {
  ticker: string;
  name: string;
  creator: string;
  subdomain: string;
  launchIndex: number;
  launchHash: string;
  launchHeight: number;
  // Bonding-curve pool state (undefined = not yet created)
  poolExists: boolean;
  initReserve: bigint;
  tokenSupply: bigint;
  basePrice: bigint;
  slope: bigint;
  feeAccumulated: bigint;
  tradeCount: number;
  graduated: boolean;
  spotPrice: bigint;
}

interface MoveEventAttr {
  key?: string;
  value?: string;
}
interface MoveEvent {
  type?: string;
  attributes?: MoveEventAttr[];
}

const VIEW_URL = `${APPCHAIN.rest}/initia/move/v1/view/json`;
const GRADUATION_INIT_RESERVE = 5_000_000_000n; // 5_000 INIT in umin

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

async function fetchPoolForTicker(ticker: string) {
  const registryArg = `"${APPCHAIN.deployedAddress}"`;
  const tickerArg = JSON.stringify(ticker);
  const exists = await moveView<boolean>("bonding_curve", "pool_exists", [registryArg, tickerArg]);
  if (exists !== true) {
    return {
      poolExists: false,
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
  const tuple = await moveView<string[]>("bonding_curve", "pool_state", [registryArg, tickerArg]);
  if (!tuple || tuple.length < 7) {
    return {
      poolExists: true,
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
  const [reserve, supply, base, slope, fee, count, graduated] = tuple.map((s) => BigInt(s));
  const spot = base + (supply * slope) / 1_000_000n;
  return {
    poolExists: true,
    initReserve: reserve,
    tokenSupply: supply,
    basePrice: base,
    slope,
    feeAccumulated: fee,
    tradeCount: Number(count),
    graduated: graduated === 1n,
    spotPrice: spot,
  };
}

async function fetchLaunched(limit: number): Promise<LaunchedToken[]> {
  if (!APPCHAIN_RPC_AVAILABLE) return [];

  const query = encodeURIComponent(`"message.action='/initia.move.v1.MsgExecuteJSON'"`);
  const url = `${APPCHAIN.rpc}/tx_search?query=${query}&per_page=${limit * 4}&order_by=%22desc%22`;
  const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) return [];
  const json = (await res.json()) as {
    result?: {
      txs?: Array<{
        hash?: string;
        height?: string;
        tx_result?: { code?: number; events?: MoveEvent[] };
      }>;
    };
  };
  const txs = json.result?.txs ?? [];

  const seen = new Set<string>();
  const launches: Array<Omit<LaunchedToken, keyof Awaited<ReturnType<typeof fetchPoolForTicker>>>> = [];

  for (const tx of txs) {
    if ((tx.tx_result?.code ?? 1) !== 0) continue;
    const events = tx.tx_result?.events ?? [];
    for (const ev of events) {
      if (ev.type !== "move") continue;
      const attrs: Record<string, string> = {};
      for (const a of ev.attributes ?? []) {
        if (a.key && a.value !== undefined) attrs[a.key] = a.value;
      }
      if (!attrs.type_tag?.endsWith("::token_factory::TokenLaunched")) continue;
      let data: Record<string, string> = {};
      try {
        data = JSON.parse(attrs.data ?? "{}") as Record<string, string>;
      } catch {
        continue;
      }
      const ticker = (data.ticker ?? "").toUpperCase();
      if (!ticker || seen.has(ticker)) continue;
      seen.add(ticker);
      launches.push({
        ticker,
        name: data.name ?? ticker,
        creator: data.creator ?? "",
        subdomain: data.subdomain ?? `${ticker}.fun.init`,
        launchIndex: Number(data.launch_index ?? 0),
        launchHash: tx.hash ?? "",
        launchHeight: Number(tx.height ?? 0),
      });
      if (launches.length >= limit) break;
    }
    if (launches.length >= limit) break;
  }

  const pools = await Promise.all(launches.map((l) => fetchPoolForTicker(l.ticker)));
  return launches.map((l, i) => ({ ...l, ...pools[i] }));
}

export function useAllLaunchedTokens(limit = 50, pollMs = 12_000) {
  return useQuery({
    queryKey: ["allLaunchedTokens", APPCHAIN.rpc, APPCHAIN.rest, limit],
    queryFn: () => fetchLaunched(limit),
    enabled: APPCHAIN_RPC_AVAILABLE,
    refetchInterval: pollMs,
    staleTime: 6_000,
    retry: 1,
  });
}

export function graduationProgress(initReserve: bigint): number {
  if (initReserve <= 0n) return 0;
  const pct = Number((initReserve * 10_000n) / GRADUATION_INIT_RESERVE) / 100;
  return Math.min(100, Math.max(0, pct));
}

export { GRADUATION_INIT_RESERVE };
