import { Loader2 } from "lucide-react";
import { Navigate } from "react-router-dom";
import { useAllLaunchedTokens } from "@/hooks/useAllLaunchedTokens";

/**
 * `/trade` and `/graduation` have no intrinsic default ticker — on a
 * fresh chain there isn't one. This component looks up the most recently
 * launched token and forwards there. If no tokens exist yet, it sends
 * the user to Discovery where they can pick one (or launch something).
 */
export default function TradeRedirect({ mode }: { mode: "trade" | "graduation" }) {
  const tokens = useAllLaunchedTokens(10);

  if (tokens.isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="flex items-center gap-3 rounded-xl bg-surface-container-low px-5 py-3 ghost-border text-on-surface-variant">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          <span className="font-mono text-[0.68rem] uppercase tracking-[0.22em]">
            Finding tokens…
          </span>
        </div>
      </div>
    );
  }

  const first = tokens.data?.[0]?.ticker;
  if (first) {
    return <Navigate to={`/${mode}/${first}`} replace />;
  }
  return <Navigate to="/" replace />;
}
