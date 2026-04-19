import { useCallback, useState } from "react";
import { useInterwovenKit } from "@initia/interwovenkit-react";
import { APPCHAIN, APPCHAIN_RPC_AVAILABLE } from "@/lib/initia";
import { useToast } from "@/components/ui/Toast";
import { useTxHistory } from "@/hooks/useTxHistory";

const MSG_EXECUTE_JSON = "/initia.move.v1.MsgExecuteJSON";

export type Side = "BUY" | "SELL";

export interface TradePayload {
  ticker: string;
  side: Side;
  /** For BUY: amount of micro-INIT to spend.
   *  For SELL: amount of micro-tokens to burn. */
  amount: bigint;
  /** Slippage protection — minimum expected output (micro-units). */
  minOut: bigint;
}

export interface TradeResult {
  txHash: string;
  height: number;
  side: Side;
  ticker: string;
  explorerUrl: string;
}

export function useTradeAction() {
  const kit = useInterwovenKit();
  const toast = useToast();
  const history = useTxHistory(kit.initiaAddress);
  const [isPending, setPending] = useState(false);

  const submit = useCallback(
    async (payload: TradePayload): Promise<TradeResult | undefined> => {
      if (!APPCHAIN_RPC_AVAILABLE) {
        toast.push({ tone: "error", title: "Appchain RPC unavailable" });
        return undefined;
      }
      if (!kit.isConnected || !kit.initiaAddress) {
        toast.push({ tone: "info", title: "Connect a wallet to continue" });
        kit.openConnect();
        return undefined;
      }

      const ticker = payload.ticker.toUpperCase();
      const fn = payload.side === "BUY" ? "buy" : "sell";
      const summary = `${payload.side === "BUY" ? "Buy" : "Sell"} $${ticker}`;

      const pendingId = toast.push({
        tone: "loading",
        title: summary,
        description: `Calling bonding_curve::${fn}…`,
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
              functionName: fn,
              typeArgs: [],
              args: [
                `"${APPCHAIN.deployedAddress}"`,
                JSON.stringify(ticker),
                JSON.stringify(payload.amount.toString()),
                JSON.stringify(payload.minOut.toString()),
              ],
            },
          },
        ];

        const memo = JSON.stringify({
          app: "minitia.fun",
          ticker,
          side: payload.side.toLowerCase(),
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
          kind: payload.side === "BUY" ? "buy" : "sell",
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
          side: payload.side,
          ticker,
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

  return { submit, isPending };
}
