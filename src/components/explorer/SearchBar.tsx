import { useMemo, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowUpRight, ExternalLink, Hash, Layers, Search, User2 } from "lucide-react";
import { APPCHAIN } from "@/lib/initia";
import { bech32ToHex, isBech32Address } from "@/lib/address";

type Detected =
  | { kind: "empty" }
  | { kind: "tx"; hash: string }
  | { kind: "block"; height: number }
  | { kind: "address_hex"; address: string }
  | { kind: "address_bech32"; address: string }
  | { kind: "ticker"; ticker: string }
  | { kind: "unknown" };

/** Classify the raw search input into a navigable target. */
function detect(raw: string): Detected {
  const trimmed = raw.trim();
  if (!trimmed) return { kind: "empty" };

  // Tx hash: 64 hex chars, optional 0x prefix.
  const txMatch = trimmed.match(/^(0x)?([0-9a-fA-F]{64})$/);
  if (txMatch) return { kind: "tx", hash: txMatch[2].toUpperCase() };

  // Hex address: 0x + 40 hex (20-byte eth-style, used on-chain).
  const hexAddr = trimmed.match(/^0x[0-9a-fA-F]{40}$/);
  if (hexAddr) return { kind: "address_hex", address: trimmed.toLowerCase() };

  // Bech32 address: validate full checksum via cosmjs.
  if (/^init1[0-9a-z]{30,70}$/.test(trimmed) && isBech32Address(trimmed)) {
    return { kind: "address_bech32", address: trimmed };
  }

  // Block height: pure integer, up to 10^10 range.
  if (/^\d{1,12}$/.test(trimmed)) {
    return { kind: "block", height: Number(trimmed) };
  }

  // Ticker: allow alnum + underscore, 2-12 chars (matches Move constraints).
  if (/^[A-Za-z][A-Za-z0-9_]{1,11}$/.test(trimmed)) {
    return { kind: "ticker", ticker: trimmed.toUpperCase() };
  }

  return { kind: "unknown" };
}

function label(d: Detected): { text: string; Icon: typeof Hash } {
  switch (d.kind) {
    case "tx":
      return { text: "Transaction hash", Icon: Hash };
    case "block":
      return { text: "Block height", Icon: Layers };
    case "address_hex":
      return { text: "Address (hex)", Icon: User2 };
    case "address_bech32":
      return { text: "Address (bech32)", Icon: User2 };
    case "ticker":
      return { text: "Ticker", Icon: Search };
    case "unknown":
      return { text: "Unrecognised", Icon: Search };
    case "empty":
      return { text: "Empty", Icon: Search };
  }
}

export function ExplorerSearchBar() {
  const [q, setQ] = useState("");
  const navigate = useNavigate();
  const detected = useMemo(() => detect(q), [q]);
  const { text, Icon } = label(detected);

  const go = (d: Detected) => {
    switch (d.kind) {
      case "tx":
        window.open(`${APPCHAIN.rpc}/tx?hash=0x${d.hash}`, "_blank", "noopener,noreferrer");
        return;
      case "block":
        window.open(`${APPCHAIN.rpc}/block?height=${d.height}`, "_blank", "noopener,noreferrer");
        return;
      case "address_hex":
        navigate(`/u/${d.address}`);
        return;
      case "address_bech32": {
        // Canonicalise to hex so the profile route is always 0x-prefixed;
        // profile hooks compare events (which emit hex) against this value.
        const hex = bech32ToHex(d.address);
        navigate(`/u/${hex ?? d.address}`);
        return;
      }
      case "ticker":
        navigate(`/trade/${d.ticker}`);
        return;
      default:
        return;
    }
  };

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    go(detected);
  };

  const canSubmit =
    detected.kind !== "empty" && detected.kind !== "unknown";

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-2">
      <div className="flex items-center gap-2 rounded-2xl surface-nested ghost-border px-3 py-2">
        <Search className="h-4 w-4 shrink-0 text-on-surface-muted" />
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Paste tx hash, block height, 0x address, init1... or a $ticker"
          className="flex-1 bg-transparent py-1.5 font-mono text-body-sm text-on-surface outline-none placeholder:text-on-surface-muted"
          autoComplete="off"
          spellCheck={false}
        />
        {canSubmit && (
          <button
            type="submit"
            className="inline-flex items-center gap-1 rounded-xl bg-editorial/15 px-3 py-1.5 font-mono text-[0.62rem] uppercase tracking-[0.2em] text-editorial hover:bg-editorial/25 snappy"
          >
            Go <ArrowUpRight className="h-3 w-3" />
          </button>
        )}
      </div>

      {/* Preview row */}
      {q.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 pl-2 font-mono text-[0.6rem] uppercase tracking-[0.22em] text-on-surface-muted">
          <Icon className="h-3 w-3" />
          <span>{text}</span>
          {detected.kind === "tx" && (
            <>
              <span>·</span>
              <a
                href={`${APPCHAIN.rpc}/tx?hash=0x${detected.hash}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-editorial-ink hover:text-editorial"
              >
                open in RPC <ExternalLink className="h-3 w-3" />
              </a>
            </>
          )}
          {detected.kind === "block" && (
            <>
              <span>·</span>
              <a
                href={`${APPCHAIN.rpc}/block?height=${detected.height}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-editorial-ink hover:text-editorial"
              >
                open in RPC <ExternalLink className="h-3 w-3" />
              </a>
            </>
          )}
          {detected.kind === "ticker" && (
            <>
              <span>·</span>
              <span className="text-editorial-ink">/trade/{detected.ticker}</span>
            </>
          )}
          {(detected.kind === "address_hex" || detected.kind === "address_bech32") && (
            <>
              <span>·</span>
              <span className="text-editorial-ink">/u/…</span>
            </>
          )}
          {detected.kind === "unknown" && (
            <span className="text-error">
              doesn't look like a tx / block / address / ticker
            </span>
          )}
        </div>
      )}
    </form>
  );
}
