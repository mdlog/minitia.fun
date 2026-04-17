import { useCallback, useState } from "react";
import { useInitiaAccount } from "@/hooks/useInitiaAccount";
import { useToast } from "@/components/ui/Toast";
import { useTxHistory, type TxKind } from "@/hooks/useTxHistory";
import { INITIA, INITIA_CHAIN_ID } from "@/lib/initia";

export interface TxActionPayload {
  kind: TxKind;
  summary: string;
  memoAction: string;
  metadata?: Record<string, unknown>;
  /** Optional — override the default self-transfer (1 uinit) with real messages once Move modules are deployed. */
  amountUinit?: string;
}

export interface TxActionResult {
  txHash: string;
  explorerUrl: string;
}

/**
 * Submits a real transaction on the Initia L1 testnet (initiation-2) and wires
 * in toast feedback + localStorage history. Uses a MsgSend self-transfer with
 * a structured memo as the proof-of-pipeline until the on-chain Move modules
 * (token_factory, bonding_curve, liquidity_migrator) are deployed.
 */
export function useTxAction() {
  const { isConnected, initiaAddress, requestTxBlock, openConnect } = useInitiaAccount();
  const toast = useToast();
  const history = useTxHistory(initiaAddress);
  const [isPending, setIsPending] = useState(false);

  const execute = useCallback(
    async (payload: TxActionPayload): Promise<TxActionResult | undefined> => {
      if (!isConnected || !initiaAddress) {
        openConnect();
        toast.push({
          tone: "info",
          title: "Connect a wallet to continue",
        });
        return undefined;
      }

      const pendingToastId = toast.push({
        tone: "loading",
        title: payload.summary,
        description: "Signing and broadcasting…",
      });

      setIsPending(true);

      try {
        const memo = JSON.stringify({
          app: "minitia.fun",
          action: payload.memoAction,
          ...(payload.metadata ?? {}),
          schemaVersion: 1,
        });

        const messages = [
          {
            typeUrl: "/cosmos.bank.v1beta1.MsgSend",
            value: {
              fromAddress: initiaAddress,
              toAddress: initiaAddress,
              amount: [{ denom: INITIA.denom, amount: payload.amountUinit ?? "1" }],
            },
          },
        ];

        const response = await requestTxBlock({
          chainId: INITIA_CHAIN_ID,
          messages,
          memo,
        });

        const txHash = response.transactionHash;
        const explorerUrl = `${INITIA.explorer}/${INITIA_CHAIN_ID}/txs/${txHash}`;

        history.push({
          hash: txHash,
          kind: payload.kind,
          chainId: INITIA_CHAIN_ID,
          summary: payload.summary,
          subdomain: typeof payload.metadata?.subdomain === "string" ? (payload.metadata.subdomain as string) : undefined,
        });

        toast.update(pendingToastId, {
          tone: "success",
          title: `${payload.summary} confirmed`,
          description: `${txHash.slice(0, 10)}…${txHash.slice(-6)}`,
          link: { href: explorerUrl, label: "View on scan.testnet.initia.xyz" },
        });

        return { txHash, explorerUrl };
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        toast.update(pendingToastId, {
          tone: "error",
          title: "Transaction failed",
          description: message,
        });
        return undefined;
      } finally {
        setIsPending(false);
      }
    },
    [isConnected, initiaAddress, openConnect, requestTxBlock, toast, history],
  );

  return { execute, isPending };
}
