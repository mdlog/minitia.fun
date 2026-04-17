import { useQuery } from "@tanstack/react-query";
import { useInterwovenKit } from "@initia/interwovenkit-react";
import { fetchInitBalance, INITIA } from "@/lib/initia";

/**
 * Unified account hook — wraps InterwovenKit and augments with an INIT balance query
 * fetched directly from the L1 REST endpoint.
 */
export function useInitiaAccount() {
  const kit = useInterwovenKit();

  const balanceQuery = useQuery({
    queryKey: ["initBalance", kit.initiaAddress, INITIA.network],
    queryFn: () => fetchInitBalance(kit.initiaAddress),
    enabled: Boolean(kit.initiaAddress),
    refetchInterval: 20_000,
    staleTime: 10_000,
  });

  return {
    // identity
    address: kit.address,
    initiaAddress: kit.initiaAddress,
    hexAddress: kit.hexAddress,
    username: kit.username,
    isConnected: kit.isConnected,

    // actions
    openConnect: kit.openConnect,
    openWallet: kit.openWallet,
    openBridge: kit.openBridge,
    openDeposit: kit.openDeposit,
    openWithdraw: kit.openWithdraw,

    // tx pipeline
    requestTxBlock: kit.requestTxBlock,
    requestTxSync: kit.requestTxSync,
    waitForTxConfirmation: kit.waitForTxConfirmation,

    // balance (uinit microunits as string)
    balance: balanceQuery.data,
    isBalanceLoading: balanceQuery.isFetching,
    refetchBalance: balanceQuery.refetch,
  };
}
