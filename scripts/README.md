# scripts/

Operational tooling for minitia.fun.

## faucet-server.mjs

HTTP server (port 8090) yang drip 10 MIN per request. Dipakai oleh Launchpad /
Trade UI ketika wallet baru tidak punya gas. Spawns `minitiad tx bank send`
dari `gas-station` keyring.

## test-launch.mjs

One-shot test launcher. Pakai cosmjs langsung untuk broadcast
`token_factory::launch` tanpa wallet popup. Diagnostic only.

## promoter.mjs -- appchain promotion daemon (Phase A: OPinit rollup spawn)

Long-running process yang:

1. Poll `APPCHAIN_RPC` tiap `POLL_MS` untuk event
   `liquidity_migrator::PromotionStaged` (emitted oleh creator saat mereka
   stage pool yang sudah graduated).
2. Generate `promoter-work/rollup-<ticker>.json` berisi Weave rollup launch
   config (chain_id, denom, moniker, genesis_accounts seeded dengan
   final_reserve creator).
3. Jika `AUTO=1`, jalankan `weave rollup launch --with-config ... --vm move`
   sebagai subprocess. Jika `AUTO=0` (default), print exact command untuk
   operator jalankan manual.
4. Setelah rollup live, operator panggil
   `node scripts/promoter.mjs record <TICKER> <ROLLUP_RPC> <FIRST_TX>` untuk
   broadcast `liquidity_migrator::record_rollup` → status pool di UI jadi
   "appchain live".

### Run

```bash
# Dry-run (preview commands only)
node scripts/promoter.mjs

# Full automated spawn (requires weave + minitiad + L1 gas)
AUTO=1 node scripts/promoter.mjs
```

### End-to-end operator checklist

**Prereq** (one-time):
- `weave` installed (`/home/mdlog/bin/weave`)
- `minitiad` available under `~/.weave/data/minimove@v1.1.11/`
- `gas-station` keyring entry with funded `init1czna6...` on both L1 +
  bonding-curve rollup

**Per-graduated-ticker flow**:

1. **Creator graduates the pool** -- reserve hits threshold, curve frozen.
2. **Creator clicks "Stage promotion"** on `/graduation/<TICKER>`. This emits
   `liquidity_migrator::PromotionStaged` on-chain.
3. **Promoter picks up the event** and either prepares a config file
   (AUTO=0) or spawns the rollup directly (AUTO=1).
4. **Rollup boots**. Verify with `curl <new_rpc>/status`.
5. **Record the mapping**:
   ```bash
   node scripts/promoter.mjs record SPX http://localhost:26657 <FIRST_TX_HASH>
   ```
   This calls `liquidity_migrator::record_rollup` so the Graduation page
   flips to the green "appchain live" card with the new chain_id + RPC link.

### What the promoter does **not** do (yet)

- Deploy `token_factory` / `bonding_curve` on the spawned appchain
- Mint the original supply per holder on the new chain
- Bootstrap an InitiaDEX pool
- Wire up an OPinit bridge relayer for the new chain

Those are Phase A.5+ scope. The current daemon delivers the **spawn signal +
config scaffolding + on-chain recording** -- enough to prove the end-to-end
promotion pipeline is wired, not enough to host a fully-featured appchain
from day one.

### Environment variables

| Var | Default | Purpose |
|---|---|---|
| `APPCHAIN_RPC` | `http://localhost:36657` | Bonding-curve rollup RPC |
| `APPCHAIN_REST` | `http://localhost:1317` | Bonding-curve rollup REST |
| `DEPLOYED_ADDRESS` | `0xC0A7DD6C8EA3CCB58831B2878FB7365AF7BE5B80` | Module admin |
| `WORKDIR` | `./promoter-work` | Where configs / state live |
| `WEAVE_BIN` | `/home/mdlog/bin/weave` | Weave CLI path |
| `MINITIAD_BIN` | `~/.weave/data/minimove@v1.1.11/minitiad` | minitiad binary |
| `MINITIAD_LIB_DIR` | `~/.weave/data/minimove@v1.1.11` | LD_LIBRARY_PATH for minitiad |
| `POLL_MS` | `15000` | Poll interval |
| `AUTO` | `0` | `1` = run `weave rollup launch` subprocess |
