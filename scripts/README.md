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

## spawn-local.mjs -- safe sovereign-chain spawner

Use this instead of `weave rollup launch` when you want to avoid:

- Destroying the main bonding-curve rollup at `~/.minitia` (weave wipes it
  by default regardless of `--minitia-dir`)
- Interactive L1 deposits for OPinit bridge deploy (costs testnet INIT)
- Waiting 15+ minutes for the bridge dance

```bash
# Use the config that the promoter daemon already wrote
node scripts/spawn-local.mjs SPX

# Or specify a config explicitly
node scripts/spawn-local.mjs SPX --config /path/to/rollup-spx.json

# Re-run: --force removes the old chain home first
node scripts/spawn-local.mjs SPX --force
```

What it does:
1. `minitiad init` in `~/.minitia-<ticker>` with custom chain_id + denom
2. Patches `app_state.opchild.params` (admin + bridge_executors) so
   `genesis validate` passes without a real bridge
3. Generates a fresh validator key, allocates creator tokens from config,
   allocates validator stake
4. `minitiad genesis add-genesis-validator` to seed the opchild validator
   set (minimove path, not cosmos SDK gentx)
5. Rewrites ports in `config.toml` + `app.toml` so the new chain doesn't
   collide with the main rollup (uses port range 20000+hash(chain_id))
6. Spawns `minitiad start` detached, waits for first block, prints the
   ready-to-use summary (chain_id, rpc, rest, pid)

Tradeoffs vs `weave`:
- ✅ Zero risk to existing `~/.minitia`
- ✅ Zero L1 INIT required
- ✅ < 2 min per ticker
- ❌ No OPinit bridge (chain is sovereign-isolated, not interwoven)
- ❌ No InitiaDEX pre-seed
- ❌ token_factory/bonding_curve not auto-published on new chain

Verified demo run (2026-04-20):
- Staged: SPX, tx `968F414F5A9662091C077835ED2F26C8572FA28B39BB73546EA6A3CE466D5307` (h=289608)
- Spawn: `spx-fun-1` at `http://localhost:61867`, validator `init1fs8cg0d...`
- Recorded: tx `A4339DF72266E05A5A0FFC3CBD51F9AB899F0270926B190FD4B5807C245C6CDB` (h=297199)
- Result: `stage_of(SPX)` returns `status=1, rollup_chain_id="spx-fun-1"`

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
