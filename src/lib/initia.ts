/**
 * Initia network config — testnet defaults.
 * Docs: https://docs.initia.xyz/hackathon/get-started
 */

export const INITIA_NETWORK = (import.meta.env.VITE_INITIA_NETWORK ?? "testnet") as
  | "testnet"
  | "mainnet";

export const INITIA_CHAIN_ID =
  INITIA_NETWORK === "mainnet" ? "interwoven-1" : "initiation-2";

export const INITIA = {
  network: INITIA_NETWORK,
  chainId: INITIA_CHAIN_ID,
  rpc:
    INITIA_NETWORK === "mainnet"
      ? "https://rpc.initia.xyz"
      : "https://rpc.testnet.initia.xyz",
  rest:
    INITIA_NETWORK === "mainnet"
      ? "https://rest.initia.xyz"
      : "https://rest.testnet.initia.xyz",
  faucet: "https://faucet.testnet.initia.xyz",
  explorer:
    INITIA_NETWORK === "mainnet"
      ? "https://scan.initia.xyz"
      : "https://scan.testnet.initia.xyz",
  indexer: "https://indexer.initia.xyz",
  denom: "uinit",
  displayDenom: "INIT",
  decimals: 6,
};

/**
 * Minitia.fun Launcher Chain (L2 spoke) — Move VM rollup.
 * Spec: 100ms blocks · 10k TPS · Move modules (token_factory, bonding_curve, liquidity_migrator).
 * Live tunnels (optional) power the Discovery live-stats cards.
 */

/** Loose Chain shape compatible with @initia/initia-registry-types so we
 *  can pass it as `customChain` to InterwovenKitProvider without taking a
 *  hard runtime dep on the registry types package. */
export interface AppchainChainConfig {
  chain_name: string;
  chain_id: string;
  pretty_name?: string;
  network_type: "testnet" | "mainnet" | "devnet";
  bech32_prefix: "init";
  slip44: number;
  key_algos: ("secp256k1" | "initia_ethsecp256k1")[];
  fees: {
    fee_tokens: Array<{
      denom: string;
      fixed_min_gas_price?: number;
      low_gas_price?: number;
      average_gas_price?: number;
      high_gas_price?: number;
    }>;
  };
  apis: {
    rpc: Array<{ address: string }>;
    rest: Array<{ address: string }>;
    indexer?: Array<{ address: string }>;
    "json-rpc"?: Array<{ address: string }>;
  };
  metadata?: {
    minitia?: { type: "minimove" | "miniwasm" | "minievm"; version: string };
  };
}

export const APPCHAIN = {
  chainId: "minitia-fun-v2-1",
  vm: "move" as const,
  denom: "umin",
  displayDenom: "MIN",
  blockTimeMs: 100,
  targetTps: 10_000,
  tradingFeeBps: 50, // 0.5%
  graduationThresholdInit: 10,
  usernameSuffix: ".fun.init",
  modules: ["token_factory", "bonding_curve", "liquidity_migrator"] as const,
  deployedAddress: "0xC0A7DD6C8EA3CCB58831B2878FB7365AF7BE5B80",
  rpc: import.meta.env.VITE_APPCHAIN_RPC ?? "",
  rest: import.meta.env.VITE_APPCHAIN_REST ?? "",
  faucet: import.meta.env.VITE_APPCHAIN_FAUCET ?? "",
};

export const APPCHAIN_RPC_AVAILABLE = Boolean(APPCHAIN.rpc);
export const APPCHAIN_FAUCET_AVAILABLE = Boolean(APPCHAIN.faucet);

/** Registry-shaped chain config so InterwovenKitProvider knows about our
 *  rollup. Without this, kit.requestTxBlock can't route to chainId
 *  `minitia-fun-test-1`. With it, the wallet adapter (Privy / MetaMask /
 *  Keplr / Leap) handles signing in whichever mode the wallet expects
 *  (eth_secp256k1 / direct / amino) — no manual cosmjs juggling. */
export const APPCHAIN_CHAIN: AppchainChainConfig | undefined = APPCHAIN_RPC_AVAILABLE
  ? {
      chain_name: "minitia-fun",
      chain_id: APPCHAIN.chainId,
      pretty_name: "Minitia.fun",
      network_type: "testnet",
      bech32_prefix: "init",
      slip44: 60,
      key_algos: ["initia_ethsecp256k1"],
      fees: {
        fee_tokens: [
          {
            denom: APPCHAIN.denom,
            fixed_min_gas_price: 0.15,
            low_gas_price: 0.15,
            average_gas_price: 0.15,
            high_gas_price: 0.3,
          },
        ],
      },
      apis: {
        rpc: [{ address: APPCHAIN.rpc }],
        rest: [{ address: APPCHAIN.rest || APPCHAIN.rpc }],
        // Kit's zm() extracts indexer unconditionally and throws "URL not
        // found" if missing. We don't run a separate indexer; route to REST.
        indexer: [{ address: APPCHAIN.rest || APPCHAIN.rpc }],
      },
      metadata: {
        minitia: { type: "minimove", version: "v1.1.11" },
      },
    }
  : undefined;

/** Fetch the user's umin balance on the rollup via REST. Returns 0 if the
 *  account hasn't been touched on-chain yet (the classic "does not exist"
 *  case we convert into a Get-MIN prompt). */
export async function fetchAppchainUminBalance(address: string): Promise<bigint> {
  if (!APPCHAIN.rest || !address) return 0n;
  try {
    const res = await fetch(
      `${APPCHAIN.rest}/cosmos/bank/v1beta1/balances/${address}/by_denom?denom=${APPCHAIN.denom}`,
      { signal: AbortSignal.timeout(6000) },
    );
    if (!res.ok) return 0n;
    const data = (await res.json()) as { balance?: { amount?: string } };
    return BigInt(data.balance?.amount ?? "0");
  } catch {
    return 0n;
  }
}

/** Message types covered by the auto-sign session grant.
 *
 * The UI broadcasts every Move entry via `MsgExecuteJSON` (Buy / Sell /
 * Create Pool / Claim Fees / Stage / Record), so that's the primary entry
 * on the whitelist. Legacy `MsgExecute` stays for BCS-encoded CLI tx.
 *
 * InterwovenKit v2.6+ implements auto-sign as a **Cosmos SDK authz grant**:
 * the connected wallet signs ONE authz tx upfront that authorises an
 * in-memory grantee key to sign the listed msg types for a limited period.
 * After that grant, Buy / Sell / etc. are signed locally by the grantee --
 * no wallet popup per trade. This works with ANY wallet InterwovenKit
 * supports, including MetaMask, because the grant tx is an ordinary signed
 * message, not a wallet-specific session-key primitive. */
export const AUTO_SIGN_MSG_TYPES = [
  "/initia.move.v1.MsgExecuteJSON",
  "/initia.move.v1.MsgExecute",
];

export function shortAddress(addr?: string | null, chars = 4): string {
  if (!addr) return "";
  if (addr.length <= chars * 2 + 2) return addr;
  return `${addr.slice(0, chars + 2)}…${addr.slice(-chars)}`;
}

export function formatInitBalance(raw: string | bigint | number | undefined, digits = 2): string {
  if (raw === undefined || raw === null) return "0.00";
  const v = typeof raw === "bigint" ? Number(raw) : Number(raw);
  const init = v / 10 ** INITIA.decimals;
  return init.toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

/**
 * Fetch INIT balance from L1 REST endpoint (bech32 initia-prefixed address).
 * Returns the `uinit` microunit amount as string; undefined if none.
 */
export async function fetchInitBalance(address: string): Promise<string | undefined> {
  if (!address) return undefined;
  try {
    const res = await fetch(
      `${INITIA.rest}/cosmos/bank/v1beta1/balances/${address}/by_denom?denom=${INITIA.denom}`,
      { signal: AbortSignal.timeout(6000) },
    );
    if (!res.ok) return undefined;
    const data = (await res.json()) as { balance?: { amount?: string } };
    return data.balance?.amount ?? "0";
  } catch {
    return undefined;
  }
}
