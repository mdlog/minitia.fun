import { fromBech32, toBech32, toHex, fromHex } from "@cosmjs/encoding";

/**
 * Bech32 / hex address helpers.
 *
 * MetaMask (or any eth_secp256k1 wallet) identifies a user by a 20-byte
 * address. Cosmos renders it as bech32 (`init1...`) while Move event data
 * renders it as hex (`0x...`). Both are the same account; code that wants
 * to compare or route between them needs explicit conversion.
 */

const DEFAULT_PREFIX = "init";

/** init1... -> 0x-prefixed lowercase hex, or null on parse failure. */
export function bech32ToHex(addr: string): string | null {
  if (!addr) return null;
  try {
    const { data } = fromBech32(addr.trim());
    return `0x${toHex(data).toLowerCase()}`;
  } catch {
    return null;
  }
}

/** 0x... (or bare hex) -> init1..., or null on parse failure. */
export function hexToBech32(hexAddr: string, prefix: string = DEFAULT_PREFIX): string | null {
  if (!hexAddr) return null;
  const cleaned = hexAddr.trim().toLowerCase().replace(/^0x/, "");
  if (!/^[0-9a-f]+$/.test(cleaned) || cleaned.length % 2 !== 0) return null;
  try {
    return toBech32(prefix, fromHex(cleaned));
  } catch {
    return null;
  }
}

/** Quick check without throwing. */
export function isBech32Address(s: string | null | undefined): boolean {
  if (!s) return false;
  try {
    fromBech32(s.trim());
    return true;
  } catch {
    return false;
  }
}

export function isHexAddress(s: string | null | undefined): boolean {
  if (!s) return false;
  return /^0x[0-9a-fA-F]{40}$/.test(s.trim());
}

/**
 * Normalise any address representation (bech32 or 0x-hex, with or without
 * prefix) into lowercase 0x-prefixed hex. Returns null if the input isn't
 * a recognisable address. Use this to build stable routing keys.
 */
export function toCanonicalHex(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (isHexAddress(trimmed)) return trimmed.toLowerCase();
  if (/^[0-9a-fA-F]{40}$/.test(trimmed)) return `0x${trimmed.toLowerCase()}`;
  if (isBech32Address(trimmed)) return bech32ToHex(trimmed);
  return null;
}

/** Compare two addresses, accepting any combination of hex / bech32 / casing. */
export function addressEq(a: string | null | undefined, b: string | null | undefined): boolean {
  const ha = toCanonicalHex(a);
  const hb = toCanonicalHex(b);
  if (!ha || !hb) return false;
  return ha === hb;
}

/** Short-display helper that works for either format. */
export function shortAddress(addr: string | null | undefined, chars = 6): string {
  if (!addr) return "";
  if (addr.length <= chars * 2 + 2) return addr;
  return `${addr.slice(0, chars + 2)}…${addr.slice(-chars)}`;
}
