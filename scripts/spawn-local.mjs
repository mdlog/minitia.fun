#!/usr/bin/env node
/**
 * Minitia.fun local sovereign-chain spawner.
 * ----------------------------------------------------------------------------
 * Safe alternative to `weave rollup launch` (which insists on overwriting
 * ~/.minitia and also requires L1 INIT deposits for OPinit bridge). This
 * script spawns a standalone minimove chain on the LOCAL machine in its own
 * home directory without touching the main bonding-curve rollup.
 *
 * Tradeoffs vs weave:
 *   + zero risk to existing ~/.minitia (main bonding-curve rollup)
 *   + zero L1 INIT required (no OPinit bridge deploy)
 *   + fast (< 2 min per ticker) and idempotent with --force
 *   - no OPinit bridge to initiation-2 (sovereign, not interwoven)
 *   - no InitiaDEX pool seeding
 *   - no token_factory republish yet (that's a follow-up minitiad tx move publish)
 *
 * Usage:
 *   node scripts/spawn-local.mjs <TICKER>                 # uses promoter-work/rollup-<ticker>.json
 *   node scripts/spawn-local.mjs --config <path>
 *   node scripts/spawn-local.mjs <TICKER> --force         # overwrite existing home
 *
 * On success prints the new chain's RPC URL + first block tx hash so the
 * operator can run:
 *   node scripts/promoter.mjs record <TICKER> <RPC> <FIRST_TX>
 */

import { spawn, spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync, existsSync, rmSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { homedir } from "node:os";
import { toBech32, fromHex } from "@cosmjs/encoding";

function hexToInitBech32(hex) {
  const clean = hex.toLowerCase().replace(/^0x/, "");
  return toBech32("init", fromHex(clean));
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = resolve(__dirname, "..");

const MINITIAD = process.env.MINITIAD_BIN
  || `${homedir()}/.weave/data/minimove@v1.1.11/minitiad`;
const MINITIAD_LIB = process.env.MINITIAD_LIB_DIR
  || `${homedir()}/.weave/data/minimove@v1.1.11`;

// --- arg parsing ------------------------------------------------------------
const argv = process.argv.slice(2);
let ticker = null;
let configPath = null;
let force = false;
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a === "--force") force = true;
  else if (a === "--config") configPath = argv[++i];
  else if (!ticker && !a.startsWith("--")) ticker = a.toUpperCase();
}
if (!ticker) {
  console.error("usage: spawn-local.mjs <TICKER> [--config <path>] [--force]");
  process.exit(1);
}
if (!configPath) {
  configPath = join(PROJECT_ROOT, "promoter-work", `rollup-${ticker.toLowerCase()}.json`);
}

if (!existsSync(configPath)) {
  console.error(`config not found: ${configPath}`);
  console.error("Run Stage promotion in the UI first, or pass --config <path>.");
  process.exit(1);
}
const cfg = JSON.parse(readFileSync(configPath, "utf8"));
console.log(`[spawn-local] ticker ${ticker}, config ${configPath}`);

const chainId = cfg.l2_config.chain_id;
const denom = cfg.l2_config.denom;
const moniker = cfg.l2_config.moniker;
const creator = cfg.genesis_accounts[0].address;
const creatorAllocation = cfg.genesis_accounts[0].coins;
const creatorBech32 = creator.startsWith("init1") ? creator : hexToInitBech32(creator);

// Port offsets -- main rollup uses 36657/36656/1317. Allocate fresh slots per
// ticker based on a simple hash so multiple chains don't collide.
function hashStr(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}
const portBase = 20000 + (hashStr(chainId) % 5000) * 10; // e.g. 24350
const rpcPort = portBase + 657;
const p2pPort = portBase + 656;
const restPort = portBase + 317;
const grpcPort = portBase + 90;
const appPort = portBase + 580; // minitiad custom app port

const home = join(homedir(), `.minitia-${ticker.toLowerCase()}`);
const rpc = `http://localhost:${rpcPort}`;

console.log(`  chain_id  : ${chainId}`);
console.log(`  denom     : ${denom}`);
console.log(`  home      : ${home}`);
console.log(`  rpc       : ${rpc}`);
console.log(`  rest      : http://localhost:${restPort}`);
console.log(`  p2p       : ${p2pPort}`);
console.log(`  creator   : ${creator}`);
console.log(`  allocation: ${creatorAllocation}`);

// --- step 1: init -----------------------------------------------------------
if (existsSync(home)) {
  if (force) {
    console.log(`[spawn-local] --force: removing existing home ${home}`);
    rmSync(home, { recursive: true, force: true });
  } else {
    console.error(`home ${home} already exists. Use --force to overwrite.`);
    process.exit(1);
  }
}

function run(label, bin, args, opts = {}) {
  console.log(`[spawn-local] ${label}`);
  const r = spawnSync(bin, args, {
    stdio: opts.showOutput ? "inherit" : "pipe",
    env: { ...process.env, LD_LIBRARY_PATH: MINITIAD_LIB },
    encoding: "utf8",
    ...opts,
  });
  if (r.status !== 0) {
    console.error(`  FAILED status=${r.status}`);
    if (r.stdout) console.error("  stdout:", r.stdout.slice(0, 600));
    if (r.stderr) console.error("  stderr:", r.stderr.slice(0, 600));
    process.exit(1);
  }
  return r;
}

run("minitiad init", MINITIAD, [
  "init", moniker,
  "--home", home,
  "--chain-id", chainId,
  "--denom", denom,
  "--overwrite",
]);

// --- step 2: patch genesis.json --------------------------------------------
const genesisPath = join(home, "config", "genesis.json");
const genesis = JSON.parse(readFileSync(genesisPath, "utf8"));

// Ensure staking denom matches our custom denom (minitiad init uses the
// flag, but belt-and-suspenders).
if (genesis.app_state?.staking?.params) {
  genesis.app_state.staking.params.bond_denom = denom;
}
if (genesis.app_state?.crisis?.constant_fee?.denom) {
  genesis.app_state.crisis.constant_fee.denom = denom;
}
if (genesis.app_state?.gov?.params?.min_deposit?.[0]?.denom) {
  genesis.app_state.gov.params.min_deposit[0].denom = denom;
}
if (genesis.app_state?.mint?.params) {
  genesis.app_state.mint.params.mint_denom = denom;
}

writeFileSync(genesisPath, JSON.stringify(genesis, null, 2));
console.log(`[spawn-local] patched genesis.json (bond_denom=${denom})`);

// --- step 2b: patch opchild (OPinit child-chain) params --------------------
// opchild.params.admin and bridge_executors default to empty strings which
// fail genesis validate. For a sovereign local spawn we never actually use
// the bridge, but we still need valid bech32 fillers.
const tempGenesis = JSON.parse(readFileSync(genesisPath, "utf8"));
if (tempGenesis.app_state?.opchild?.params) {
  const p = tempGenesis.app_state.opchild.params;
  p.admin = creatorBech32;
  p.bridge_executors = [creatorBech32];
  writeFileSync(genesisPath, JSON.stringify(tempGenesis, null, 2));
  console.log(`[spawn-local] patched opchild.params (admin + bridge_executors = ${creatorBech32})`);
}

// --- step 3: validator key + creator account --------------------------------
// Creator address is an 0x hex -- convert to bech32 for the account account cmd.
// minitiad accepts 0x addresses directly in most places, but `add-genesis-account`
// prefers bech32. Use minitiad's `keys parse` conversion if needed.
// For simplicity we create a local validator key, give it stake, and also
// allocate to the creator's 0x address (minitiad accepts this form).
run("minitiad keys add validator", MINITIAD, [
  "keys", "add", "validator",
  "--keyring-backend", "test",
  "--home", home,
  "--output", "json",
]);

// Read validator bech32
const valKeyRaw = spawnSync(MINITIAD, [
  "keys", "show", "validator",
  "--keyring-backend", "test",
  "--home", home,
  "--output", "json",
], { env: { ...process.env, LD_LIBRARY_PATH: MINITIAD_LIB }, encoding: "utf8" });
if (valKeyRaw.status !== 0) {
  console.error("keys show failed:", valKeyRaw.stderr);
  process.exit(1);
}
const valAddr = JSON.parse(valKeyRaw.stdout).address;
console.log(`[spawn-local] validator addr: ${valAddr}`);

// Grant validator stake + creator allocation.
const validatorStake = `100000000${denom}`; // 100m units for staking
run("genesis add validator account", MINITIAD, [
  "genesis", "add-genesis-account",
  valAddr, validatorStake,
  "--home", home,
]);
console.log(`[spawn-local] creator bech32: ${creatorBech32}`);
run("genesis add creator account", MINITIAD, [
  "genesis", "add-genesis-account",
  creatorBech32, creatorAllocation,
  "--home", home,
]);

// --- step 4: register validator (minimove / OPinit path) --------------------
// Minimove rollups use opchild-module validator registration, not
// Cosmos SDK staking gentx. `add-genesis-validator` writes the validator
// (with its pubkey from the keyring) into app_state.opchild.validators
// so the L2 can start without a gentx + collect-gentxs flow.
run("genesis add-genesis-validator", MINITIAD, [
  "genesis", "add-genesis-validator", "validator",
  "--keyring-backend", "test",
  "--home", home,
  "--chain-id", chainId,
]);
run("genesis validate", MINITIAD, [
  "genesis", "validate",
  "--home", home,
]);

// --- step 5: patch ports in config.toml + app.toml --------------------------
function patchFile(path, mutations) {
  let txt = readFileSync(path, "utf8");
  for (const [pattern, replacement] of mutations) {
    txt = txt.replace(pattern, replacement);
  }
  writeFileSync(path, txt);
}

patchFile(join(home, "config", "config.toml"), [
  [/laddr = "tcp:\/\/127\.0\.0\.1:26657"/, `laddr = "tcp://0.0.0.0:${rpcPort}"`],
  [/laddr = "tcp:\/\/0\.0\.0\.0:26657"/, `laddr = "tcp://0.0.0.0:${rpcPort}"`],
  [/laddr = "tcp:\/\/0\.0\.0\.0:26656"/, `laddr = "tcp://0.0.0.0:${p2pPort}"`],
  [/pprof_laddr = "localhost:6060"/, `pprof_laddr = "localhost:${portBase + 60}"`],
  [/proxy_app = "tcp:\/\/127\.0\.0\.1:26658"/, `proxy_app = "tcp://127.0.0.1:${appPort}"`],
]);

patchFile(join(home, "config", "app.toml"), [
  [/address = "tcp:\/\/localhost:1317"/, `address = "tcp://0.0.0.0:${restPort}"`],
  [/address = "localhost:9090"/, `address = "localhost:${grpcPort}"`],
  [/address = "localhost:9091"/, `address = "localhost:${grpcPort + 1}"`],
  [/minimum-gas-prices = ""/, `minimum-gas-prices = "0${denom}"`],
]);

console.log(`[spawn-local] ports patched (rpc=${rpcPort}, p2p=${p2pPort}, rest=${restPort})`);

// --- step 6: start as background process -----------------------------------
const logFile = join(home, "chain.log");
writeFileSync(logFile, ""); // reset
const child = spawn(MINITIAD, [
  "start",
  "--home", home,
  "--log_level", "*:info",
], {
  env: { ...process.env, LD_LIBRARY_PATH: MINITIAD_LIB },
  detached: true,
  stdio: ["ignore", "ignore", "ignore"],
});
child.unref();
console.log(`[spawn-local] minitiad started detached, pid=${child.pid}`);
console.log(`  log: ${logFile} (minitiad stdout/stderr not captured due to detach)`);

// --- step 7: wait for /status -----------------------------------------------
async function waitForStatus(maxAttempts = 30) {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const r = await fetch(`${rpc}/status`, { signal: AbortSignal.timeout(2000) });
      if (r.ok) {
        const j = await r.json();
        if (j.result?.node_info?.network === chainId) {
          return j.result.sync_info.latest_block_height;
        }
      }
    } catch {
      /* retry */
    }
    await new Promise((res) => setTimeout(res, 1500));
  }
  return null;
}

console.log("[spawn-local] waiting for chain to produce first block…");
const height = await waitForStatus();
if (!height) {
  console.error(`chain did not come up at ${rpc} within 45s.`);
  console.error(`check logs: ps aux | grep ${chainId}`);
  process.exit(1);
}
console.log(`[spawn-local] chain live. height=${height}`);

// Fetch first block tx hash (if any) -- for a fresh chain this is usually empty,
// so fall back to "genesis".
let firstBlockTx = "genesis";
try {
  const r = await fetch(`${rpc}/block?height=1`);
  const j = await r.json();
  const txs = j.result?.block?.data?.txs || [];
  if (txs.length > 0) {
    const raw = txs[0];
    const hashR = await fetch(`${rpc}/tx_search?query=%22tx.height%3D1%22&per_page=1`);
    const hashJ = await hashR.json();
    firstBlockTx = hashJ.result?.txs?.[0]?.hash || "genesis";
  }
} catch {
  /* non-fatal */
}

// --- step 8: final summary --------------------------------------------------
const summary = {
  ticker,
  chain_id: chainId,
  rpc,
  rest: `http://localhost:${restPort}`,
  home,
  height,
  first_block_tx: firstBlockTx,
  pid: child.pid,
};
writeFileSync(
  join(PROJECT_ROOT, "promoter-work", `live-${ticker.toLowerCase()}.json`),
  JSON.stringify(summary, null, 2),
);

console.log("\n=== CHAIN LIVE ===");
console.log(JSON.stringify(summary, null, 2));
console.log("\nNow register it on the bonding-curve rollup:");
console.log(
  `  node scripts/promoter.mjs record ${ticker} ${rpc} ${firstBlockTx}\n`,
);
