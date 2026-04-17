import { Droplet, ExternalLink } from "lucide-react";
import { useInitiaAccount } from "@/hooks/useInitiaAccount";
import { formatInitBalance, INITIA } from "@/lib/initia";

/**
 * Thin testnet notice strip — hidden on mainnet.
 * Shows faucet CTA when connected wallet has < 1 INIT, otherwise a generic testnet tag.
 */
export function TestnetBanner() {
  const { isConnected, balance } = useInitiaAccount();

  if (INITIA.network !== "testnet") return null;

  const initAmount = balance ? Number(balance) / 10 ** INITIA.decimals : 0;
  const lowBalance = isConnected && initAmount < 1;

  return (
    <div className="flex items-center justify-between gap-4 border-b border-editorial/20 bg-editorial-container/40 px-6 py-2 md:px-10">
      <div className="flex items-center gap-3 text-[0.62rem] font-mono uppercase tracking-[0.28em] text-editorial">
        <span className="h-1.5 w-1.5 rounded-full bg-editorial animate-pulse" />
        <span>Initia Testnet · {INITIA.chainId}</span>
        {isConnected && (
          <span className="hidden md:inline text-on-surface-muted">
            · bal <span className="text-editorial-ink">{formatInitBalance(balance)}</span> INIT
          </span>
        )}
      </div>

      <a
        href={INITIA.faucet}
        target="_blank"
        rel="noreferrer"
        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[0.62rem] font-mono uppercase tracking-[0.22em] snappy transition-colors ${
          lowBalance
            ? "bg-editorial text-surface animate-pulse"
            : "bg-white/[0.05] text-on-surface-variant hover:bg-white/[0.08] hover:text-editorial-ink"
        }`}
      >
        <Droplet className="h-3 w-3" />
        {lowBalance ? "Grab testnet INIT" : "Faucet"}
        <ExternalLink className="h-3 w-3" />
      </a>
    </div>
  );
}
