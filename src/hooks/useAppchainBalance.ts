import { useQuery } from "@tanstack/react-query";
import { APPCHAIN, fetchAppchainUminBalance } from "@/lib/initia";

/** Live `umin` balance for the given address on the rollup. */
export function useAppchainBalance(address?: string | null, pollMs = 10_000) {
  return useQuery({
    queryKey: ["appchainBalance", address, APPCHAIN.rest],
    queryFn: () => fetchAppchainUminBalance(address ?? ""),
    enabled: Boolean(address) && Boolean(APPCHAIN.rest),
    refetchInterval: pollMs,
    staleTime: 4_000,
    retry: 1,
  });
}
