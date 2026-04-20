import { useState } from "react";
import { Copy, ExternalLink, LogOut, RefreshCcw, Trash2, Wallet as WalletIcon } from "lucide-react";
import { useDisconnect } from "wagmi";
import { useInitiaAccount } from "@/hooks/useInitiaAccount";
import { useTxHistory } from "@/hooks/useTxHistory";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { formatInitBalance, INITIA, shortAddress } from "@/lib/initia";
import { hexToBech32, shortAddress as shortAny } from "@/lib/address";

function formatAgo(timestamp: number): string {
  const diff = Date.now() - timestamp;
  if (diff < 60_000) return `${Math.max(1, Math.round(diff / 1000))}s`;
  if (diff < 3_600_000) return `${Math.round(diff / 60_000)}m`;
  if (diff < 86_400_000) return `${Math.round(diff / 3_600_000)}h`;
  return `${Math.round(diff / 86_400_000)}d`;
}

function useClickOutside(onClose: () => void) {
  return (el: HTMLDivElement | null) => {
    if (!el) return;
    const handler = (e: MouseEvent) => {
      if (!el.contains(e.target as Node)) onClose();
    };
    setTimeout(() => document.addEventListener("mousedown", handler), 0);
    return () => document.removeEventListener("mousedown", handler);
  };
}

export function WalletPill() {
  const {
    isConnected,
    initiaAddress,
    hexAddress,
    username,
    balance,
    isBalanceLoading,
    openConnect,
    openWallet,
    refetchBalance,
  } = useInitiaAccount();
  const { disconnect } = useDisconnect();
  const [menuOpen, setMenuOpen] = useState(false);
  const [copied, setCopied] = useState<"hex" | "bech32" | null>(null);
  const menuRef = useClickOutside(() => setMenuOpen(false));
  const history = useTxHistory(initiaAddress);

  const bech32 = initiaAddress ?? (hexAddress ? hexToBech32(hexAddress) : null);
  const hex = hexAddress ?? null;

  if (!isConnected || !initiaAddress) {
    return (
      <Button
        variant="primary"
        size="sm"
        leading={<WalletIcon className="h-3.5 w-3.5" />}
        onClick={openConnect}
      >
        Connect wallet
      </Button>
    );
  }

  const display = username ? `@${username}` : shortAddress(initiaAddress);
  const balanceDisplay =
    balance === undefined
      ? isBalanceLoading
        ? "—"
        : "0.00"
      : formatInitBalance(balance);

  const copy = async (form: "hex" | "bech32") => {
    const value = form === "hex" ? hex : bech32;
    if (!value) return;
    await navigator.clipboard.writeText(value);
    setCopied(form);
    setTimeout(() => setCopied(null), 1200);
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setMenuOpen((o) => !o)}
        className="flex items-center gap-2 rounded-md bg-[#0F0F11] ghost-border px-2.5 py-1.5 transition-colors hover:bg-white/[0.04]"
      >
        <span className="h-1.5 w-1.5 rounded-full bg-secondary" />
        <span className="font-mono text-[12px] text-on-surface">{display}</span>
        <span className="h-3 w-px bg-white/10" />
        <span className="font-mono text-[12px] tabular-nums text-on-surface-variant">
          {balanceDisplay}
        </span>
        <span className="font-mono text-[10px] text-on-surface-muted">INIT</span>
      </button>

      {menuOpen && (
        <div className="absolute right-0 top-[calc(100%+6px)] z-50 w-80 rounded-xl bg-surface-container ghost-border py-2 shadow-ambient-lg animate-fade-in">
          <div className="px-4 pt-2 pb-3">
            <div className="text-[10.5px] font-medium uppercase tracking-[0.08em] text-on-surface-muted">
              Initia · {INITIA.network}
            </div>
            <div className="mt-1.5 flex items-baseline gap-2">
              <span className="font-mono text-[22px] font-medium tabular-nums text-on-surface">
                {balanceDisplay}
              </span>
              <span className="font-mono text-[11px] text-on-surface-muted">INIT</span>
            </div>
          </div>

          <div className="h-px mx-4 bg-white/[0.05]" />

          <div className="flex flex-col gap-2 px-4 py-3">
            {bech32 && (
              <AddressRow
                label="Cosmos · init1…"
                value={bech32}
                display={shortAny(bech32, 8)}
                copied={copied === "bech32"}
                onCopy={() => copy("bech32")}
              />
            )}
            {hex && (
              <AddressRow
                label="EVM · 0x…"
                value={hex}
                display={shortAny(hex, 6)}
                copied={copied === "hex"}
                onCopy={() => copy("hex")}
              />
            )}
            <span className="text-[10px] text-[#52525B]">
              same account · different encoding
            </span>
          </div>

          <div className="h-px mx-4 bg-white/[0.05]" />
          <MenuItem
            icon={<RefreshCcw className="h-3.5 w-3.5" />}
            label="Refresh balance"
            onClick={() => refetchBalance()}
          />
          <MenuItem
            icon={<WalletIcon className="h-3.5 w-3.5" />}
            label="Open portfolio"
            onClick={() => {
              openWallet();
              setMenuOpen(false);
            }}
          />
          <MenuItem
            icon={<ExternalLink className="h-3.5 w-3.5" />}
            label="View on explorer"
            onClick={() =>
              window.open(`${INITIA.explorer}/${INITIA.chainId}/account/${initiaAddress}`, "_blank")
            }
          />

          {history.records.length > 0 && (
            <>
              <div className="h-px mx-4 my-1 bg-white/[0.05]" />
              <div className="flex items-center justify-between px-4 pb-1 pt-1">
                <span className="text-[10.5px] font-medium uppercase tracking-[0.08em] text-on-surface-muted">
                  Recent activity
                </span>
                <button
                  type="button"
                  onClick={() => history.clear()}
                  className="text-on-surface-muted hover:text-error"
                  aria-label="Clear history"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
              <ul className="max-h-48 overflow-y-auto px-2">
                {history.records.slice(0, 5).map((r) => (
                  <li key={r.hash}>
                    <a
                      href={`${INITIA.explorer}/${r.chainId}/txs/${r.hash}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-3 rounded-md px-2 py-1.5 text-on-surface-variant hover:bg-white/[0.04] hover:text-on-surface"
                    >
                      <span
                        className={cn(
                          "h-1.5 w-1.5 shrink-0 rounded-full",
                          r.kind === "deploy" || r.kind === "launch"
                            ? "bg-primary"
                            : r.kind === "sell"
                              ? "bg-error"
                              : "bg-secondary",
                        )}
                      />
                      <span className="flex-1 truncate text-[12px]">{r.summary}</span>
                      <span className="font-mono text-[10px] text-on-surface-muted">
                        {formatAgo(r.timestamp)}
                      </span>
                      <ExternalLink className="h-3 w-3 text-on-surface-muted" />
                    </a>
                  </li>
                ))}
              </ul>
            </>
          )}

          <div className="h-px mx-4 my-1 bg-white/[0.05]" />

          <MenuItem
            icon={<LogOut className="h-3.5 w-3.5" />}
            label="Disconnect"
            tone="danger"
            onClick={() => {
              disconnect();
              setMenuOpen(false);
            }}
          />
        </div>
      )}
    </div>
  );
}

function AddressRow({
  label,
  value,
  display,
  copied,
  onCopy,
}: {
  label: string;
  value: string;
  display: string;
  copied: boolean;
  onCopy: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-md bg-[#0F0F11] ghost-border px-3 py-2">
      <div className="min-w-0 flex-1">
        <div className="text-[10px] font-medium uppercase tracking-[0.08em] text-on-surface-muted">
          {label}
        </div>
        <div className="mt-0.5 font-mono text-[12px] text-on-surface" title={value}>
          {display}
        </div>
      </div>
      <button
        type="button"
        onClick={onCopy}
        aria-label={`Copy ${label}`}
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-white/[0.06] text-on-surface-variant hover:bg-white/[0.12] hover:text-on-surface"
      >
        {copied ? (
          <span className="text-[10px] font-mono text-secondary">ok</span>
        ) : (
          <Copy className="h-3 w-3" />
        )}
      </button>
    </div>
  );
}

function MenuItem({
  icon,
  label,
  onClick,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  tone?: "danger";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3 px-4 py-2 text-left text-[12.5px] transition-colors",
        tone === "danger"
          ? "text-error hover:bg-error/10"
          : "text-on-surface-variant hover:bg-white/[0.04] hover:text-on-surface",
      )}
    >
      <span className={cn(tone === "danger" ? "text-error" : "text-on-surface-muted")}>{icon}</span>
      {label}
    </button>
  );
}
