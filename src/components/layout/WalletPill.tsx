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

  // If the wallet lib only exposed one form, derive the other from it.
  const bech32 = initiaAddress ?? (hexAddress ? hexToBech32(hexAddress) : null);
  const hex = hexAddress ?? null;

  if (!isConnected || !initiaAddress) {
    return (
      <Button
        variant="hyperglow"
        size="md"
        className="min-w-[152px] font-semibold"
        leading={<WalletIcon className="h-4 w-4" />}
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
        className={cn(
          "group flex items-center gap-3 rounded-2xl ghost-border bg-white/[0.04] pl-2.5 pr-3 py-1.5 snappy transition-colors hover:bg-white/[0.07]",
        )}
      >
        {/* Balance chip */}
        <span className="flex items-baseline gap-1.5 rounded-xl bg-secondary-container/60 px-2.5 py-1">
          <span className="font-editorial italic text-[1.05rem] leading-none text-editorial-ink">
            {balanceDisplay}
          </span>
          <span className="font-mono text-[0.58rem] uppercase tracking-[0.22em] text-secondary">
            INIT
          </span>
        </span>

        {/* Address */}
        <span className="flex flex-col items-start leading-tight">
          <span className="font-mono text-[0.72rem] font-medium text-on-surface">{display}</span>
          <span className="font-mono text-[0.58rem] uppercase tracking-[0.24em] text-secondary">
            {INITIA.network}
          </span>
        </span>

        <span className="h-2 w-2 rounded-full bg-secondary shadow-glow-secondary" />
      </button>

      {menuOpen && (
        <div className="absolute right-0 top-[calc(100%+8px)] z-50 w-80 rounded-[20px] bg-surface-container-high ghost-border-strong shadow-ambient-lg py-3 animate-fade-in">
          <div className="px-4 pb-3">
            <div className="font-mono text-[0.62rem] uppercase tracking-[0.28em] text-on-surface-muted">
              Initia {INITIA.network}
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="font-editorial italic text-headline-md leading-none text-editorial">
                {balanceDisplay}
              </span>
              <span className="font-mono text-label-sm uppercase tracking-[0.2em] text-on-surface-muted">
                INIT
              </span>
            </div>
          </div>

          <div className="h-px mx-4 bg-editorial/15" />

          {/* Both address encodings — same 20 bytes, different UI conventions */}
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
            <span className="font-mono text-[0.55rem] uppercase tracking-[0.22em] text-on-surface-muted">
              same account · different encoding
            </span>
          </div>

          <div className="h-px mx-4 bg-editorial/15" />
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
              <div className="h-px mx-4 my-1.5 bg-editorial/15" />
              <div className="px-4 pb-2 pt-1 flex items-center justify-between">
                <span className="font-mono text-[0.58rem] uppercase tracking-[0.28em] text-on-surface-muted">
                  Recent activity
                </span>
                <button
                  type="button"
                  onClick={() => history.clear()}
                  className="text-on-surface-muted hover:text-error snappy"
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
                      className="flex items-center gap-3 rounded-lg px-2 py-1.5 text-on-surface-variant hover:bg-white/[0.04] hover:text-on-surface snappy"
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
                      <span className="flex-1 truncate text-body-sm">{r.summary}</span>
                      <span className="font-mono text-[0.58rem] uppercase tracking-[0.22em] text-on-surface-muted">
                        {formatAgo(r.timestamp)}
                      </span>
                      <ExternalLink className="h-3 w-3 text-on-surface-muted" />
                    </a>
                  </li>
                ))}
              </ul>
            </>
          )}

          <div className="h-px mx-4 my-1.5 bg-editorial/15" />

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
    <div className="flex items-center justify-between gap-2 rounded-xl bg-white/[0.04] px-3 py-2 ghost-border">
      <div className="min-w-0 flex-1">
        <div className="font-mono text-[0.56rem] uppercase tracking-[0.24em] text-on-surface-muted">
          {label}
        </div>
        <div className="mt-0.5 font-mono text-body-sm text-on-surface" title={value}>
          {display}
        </div>
      </div>
      <button
        type="button"
        onClick={onCopy}
        aria-label={`Copy ${label}`}
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/[0.06] text-on-surface-variant hover:bg-white/[0.12] hover:text-on-surface snappy"
      >
        {copied ? (
          <span className="text-[0.58rem] font-mono uppercase tracking-[0.22em] text-secondary">
            ok
          </span>
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
        "flex w-full items-center gap-3 px-4 py-2 text-left text-body-sm snappy transition-colors",
        tone === "danger"
          ? "text-error hover:bg-error-container/40"
          : "text-on-surface-variant hover:bg-white/[0.04] hover:text-on-surface",
      )}
    >
      <span className={cn(tone === "danger" ? "text-error" : "text-on-surface-muted")}>{icon}</span>
      {label}
    </button>
  );
}
