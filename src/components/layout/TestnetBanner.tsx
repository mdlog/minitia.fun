import { Droplet, ExternalLink } from "lucide-react";
import { useInitiaAccount } from "@/hooks/useInitiaAccount";
import { formatInitBalance, INITIA } from "@/lib/initia";

export function TestnetBanner() {
  const { isConnected, balance } = useInitiaAccount();

  if (INITIA.network !== "testnet") return null;

  const initAmount = balance ? Number(balance) / 10 ** INITIA.decimals : 0;
  const lowBalance = isConnected && initAmount < 1;

  return (
    <div className="flex items-center justify-between gap-4 rounded-md bg-[#1E3A8A]/20 px-3 py-1.5 ghost-border">
      <div className="flex items-center gap-2 text-[11px] text-[#60A5FA]">
        <span className="h-1.5 w-1.5 rounded-full bg-[#3B82F6] animate-pulse" />
        <span className="font-medium">Initia Testnet</span>
        <span className="text-on-surface-muted">·</span>
        <span className="font-mono text-on-surface-variant">{INITIA.chainId}</span>
        {isConnected && (
          <>
            <span className="text-on-surface-muted">·</span>
            <span className="hidden md:inline font-mono text-on-surface-variant">
              bal <span className="text-on-surface">{formatInitBalance(balance)}</span> INIT
            </span>
          </>
        )}
      </div>

      <a
        href={INITIA.faucet}
        target="_blank"
        rel="noreferrer"
        className={
          lowBalance
            ? "inline-flex items-center gap-1 rounded-md bg-[#2563EB] px-2.5 py-1 text-[11px] font-medium text-white animate-pulse"
            : "inline-flex items-center gap-1 text-[11px] text-on-surface-variant hover:text-on-surface"
        }
      >
        <Droplet className="h-3 w-3" />
        <span>{lowBalance ? "Grab testnet INIT" : "Faucet"}</span>
        <ExternalLink className="h-3 w-3" />
      </a>
    </div>
  );
}
