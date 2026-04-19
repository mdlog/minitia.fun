import { useCallback, useState } from "react";
import { SigningStargateClient, GasPrice, type DeliverTxResponse } from "@cosmjs/stargate";
import { Registry } from "@cosmjs/proto-signing";
import { defaultRegistryTypes } from "@cosmjs/stargate";
import { MsgExecuteJSON } from "@initia/initia.proto/initia/move/v1/tx";
import { useInterwovenKit } from "@initia/interwovenkit-react";
import { APPCHAIN, APPCHAIN_RPC_AVAILABLE } from "@/lib/initia";
import { useToast } from "@/components/ui/Toast";
import { useTxHistory } from "@/hooks/useTxHistory";

const MSG_EXECUTE_JSON_TYPE_URL = "/initia.move.v1.MsgExecuteJSON";

type Registered = InstanceType<typeof Registry>;
let cachedRegistry: Registered | null = null;

function buildRegistry(): Registered {
  if (cachedRegistry) return cachedRegistry;
  const registry = new Registry([...defaultRegistryTypes]);
  registry.register(MSG_EXECUTE_JSON_TYPE_URL, MsgExecuteJSON);
  cachedRegistry = registry;
  return registry;
}

export interface LaunchTokenPayload {
  name: string;
  ticker: string;
  description: string;
}

export interface LaunchTokenResult {
  txHash: string;
  height: number;
  subdomain: string;
  explorerUrl: string;
}

/**
 * Real launch: broadcasts `/initia.move.v1.MsgExecuteJSON` against the
 * Minitia.fun rollup via its public tunnel RPC, calling `token_factory::launch`
 * with the user's ticker/name/description. Uses the connected wallet's
 * offlineSigner (from InterwovenKit) to sign with the user's own keys —
 * no private key ever leaves the wallet.
 *
 * The user must have a balance of `umin` on the rollup (genesis-accounted
 * addresses, airdrop recipients, etc.). Non-genesis users get "insufficient
 * funds" — a post-launch faucet for MIN is a Phase 2 item.
 */
export function useRollupLaunchToken() {
  const { isConnected, initiaAddress, offlineSigner, openConnect } = useInterwovenKit();
  const toast = useToast();
  const history = useTxHistory(initiaAddress);
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
      if (!isConnected || !initiaAddress || !offlineSigner) {
        toast.push({ tone: "info", title: "Connect a wallet to continue" });
        openConnect();
        return undefined;
      }

      const ticker = payload.ticker.trim().toUpperCase();
      const name = payload.name.trim();
      const description = payload.description.trim();
      const subdomain = `${ticker.toLowerCase()}.fun.init`;

      if (!ticker || !name) {
        toast.push({ tone: "error", title: "Ticker and name are required" });
        return undefined;
      }

      const pendingId = toast.push({
        tone: "loading",
        title: `Launch $${ticker}`,
        description: "Signing MsgExecuteJSON and broadcasting to the rollup…",
      });

      setPending(true);

      try {
        const registry = buildRegistry();
        const client = await SigningStargateClient.connectWithSigner(
          APPCHAIN.rpc,
          offlineSigner,
          {
            registry,
            gasPrice: GasPrice.fromString(`0.15${APPCHAIN.denom}`),
          },
        );

        // MsgExecuteJSON expects:
        //   - args: string[] — each is the raw JSON representation of the arg.
        //     For `address` the repr is a hex string; for `String` it's a
        //     JSON-quoted string.
        const msg = {
          typeUrl: MSG_EXECUTE_JSON_TYPE_URL,
          value: MsgExecuteJSON.fromPartial({
            sender: initiaAddress,
            moduleAddress: APPCHAIN.deployedAddress,
            moduleName: "token_factory",
            functionName: "launch",
            typeArgs: [],
            args: [
              `"${APPCHAIN.deployedAddress}"`,
              JSON.stringify(ticker),
              JSON.stringify(name),
              JSON.stringify(description),
            ],
          }),
        };

        const memo = JSON.stringify({
          app: "minitia.fun",
          ticker,
          subdomain,
          schemaVersion: 1,
        });

        const result: DeliverTxResponse = await client.signAndBroadcast(
          initiaAddress,
          [msg],
          "auto",
          memo,
        );

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
    [isConnected, initiaAddress, offlineSigner, openConnect, toast, history],
  );

  return { launch, isPending };
}
