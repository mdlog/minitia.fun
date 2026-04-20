import { useMemo } from "react";
import { Loader2, Zap, ZapOff } from "lucide-react";
import { useInterwovenKit } from "@initia/interwovenkit-react";
import { useInitiaAccount } from "@/hooks/useInitiaAccount";
import { useToast } from "@/components/ui/Toast";
import { APPCHAIN } from "@/lib/initia";
import { cn } from "@/lib/cn";

type KitAutoSign = {
  isLoading?: boolean;
  enable: (chainId?: string) => Promise<void>;
  disable: (chainId?: string) => Promise<void>;
  expiredAtByChain?: Record<string, Date | null | undefined>;
  isEnabledByChain?: Record<string, boolean>;
};

/**
 * Auto-sign indicator + toggle for the Minitia.fun rollup. Reflects the
 * real `kit.autoSign` runtime state from InterwovenKit (not just
 * "connected" — it checks `isEnabledByChain[APPCHAIN.chainId]`).
 *
 * Click behaviour:
 *  - disabled -> `autoSign.enable(chainId)` triggers ONE wallet signature
 *    granting an in-memory grantee key authority to broadcast the
 *    whitelisted Move msg types for the session window.
 *  - enabled -> shows remaining session lifetime; click to `disable()`.
 */
export function AutoSignIndicator() {
  const { isConnected } = useInitiaAccount();
  const kit = useInterwovenKit();
  const autoSign = (kit as unknown as { autoSign?: KitAutoSign }).autoSign;
  const enabled = Boolean(autoSign?.isEnabledByChain?.[APPCHAIN.chainId]);
  const expiresAt = autoSign?.expiredAtByChain?.[APPCHAIN.chainId];
  const isLoading = autoSign?.isLoading ?? false;
  const toast = useToast();

  const remainingLabel = useMemo(() => {
    if (!enabled || !expiresAt) return null;
    const diff = new Date(expiresAt).getTime() - Date.now();
    if (diff <= 0) return "expired";
    const mins = Math.round(diff / 60_000);
    if (mins < 60) return `${mins}m`;
    const hours = Math.round(mins / 60);
    if (hours < 24) return `${hours}h`;
    return `${Math.round(hours / 24)}d`;
  }, [enabled, expiresAt]);

  if (!isConnected || !autoSign) return null;

  const toggle = async () => {
    try {
      if (enabled) {
        await autoSign.disable(APPCHAIN.chainId);
        toast.push({
          tone: "info",
          title: "Auto-sign disabled",
          description: "Future trades will ask for a wallet signature.",
        });
      } else {
        await autoSign.enable(APPCHAIN.chainId);
        toast.push({
          tone: "success",
          title: "Auto-sign enabled",
          description: `One-click trading on ${APPCHAIN.chainId} active.`,
        });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      toast.push({
        tone: "error",
        title: "Auto-sign action failed",
        description: msg.slice(0, 200),
      });
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={isLoading}
      className={cn(
        "hidden items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[11px] font-medium transition-colors lg:inline-flex",
        enabled
          ? "bg-[#10B981]/10 text-[#34D399] hover:bg-[#10B981]/15"
          : "bg-[#0F0F11] ghost-border text-on-surface-variant hover:text-on-surface",
        isLoading && "cursor-wait opacity-60",
      )}
      title={
        enabled
          ? `Auto-sign active${expiresAt ? ` until ${new Date(expiresAt).toLocaleString()}` : ""}. Click to disable.`
          : "Grant a session key so trades execute without per-tx popups. Click to enable."
      }
    >
      {isLoading ? (
        <Loader2 className="h-3 w-3 animate-spin" />
      ) : enabled ? (
        <Zap className="h-3 w-3 animate-pulse-glow" />
      ) : (
        <ZapOff className="h-3 w-3" />
      )}
      {enabled ? (
        <span className="inline-flex items-center gap-1">
          Auto-sign
          {remainingLabel && (
            <span className="text-on-surface-muted">· {remainingLabel}</span>
          )}
        </span>
      ) : (
        <>Enable auto-sign</>
      )}
    </button>
  );
}
