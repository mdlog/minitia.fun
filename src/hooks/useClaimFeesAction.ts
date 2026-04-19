import { useCallback, useState } from "react";
import { useInterwovenKit } from "@initia/interwovenkit-react";
import { APPCHAIN, APPCHAIN_RPC_AVAILABLE } from "@/lib/initia";
import { useToast } from "@/components/ui/Toast";
import { useTxHistory } from "@/hooks/useTxHistory";

const MSG_EXECUTE_JSON = "/initia.move.v1.MsgExecuteJSON";

export interface ClaimFeesResult {
  txHash: string;
  height: number;
  ticker: string;
  explorerUrl: string;
}

export function useClaimFeesAction() {
  const kit = useInterwovenKit();
  const toast = useToast();
  const history = useTxHistory(kit.initiaAddress);
  const [isPending, setPending] = useState(false);

  const claim = useCallback(
    async (ticker: string): Promise<ClaimFeesResult | undefined> => {
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
      const summary = `Claim $${upper} fees`;
      const pendingId = toast.push({
        tone: "loading",
        title: summary,
        description: "Calling bonding_curve::claim_fees…",
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
              functionName: "claim_fees",
              typeArgs: [],
              args: [`"${APPCHAIN.deployedAddress}"`, JSON.stringify(upper)],
            },
          },
        ];

        const memo = JSON.stringify({
          app: "minitia.fun",
          action: "claim_fees",
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
