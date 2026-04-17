import { ArrowLeftRight } from "lucide-react";
import { useInitiaAccount } from "@/hooks/useInitiaAccount";

/**
 * Cross-chain Bridge entrypoint — opens the InterwovenKit bridge drawer.
 * Lets users deposit assets from ANY chain (Ethereum, Solana, etc.) into Initia in one step.
 */
export function BridgePill() {
  const { openBridge, isConnected } = useInitiaAccount();

  return (
    <button
      type="button"
      onClick={() => openBridge()}
      disabled={!isConnected}
      className="group hidden items-center gap-2 rounded-2xl ghost-border bg-white/[0.04] px-3 py-2 snappy transition-all hover:bg-white/[0.07] disabled:opacity-40 md:inline-flex"
      aria-label="Open cross-chain bridge"
    >
      <ArrowLeftRight className="h-3.5 w-3.5 text-tertiary snappy group-hover:rotate-180 transition-transform duration-500" />
      <span className="font-mono text-[0.62rem] uppercase tracking-[0.22em] text-on-surface-variant group-hover:text-on-surface">
        Bridge
      </span>
    </button>
  );
}
