/**
 * Minimal Pinata upload helper.
 *
 * Reads a JWT from `VITE_PINATA_JWT` and a gateway from `VITE_PINATA_GATEWAY`
 * (optional — falls back to the public `gateway.pinata.cloud` gateway).
 *
 * SECURITY NOTE
 * -------------
 * The JWT is shipped in the client bundle. This is the simplest setup and is
 * acceptable for testnet / hackathon use, but the token can be extracted by
 * anyone who inspects the JS and used to burn your Pinata quota.
 *
 * For production, replace this module with a call to a small backend that
 * returns a short-lived presigned upload URL (Pinata supports this via
 * `POST /v3/files/sign`). The JWT then stays server-side and only the scoped
 * upload URL reaches the browser.
 */

const PIN_FILE_URL = "https://api.pinata.cloud/pinning/pinFileToIPFS";

export interface PinataConfig {
  jwt: string;
  gateway: string;
}

export function getPinataConfig(): PinataConfig | null {
  const jwt = import.meta.env.VITE_PINATA_JWT as string | undefined;
  if (!jwt) return null;
  const rawGateway = (import.meta.env.VITE_PINATA_GATEWAY as string | undefined)?.trim();
  const gateway = (rawGateway || "https://gateway.pinata.cloud").replace(/\/$/, "");
  return { jwt, gateway };
}

export const PINATA_ENABLED = Boolean(getPinataConfig());

export interface UploadResult {
  /** Raw Pinata CID. */
  cid: string;
  /** `ipfs://<cid>` — the canonical on-chain pointer. */
  ipfsUri: string;
  /** Full HTTPS URL usable in an `<img src>` tag. */
  gatewayUrl: string;
  /** Pinata-reported size in bytes. */
  size: number;
}

interface PinataResponse {
  IpfsHash: string;
  PinSize: number;
  Timestamp?: string;
}

export async function uploadToPinata(
  file: File,
  opts?: { name?: string; keyvalues?: Record<string, string>; signal?: AbortSignal },
): Promise<UploadResult> {
  const cfg = getPinataConfig();
  if (!cfg) {
    throw new Error(
      "Pinata is not configured. Set VITE_PINATA_JWT in .env.local.",
    );
  }

  const form = new FormData();
  form.append("file", file, file.name);
  if (opts?.name) {
    form.append(
      "pinataMetadata",
      JSON.stringify({ name: opts.name, keyvalues: opts.keyvalues ?? {} }),
    );
  }
  // Pin as CIDv1 (base32) for a URL-friendly CID; Pinata accepts the override.
  form.append("pinataOptions", JSON.stringify({ cidVersion: 1 }));

  const res = await fetch(PIN_FILE_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${cfg.jwt}` },
    body: form,
    signal: opts?.signal,
  });

  if (!res.ok) {
    let detail = `HTTP ${res.status}`;
    try {
      const body = await res.text();
      if (body) detail = body.slice(0, 300);
    } catch {
      /* ignore */
    }
    throw new Error(`Pinata upload failed · ${detail}`);
  }

  const json = (await res.json()) as PinataResponse;
  if (!json.IpfsHash) {
    throw new Error("Pinata upload returned no CID");
  }

  return {
    cid: json.IpfsHash,
    ipfsUri: `ipfs://${json.IpfsHash}`,
    gatewayUrl: `${cfg.gateway}/ipfs/${json.IpfsHash}`,
    size: json.PinSize ?? 0,
  };
}

/** Resolve any token metadata URI (ipfs://…, https://…, data:…) into an HTTPS
 * URL that an <img> tag can load. Returns null for empty / unknown schemes. */
export function resolveImageUri(uri?: string | null): string | null {
  if (!uri) return null;
  const trimmed = uri.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("data:") || trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }
  if (trimmed.startsWith("ipfs://")) {
    const cfg = getPinataConfig();
    const gateway = cfg?.gateway ?? "https://gateway.pinata.cloud";
    const path = trimmed.slice("ipfs://".length).replace(/^\/+/, "");
    return `${gateway}/ipfs/${path}`;
  }
  // Bare CID (Qm… / bafy…) — assume ipfs:
  if (/^(Qm[1-9A-HJ-NP-Za-km-z]{44}|b[a-z2-7]{58,})$/i.test(trimmed)) {
    return resolveImageUri(`ipfs://${trimmed}`);
  }
  return null;
}
