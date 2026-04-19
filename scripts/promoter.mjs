#!/usr/bin/env node
/**
 * Minitia.fun appchain promoter daemon.
 * ----------------------------------------------------------------------------
 * Long-running process that watches the bonding-curve rollup for
 * liquidity_migrator::PromotionStaged events, assembles a Weave rollup launch
 * config per graduated ticker, and (optionally) invokes `weave rollup launch`
 * to spawn the new appchain.
 *
 * Design:
 * - Poll the tendermint RPC tx_search endpoint every POLL_MS (default 15s).
 * - Dedupe already-seen tickers in-process + via an on-disk state file so a
 *   restart doesn't re-launch a rollup that's already live.
 * - For each new stage: generate rollup-{ticker}.json in WORKDIR and either
 *   (a) shell out to `weave rollup launch --with-config <path>` if AUTO=1, or
 *   (b) print the exact command for the operator to run manually.
 * - Once the operator (or AUTO) confirms the rollup is live, call
 *   liquidity_migrator::record_rollup via minitiad CLI to persist
 *   (chain_id, rpc_url, first_block_tx) on-chain.
 *
 * Env:
 *   APPCHAIN_RPC         bonding-curve rollup RPC (default http://localhost:36657)
 *   APPCHAIN_REST        bonding-curve rollup REST (default http://localhost:1317)
 *   DEPLOYED_ADDRESS     module admin address (default 0xC0A7DD6...)
 *   WORKDIR              where to write configs / state (default ./promoter-work)
 *   WEAVE_BIN            path to weave binary (default /home/mdlog/bin/weave)
 *   MINITIAD_BIN         path to minitiad (default ~/.weave/data/minimove.../minitiad)
 *   MINITIAD_LIB_DIR     lib dir for minitiad (default ~/.weave/data/minimove...)
 *   POLL_MS              poll interval in ms (default 15000)
 *   AUTO                 when 1, actually exec `weave rollup launch`. Otherwise dry-run.
 */

import { spawn, spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve, join } from "node:path";

const APPCHAIN_RPC = process.env.APPCHAIN_RPC || "http://localhost:36657";
const APPCHAIN_REST = process.env.APPCHAIN_REST || "http://localhost:1317";
const DEPLOYED_ADDRESS = (process.env.DEPLOYED_ADDRESS || "0xC0A7DD6C8EA3CCB58831B2878FB7365AF7BE5B80").toLowerCase();
const WORKDIR = resolve(process.env.WORKDIR || "./promoter-work");
const WEAVE_BIN = process.env.WEAVE_BIN || "/home/mdlog/bin/weave";
const MINITIAD_BIN = process.env.MINITIAD_BIN || "/home/mdlog/.weave/data/minimove@v1.1.11/minitiad";
const MINITIAD_LIB = process.env.MINITIAD_LIB_DIR || "/home/mdlog/.weave/data/minimove@v1.1.11";
const POLL_MS = Number(process.env.POLL_MS || 15_000);
const AUTO = process.env.AUTO === "1";

mkdirSync(WORKDIR, { recursive: true });
const STATE_FILE = join(WORKDIR, "state.json");

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

async function fetchStagedEvents() {
  const q = encodeURIComponent(`"message.action='/initia.move.v1.MsgExecuteJSON'"`);
  const url = `${APPCHAIN_RPC}/tx_search?query=${q}&per_page=100&order_by=%22desc%22`;
  const json = await fetchJson(url);
  const out = [];
  for (const tx of json?.result?.txs ?? []) {
    if ((tx.tx_result?.code ?? 1) !== 0) continue;
    for (const ev of tx.tx_result?.events ?? []) {
      if (ev.type !== "move") continue;
      const attrs = Object.fromEntries((ev.attributes ?? []).map(a => [a.key, a.value]));
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
 * Minimal rollup launch config. We keep the OP bridge + gas params identical
 * to the live minitia-fun-test-1 config (see ~/.weave/data/minitia.config.json)
 * and just swap chain_id + moniker + the creator's genesis allocation.
 *
 * system_keys are intentionally NOT included: operators should let `weave
 * rollup launch` generate fresh keys during interactive setup, OR fill them
 * in per-environment. The promoter's job is scaffolding, not key custody.
 */
function buildConfig(ev) {
  const chain_id = tickerToChainId(ev.ticker);
  const denom = tickerToDenom(ev.ticker);
  return {
    l1_config: {
      chain_id: "initiation-2",
      rpc_url: "https://rpc.testnet.initia.xyz:443",
      gas_prices: "0.015uinit",
    },
    l2_config: {
      chain_id,
      denom,
      moniker: `${chain_id}-validator`,
    },
    op_bridge: {
      output_submission_interval: "1m",
      output_finalization_period: "168h",
      output_submission_start_height: 1,
      batch_submission_target: "INITIA",
      enable_oracle: true,
    },
    // Creator seeded with final_reserve worth of gas denom so the new chain
    // is usable the moment it boots. Supply token custody is handled by a
    // follow-up Move publish on the spawned chain (phase A.6).
    genesis_accounts: [
      { address: ev.creator, coins: `${ev.final_reserve}${denom}` },
    ],
    /** marker so downstream tools know this config was auto-generated */
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

async function handleStaged(ev, state) {
  if (state.live[ev.ticker]) {
    return; // already spawned
  }
  if (state.staged[ev.ticker]) {
    log(`ticker ${ev.ticker} already staged (tx ${state.staged[ev.ticker].hash}); skipping`);
    return;
  }
  log(`[stage] new PromotionStaged event for $${ev.ticker}`);
  log(`  creator      : ${ev.creator}`);
  log(`  final_reserve: ${ev.final_reserve}`);
  log(`  final_supply : ${ev.final_supply}`);
  log(`  tx           : ${ev.hash} h=${ev.height}`);

  const cfg = buildConfig(ev);
  const cfgPath = join(WORKDIR, `rollup-${ev.ticker.toLowerCase()}.json`);
  writeFileSync(cfgPath, JSON.stringify(cfg, null, 2));
  log(`  config       : ${cfgPath}`);

  state.staged[ev.ticker] = { hash: ev.hash, height: ev.height, cfgPath };
  saveState(state);

  const minitiaDir = join(WORKDIR, "homes", ev.ticker.toLowerCase());
  const opinitDir = join(WORKDIR, "opinit", ev.ticker.toLowerCase());
  const cmd = `${WEAVE_BIN} rollup launch --with-config ${cfgPath} --vm move --minitia-dir ${minitiaDir} --opinit-dir ${opinitDir} --force`;

  if (!AUTO) {
    log("  AUTO=0; operator must run:");
    log("  $ " + cmd);
    log("  Then invoke: node scripts/promoter.mjs record " + ev.ticker + " <rollup_rpc> <first_block_tx>");
    return;
  }

  log("  AUTO=1; launching rollup subprocess…");
  await new Promise((resolvePromise) => {
    const child = spawn(WEAVE_BIN, [
      "rollup", "launch",
      "--with-config", cfgPath,
      "--vm", "move",
      "--minitia-dir", minitiaDir,
      "--opinit-dir", opinitDir,
      "--force",
    ], { stdio: "inherit" });
    child.on("exit", (code) => {
      if (code === 0) {
        log(`  weave rollup launch finished ok for ${ev.ticker}`);
      } else {
        log(`  weave rollup launch exited code=${code} for ${ev.ticker}`);
      }
      resolvePromise();
    });
  });
}

function recordRollup(ticker, rollupRpc, firstBlockTx) {
  const chain_id = tickerToChainId(ticker);
  const args = JSON.stringify([
    `"${DEPLOYED_ADDRESS}"`,
    JSON.stringify(ticker.toUpperCase()),
    JSON.stringify(chain_id),
    JSON.stringify(rollupRpc),
    JSON.stringify(firstBlockTx),
  ]);
  const argsPath = join(WORKDIR, `record-args-${ticker.toLowerCase()}.json`);
  writeFileSync(argsPath, args);
  log(`[record] calling liquidity_migrator::record_rollup for $${ticker}`);
  const env = { ...process.env, LD_LIBRARY_PATH: MINITIAD_LIB };
  const r = spawnSync(MINITIAD_BIN, [
    "tx", "move", "execute-json",
    DEPLOYED_ADDRESS,
    "liquidity_migrator", "record_rollup",
    "--args", args,
    "--from", "gas-station",
    "--chain-id", "minitia-fun-test-1",
    "--keyring-backend", "test",
    "--node", APPCHAIN_RPC,
    "--gas", "500000",
    "--gas-prices", "0.15umin",
    "-y",
  ], { env, encoding: "utf8" });
  if (r.status !== 0) {
    log("  record_rollup failed:", r.stdout?.slice(0, 400), r.stderr?.slice(0, 400));
    return;
  }
  const match = r.stdout.match(/txhash: ([A-F0-9]+)/);
  if (match) log(`  record tx broadcast: ${match[1]}`);
  const state = loadState();
  state.live[ticker.toUpperCase()] = { chain_id, rollupRpc, firstBlockTx, recordedAt: Date.now() };
  delete state.staged[ticker.toUpperCase()];
  saveState(state);
  log(`  ${ticker} now marked live in promoter state`);
}

async function watchLoop() {
  log(`watching ${APPCHAIN_RPC} every ${POLL_MS}ms for PromotionStaged events`);
  log(`workdir: ${WORKDIR}, AUTO=${AUTO ? 1 : 0}`);
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

// CLI: `node promoter.mjs record TICKER RPC FIRST_BLOCK_TX`
if (process.argv[2] === "record") {
  const [, , , ticker, rpc, firstBlockTx] = process.argv;
  if (!ticker || !rpc || !firstBlockTx) {
    console.error("usage: promoter.mjs record TICKER ROLLUP_RPC FIRST_BLOCK_TX");
    process.exit(1);
  }
  recordRollup(ticker, rpc, firstBlockTx);
} else {
  watchLoop();
}
