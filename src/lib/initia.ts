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
export const APPCHAIN = {
  chainId: "minitia-fun-test-1",
  vm: "move" as const,
  denom: "umin",
  displayDenom: "MIN",
  blockTimeMs: 100,
  targetTps: 10_000,
  tradingFeeBps: 50, // 0.5%
  graduationThresholdInit: 5_000,
  usernameSuffix: ".fun.init",
  modules: ["token_factory", "bonding_curve", "liquidity_migrator"] as const,
  deployedAddress: "0xC0A7DD6C8EA3CCB58831B2878FB7365AF7BE5B80",
  rpc: import.meta.env.VITE_APPCHAIN_RPC ?? "",
  rest: import.meta.env.VITE_APPCHAIN_REST ?? "",
  faucet: import.meta.env.VITE_APPCHAIN_FAUCET ?? "",
};

export const APPCHAIN_RPC_AVAILABLE = Boolean(APPCHAIN.rpc);
export const APPCHAIN_FAUCET_AVAILABLE = Boolean(APPCHAIN.faucet);

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

/** Message types we auto-sign for one-click trading (session keys). */
export const AUTO_SIGN_MSG_TYPES = [
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
