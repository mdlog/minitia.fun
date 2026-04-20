# Minitia.fun

**The instant appchain launcher — launch anything, graduate fast.**

Submission for [**INITIATE: The Initia Hackathon · Season 1**](https://docs.initia.xyz/hackathon) · Track: **DeFi**

---

## Initia Hackathon Submission

- **Project Name**: Minitia.fun

### Project Overview

Minitia.fun is a fair-launch appchain launcher on Initia where anyone mints a
token in seconds, trades it on a fast-block bonding curve, claims creator
fees, then promotes the community into its own sovereign L2 rollup. Pump.fun
stops at a DEX listing; Minitia.fun continues the journey into full appchain
sovereignty — the only missing piece of the instant-launch market.

### Implementation Detail

- **The Custom Implementation**: A Move-VM launcher rollup
  (`minitia-fun-v2-1`) with **four** custom modules —
  - [`token_factory`](contracts/sources/token_factory.move) — registry of
    fair-launched tokens; `TokenInfo` stores creator, ticker, name,
    description, **`image_uri`** (IPFS pointer to the logo pinned via
    Pinata), subdomain, and launch index. `TokenLaunched` event mirrors
    every field so indexers resolve the logo without extra view calls.
  - [`bonding_curve`](contracts/sources/bonding_curve.move) — integral
    linear-curve pricing with **real umin custody** (`primary_fungible_store`
    moves MIN between trader wallets and a module-owned vault object) and
    **fixed supply caps**: every pool carries a `max_supply: u128`, `buy`
    aborts with `E_SUPPLY_CAP` when a trade would push supply past it, and
    graduation fires on whichever comes first — reserve threshold OR supply
    cap reached. A **cross-module guard** in `create_pool` forces the caller
    to match `token_factory::launcher_of(ticker)` so trading fees + appchain
    promotion rights stay with the original launcher.
  - [`liquidity_migrator`](contracts/sources/liquidity_migrator.move) —
    coordinates appchain promotion via `stage_promotion` + `record_rollup`
    entries; off-chain [`scripts/promoter.mjs`](scripts/promoter.mjs) +
    [`scripts/spawn-local.mjs`](scripts/spawn-local.mjs) pick up
    `PromotionStaged` events and bootstrap a brand-new sovereign rollup.
  - [`comments`](contracts/sources/comments.move) — per-ticker public wall
    for social signal, scannable via `tx_search`.

  The React 19 + Vite frontend wraps all four modules: Launchpad pins the
  logo to IPFS via Pinata V3 upload then bundles
  `token_factory::launch + bonding_curve::create_pool` (with `max_supply`)
  in one tx; Trade page mirrors the integral math so UI estimates match
  on-chain settlement to within 1 unit; Graduation page is a real 4-state
  machine reading `pool_state` + `stage_of` every 10 s.

- **The Native Feature**: **Auto-signing (Session UX via Cosmos SDK
  authz).** `InterwovenKitProvider` is configured with `enableAutoSign:
  { [chainId]: ["/initia.move.v1.MsgExecuteJSON", "/initia.move.v1.MsgExecute"] }`
  in [`src/providers/Web3Providers.tsx`](src/providers/Web3Providers.tsx).
  The top-bar [`AutoSignIndicator`](src/components/layout/AutoSignIndicator.tsx)
  is a real toggle: one click triggers ONE `MsgGrant` signature, after which
  every Buy / Sell / Claim / Stage / Record executes under 1 s with **zero
  popups**. Auto-signed tx are wrapped in `/cosmos.authz.v1beta1.MsgExec` on
  chain; every data-fetching hook in the frontend queries both the direct
  `MsgExecuteJSON` and the authz-wrapped form so UI state stays consistent
  whether the user is auto-signing or not. The Interwoven Bridge
  (`openBridge()`) and `.init` Usernames (`ticker.fun.init`) are also wired
  end-to-end.

### How to Run Locally

1. `npm install` — installs React 19 + Vite + InterwovenKit + wagmi + viem +
   TanStack Query.
2. `cp .env.example .env.local`.
3. Point `VITE_APPCHAIN_RPC` / `VITE_APPCHAIN_REST` at your rollup
   endpoints (`https://rpc.minitia.fun` / `https://rest.minitia.fun` if you
   tunnel, or `http://localhost:26657` / `http://localhost:1317` for local
   dev only — localhost URLs won't resolve from other devices).
4. **For logo uploads**: set `VITE_PINATA_JWT` (get one at
   [Pinata → API Keys](https://app.pinata.cloud/developers/api-keys), scope:
   `files:create`) and optionally `VITE_PINATA_GATEWAY` to your dedicated
   Pinata subdomain. When blank, Launchpad skips the logo step — tokens
   still launch, UI falls back to monogram avatars.
5. `npm run dev` — dev server at `http://localhost:5173`. Grab testnet INIT
   from [`faucet.testnet.initia.xyz`](https://faucet.testnet.initia.xyz) if
   the wallet is empty, or spin up the local MIN faucet (see below).
6. Connect via MetaMask / Keplr / Leap / Privy, click **"Enable auto-sign"**
   in the top bar (one popup, then silence), then launch a token at
   `/launchpad` or trade at `/trade/<TICKER>`. Every action hits the live
   Move rollup.

### Why Move for a DeFi track

Initia's track guide hints DeFi → EVM, but we deliberately chose Move-VM
because **memecoin launchers carry asymmetric user-funds risk and benefit
disproportionately from Move's resource model**:

1. **Token-as-resource semantics.** Each `$TICKER` balance lives in a
   per-holder `Table<HolderKey, u128>` entry — it can't be duplicated,
   silently overwritten, or reentrancy-drained. An EVM ERC20 clone would
   require three explicit audits (reentrancy guard, overflow, approval
   races) for behavior Move makes impossible to express.
2. **Creator vault custody.** `primary_fungible_store` gives us first-class
   fungible-asset plumbing with a module-owned vault object accessed via
   `ExtendRef`. On EVM this is 200+ lines of custody + withdrawal guard
   code; in Move it's a resource with type-level guarantees.
3. **Cross-module invariants.** `create_pool` calling
   `token_factory::launcher_of` to enforce "only the launcher can open the
   curve" is a 3-line cross-module view call — no shared storage, no admin
   allowlist, no signature bridging.
4. **Graduation safety.** The `graduated` flag aborts all further
   `buy/sell` with `E_GRADUATED`. Combined with the `max_supply` cap in
   `buy`, the contract has two independent graduation triggers (reserve
   OR supply), making it impossible for a pool to get stuck in a
   half-graduated state.

For a category where users send real MIN into a curve they don't control,
Move's "make invalid states unrepresentable" philosophy is the right
default.

### On-chain proof (deployed and verified)

| Artefact | Value |
|---|---|
| **Rollup chain ID** | `minitia-fun-v2-1` (Move VM, Initia DA) |
| **Rollup RPC** (public) | [`https://rpc.minitia.fun`](https://rpc.minitia.fun/status) — judges: check `/status` for live height |
| **Rollup REST** (public) | [`https://rest.minitia.fun`](https://rest.minitia.fun/cosmos/base/tendermint/v1beta1/node_info) — chain info + generic cosmos routes |
| **Rollup RPC** (local) | `tcp://localhost:26657` |
| **Deployed module address** | `0xC0A7DD6C8EA3CCB58831B2878FB7365AF7BE5B80` (aka `init1czna6myw50xttzp3k2rcldekttmmukuqcu4u6c`) |
| **Published modules** | `token_factory`, `bonding_curve`, `comments`, `liquidity_migrator` (all state initialised: `Registry`, `CustodyCap`, `MigratorRegistry`) |
| **Graduation threshold** | **10 MIN** reserve (hackathon demo value at `bonding_curve.move::GRADUATION_INIT_RESERVE`) |
| **Default supply cap** | 1,000,000,000 tokens per pool (user-overridable at launch) |
| **Block time** | ~150 ms (`create_empty_blocks = true`, 1 s interval + CometBFT quick-commit) |

Every view call above is reproducible with one `curl`:

```bash
# authoritative token count
curl -s -X POST https://rest.minitia.fun/initia/move/v1/view/json \
  -H 'Content-Type: application/json' \
  -d '{"address":"0xC0A7DD6C8EA3CCB58831B2878FB7365AF7BE5B80",
       "module_name":"token_factory","function_name":"count",
       "type_args":[],"args":["\"0xC0A7DD6C8EA3CCB58831B2878FB7365AF7BE5B80\""]}'
```

Reproduce deploy locally with [`DEPLOY.md`](DEPLOY.md) → v2 section. See
[`contracts/README.md`](contracts/README.md) for the Move build / deploy
commands. Automated deploy script:
[`scripts/deploy-v2.sh`](scripts/deploy-v2.sh) runs build + publish + 4
initialize entries against a freshly-spawned rollup.

**Frontend reads the rollup live** via those public tunnels: Discovery's
**"Launched on Minitia.fun"** feed polls `tx_search` for `TokenLaunched`
events (both raw + authz-wrapped), the Explorer reads block height every
3 s, and the bell menu renders a rolling feed of **wallet-scoped
notifications** (own trades, own launches, own claims, plus pool activity
for tokens the user created).

### Token metadata via IPFS (Pinata)

`TokenInfo.image_uri` on-chain stores an `ipfs://<cid>` pointer. The
Launchpad uses **Pinata V3 upload API** (`uploads.pinata.cloud/v3/files`)
with `network=public` so the CID points directly at the image file (the
legacy V2 `/pinning/pinFileToIPFS` wraps uploads in a directory, which
`<img src>` against the bare CID cannot resolve). Draft CID is persisted
per-device so closing the tab and coming back doesn't re-upload. Each
pin is tagged with `ticker` + `app: minitia.fun` keyvalues for traceability.

**Security note**: `VITE_PINATA_JWT` ships in the client bundle. Acceptable
for testnet / hackathon; production should proxy uploads through a backend
that returns presigned URLs via Pinata's
[`POST /v3/files/sign`](https://docs.pinata.cloud/api-reference/endpoint/upload/sign).

### Sovereign appchain spawn — live, end-to-end

**The signature differentiator**: when a graduated token is staged, an
off-chain promoter daemon picks up the event and bootstraps a **brand-new
sovereign minimove rollup** for that community. The state machine is
exposed on the Graduation page — creator clicks **Stage promotion** → an
amber "staged · waiting for promoter daemon" card appears → once the
promoter runs `weave rollup launch --with-config` and the new chain is
live, creator signs `record_rollup` → card flips emerald with the new
chain's `chain_id`, RPC, and first-block tx hash linked.

The [`spawn-local.mjs`](scripts/spawn-local.mjs) script bootstraps a
standalone sovereign rollup per graduated ticker — no L1 INIT deposit, no
opbridge, hashed ports to avoid collision across tickers. Demonstrated on
v1 for `$SPX → spx-fun-1` (historical; v1 chain archived during v2
migration).

**Why this matters for judging**: no other submission is likely to ship a
*real* graduation-to-sovereign-chain flow. Ours has chain-verifiable
transactions for every step and a reproducible script for the spawn.

### Local MIN faucet (for judges with a fresh wallet)

The Launchpad's `Deploy token` button submits a real `MsgExecuteJSON`
against `token_factory::launch` + `bonding_curve::create_pool`. The signing
wallet needs a tiny balance of `umin` to pay gas. To fund an arbitrary
`init1…` address:

```bash
RPC="tcp://localhost:26657" CHAIN_ID="minitia-fun-v2-1" \
  node scripts/faucet-server.mjs     # drips 10 MIN per request from gas-station
```

The faucet listens on `http://localhost:8090`. Set
`VITE_APPCHAIN_FAUCET=http://localhost:8090/faucet` in `.env.local` (or
point at a tunneled URL) and the Launchpad / Trade page render a **Get 10
MIN** button next to the connected wallet's balance.

Only the machine that holds the rollup's `gas-station` keyring can run the
faucet. Remote judges either ask the submitter to drip (share their
`init1…`) or import the gas-station mnemonic from
`~/.weave/config.json` (testnet only).

---

## Post-hackathon milestone roadmap

The INITIATE reward structure gates most of the prize pool on milestones
hit **after** placement is announced. Below is the commitment plan the
team will run against, mapped to each gate.

### Gate 1 · Public mainnet launch (T+30 days) · $1,200-1,500

**Definition of done**: all 4 Move modules deployed to `initia-1` (Initia
mainnet), publicly addressable via tunneled RPC + REST, Launchpad + Trade +
Graduation flows all hitting the mainnet deployment.

| Milestone | ETA | Blocker / cost |
|---|---|---|
| Fund mainnet admin wallet | T+3d | Needs mainnet INIT (~$50-100 for deploy + init gas) |
| Publish `token_factory`, `bonding_curve`, `comments`, `liquidity_migrator` on mainnet | T+7d | `minitiad move deploy` × 1 (bundled) |
| Initialize Registry + Wall + Vault + MigratorRegistry | T+7d | 4 entry-fn tx |
| Tunnel RPC + REST with a sticky domain | T+14d | DNS + reverse-proxy setup |
| Repoint `VITE_APPCHAIN_*` to mainnet endpoints | T+14d | Env vars swap |
| Move Pinata JWT off client → presigned-URL backend | T+21d | Small Node/Deno edge function |
| Verify: 1 test-token launched + 1 trade round-trip on mainnet | T+21d | Smoke test |
| Snapshot the tx hashes, update [`.initia/PROOF-MAINNET.md`](./.initia/) | T+28d | Audit trail |

### Gate 2 · Adoption — 500 active wallets OR $10k TVL (T+90 days) · $2,500

**Definition of done**: at least ONE of the thresholds cleared, verifiable
from on-chain data.

- **500 active wallets** = unique `sender` addresses broadcasting
  `MsgExecuteJSON` (or authz-wrapped equivalent) against our modules
  within a 30-day window.
- **$10k TVL** = total umin held in `bonding_curve` vault plus
  `liquidity_migrator` stages, converted to USD at the day's INIT/USD
  rate.

**Go-to-market**:
| Lever | Commitment |
|---|---|
| X / Twitter thread series | 2 per week post-launch — launch flywheel, graduation case studies, creator-fee highlights |
| Telegram alpha channel seeding | Post new-token firehose to 5-10 memecoin alpha groups in the first 2 weeks |
| Creator onboarding | Partner with 3-5 memecoin community leaders to co-launch their token on mainnet as anchor cases |
| Interwoven Bridge campaign | Cross-chain deposits (Ethereum / Solana / Base → Initia) as onboarding funnel |
| Referral / fee share | Route a slice of creator fees to referrers via on-chain memo tracking |

### Stretch · $100k TVL OR 1M txs (T+180 days) · $6,600

**Definition of done**: cleared EITHER threshold on mainnet before any
other eligible team.

| Lever | Commitment |
|---|---|
| Graduated chain ecosystem | Real `spawn-local` → OPinit-bridged rollups, not just sovereign chains |
| InitiaDEX pool auto-seed | Graduated tokens get automatic liquidity pool on L1 InitiaDEX for secondary market |
| Paid user acquisition | $5k-10k marketing budget contingent on Gate 1 + 2 hit, targeting CT memecoin crowd |
| SDK / CLI | `npm i @minitia-fun/sdk` for trivial third-party integration (bots, indexers, bundlers) |

### Why these numbers are realistic

- Bonding curves are **highly capital-efficient** for TVL formation on
  memecoin flywheels. Pump.fun hit $100M+ TVL during peak cycles; 0.1% of
  that feels conservative on Initia given the novelty.
- 500 wallets is ~15 new wallets/day over 30 days. For context, a single
  viral X launch has historically driven 1000+ unique buyers in hours.
- Mainnet launch in 30 days is doable: most infra is already proven on
  testnet v2; mainnet is mostly redeploy + DNS config, not fresh
  implementation.

### Hard blockers we're honest about

- OPinit bridge to `initiation-1` mainnet: needs Initia team coordination
  + real L1 INIT deposit (~$500+) for bridge deploy. If Initia doesn't
  whitelist us or costs run high, Gate 1 scope might need to shift to
  "sovereign spawn live, no L1 bridge" as the MVP.
- Regulatory: a US-fronted memecoin launcher is a compliance minefield.
  We'll likely geofence or run behind a non-US entity from day one.
- Indexer: RPC `tx_search` does not scale past a few thousand txs. Running
  a dedicated Initia indexer is on Gate 2 critical path.
- Pinata quota: client-side JWT means anyone can exhaust our pinning quota
  once the site is public. Gate 1 includes moving to presigned-URL
  backend.

---

## 1. The Pitch

Minitia.fun is a **fair-launch appchain launcher** built on the Initia
stack. Anyone can mint a token in seconds, trade it on a fast-block
bonding curve, claim creator fees, and then promote the community into
its own **sovereign L2 rollup** — all from a single cockpit.

Pump.fun proved a market exists for instant-launch token economies. The
catch: on Solana, graduation ends at a fixed DEX. On Initia, **graduation
is just the start** — successful communities can fork into their own
appchain with customised execution, fee economics, and interoperable
liquidity. That is the fresh point of view: **launch-to-sovereignty in
one product surface.**

## 2. Why this is a fit for DeFi track

- **Revenue flywheel** at every step: deployment gas + 0.5 % curve fee
  retained to the pool creator → graduation + promotion fee to the
  launcher ecosystem → future VIP esINIT distribution to active traders.
- **No value leakage** — every trade executes on our own Move L2 rollup,
  gas stays in the ecosystem.
- **Distribution on day one** — cross-chain deposits via Interwoven Bridge
  let users come from Ethereum, Solana, Base, Celestia without manually
  bridging.
- **One-click trading UX** via auto-sign session keys — trades feel like
  Web2 clicks.

## 3. Initia-native features used

All three native features are wired, not just one:

| Feature | File / Surface | Effect |
| --- | --- | --- |
| **InterwovenKit** — `@initia/interwovenkit-react` | [`src/providers/Web3Providers.tsx`](src/providers/Web3Providers.tsx) · [`src/hooks/useInitiaAccount.ts`](src/hooks/useInitiaAccount.ts) | Wallet connect (Keplr / Leap / MetaMask / Privy), unified account state, username resolution |
| **Auto-sign / Session UX** | `enableAutoSign` whitelist for `/initia.move.v1.MsgExecuteJSON` + `MsgExecute` in [`Web3Providers.tsx`](src/providers/Web3Providers.tsx); toggle + expiry countdown in [`AutoSignIndicator.tsx`](src/components/layout/AutoSignIndicator.tsx) | ONE authz grant → subsequent Buy / Sell / Claim / Stage / Record execute with zero popups until session expires |
| **Interwoven Bridge** | [`src/components/layout/BridgePill.tsx`](src/components/layout/BridgePill.tsx) | `openBridge()` → users deposit from any chain in one step |
| **Initia Usernames (.init)** | [`src/pages/Launchpad.tsx`](src/pages/Launchpad.tsx) · `ticker.fun.init` preview | Every launched token gets a native identity; WalletPill shows `@username` when available |

## 4. Technical architecture (Hub & Spoke)

```
             ┌─────────────────────────────────────────┐
             │  Layer 1 · Initia Coordination Hub       │
             │  · Settlement & finality                 │
             │  · InitiaDEX (graduation destination)    │
             │  · Enshrined Liquidity (L1 staking)      │
             └────────────────────┬────────────────────┘
                                  │ IBC + OPinit
             ┌────────────────────┴────────────────────┐
             │  Layer 2 · Minitia.fun Launcher Chain    │
             │  chainId: minitia-fun-v2-1               │
             │  vm: Move · ~150 ms blocks · ~10 k TPS   │
             │  modules: token_factory                  │
             │           bonding_curve                  │
             │           liquidity_migrator             │
             │           comments                       │
             └─────────────────────────────────────────┘
                                  │
                                  │ liquidity_migrator::stage_promotion
                                  ▼
             ┌─────────────────────────────────────────┐
             │  Layer 3 · Per-token sovereign rollup    │
             │  (one per graduated community)           │
             │  spawn via scripts/spawn-local.mjs       │
             └─────────────────────────────────────────┘
```

## 5. Economic flywheel

1. **Launch phase** — creator pays deployment gas + chooses `max_supply`
   (default 1 B). `TokenInfo.image_uri` pins logo to IPFS for user
   verification.
2. **Trading phase** — bonding curve on L2. **0.5 %** fee per trade
   accumulates in `pool.fee_accumulated`, claimable by the pool creator
   (= launcher, enforced by `create_pool` launcher guard).
3. **Graduation phase** — when reserve ≥ `GRADUATION_INIT_RESERVE` (10 MIN
   demo value) OR supply reaches `max_supply`, pool freezes (buy/sell
   abort with `E_GRADUATED`). `liquidity_migrator::stage_promotion`
   signals the off-chain promoter to spawn a sovereign rollup.
4. **Sovereignty phase** — the graduated community owns its own chain:
   customise execution, fee economics, validator set. Enshrined Liquidity
   at L1 remains the gravity well.

## 6. Quick start

```bash
# 1. Install
npm install

# 2. Configure network + IPFS
cp .env.example .env.local
# Edit .env.local:
#   VITE_APPCHAIN_RPC=https://rpc.minitia.fun    (or http://localhost:26657 for dev)
#   VITE_APPCHAIN_REST=https://rest.minitia.fun  (or http://localhost:1317 for dev)
#   VITE_PINATA_JWT=<JWT from pinata.cloud>      (optional — logos skipped if blank)
#   VITE_PINATA_GATEWAY=https://<sub>.mypinata.cloud  (optional)

# 3. Run dev server
npm run dev
# → http://localhost:5173

# 4. Production build
npm run build
```

## 7. Walkthrough

1. **Open the app.** Discovery page lists every token launched on the
   rollup with FDV + graduation progress + status chip.
2. **Connect wallet** — top-right `Connect wallet` → InterwovenKit modal
   → pick Keplr / Leap / MetaMask / Privy. Address + MIN balance appear;
   auto-sign toggle becomes available.
3. **Enable auto-sign** — one click, one wallet popup → session-key
   authz grant. Every subsequent Buy / Sell / Claim / Stage / Record
   executes with zero popups.
4. **Bridge in funds** (optional) — Bridge pill next to wallet →
   InterwovenKit cross-chain deposit from Ethereum / Solana in one step.
5. **Launch a token** — `/launchpad` → name, ticker, description, logo
   (uploads to IPFS via Pinata V3), total supply (default 1 B) →
   subdomain `ticker.fun.init` auto-reserved → `Deploy token`. Browser
   uploads to Pinata first (toast: "Logo pinned"), then submits bundled
   `token_factory::launch` + `bonding_curve::create_pool` tx. CID is
   persisted in draft localStorage so a page refresh won't re-upload.
6. **Trade** — `/trade/<TICKER>` → stat strip (Price, 24h %, 24h Vol,
   FDV, Supply progress, Graduation %), candle chart with 5m/1H/4H/1D/1W
   timeframe selector (OHLC built client-side from Trade events), tabs
   for Recent trades / Holders / Comments / **Curve depth**. The
   Curve-depth tab renders the bonding-curve price function with markers
   for current supply, graduation target, and supply cap — because
   bonding-curve pools do not have order books.
7. **Claim fees** — `/graduation/<TICKER>` → creator sees unclaimed
   trading fees + one-click Claim. Holders list is locked (sells blocked
   post-graduation).
8. **Promote to sovereign** — on the same page, creator signs
   `stage_promotion` → state machine flips to amber "staged" → promoter
   daemon picks up event → spawns new rollup → creator signs
   `record_rollup` → flips emerald "live".
9. **Notifications** — bell in top-bar shows wallet-scoped on-chain
   events: own trades/launches/claims and pool activity on tokens you
   created. Unread count badge. Persisted read-state per-address.

## 8. Target user & market

| Segment | Why this fits |
| --- | --- |
| **Degen token launchers** | Pump.fun-style fair-launch is familiar; 0.5 % fee, fixed supply semantics, fast execution |
| **Memecoin community founders** | Graduation-to-own-chain is asymmetric upside unavailable on Solana or Base |
| **DeFi protocol founders on a budget** | Move L2 rollup + enshrined liquidity = lower ops overhead than bootstrapping alone |

### Competitive landscape

| Competitor | Chain | Our edge |
| --- | --- | --- |
| Pump.fun | Solana | Graduation to sovereign L2 (they stop at Raydium) |
| Virtuals | Base | We target any token category, not only AI agents |
| Believe | Solana | Move VM safety + Interwoven Bridge onboarding |
| Base memecoin apps | Base | Faster blocks, fixed supply with launcher-locked fees, native cross-chain deposits |

## 9. Development status

**Phase 2 — Active testnet (this submission):**

- ✅ 4 Move modules on `minitia-fun-v2-1` (token_factory, bonding_curve,
  liquidity_migrator, comments)
- ✅ Fixed-supply bonding curves (`max_supply` in Pool) with dual
  graduation trigger
- ✅ Cross-module launcher guard in `create_pool`
- ✅ IPFS logo pinning via Pinata V3 API
- ✅ On-chain notifications feed (wallet-scoped filter)
- ✅ Price chart + 24h metrics + FDV + curve-depth tab
- ✅ Auto-sign session keys (authz-wrapped tx, all hooks handle both
  forms)
- ✅ Full UI refresh to flat zinc design system
- ✅ Local sovereign rollup spawn demonstrated

**Phase 3 — Mainnet (roadmap):**

- Sovereign Minitia spawn with OPinit bridge to `initiation-1`
- Backend proxy for Pinata uploads (presigned URLs, JWT off client)
- VIP esINIT reward redistribution
- Dedicated indexer (tx_search replacement)

## 10. Tech stack

- **Frontend** — Vite + React 19 + TypeScript strict
- **Styling** — Tailwind CSS 3 + clean zinc design tokens ("flat"
  aesthetic, no gradients/glass on core UI)
- **Typography** — Inter everywhere (ui / display / mono-adjacent) +
  JetBrains Mono for data
- **Web3** — `@initia/interwovenkit-react` + wagmi v2 + viem +
  `@tanstack/react-query`
- **Router** — react-router-dom v6
- **IPFS** — Pinata V3 upload (`uploads.pinata.cloud/v3/files`), public
  network, direct-file CIDs
- **Charts** — hand-rolled SVG (CandleChart + CurveDepthChart), no
  charting dependency

## 11. Repository layout

```
minitia.fun/
├── .initia/
│   └── submission.json          ← hackathon metadata
├── contracts/
│   ├── Move.toml
│   └── sources/
│       ├── token_factory.move        ← TokenInfo + launch + image_uri + launcher_of view
│       ├── bonding_curve.move        ← Pool + max_supply + launcher guard + custody vault
│       ├── liquidity_migrator.move   ← stage_promotion + record_rollup state machine
│       └── comments.move             ← per-ticker wall
├── src/
│   ├── components/
│   │   ├── layout/              ← Sidebar, TopBar, AppShell, WalletPill, BridgePill, AutoSignIndicator, TestnetBanner, NotificationsMenu
│   │   └── ui/                  ← Button, Card, Input, Chip, ProgressBar, Segmented, Delta, Stat, Tabs, CandleChart, CurveDepthChart, …
│   ├── hooks/
│   │   ├── useInitiaAccount.ts       ← unified wallet + balance
│   │   ├── useAllLaunchedTokens.ts   ← Discovery feed (dual tx action filter)
│   │   ├── usePoolState.ts + usePoolCreator ← bonding curve reads + launcher lookup
│   │   ├── useRollupLaunchToken.ts   ← bundled launch+create_pool tx
│   │   ├── useCreatePoolAction.ts    ← legacy pool opener
│   │   ├── useTradeAction.ts         ← buy/sell + slippage
│   │   ├── useClaimFeesAction.ts     ← creator fee withdrawal
│   │   ├── usePromotionStage.ts      ← stage + record rollup
│   │   ├── useRecentTrades.ts        ← Trade page tape (dual filter)
│   │   ├── usePriceSeries.ts         ← OHLC + 24h metrics from events
│   │   ├── useGraduationEvent.ts     ← Graduation banner data
│   │   ├── useHolderLeaderboard.ts   ← Top holders from Trade events
│   │   ├── useComments.ts + useCommentPost
│   │   ├── useGlobalActivity.ts      ← global event stream
│   │   ├── useNotifications.ts       ← wallet-scoped filter on global stream
│   │   ├── useAppchainStats.ts       ← Explorer metric strip
│   │   ├── useRecentBlocks.ts, useRecentMoveTxs.ts, useBlockDetail.ts, useTxDetail.ts
│   │   └── useAppchainBalance.ts + useAppchainFaucet.ts
│   ├── lib/
│   │   ├── initia.ts            ← APPCHAIN constants, chain config for InterwovenKit
│   │   └── pinata.ts            ← V3 upload helper + resolveImageUri
│   ├── pages/                   ← Discovery, Launchpad, Trade, Graduation, Airdrops, Explorer, BlockDetail, TxDetail, UserProfile
│   ├── providers/
│   │   └── Web3Providers.tsx    ← wagmi + QueryClient + InterwovenKitProvider + auto-sign whitelist
│   └── styles/
│       └── tokens.css           ← zinc design tokens
├── scripts/
│   ├── deploy-v2.sh             ← build + publish + initialise all 4 registries
│   ├── spawn-local.mjs          ← per-ticker sovereign rollup spawner
│   ├── promoter.mjs             ← off-chain promotion daemon
│   ├── faucet-server.mjs        ← 10 MIN drip per-request
│   └── test-launch.mjs          ← CLI smoke test
├── DEPLOY.md                    ← full deploy + v2 migration runbook
└── README.md                    ← this file
```

## 12. Credits & license

Built by the Minitia.fun team for **INITIATE: The Initia Hackathon ·
Season 1**. MIT.
