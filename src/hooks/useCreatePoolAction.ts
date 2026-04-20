import { useCallback, useState } from "react";
import { useInterwovenKit } from "@initia/interwovenkit-react";
import { APPCHAIN, APPCHAIN_RPC_AVAILABLE } from "@/lib/initia";
import { useToast } from "@/components/ui/Toast";

const MSG_EXECUTE_JSON = "/initia.move.v1.MsgExecuteJSON";
const DEFAULT_BASE_PRICE = "1000";
const DEFAULT_SLOPE = "10";
const DEFAULT_MAX_SUPPLY = "1000000000";

/** Opens the bonding-curve pool for a pre-existing token (token launched
 *  before Launchpad was bundling create_pool with launch). v2 requires
 *  the caller to be the token_factory launcher AND a max_supply cap. */
export function useCreatePoolAction() {
  const kit = useInterwovenKit();
  const toast = useToast();
  const [isPending, setPending] = useState(false);

  const create = useCallback(
    async (ticker: string, maxSupply: string = DEFAULT_MAX_SUPPLY): Promise<string | undefined> => {
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
      const pendingId = toast.push({
        tone: "loading",
        title: `Open curve for $${upper}`,
        description: "Signing bonding_curve::create_pool…",
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
              functionName: "create_pool",
              typeArgs: [],
              args: [
                `"${APPCHAIN.deployedAddress}"`,
                JSON.stringify(upper),
                JSON.stringify(DEFAULT_BASE_PRICE),
                JSON.stringify(DEFAULT_SLOPE),
                JSON.stringify(maxSupply.replace(/[^0-9]/g, "") || DEFAULT_MAX_SUPPLY),
              ],
            },
          },
        ];
        const memo = JSON.stringify({
          app: "minitia.fun",
          action: "create_pool",
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
        toast.update(pendingId, {
          tone: "success",
          title: `$${upper} pool live`,
          description: `height ${result.height}`,
          link: { href: explorerUrl, label: "View tx" },
        });
        return result.transactionHash;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        toast.update(pendingId, {
          tone: "error",
          title: "Create pool failed",
          description: msg.slice(0, 240),
        });
        return undefined;
      } finally {
        setPending(false);
      }
    },
    [kit, toast],
  );

  return { create, isPending };
}
