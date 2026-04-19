import { useCallback, useState } from "react";
import { useInitiaAccount } from "@/hooks/useInitiaAccount";
import { useToast } from "@/components/ui/Toast";
import { APPCHAIN, APPCHAIN_FAUCET_AVAILABLE } from "@/lib/initia";

export interface DripResult {
  txHash: string;
  amount: string;
  chain: string;
}

/**
 * Client for the local/tunnelled faucet (scripts/faucet-server.mjs).
 * Sends a POST { address } and returns the drip receipt. Surfaces cooldown
 * (429) and missing config as friendly toasts.
 */
export function useAppchainFaucet() {
  const { initiaAddress } = useInitiaAccount();
  const toast = useToast();
  const [isPending, setPending] = useState(false);

  const drip = useCallback(
    async (address?: string): Promise<DripResult | undefined> => {
      if (!APPCHAIN_FAUCET_AVAILABLE) {
        toast.push({
          tone: "error",
          title: "Faucet not configured",
          description: "Set VITE_APPCHAIN_FAUCET in .env.local to enable.",
        });
        return undefined;
      }
      const target = (address ?? initiaAddress ?? "").trim();
      if (!target) {
        toast.push({ tone: "info", title: "Connect a wallet first" });
        return undefined;
      }

      const toastId = toast.push({
        tone: "loading",
        title: "Requesting MIN from faucet",
        description: `for ${target.slice(0, 12)}…${target.slice(-6)}`,
      });

      setPending(true);
      try {
        const res = await fetch(APPCHAIN.faucet, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ address: target }),
          signal: AbortSignal.timeout(30_000),
        });
        const json = (await res.json().catch(() => ({}))) as {
          txHash?: string;
          amount?: string;
          chain?: string;
          error?: string;
          retryInMs?: number;
        };

        if (res.status === 429 && json.retryInMs) {
          const seconds = Math.ceil(json.retryInMs / 1000);
          toast.update(toastId, {
            tone: "info",
            title: "Cooldown active",
            description: `Try again in ~${seconds}s.`,
          });
          return undefined;
        }
        if (!res.ok || !json.txHash) {
          throw new Error(json.error || `status ${res.status}`);
        }

        toast.update(toastId, {
          tone: "success",
          title: `Received ${json.amount ?? "10 MIN"}`,
          description: `${json.txHash.slice(0, 10)}…${json.txHash.slice(-6)}`,
        });

        return {
          txHash: json.txHash,
          amount: json.amount ?? "10 MIN",
          chain: json.chain ?? APPCHAIN.chainId,
        };
      } catch (err) {
        toast.update(toastId, {
          tone: "error",
          title: "Faucet unreachable",
          description: err instanceof Error ? err.message.slice(0, 200) : "unknown",
        });
        return undefined;
      } finally {
        setPending(false);
      }
    },
    [initiaAddress, toast],
  );

  return { drip, isPending };
}
