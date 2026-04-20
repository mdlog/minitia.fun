# Submission Finalisation Checklist

This repository is submission-ready except for three placeholder fields in
[`.initia/submission.json`](.initia/submission.json) that can only be filled
**after** you run the deployment CLI locally. Follow the steps below in order
and the submission will be complete.

Reference: [`docs.initia.xyz/hackathon/get-started`](https://docs.initia.xyz/hackathon/get-started)
and [`docs.initia.xyz/hackathon/builder-guide`](https://docs.initia.xyz/hackathon/builder-guide).

---

## Step 0 · Prerequisites

- Docker Desktop running
- Go 1.22+
- [`weave`](https://github.com/initia-labs/weave), `initiad`, `minitiad` in `PATH`
- Set up via the official AI skill: `npx skills add initia-labs/agent-skills`

Verify with the AI agent:

> Using the `initia-appchain-dev` skill, please verify that `initiad`, `weave`, and `minitiad` are properly installed and accessible in my PATH.

## Step 1 · Spin up your Minitia

```bash
weave init                         # interactive setup — choose chain-id: minitia-fun-test-1
weave opinit init executor
weave opinit start executor -d
weave relayer init
weave relayer start -d
weave rollup start -d
```

Fund the Gas Station key:

```bash
MNEMONIC=$(jq -r '.common.gas_station.mnemonic' ~/.weave/config.json)
initiad keys add gas-station --recover --keyring-backend test \
  --coin-type 60 --key-type eth_secp256k1 \
  --source <(echo -n "$MNEMONIC")
minitiad keys add gas-station --recover --keyring-backend test \
  --coin-type 60 --key-type eth_secp256k1 \
  --source <(echo -n "$MNEMONIC")
```

## Step 2 · Fund your personal wallet

> Using the `initia-appchain-dev` skill, please fund my personal wallet `init1…` with 1 INIT on L1 and 100 MIN on my appchain's L2.

## Step 3 · Deploy the Move modules

```bash
cd contracts
minitiad move build
minitiad move deploy \
  --from gas-station \
  --chain-id minitia-fun-test-1 \
  --keyring-backend test \
  --node http://localhost:26657
```

Note the **module address** printed on success — it looks like
`0xCAFE::token_factory` or similar.

## Step 4 · Smoke test

> Using the `initia-appchain-dev` skill, I want to smoke test my live `token_factory` on my appchain.

## Step 5 · Point frontend at your rollup

Edit [`src/lib/initia.ts`](src/lib/initia.ts) → update `APPCHAIN.rpc` to
your local / hosted rollup RPC (default `http://localhost:26657`).

Then rewire [`src/hooks/useTxAction.ts`](src/hooks/useTxAction.ts) from the
current `MsgSend` proof-of-pipeline to a real `MsgExecute`:

```ts
const messages = [{
  typeUrl: "/initia.move.v1.MsgExecute",
  value: {
    sender: initiaAddress,
    moduleAddress: "<YOUR_DEPLOYED_ADDRESS>",
    moduleName: "bonding_curve",
    functionName: payload.kind === "buy" ? "buy" : "sell",
    typeArgs: [],
    args: [/* serialised move args for metadata, amount, min_out */],
  },
}];
```

## Step 6 · Record the demo video

Use [`.initia/demo.md`](.initia/demo.md) as the shot list. Upload to
YouTube or Loom (public).

## Step 7 · Fill `.initia/submission.json`

Replace the three placeholder values:

| Field | Placeholder | Fill with |
|---|---|---|
| `commit_sha` | `"0000…0000"` | `git rev-parse HEAD` after your final commit |
| `deployed_address` | `"0x…dEaD"` | The module address printed in Step 3 |
| `demo_video_url` | `"https://youtu.be/placeholder"` | The public URL from Step 6 |
| `repo_url` | `https://github.com/initia-labs/minitia-fun` | Your actual GitHub repo |

## Step 8 · Final verification

Open [`.initia/submission.json`](.initia/submission.json) and confirm every
field passes the validation rules:

- `commit_sha`: 40-char hex (`[0-9a-f]{40}`)
- `repo_url`: reachable public GitHub URL
- `demo_video_url`: public Loom or YouTube URL
- `vm`: one of `move`, `evm`, `wasm` → `move`
- `native_feature`: one of `auto-signing`, `interwoven-bridge`, `initia-usernames` → `auto-signing`
- `core_logic_path` + `native_feature_frontend_path`: both resolve at `commit_sha`

Push the final commit. You're done.

## Upgrading the Move package

Compatible upgrades preserve the existing `Registry` state (token list,
pools, balances, vault custody) — new entry functions and new constants
are fine, struct field additions/removals are not.

```bash
cd contracts
minitiad move build
minitiad move deploy \
  --from gas-station \
  --chain-id minitia-fun-test-1 \
  --keyring-backend test \
  --node http://localhost:26657 \
  --upgrade-policy compatible
```

### Pool-creator guard upgrade (commit <FILL IN AFTER COMMIT>)

`bonding_curve::create_pool` now requires `caller == token_factory::launcher_of(ticker)`.
Effects:
- New pools can only be opened by the wallet that ran `token_factory::launch`
  for that ticker. Launchpad already bundles both calls in one tx, so the
  happy path is unchanged.
- Existing pools are untouched — the upgrade does not rewrite `pool.creator`
  for tokens where the launcher and pool creator had already diverged.
  Those tokens keep their historical split; the pool creator remains the
  fee claimer and promotion gatekeeper.
- Entry signatures are unchanged. No client-side migration needed.

Abort codes added: `E_TICKER_NOT_LAUNCHED = 13`, `E_NOT_LAUNCHER = 14`.

## v2 — Fresh appchain migration (supply cap)

Adding `max_supply` to the `Pool` struct breaks compatible upgrades (storage
layout change). v2 is deployed onto a **new appchain** rather than upgraded
in place. Old appchain is frozen as the hackathon/testnet snapshot.

### Contract changes

- `bonding_curve::create_pool` new signature:
  `create_pool(creator, registry_addr, ticker, base_price, slope, max_supply)`
- `Pool` struct adds `max_supply: u128`
- `buy` aborts with `E_SUPPLY_CAP` if `token_supply + tokens_out > max_supply`
- Graduation now fires on reserve threshold **OR** supply cap reached
- `pool_state` view returns 8 elements (appends `max_supply` at index 7)
- `PoolCreated` event includes `max_supply`
- Abort codes added: `E_SUPPLY_CAP = 15`, `E_INVALID_SUPPLY = 16`

### Migration steps

```bash
# 1. Spawn a fresh appchain
weave rollup launch --chain-id minitia-fun-v2-1 --with-config rollup-v2.json

# 2. Deploy modules fresh to the new appchain
cd contracts
minitiad move build
minitiad move deploy \
  --from gas-station \
  --chain-id minitia-fun-v2-1 \
  --keyring-backend test \
  --node http://localhost:26657

# 3. Initialize registries (same as initial deploy)
minitiad tx move execute <DEPLOYED_ADDR> token_factory initialize ...
minitiad tx move execute <DEPLOYED_ADDR> bonding_curve initialize ...
minitiad tx move execute <DEPLOYED_ADDR> bonding_curve initialize_custody ...
minitiad tx move execute <DEPLOYED_ADDR> liquidity_migrator initialize ...

# 4. Point the frontend at v2
# Edit src/lib/initia.ts:
#   APPCHAIN.chainId = "minitia-fun-v2-1"
#   APPCHAIN.rpc     = "<new rpc>"
#   APPCHAIN.rest    = "<new rest>"
#   APPCHAIN.deployedAddress = "<new module address>"
```

### Client impact

- `useRollupLaunchToken` + `useCreatePoolAction` now pass `max_supply` as the
  5th `create_pool` arg (default 1,000,000,000). Old v1 appchain deployments
  would abort — so frontend only targets v2 after `src/lib/initia.ts` is
  updated.
- `usePoolState` reads `max_supply` from tuple index 7; legacy v1 reads
  (tuple length 7) return `maxSupply = 0n` and the UI falls back to
  "uncapped" behavior (FDV = spot × current supply instead of spot × cap).
- `Launchpad.tsx` exposes a "Total supply" input (default 1B tokens).
- Trade page shows FDV = `spot × max_supply` and a new "Supply" stat showing
  `tokens_sold / max_supply` percentage.
- `CurveDepthChart` renders a rose dashed line at the supply cap.

### What is NOT migrated

Pools, balances, promotion stages, and claimed-fee state on the old appchain
do not carry over. Users re-launch on v2 under the same ticker if the name
is still available. Announce the migration clearly before cutover.
