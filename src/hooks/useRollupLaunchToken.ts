import { useCallback, useState } from "react";
import { useInterwovenKit } from "@initia/interwovenkit-react";
import { APPCHAIN, APPCHAIN_RPC_AVAILABLE } from "@/lib/initia";
import { useToast } from "@/components/ui/Toast";
import { useTxHistory } from "@/hooks/useTxHistory";

const MSG_EXECUTE_JSON_TYPE_URL = "/initia.move.v1.MsgExecuteJSON";

/** Default bonding-curve params every new pool opens with.
 *  base_price = 1,000 umin = 0.001 MIN/token · slope = 10
 *  max_supply = 1_000_000_000 (1B tokens) — the default pump.fun-style cap. */
const DEFAULT_BASE_PRICE = "1000";
const DEFAULT_SLOPE = "10";
const DEFAULT_MAX_SUPPLY = "1000000000";

export interface LaunchTokenPayload {
  name: string;
  ticker: string;
  description: string;
  /** Optional override for the hard supply cap (whole tokens). Defaults to 1B. */
  maxSupply?: string;
  /** Off-chain pointer to the token logo (ipfs://<cid> or https://…).
   *  Empty string launches without a logo. */
  imageUri?: string;
}

export interface LaunchTokenResult {
  txHash: string;
  height: number;
  subdomain: string;
  explorerUrl: string;
}

/**
 * Real launch via InterwovenKit's `requestTxBlock` against the rollup
 * (chainId from APPCHAIN_CHAIN customChain config). Lets the kit handle
 * wallet-specific signing (MetaMask uses eth_secp256k1; Privy/Keplr/Leap
 * use direct/amino as appropriate). No raw cosmjs juggling needed.
 *
 * The signing wallet must hold `umin` on the rollup. Use the in-app
 * "Get 10 MIN" button (Launchpad) which calls the local faucet.
 */
export function useRollupLaunchToken() {
  const kit = useInterwovenKit();
  const toast = useToast();
  const history = useTxHistory(kit.initiaAddress);
  const [isPending, setPending] = useState(false);

  const launch = useCallback(
    async (payload: LaunchTokenPayload): Promise<LaunchTokenResult | undefined> => {
      if (!APPCHAIN_RPC_AVAILABLE) {
        toast.push({
          tone: "error",
          title: "Appchain RPC unavailable",
          description: "Set VITE_APPCHAIN_RPC in .env.local to enable on-rollup launches.",
        });
        return undefined;
      }
      if (!kit.isConnected || !kit.initiaAddress) {
        toast.push({ tone: "info", title: "Connect a wallet to continue" });
        kit.openConnect();
        return undefined;
      }

      const ticker = payload.ticker.trim().toUpperCase();
      const name = payload.name.trim();
      const description = payload.description.trim();
      const imageUri = (payload.imageUri ?? "").trim();
      const subdomain = `${ticker.toLowerCase()}.fun.init`;
      const maxSupply = (payload.maxSupply ?? DEFAULT_MAX_SUPPLY).replace(/[^0-9]/g, "");

      if (!ticker || !name) {
        toast.push({ tone: "error", title: "Ticker and name are required" });
        return undefined;
      }
      if (!maxSupply || maxSupply === "0") {
        toast.push({ tone: "error", title: "Total supply must be greater than zero" });
        return undefined;
      }

      const pendingId = toast.push({
        tone: "loading",
        title: `Launch $${ticker}`,
        description: `Signing on ${APPCHAIN.chainId}…`,
      });

      setPending(true);
      try {
        // Bundle both messages in one tx: register the token AND open its
        // bonding-curve pool. Without the second call the token has metadata
        // but trading is impossible -- /trade/:ticker shows "no pool exists".
        const messages = [
          {
            typeUrl: MSG_EXECUTE_JSON_TYPE_URL,
            value: {
              sender: kit.initiaAddress,
              moduleAddress: APPCHAIN.deployedAddress,
              moduleName: "token_factory",
              functionName: "launch",
              typeArgs: [],
              args: [
                `"${APPCHAIN.deployedAddress}"`,
                JSON.stringify(ticker),
                JSON.stringify(name),
                JSON.stringify(description),
                JSON.stringify(imageUri),
              ],
            },
          },
          {
            typeUrl: MSG_EXECUTE_JSON_TYPE_URL,
            value: {
              sender: kit.initiaAddress,
              moduleAddress: APPCHAIN.deployedAddress,
              moduleName: "bonding_curve",
              functionName: "create_pool",
              typeArgs: [],
              args: [
                `"${APPCHAIN.deployedAddress}"`,
                JSON.stringify(ticker),
                JSON.stringify(DEFAULT_BASE_PRICE),
                JSON.stringify(DEFAULT_SLOPE),
                JSON.stringify(maxSupply),
              ],
            },
          },
        ];
        const memo = JSON.stringify({
          app: "minitia.fun",
          ticker,
          subdomain,
          ts: Date.now(), // breaks tx-cache hash on retry with same payload
          schemaVersion: 1,
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
          kind: "deploy",
          chainId: APPCHAIN.chainId,
          summary: `Launch $${ticker}`,
          subdomain,
        });

        toast.update(pendingId, {
          tone: "success",
          title: `$${ticker} launched`,
          description: `${subdomain} · height ${result.height}`,
          link: { href: explorerUrl, label: "View on rollup RPC" },
        });

        return {
          txHash: result.transactionHash,
          height: result.height,
          subdomain,
          explorerUrl,
        };
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        toast.update(pendingId, {
          tone: "error",
          title: "Launch failed",
          description: message.slice(0, 240),
        });
        return undefined;
      } finally {
        setPending(false);
      }
    },
    [kit, toast, history],
  );

  return { launch, isPending };
}
