#!/usr/bin/env node
/**
 * Minitia.fun appchain promoter daemon (v2).
 * ----------------------------------------------------------------------------
 * Long-running process that watches the bonding-curve rollup for
 * liquidity_migrator::PromotionStaged events, writes a rollup config per
 * graduated ticker, spawns a sovereign minimove chain via
 * scripts/spawn-local.mjs, waits for the new chain to produce its first
 * block, and calls liquidity_migrator::record_rollup to flip the
 * Graduation card from amber "staged" to emerald "live" on the UI.
 *
 * Why spawn-local.mjs instead of `weave rollup launch` directly:
 *   - weave is interactive even with --with-config (OP-bridge funding
 *     confirmation, relayer setup). A daemon can't handle prompts.
 *   - spawn-local.mjs is non-interactive, sovereign (no L1 INIT deposit),
 *     and writes promoter-work/live-<ticker>.json with chain_id + rpc
 *     + first_block_tx on success. Perfect handoff.
 *
 * Env:
 *   APPCHAIN_RPC         default http://localhost:26657   (v2 port)
 *   APPCHAIN_REST        default http://localhost:1317
 *   CHAIN_ID             default minitia-fun-v2-1
 *   DEPLOYED_ADDRESS     default 0xC0A7DD6C8EA3CCB58831B2878FB7365AF7BE5B80
 *   WORKDIR              default ./promoter-work
 *   MINITIAD_BIN         default ~/.weave/data/minimove@v1.1.11/minitiad
 *   MINITIAD_LIB_DIR     default ~/.weave/data/minimove@v1.1.11
 *   POLL_MS              default 15000
 *   AUTO                 when "1" (default) spawns chains + records on-chain
 *                        automatically. Set "0" for dry-run (prints
 *                        commands, doesn't execute).
 */

import { spawn, spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve, join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { homedir } from "node:os";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, "..");

const APPCHAIN_RPC = process.env.APPCHAIN_RPC || "http://localhost:26657";
const APPCHAIN_REST = process.env.APPCHAIN_REST || "http://localhost:1317";
const CHAIN_ID = process.env.CHAIN_ID || "minitia-fun-v2-1";
const DEPLOYED_ADDRESS = (
  process.env.DEPLOYED_ADDRESS || "0xC0A7DD6C8EA3CCB58831B2878FB7365AF7BE5B80"
).toLowerCase();
const WORKDIR = resolve(process.env.WORKDIR || join(PROJECT_ROOT, "promoter-work"));
const MINITIAD_BIN =
  process.env.MINITIAD_BIN || join(homedir(), ".weave/data/minimove@v1.1.11/minitiad");
const MINITIAD_LIB =
  process.env.MINITIAD_LIB_DIR || join(homedir(), ".weave/data/minimove@v1.1.11");
const POLL_MS = Number(process.env.POLL_MS || 15_000);
// Default AUTO=1 so the daemon actually does the work. Set AUTO=0 for dry-run.
const AUTO = (process.env.AUTO ?? "1") === "1";

const SPAWN_LOCAL = join(PROJECT_ROOT, "scripts/spawn-local.mjs");

mkdirSync(WORKDIR, { recursive: true });
const STATE_FILE = join(WORKDIR, "state.json");

// ---- utils -----------------------------------------------------------------

function loadState() {
  if (!existsSync(STATE_FILE)) return { staged: {}, live: {} };
  try {
    return JSON.parse(readFileSync(STATE_FILE, "utf8"));
  } catch {
    return { staged: {}, live: {} };
  }
}
function saveState(state) {
  writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

function log(...args) {
  const ts = new Date().toISOString().slice(11, 19);
  console.log(`[${ts}]`, ...args);
}

async function fetchJson(url) {
  const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
}

async function fetchTxsByAction(action) {
  const q = encodeURIComponent(`"message.action='${action}'"`);
  const url = `${APPCHAIN_RPC}/tx_search?query=${q}&per_page=100&order_by=%22desc%22`;
  const json = await fetchJson(url);
  return json?.result?.txs ?? [];
}

/**
 * Parse PromotionStaged events from BOTH direct MsgExecuteJSON txs and
 * authz-wrapped (MsgExec) — required because auto-sign routes everything
 * through authz and CometBFT only indexes the outer action attribute.
 */
async function fetchStagedEvents() {
  const [direct, wrapped] = await Promise.all([
    fetchTxsByAction("/initia.move.v1.MsgExecuteJSON"),
    fetchTxsByAction("/cosmos.authz.v1beta1.MsgExec"),
  ]);
  const txs = [...direct, ...wrapped].sort(
    (a, b) => Number(b.height ?? 0) - Number(a.height ?? 0),
  );
  const seen = new Set();
  const out = [];
  for (const tx of txs) {
    if ((tx.tx_result?.code ?? 1) !== 0) continue;
    if (seen.has(tx.hash)) continue;
    seen.add(tx.hash);
    for (const ev of tx.tx_result?.events ?? []) {
      if (ev.type !== "move") continue;
      const attrs = Object.fromEntries((ev.attributes ?? []).map((a) => [a.key, a.value]));
      if (!attrs.type_tag?.endsWith("::liquidity_migrator::PromotionStaged")) continue;
      try {
        const data = JSON.parse(attrs.data || "{}");
        out.push({
          ticker: String(data.ticker || "").toUpperCase(),
          creator: String(data.creator || ""),
          final_reserve: String(data.final_reserve || "0"),
          final_supply: String(data.final_supply || "0"),
          hash: tx.hash,
          height: Number(tx.height || 0),
        });
      } catch (e) {
        log("bad PromotionStaged event data:", e.message);
      }
    }
  }
  return out;
}

function tickerToChainId(ticker) {
  return `${ticker.toLowerCase()}-fun-1`;
}
function tickerToDenom(ticker) {
  return `u${ticker.toLowerCase()}`;
}

/**
 * Minimal rollup launch config consumed by spawn-local.mjs. The native
 * denom of the spawned chain is `u<ticker>` — effectively "the memecoin
 * IS the gas token". Creator is seeded with final_reserve worth so the
 * chain is immediately usable (deploy contracts, transfer, etc.).
 *
 * Conceptually: final_reserve represents total MIN deposited into the
 * curve. Mapping 1:1 to u<ticker> at genesis lets the creator then seed
 * a DEX pool or airdrop holders on the new chain with real backing.
 */
function buildConfig(ev) {
  const chain_id = tickerToChainId(ev.ticker);
  const denom = tickerToDenom(ev.ticker);
  return {
    l1_config: {
      chain_id: CHAIN_ID,
      rpc_url: APPCHAIN_RPC,
      gas_prices: "0.15umin",
    },
    l2_config: {
      chain_id,
      denom,
      moniker: `${chain_id}-validator`,
    },
    genesis_accounts: [
      { address: ev.creator, coins: `${ev.final_reserve}${denom}` },
    ],
    minitia_fun: {
      ticker: ev.ticker,
      staged_by: DEPLOYED_ADDRESS,
      staged_height: ev.height,
      staged_tx: ev.hash,
      final_reserve: ev.final_reserve,
      final_supply: ev.final_supply,
    },
  };
}

// ---- spawn + record --------------------------------------------------------

function runSpawnLocal(ticker) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn("node", [SPAWN_LOCAL, ticker, "--force"], {
      env: { ...process.env },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      const s = chunk.toString();
      stdout += s;
      for (const line of s.split("\n")) if (line) log(`  [spawn] ${line}`);
    });
    child.stderr.on("data", (chunk) => {
      const s = chunk.toString();
      stderr += s;
      for (const line of s.split("\n")) if (line) log(`  [spawn!] ${line}`);
    });
    child.on("exit", (code) => {
      if (code === 0) resolvePromise({ stdout, stderr });
      else reject(new Error(`spawn-local exited code=${code}: ${stderr.slice(0, 400)}`));
    });
  });
}

function readLiveSummary(ticker) {
  const path = join(WORKDIR, `live-${ticker.toLowerCase()}.json`);
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return null;
  }
}

function recordRollup(ticker, rollupRpc, firstBlockTx) {
  const chain_id = tickerToChainId(ticker);
  // execute-json expects a JSON array of Move arg values. Signature:
  //   record_rollup(sender, registry_addr: address, ticker: String,
  //                 rollup_chain_id: String, rollup_rpc: String,
  //                 first_block_tx: String)
  // sender is supplied implicitly via --from, so args starts at registry_addr.
  const args = JSON.stringify([
    DEPLOYED_ADDRESS,
    ticker.toUpperCase(),
    chain_id,
    rollupRpc,
    firstBlockTx,
  ]);
  log(`[record] calling liquidity_migrator::record_rollup for $${ticker}`);
  log(`  chain_id=${chain_id}  rollup_rpc=${rollupRpc}`);
  const env = { ...process.env, LD_LIBRARY_PATH: MINITIAD_LIB };
  const r = spawnSync(
    MINITIAD_BIN,
    [
      "tx",
      "move",
      "execute-json",
      DEPLOYED_ADDRESS,
      "liquidity_migrator",
      "record_rollup",
      "--args",
      args,
      "--from",
      "gas-station",
      "--chain-id",
      CHAIN_ID,
      "--keyring-backend",
      "test",
      "--node",
      APPCHAIN_RPC.replace(/^http:/, "tcp:"),
      "--gas",
      "500000",
      "--gas-prices",
      "0.15umin",
      "-y",
    ],
    { env, encoding: "utf8" },
  );
  if (r.status !== 0) {
    log("  record_rollup failed:", r.stdout?.slice(0, 400), r.stderr?.slice(0, 400));
    return false;
  }
  const match = r.stdout.match(/txhash: ([A-F0-9]+)/);
  if (match) log(`  record tx broadcast: ${match[1]}`);
  const state = loadState();
  state.live[ticker.toUpperCase()] = {
    chain_id,
    rollupRpc,
    firstBlockTx,
    recordedAt: Date.now(),
  };
  delete state.staged[ticker.toUpperCase()];
  saveState(state);
  log(`  ${ticker} now marked live in promoter state`);
  return true;
}

// ---- event handler ---------------------------------------------------------

async function handleStaged(ev, state) {
  if (state.live[ev.ticker]) return; // already spawned + recorded
  const prior = state.staged[ev.ticker];
  if (prior && prior.hash === ev.hash) return; // already attempted this exact stage
  log(`[stage] PromotionStaged for $${ev.ticker}`);
  log(`  creator       : ${ev.creator}`);
  log(`  final_reserve : ${ev.final_reserve}`);
  log(`  final_supply  : ${ev.final_supply}`);
  log(`  tx            : ${ev.hash} h=${ev.height}`);

  const cfg = buildConfig(ev);
  const cfgPath = join(WORKDIR, `rollup-${ev.ticker.toLowerCase()}.json`);
  writeFileSync(cfgPath, JSON.stringify(cfg, null, 2));
  log(`  wrote config  : ${cfgPath}`);

  state.staged[ev.ticker] = { hash: ev.hash, height: ev.height, cfgPath };
  saveState(state);

  if (!AUTO) {
    log("  AUTO=0 — operator must run:");
    log(`    $ node ${SPAWN_LOCAL} ${ev.ticker} --force`);
    log(`    $ node scripts/promoter.mjs record ${ev.ticker} <rpc> <first_tx>`);
    return;
  }

  log("  AUTO=1 — spawning sovereign chain via scripts/spawn-local.mjs…");
  try {
    await runSpawnLocal(ev.ticker);
  } catch (err) {
    log(`  spawn-local failed for ${ev.ticker}: ${err.message}`);
    return;
  }

  // spawn-local writes live-<ticker>.json on success — read it for coords.
  const summary = readLiveSummary(ev.ticker);
  if (!summary?.rpc || !summary?.chain_id) {
    log(`  missing live summary for ${ev.ticker}; skipping record`);
    return;
  }
  log(`  spawn ok — rpc=${summary.rpc} first_block_tx=${summary.first_block_tx}`);

  const ok = recordRollup(ev.ticker, summary.rpc, summary.first_block_tx || "genesis");
  if (!ok) {
    log(`  record_rollup broadcast failed for ${ev.ticker}; leaving in staged state`);
  }
}

// ---- main loop -------------------------------------------------------------

async function watchLoop() {
  log(`watching ${APPCHAIN_RPC} every ${POLL_MS}ms for PromotionStaged events`);
  log(`chain_id=${CHAIN_ID}  workdir=${WORKDIR}  AUTO=${AUTO ? 1 : 0}`);
  const state = loadState();
  /* eslint no-constant-condition: off */
  while (true) {
    try {
      const events = await fetchStagedEvents();
      for (const ev of events.reverse()) await handleStaged(ev, state);
    } catch (e) {
      log("poll error:", e.message);
    }
    await new Promise((r) => setTimeout(r, POLL_MS));
  }
}

// ---- CLI -------------------------------------------------------------------

if (process.argv[2] === "record") {
  const [, , , ticker, rpc, firstBlockTx] = process.argv;
  if (!ticker || !rpc) {
    console.error("usage: promoter.mjs record TICKER ROLLUP_RPC [FIRST_BLOCK_TX]");
    process.exit(1);
  }
  recordRollup(ticker, rpc, firstBlockTx || "genesis");
} else {
  watchLoop();
}
