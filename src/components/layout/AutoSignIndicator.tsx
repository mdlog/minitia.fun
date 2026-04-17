import { Zap } from "lucide-react";
import { useInitiaAccount } from "@/hooks/useInitiaAccount";

/**
 * Shows users that trading is "one-click" via session keys (Auto-sign) —
 * a key Initia-native UX differentiator.
 */
export function AutoSignIndicator() {
  const { isConnected } = useInitiaAccount();
  if (!isConnected) return null;

  return (
    <span
      className="hidden items-center gap-1.5 rounded-full bg-secondary-container/50 px-2.5 py-1 text-[0.58rem] font-mono uppercase tracking-[0.24em] text-secondary lg:inline-flex"
      title="Session keys enabled — trades auto-sign without wallet popups"
    >
      <Zap className="h-3 w-3 animate-pulse-glow" />
      Auto-sign
    </span>
  );
}
