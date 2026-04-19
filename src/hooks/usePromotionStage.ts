import { useCallback, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useInterwovenKit } from "@initia/interwovenkit-react";
import { APPCHAIN, APPCHAIN_RPC_AVAILABLE } from "@/lib/initia";
import { useToast } from "@/components/ui/Toast";

const VIEW_URL = `${APPCHAIN.rest}/initia/move/v1/view/json`;
const MSG_EXECUTE_JSON = "/initia.move.v1.MsgExecuteJSON";

export interface PromotionStage {
  exists: boolean;
  /** 0 = staged (awaiting spawn), 1 = live (rollup recorded). */
  status: 0 | 1;
  creator: string;
  finalReserve: bigint;
  finalSupply: bigint;
  rollupChainId: string;
  rollupRpc: string;
  firstBlockTx: string;
}

async function viewJson<T>(moduleName: string, fn: string, args: string[]): Promise<T | undefined> {
  try {
    const res = await fetch(VIEW_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        address: APPCHAIN.deployedAddress,
        module_name: moduleName,
        function_name: fn,
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

async function fetchStage(ticker: string): Promise<PromotionStage> {
  const empty: PromotionStage = {
    exists: false,
    status: 0,
    creator: "",
    finalReserve: 0n,
    finalSupply: 0n,
    rollupChainId: "",
    rollupRpc: "",
    firstBlockTx: "",
  };
  if (!APPCHAIN_RPC_AVAILABLE || !ticker) return empty;

  const registryArg = `"${APPCHAIN.deployedAddress}"`;
  const tickerArg = JSON.stringify(ticker.toUpperCase());

  const exists = await viewJson<boolean>("liquidity_migrator", "stage_exists", [
    registryArg,
    tickerArg,
  ]);
  if (!exists) return empty;

  // stage_of returns (creator, final_reserve, final_supply, status, chain_id, rpc, first_block_tx)
  const tuple = await viewJson<[string, string, string, number, string, string, string]>(
    "liquidity_migrator",
    "stage_of",
    [registryArg, tickerArg],
  );
  if (!tuple || tuple.length < 7) return empty;

  return {
    exists: true,
    status: (Number(tuple[3]) === 1 ? 1 : 0) as 0 | 1,
    creator: tuple[0],
    finalReserve: BigInt(tuple[1]),
    finalSupply: BigInt(tuple[2]),
    rollupChainId: tuple[4],
    rollupRpc: tuple[5],
    firstBlockTx: tuple[6],
  };
}

export function usePromotionStage(ticker: string, pollMs = 10_000) {
  return useQuery({
    queryKey: ["promotionStage", APPCHAIN.rest, ticker],
    queryFn: () => fetchStage(ticker),
    enabled: APPCHAIN_RPC_AVAILABLE && Boolean(ticker),
    refetchInterval: pollMs,
    staleTime: 5_000,
    retry: 1,
  });
}

export function useStagePromotionAction() {
  const kit = useInterwovenKit();
  const toast = useToast();
  const [isPending, setPending] = useState(false);

  const stage = useCallback(
    async (ticker: string): Promise<boolean> => {
      if (!APPCHAIN_RPC_AVAILABLE) {
        toast.push({ tone: "error", title: "Appchain RPC unavailable" });
        return false;
      }
      if (!kit.isConnected || !kit.initiaAddress) {
        toast.push({ tone: "info", title: "Connect a wallet to continue" });
        kit.openConnect();
        return false;
      }
      const upper = ticker.toUpperCase();
      const pendingId = toast.push({
        tone: "loading",
        title: `Stage $${upper} promotion`,
        description: "Signing liquidity_migrator::stage_promotion…",
      });
      setPending(true);
      try {
        const result = await kit.requestTxBlock({
          chainId: APPCHAIN.chainId,
          messages: [
            {
              typeUrl: MSG_EXECUTE_JSON,
              value: {
                sender: kit.initiaAddress,
                moduleAddress: APPCHAIN.deployedAddress,
                moduleName: "liquidity_migrator",
                functionName: "stage_promotion",
                typeArgs: [],
                args: [
                  `"${APPCHAIN.deployedAddress}"`,
                  `"${APPCHAIN.deployedAddress}"`,
                  JSON.stringify(upper),
                ],
              },
            },
          ],
          memo: JSON.stringify({
            app: "minitia.fun",
            action: "stage_promotion",
            ticker: upper,
            ts: Date.now(),
          }),
        });
        if (result.code !== 0) throw new Error(result.rawLog || `code ${result.code}`);
        const explorerUrl = `${APPCHAIN.rpc}/tx?hash=0x${result.transactionHash}`;
        toast.update(pendingId, {
          tone: "success",
          title: `$${upper} promotion staged`,
          description: `height ${result.height} -- promoter daemon will prepare the rollup`,
          link: { href: explorerUrl, label: "View tx" },
        });
        return true;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        toast.update(pendingId, {
          tone: "error",
          title: "Stage failed",
          description: msg.slice(0, 240),
        });
        return false;
      } finally {
        setPending(false);
      }
    },
    [kit, toast],
  );

  return { stage, isPending };
}
