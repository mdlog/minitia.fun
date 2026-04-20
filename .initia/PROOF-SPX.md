# Proof of Authenticity — $SPX → spx-fun-1 End-to-End Spawn

A single graduated token (`$SPX`) and its full lifecycle are covered by
**five transactions and two independent chains**. Every claim below is
reproducible with a `curl` against the public tunnels.

## 1 · The token itself (minitia-fun-test-1)

| Fact | Value | Verification |
|---|---|---|
| Ticker | `SPX` | `token_factory::info` view |
| Name | `SPACE` | same |
| Creator | `0xebe70f18642124931908b37cdb40b6ae9b45d05b` | same |
| Launch index | 6 (the 6th token ever launched on this rollup) | `token_factory::count` = `"6"` |
| Subdomain | `SPX.fun.init` | same |

```bash
curl -s -X POST https://rest.minitia.fun/initia/move/v1/view/json \
  -H 'Content-Type: application/json' \
  -d '{"address":"0xC0A7DD6C8EA3CCB58831B2878FB7365AF7BE5B80",
       "module_name":"token_factory","function_name":"info",
       "type_args":[],"args":["\"0xC0A7DD6C8EA3CCB58831B2878FB7365AF7BE5B80\"","\"SPX\""]}'
```

## 2 · Transaction chain (all `code: 0`, all on `minitia-fun-test-1`)

Every tx is inspectable via the public tunneled RPC
`https://rpc.minitia.fun/tx?hash=0x<hash>`.

| # | Step | Tx hash | Height | Evidence |
|---|---|---|---|---|
| 1 | **Launch + pool creation** (bundled) | `2FE790361F8490F40DFDF6B9F8280B2BF9DF6B830F18C85B444CB0575D2862C4` | 262635 | emits `TokenLaunched` **and** `PoolCreated` in the same tx |
| 2 | First buy (0.995 MIN → 994 SPX) | `9E066FBD...` | 262883 | emits `bonding_curve::Trade` side=0 |
| 3 | Second buy (10.95 MIN → 10,944 SPX) | `4817945920CAA912...` | 263301 | emits `Trade` **and** `Graduated` -- reserve crossed 10 MIN threshold |
| 4 | Stage promotion (creator self-service) | `968F414F5A9662091C077835ED2F26C8572FA28B39BB73546EA6A3CE466D5307` | 289608 | emits `liquidity_migrator::PromotionStaged` |
| 5 | Record rollup (after spawn live) | `A4339DF72266E05A5A0FFC3CBD51F9AB899F0270926B190FD4B5807C245C6CDB` | 297199 | emits `liquidity_migrator::RollupRegistered` |

## 3 · Terminal state on the bonding-curve rollup

```
bonding_curve::pool_state("SPX")
  init_reserve    = 11,940,000 umin   (= 11.94 MIN)
  token_supply    = 11,938
  base_price      = 1,000
  slope           = 10
  trade_count     = 2
  graduated       = 1   ← sealed

liquidity_migrator::stage_of("SPX")
  creator         = 0xebe70f18642124931908b37cdb40b6ae9b45d05b
  final_reserve   = 11,940,000 umin
  final_supply    = 11,938
  status          = 1   ← appchain live
  rollup_chain_id = spx-fun-1
```

## 4 · Sovereign chain spawned (`spx-fun-1`)

A second, independent blockchain was bootstrapped from the stage event.
It runs on the same host as a completely separate minitiad process:

| Fact | Value |
|---|---|
| Network | `spx-fun-1` (returned by `/status`) |
| Moniker | `spx-fun-1-validator` |
| Chain home | `/home/mdlog/.minitia-spx/` |
| RPC port | `61867` (isolated from main rollup on `36657`) |
| Genesis allocation | creator `init1a0ns7xryyyjfxxggkd7dks9k46d5t5zmhjm5kp` funded with `11,940,000 uspx` |
| Block height | advancing (26+ at last check) |
| Validator | `init1f6j3hmew3rdgxhkcmxah0t45ul06e9ndnxm4rc` (newly generated for this chain) |

```bash
# Live check while the chain is running locally:
curl -s http://localhost:61867/status | jq '.result.node_info.network'
# → "spx-fun-1"
```

## 5 · Cross-chain consistency

Three independent signals all reference the same state, but emitted from
different places -- proving the two chains weren't fabricated independently:

| Claim | Source A (bonding curve) | Source B (spawned chain) | Match |
|---|---|---|---|
| Creator address | `0xebe70f18642124931908b37cdb40b6ae9b45d05b` (event) | `init1a0ns7xryyyjfxxggkd7dks9k46d5t5zmhjm5kp` (genesis) | same 20 bytes, different encoding ✓ |
| Reserve amount | `11,940,000 umin` (pool) | `11,940,000 uspx` (genesis allocation) | ✓ |
| Stage → spawn config | tx `968F414F…` emits `staged_height 289608` | spawn config `rollup-spx.json` footer has `staged_tx: "968F414F…"` | bidirectional reference ✓ |

## 6 · Reproduce locally

Anyone can clone the repo + point at the same tunnel and replay:

```bash
# 1. View the bonding-curve state
curl -s https://rest.minitia.fun/initia/move/v1/view/json \
  -H 'Content-Type: application/json' \
  -d '{"address":"0xC0A7DD6C8EA3CCB58831B2878FB7365AF7BE5B80",
       "module_name":"liquidity_migrator","function_name":"stage_of",
       "type_args":[],"args":["\"0xC0A7DD6C8EA3CCB58831B2878FB7365AF7BE5B80\"","\"SPX\""]}'

# 2. Read any of the 5 tx hashes
curl -s "https://rpc.minitia.fun/tx?hash=0x968F414F5A9662091C077835ED2F26C8572FA28B39BB73546EA6A3CE466D5307"

# 3. If minitiad + weave are installed:
node scripts/spawn-local.mjs SPX --force     # spawn a fresh spx-fun-1
```

## Bottom line

Every UI state shown on `/graduation/SPX` corresponds to an event emitted
by a real Move entry function invoked by a real wallet-signed tx, recorded
on the Initia minimove rollup, decodable by anyone with the public RPC.
There is no mock state anywhere in this chain of evidence.
