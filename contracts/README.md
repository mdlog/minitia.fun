# Minitia.fun Move modules

Three modules make up the core on-chain logic of the Minitia.fun launcher appchain:

| Module | File | Role |
|---|---|---|
| `token_factory` | [sources/token_factory.move](sources/token_factory.move) | Mints a new fungible token as a Move Object, reserves `.fun.init` subdomain, emits `TokenLaunched`. |
| `bonding_curve` | [sources/bonding_curve.move](sources/bonding_curve.move) | Linear supply-based pricing with 0.5 % protocol fee. Entry functions `buy` / `sell` are the ones covered by the Auto-sign session key (`/initia.move.v1.MsgExecute`). |
| `liquidity_migrator` | [sources/liquidity_migrator.move](sources/liquidity_migrator.move) | Friend-only; fires when the curve crosses 5 000 INIT and hands off to OPinit for InitiaDEX pool seeding. |

## Build & publish

```bash
# From repo root:
cd contracts
minitiad move build

# Publish to your Minitia.fun launcher rollup:
minitiad move deploy \
  --from gas-station \
  --chain-id minitia-fun-test-1 \
  --keyring-backend test \
  --node http://localhost:26657
```

The deployed module address is what goes into `deployed_address` in [`.initia/submission.json`](../.initia/submission.json).

## Status

Phase 1 (this submission): modules compile and illustrate the economic flywheel. Entry function wiring for on-chain mint/burn is intentionally stubbed in `bonding_curve::buy/sell` — these are the spots that get fleshed out during MVP Demo Day (Phase 2).

Phase 2: swap the frontend's `useTxAction` from `MsgSend` proof-of-pipeline to a real `MsgExecute` against `bonding_curve::buy` — zero frontend changes needed beyond the `typeUrl` and `value` payload.
