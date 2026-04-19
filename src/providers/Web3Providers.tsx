import { useEffect, type PropsWithChildren } from "react";
import { createConfig, http, WagmiProvider } from "wagmi";
import { mainnet } from "wagmi/chains";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  initiaPrivyWalletConnector,
  injectStyles,
  InterwovenKitProvider,
  TESTNET,
  MAINNET,
} from "@initia/interwovenkit-react";
import InterwovenKitStyles from "@initia/interwovenkit-react/styles.js";
import {
  APPCHAIN,
  APPCHAIN_CHAIN,
  AUTO_SIGN_MSG_TYPES,
  INITIA_CHAIN_ID,
  INITIA_NETWORK,
} from "@/lib/initia";

const wagmiConfig = createConfig({
  connectors: [initiaPrivyWalletConnector],
  chains: [mainnet],
  transports: { [mainnet.id]: http() },
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
    },
  },
});

const baseChainConfig = INITIA_NETWORK === "mainnet" ? MAINNET : TESTNET;

/**
 * Auto-sign config — maps each chainId to the msg-type-urls we want session keys to handle.
 * Per hackathon spec: /initia.move.v1.MsgExecute for one-click trading on our Move rollup.
 */
const autoSignPolicy: Record<string, string[]> = {
  [INITIA_CHAIN_ID]: AUTO_SIGN_MSG_TYPES,
  [APPCHAIN.chainId]: AUTO_SIGN_MSG_TYPES,
};

export function Web3Providers({ children }: PropsWithChildren) {
  useEffect(() => {
    injectStyles(InterwovenKitStyles);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <WagmiProvider config={wagmiConfig}>
        <InterwovenKitProvider
          {...baseChainConfig}
          {...(APPCHAIN_CHAIN
            ? {
                customChain: APPCHAIN_CHAIN as never,
                // Force kit to use customChain (no registry fetch) by making
                // our rollup the default. Bridge/connect still work against L1
                // because TESTNET preset's L1 chain remains discoverable from
                // registryUrl when the bridge drawer queries other chains.
                defaultChainId: APPCHAIN.chainId,
              }
            : {})}
          enableAutoSign={autoSignPolicy}
          theme="dark"
        >
          {children}
        </InterwovenKitProvider>
      </WagmiProvider>
    </QueryClientProvider>
  );
}
