import { useCallback, useState } from "react";
import { useInterwovenKit } from "@initia/interwovenkit-react";
import { APPCHAIN, APPCHAIN_RPC_AVAILABLE } from "@/lib/initia";
import { useToast } from "@/components/ui/Toast";
import { useTxHistory } from "@/hooks/useTxHistory";

const MSG_EXECUTE_JSON = "/initia.move.v1.MsgExecuteJSON";

export interface ClaimReserveResult {
  txHash: string;
  height: number;
  ticker: string;
  explorerUrl: string;
}

/**
 * One-shot withdrawal of the ENTIRE reserve (custodied umin) from a
 * graduated pool — intended for seeding DEX liquidity, funding the sovereign
 * rollup's treasury, or airdropping to holders on the new chain.
 *
 * Contract guardrails (bonding_curve::claim_reserve):
 *   - caller must be pool creator
 *   - pool.graduated == true
 *   - pool.init_reserve > 0  (aborts with E_NO_RESERVE on re-entry)
 */
export function useClaimReserveAction() {
  const kit = useInterwovenKit();
  const toast = useToast();
  const history = useTxHistory(kit.initiaAddress);
  const [isPending, setPending] = useState(false);

  const claim = useCallback(
    async (ticker: string): Promise<ClaimReserveResult | undefined> => {
      if (!APPCHAIN_RPC_AVAILABLE) {
        toast.push({ tone: "error", title: "Appchain RPC unavailable" });
        return undefined;
      }
      if (!kit.isConnected || !kit.initiaAddress) {
        toast.push({ tone: "info", title: "Connect a wallet to continue" });
        kit.openConnect();
        return undefined;
      }

      const upper = ticker.toUpperCase();
      const summary = `Claim $${upper} reserve`;
      const pendingId = toast.push({
        tone: "loading",
        title: summary,
        description: "Calling bonding_curve::claim_reserve…",
      });

      setPending(true);
      try {
        const messages = [
          {
            typeUrl: MSG_EXECUTE_JSON,
            value: {
              sender: kit.initiaAddress,
              moduleAddress: APPCHAIN.deployedAddress,
              moduleName: "bonding_curve",
              functionName: "claim_reserve",
              typeArgs: [],
              args: [`"${APPCHAIN.deployedAddress}"`, JSON.stringify(upper)],
            },
          },
        ];

        const memo = JSON.stringify({
          app: "minitia.fun",
          action: "claim_reserve",
          ticker: upper,
          ts: Date.now(),
        });

        const result = await kit.requestTxBlock({
          chainId: APPCHAIN.chainId,
          messages,
          memo,
        });

        if (result.code !== 0) {
          throw new Error(result.rawLog || `code ${result.code}`);
        }

        const explorerUrl = `${APPCHAIN.rpc}/tx?hash=0x${result.transactionHash}`;
        history.push({
          hash: result.transactionHash,
          kind: "claim",
          chainId: APPCHAIN.chainId,
          summary,
        });

        toast.update(pendingId, {
          tone: "success",
          title: `${summary} confirmed`,
          description: `height ${result.height}`,
          link: { href: explorerUrl, label: "View tx" },
        });

        return {
          txHash: result.transactionHash,
          height: result.height,
          ticker: upper,
          explorerUrl,
        };
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        toast.update(pendingId, {
          tone: "error",
          title: `${summary} failed`,
          description: msg.slice(0, 240),
        });
        return undefined;
      } finally {
        setPending(false);
      }
    },
    [kit, toast, history],
  );

  return { claim, isPending };
}
