import { ArrowLeftRight } from "lucide-react";
import { useInitiaAccount } from "@/hooks/useInitiaAccount";

export function BridgePill() {
  const { openBridge, isConnected } = useInitiaAccount();

  return (
    <button
      type="button"
      onClick={() => openBridge()}
      disabled={!isConnected}
      className="hidden items-center gap-1.5 rounded-md bg-[#0F0F11] ghost-border px-2.5 py-1.5 text-[12px] text-on-surface-variant transition-colors hover:text-on-surface disabled:opacity-40 md:inline-flex"
      aria-label="Open cross-chain bridge"
    >
      <ArrowLeftRight className="h-3.5 w-3.5" />
      <span>Bridge</span>
    </button>
  );
}
