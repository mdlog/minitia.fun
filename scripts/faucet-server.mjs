#!/usr/bin/env node
/**
 * Minitia.fun testnet faucet — drips 10 MIN from the gas-station key
 * to any bech32 `init1…` address so it can sign txs on the rollup.
 *
 * Usage:
 *   node scripts/faucet-server.mjs
 *
 * Env (optional):
 *   FAUCET_PORT            Default 8090
 *   FAUCET_AMOUNT_UMIN     Default 10_000_000 (10 MIN)
 *   MINITIAD               Absolute path to minitiad binary
 *   MINITIA_HOME           Default ~/.minitia
 *   RPC                    Default tcp://localhost:36657
 *   CHAIN_ID               Default minitia-fun-test-1
 *   KEY_NAME               Default gas-station
 *
 * Delegates signing to the local keyring via the minitiad CLI. No
 * private keys leave this process.
 */

import http from "node:http";
import { spawn } from "node:child_process";
import { join } from "node:path";
import { homedir } from "node:os";

const PORT = Number(process.env.FAUCET_PORT ?? 8090);
const AMOUNT = String(process.env.FAUCET_AMOUNT_UMIN ?? 10_000_000);
const MINITIAD =
  process.env.MINITIAD ?? join(homedir(), ".weave/data/minimove@v1.1.11/minitiad");
// Use a dedicated env var so we don't accidentally pick up the host's
// LD_LIBRARY_PATH (cuda, etc.) which doesn't contain libmovevm.so.
const LIB_DIR =
  process.env.MINITIAD_LIB_DIR ?? join(homedir(), ".weave/data/minimove@v1.1.11");
const HOME = process.env.MINITIA_HOME ?? join(homedir(), ".minitia");
const RPC = process.env.RPC ?? "tcp://localhost:36657";
const CHAIN_ID = process.env.CHAIN_ID ?? "minitia-fun-test-1";
const KEY_NAME = process.env.KEY_NAME ?? "gas-station";

const ADDR_RE = /^init1[0-9a-z]{20,80}$/;
const DRIP_COOLDOWN_MS = 60_000;
const lastDrip = new Map(); // addr -> timestamp

function json(res, status, obj) {
  res.writeHead(status, {
    "content-type": "application/json",
    "access-control-allow-origin": "*",
    "access-control-allow-headers": "content-type",
    "access-control-allow-methods": "POST,OPTIONS",
  });
  res.end(JSON.stringify(obj));
}

function sendTokens(toAddr) {
  return new Promise((resolve, reject) => {
    // Wrap in /bin/sh so LD_LIBRARY_PATH is applied to the child's dynamic
    // loader (Node's env option alone doesn't always propagate on Linux).
    const shellCmd = [
      `export LD_LIBRARY_PATH="${LIB_DIR}"`,
      [
        `"${MINITIAD}"`,
        "tx", "bank", "send", KEY_NAME, toAddr, `${AMOUNT}umin`,
        "--from", KEY_NAME,
        "--keyring-backend", "test",
        `--home "${HOME}"`,
        "--chain-id", CHAIN_ID,
        `--node "${RPC}"`,
        "--gas", "auto",
        "--gas-adjustment", "1.5",
        "--gas-prices", "0.15umin",
        "--broadcast-mode", "sync",
        "-o", "json",
        "--yes",
      ].join(" "),
    ].join(" && ");
    // Inherit parent env fully; the `export LD_LIBRARY_PATH=...` inside
    // shellCmd is what the dynamic loader actually reads.
    console.log("[drip-cmd]", shellCmd.slice(0, 260));
    const proc = spawn("/bin/sh", ["-c", shellCmd]);

    const out = [];
    const err = [];
    proc.stdout.on("data", (c) => out.push(c));
    proc.stderr.on("data", (c) => err.push(c));
    proc.on("error", (e) => reject(e));
    proc.on("close", (code) => {
      const stdout = Buffer.concat(out).toString();
      const stderr = Buffer.concat(err).toString();
      if (code !== 0) {
        return reject(new Error(stderr.slice(0, 400) || `minitiad exit ${code}`));
      }
      try {
        const js = JSON.parse(stdout);
        if (js.code && js.code !== 0) {
          return reject(new Error((js.raw_log || "").slice(0, 400) || `code ${js.code}`));
        }
        resolve({ txHash: js.txhash, height: js.height ?? "0" });
      } catch {
        reject(new Error(stdout.slice(0, 400) || "could not parse minitiad output"));
      }
    });
  });
}

async function readBody(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  if (chunks.length === 0) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString());
  } catch {
    throw new Error("bad json");
  }
}

const server = http.createServer(async (req, res) => {
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "access-control-allow-origin": "*",
      "access-control-allow-headers": "content-type",
      "access-control-allow-methods": "POST,OPTIONS",
    });
    return res.end();
  }

  if (req.method === "GET" && req.url === "/health") {
    return json(res, 200, { ok: true, chain: CHAIN_ID, amount: `${Number(AMOUNT) / 1e6} MIN` });
  }

  if (req.method !== "POST" || !req.url?.startsWith("/faucet")) {
    return json(res, 404, { error: "not found" });
  }

  let body;
  try {
    body = await readBody(req);
  } catch {
    return json(res, 400, { error: "bad json" });
  }

  const to = String(body.address ?? "").trim();
  if (!ADDR_RE.test(to)) {
    return json(res, 400, { error: "invalid address" });
  }

  const last = lastDrip.get(to) ?? 0;
  const now = Date.now();
  if (now - last < DRIP_COOLDOWN_MS) {
    return json(res, 429, {
      error: "cooldown",
      retryInMs: DRIP_COOLDOWN_MS - (now - last),
    });
  }

  try {
    const result = await sendTokens(to);
    lastDrip.set(to, now);
    json(res, 200, {
      txHash: result.txHash,
      height: result.height,
      amount: `${Number(AMOUNT) / 1e6} MIN`,
      chain: CHAIN_ID,
    });
    console.log(`[drip] ${new Date().toISOString()}  ${to}  ->  ${result.txHash}`);
  } catch (e) {
    console.error(`[drip-fail] ${new Date().toISOString()}  ${to}  ${e.message}`);
    json(res, 500, { error: String(e.message ?? e) });
  }
});

// Bind to 0.0.0.0 so cloudflared quick-tunnels (which require a public-ish
// interface) can reach it. Keep PORT non-standard; use TLS-only tunnel for
// any serious exposure.
server.listen(PORT, "0.0.0.0", () => {
  console.log(`[faucet] drips ${Number(AMOUNT) / 1e6} MIN per request on http://0.0.0.0:${PORT}`);
  console.log(`[faucet] key=${KEY_NAME} chain=${CHAIN_ID} home=${HOME}`);
});
