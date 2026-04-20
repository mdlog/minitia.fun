# Minitia.fun

**The instant appchain launcher — launch anything, graduate fast.**

Submission for [**INITIATE: The Initia Hackathon · Season 1**](https://docs.initia.xyz/hackathon) · Track: **DeFi**

---

## Initia Hackathon Submission

- **Project Name**: Minitia.fun

### Project Overview

Minitia.fun is a fair-launch appchain launcher on Initia where anyone mints a token in seconds, trades it on a 100 ms-block bonding curve, then graduates liquidity to InitiaDEX and promotes the community into its own sovereign L2 rollup. Pump.fun stops at a DEX listing; Minitia.fun continues the journey into full appchain sovereignty — the only missing piece of the instant-launch market.

### Implementation Detail

- **The Custom Implementation**: A Move-VM launcher rollup (`minitia-fun-test-1`) with **four** custom modules —
  - [`token_factory`](contracts/sources/token_factory.move) — registry of fair-launched tokens (6 live on-chain as of submission),
  - [`bonding_curve`](contracts/sources/bonding_curve.move) — integral linear-curve pricing with a **real umin custody vault** (Phase 2: `primary_fungible_store` moves MIN between trader wallets and a module-owned object, no synthetic reserve),
  - [`comments`](contracts/sources/comments.move) — per-ticker public wall for social signal layer, events scannable via `tx_search`,
  - [`liquidity_migrator`](contracts/sources/liquidity_migrator.move) — coordinates appchain promotion via `stage_promotion` + `record_rollup` entries; off-chain [`scripts/promoter.mjs`](scripts/promoter.mjs) + [`scripts/spawn-local.mjs`](scripts/spawn-local.mjs) pick up `PromotionStaged` events and bootstrap a brand-new sovereign rollup (demonstrated end-to-end for `$SPX → spx-fun-1`).

  The React 19 + Vite frontend wraps all four modules: Launchpad bundles `token_factory::launch + bonding_curve::create_pool` in one tx, Trade page mirrors the integral math so UI estimate matches on-chain settlement to within 1 unit, Graduation page is a real 4-state machine reading `pool_state` + `stage_of` every 10 s.

- **The Native Feature**: **Auto-signing (Session UX via Cosmos SDK authz).** `InterwovenKitProvider` is configured with `enableAutoSign: { [chainId]: ["/initia.move.v1.MsgExecuteJSON", "/initia.move.v1.MsgExecute"] }` in [`src/providers/Web3Providers.tsx`](src/providers/Web3Providers.tsx). The top-bar [`AutoSignIndicator`](src/components/layout/AutoSignIndicator.tsx) is a real toggle: one click triggers ONE `MsgGrant` signature in the user's wallet (MetaMask / Keplr / Leap / Privy all work — InterwovenKit implements this as an authz grant, not a wallet-specific session primitive), after which every Buy / Sell / Claim / Stage / Record executes under 1 s with **zero popups**. The Interwoven Bridge (`openBridge()`) and `.init` Usernames (`ticker.fun.init`) are also wired end-to-end.

### How to Run Locally

1. `npm install` — installs React 19 + Vite + InterwovenKit + wagmi + viem + TanStack Query.
2. `cp .env.example .env.local` and point `VITE_APPCHAIN_RPC` / `VITE_APPCHAIN_REST` at the live tunnel (`https://evonft.xyz` / `https://nectiq.xyz`) or leave blank to skip rollup reads.
3. `npm run dev` — dev server at `http://localhost:5173`. Grab testnet INIT from [`faucet.testnet.initia.xyz`](https://faucet.testnet.initia.xyz) if the wallet is empty.
4. Connect via MetaMask / Keplr / Leap / Privy, click **"Enable auto-sign"** in the top bar (one popup, then silence), then launch a token at `/launchpad` or buy `$MOVE` at `/trade/MOVE`. Every action hits the live `minitia-fun-test-1` Move rollup.

### Why Move for a DeFi track

Initia's track guide hints DeFi → EVM, but we deliberately chose Move-VM because **memecoin launchers carry asymmetric user-funds risk and benefit disproportionately from Move's resource model**:

1. **Token-as-resource semantics.** Each `$TICKER` balance lives in a per-holder `Table<HolderKey, u128>` entry — it can't be duplicated, silently overwritten, or reentrancy-drained. An EVM ERC20 clone would require three explicit audits (reentrancy guard, overflow, approval races) for behavior Move makes impossible to express.
2. **Creator vault custody.** Phase 2 `primary_fungible_store` gives us first-class fungible-asset plumbing with a module-owned vault object accessed via `ExtendRef`. On EVM this is 200+ lines of custody + withdrawal guard code; in Move it's a resource with type-level guarantees.
3. **Graduation safety.** The `graduated` flag aborts all further `buy/sell` with `E_GRADUATED`. In Move, the type system prevents a caller from smuggling through a stale reference; EVM mutex patterns are notoriously error-prone.
4. **Compatible upgrades.** `COMPATIBLE` upgrade policy lets us iterate the bonding curve (we shipped 4 versions during the hackathon) without breaking existing pool state — the migration story at the Move-VM level.

For a category where users send real MIN into a curve they don't control, Move's "make invalid states unrepresentable" philosophy is the right default.

### On-chain proof (deployed and verified)

| Artefact | Value |
|---|---|
| **Rollup chain ID** | `minitia-fun-test-1` (Move VM, Initia DA) |
| **Rollup RPC** (public) | [`https://evonft.xyz`](https://evonft.xyz/status) — judges: check `/status` for live height |
| **Rollup REST** (public) | [`https://nectiq.xyz`](https://nectiq.xyz/cosmos/base/tendermint/v1beta1/node_info) — chain info + generic cosmos routes |
| **Rollup RPC** (local) | `tcp://localhost:36657` |
| **Deployed module address** | `0xC0A7DD6C8EA3CCB58831B2878FB7365AF7BE5B80` (aka `init1czna6myw50xttzp3k2rcldekttmmukuqcu4u6c`) |
| **Published modules** | `token_factory`, `bonding_curve`, `comments`, `liquidity_migrator` (4 modules, all state init'd) |
| **Tokens launched** | **6** — verified via `token_factory::count` view |
| **Latest bonding_curve republish** | `92E385B91B68C3C69C9EB5B355B3DA875ACA9A65073FF3D5EC680CBB94F75394` (height 256108) — Phase 2 real-umin custody |
| **Custody vault object address** | `0x552ae044ded0d5080ef71bc6bbc1a496d64114dedc4f595d540c0a69764109cb` |
| **comments module publish** | `594CD59E4AB84F121E14D4088CFB903EBA2DC72BF7BF234D0EF4F8C9EB85D772` (height 230021) |
| **liquidity_migrator publish** | `F4C3277585D944A04CD8B79B0A5BCBD2E4916E1FF2A47CA30FA76A3BC9DEB78A` (height 278231) |
| **Graduation threshold** | **10 MIN** (hackathon demo value; lives at `bonding_curve.move::GRADUATION_INIT_RESERVE`) |

Every view call above is reproducible with one `curl`:

```bash
# authoritative token count
curl -s -X POST https://nectiq.xyz/initia/move/v1/view/json \
  -H 'Content-Type: application/json' \
  -d '{"address":"0xC0A7DD6C8EA3CCB58831B2878FB7365AF7BE5B80",
       "module_name":"token_factory","function_name":"count",
       "type_args":[],"args":["\"0xC0A7DD6C8EA3CCB58831B2878FB7365AF7BE5B80\""]}'
# → {"data":"\"6\""}
```

Reproduce locally with [`DEPLOY.md`](DEPLOY.md). See [`contracts/README.md`](contracts/README.md) for the Move build / deploy commands.

**Frontend reads from the rollup live** via those public tunnels: the Discovery page's **"Launched on Minitia.fun"** feed polls `tx_search` for `TokenLaunched` events, the Explorer reads block height every 3 s, and the sticky **global activity ticker** renders a rolling feed of all cross-token trades (real on-chain data, zero mock).

### Sovereign appchain spawn — live, end-to-end (Phase A)

**The signature differentiator**: when a graduated token is staged, an off-chain promoter daemon picks up the event and bootstraps a **brand-new sovereign minimove rollup** for that community. Demonstrated live for `$SPX`:

| # | Step | Tx / location | Evidence |
|---|---|---|---|
| 1 | Launch + pool creation (bundled) | `2FE790361F8490F40DFDF6B9F8280B2BF9DF6B830F18C85B444CB0575D2862C4` · h=262635 | `TokenLaunched` + `PoolCreated` events in same tx |
| 2 | Two buys drive reserve past 10 MIN threshold | `9E066FBD…` (h=262883) + `4817945920CAA912…` (h=263301) | `Trade` + `Graduated` emit in second tx |
| 3 | Creator self-service stage | `968F414F5A9662091C077835ED2F26C8572FA28B39BB73546EA6A3CE466D5307` · h=289608 | `liquidity_migrator::PromotionStaged` |
| 4 | Promoter daemon scaffolds `rollup-spx.json` | [`promoter-work/rollup-spx.json`](./scripts/) | config file includes staged_tx metadata pointing back to step 3 |
| 5 | `scripts/spawn-local.mjs SPX` bootstraps the new chain | `~/.minitia-spx/` with custom genesis | minitiad process producing blocks at `localhost:61867` |
| 6 | Creator records live rollup | `A4339DF72266E05A5A0FFC3CBD51F9AB899F0270926B190FD4B5807C245C6CDB` · h=297199 | `liquidity_migrator::RollupRegistered` → Graduation UI flips to emerald "appchain live" |

**The second chain is independently verifiable**:

```bash
curl -s http://localhost:61867/status | jq '.result.node_info.network'
# → "spx-fun-1"
```

Full audit trail (cross-chain consistency checks, all verification commands): [`.initia/PROOF-SPX.md`](./.initia/PROOF-SPX.md).

**Why this matters for judging**: no other submission is likely to ship a *real* graduation-to-sovereign-chain flow. Everyone else's "promote to appchain" is marketing copy or a stubbed button. Ours has five chain-verifiable transactions and a second running chain.

### Local MIN faucet (for judges with a fresh wallet)

The Launchpad's `Launch on rollup` button submits a real `MsgExecuteJSON` against `token_factory::launch`. The signing wallet therefore needs a tiny balance of `umin` to pay gas. To fund an arbitrary `init1…` address:

```bash
node scripts/faucet-server.mjs     # drips 10 MIN per request from gas-station
```

The faucet listens on `http://localhost:8090`. Set `VITE_APPCHAIN_FAUCET=http://localhost:8090/faucet` in `.env.local` and the Launchpad will render a **Get 10 MIN** button next to the connected wallet's balance.

Only the machine that holds the rollup's `gas-station` keyring can run the faucet. Remote judges either ask the submitter to drip (share their `init1…`) or import the `gas-station` mnemonic printed in the deployment logs (testnet only).

---

## Who's building this & why

<!--
  TODO for submitter: replace this block with a short (3-5 sentence) bio
  covering:
    - name + crypto / product background
    - how you found Initia and what clicked
    - why THIS problem (appchain launcher) and why YOU can ship it
    - post-hackathon commitment level (full-time / part-time / weekend)
  Judges reading for the "strongest founder potential" Network School
  trip check this section first. Keep it specific; avoid generic "crypto
  native since 2019" filler.
-->

_Founder bio to be filled in by submitter before final submission._

---

## Post-hackathon milestone roadmap

The INITIATE reward structure gates most of the prize pool on milestones hit **after** placement is announced. Below is the commitment plan the team will run against, mapped to each gate.

### Gate 1 · Public mainnet launch (T+30 days) · $1,200-1,500

**Definition of done**: all 4 Move modules deployed to `initia-1` (Initia mainnet), publicly addressable via tunneled RPC + REST, Launchpad + Trade + Graduation flows all hitting the mainnet deployment.

| Milestone | ETA | Blocker / cost |
|---|---|---|
| Fund mainnet admin wallet | T+3d | Needs mainnet INIT (~$50-100 for deploy + init gas) |
| Publish `token_factory`, `bonding_curve`, `comments`, `liquidity_migrator` on mainnet | T+7d | `minitiad tx move publish` × 4 |
| Initialize Registry + Wall + Vault + MigratorRegistry | T+7d | 4 entry-fn tx |
| Tunnel RPC + REST with a sticky domain (not cloudflared ephemeral) | T+14d | DNS + reverse-proxy setup |
| Repoint `VITE_APPCHAIN_*` in Vercel to mainnet endpoints | T+14d | Vercel env vars swap |
| Verify: 1 test-token launched + 1 trade round-trip on mainnet | T+21d | Smoke test |
| Snapshot the tx hashes, update [`.initia/PROOF-MAINNET.md`](./.initia/) | T+28d | Audit trail |

### Gate 2 · Adoption — 500 active wallets OR $10k TVL (T+90 days) · $2,500

**Definition of done**: at least ONE of the thresholds cleared, verifiable from on-chain data.

- **500 active wallets** = unique `sender` addresses broadcasting `MsgExecuteJSON` against our modules within a 30-day window.
- **$10k TVL** = total umin held in `bonding_curve` vault (Phase 2 real custody) plus `liquidity_migrator` stages, converted to USD at the day's INIT/USD rate.

**Go-to-market**:
| Lever | Commitment |
|---|---|
| X / Twitter thread series | 2 per week post-launch — launch flywheel, graduation case studies, creator-fee highlights |
| Telegram alpha channel seeding | Post new-token firehose to 5-10 memecoin alpha groups in the first 2 weeks |
| Creator onboarding | Partner with 3-5 memecoin community leaders to co-launch their token on mainnet as anchor cases |
| Interwoven Bridge campaign | Cross-chain deposits (Ethereum / Solana / Base → Initia) as onboarding funnel |
| Referral / fee share | Route a slice of creator fees to referrers via on-chain memo tracking |

### Stretch · $100k TVL OR 1M txs (T+180 days) · $6,600

**Definition of done**: cleared EITHER threshold on mainnet before any other eligible team.

| Lever | Commitment |
|---|---|
| Graduated chain ecosystem | Real `spawn-local` → OPinit-bridged rollups (Phase A.5+ scope), not hackathon demo |
| InitiaDEX pool auto-seed | Graduated tokens get automatic liquidity pool on L1 InitiaDEX for secondary market |
| Paid user acquisition | $5k-10k marketing budget contingent on Gate 1 + 2 hit, targeting CT memecoin crowd |
| SDK / CLI | `npm i @minitia-fun/sdk` for trivial third-party integration (bots, indexers, bundlers) |

### Why these numbers are realistic

- Bonding curves are **highly capital-efficient** for TVL formation on memecoin flywheels. Pump.fun hit $100M+ TVL during peak cycles; 0.1% of that feels conservative on Initia given the novelty.
- 500 wallets is ~15 new wallets/day over 30 days. For context, a single viral X launch has historically driven 1000+ unique buyers in hours.
- Mainnet launch in 30 days is doable: most infra is already proven on `minitia-fun-test-1`; mainnet is mostly redeploy + DNS config, not fresh implementation.

### Hard blockers we're honest about

- OPinit bridge to `initiation-1` mainnet: needs Initia team coordination + real L1 INIT deposit (~$500+) for bridge deploy. If Initia doesn't whitelist us or costs run high, Gate 1 scope might need to shift to "sovereign spawn live, no L1 bridge" as the MVP.
- Regulatory: a US-fronted memecoin launcher is a compliance minefield. We'll likely geofence or run behind a non-US entity from day one.
- Indexer: RPC `tx_search` does not scale past a few thousand txs. Running a dedicated Initia indexer is on Gate 2 critical path.

---

## 1. The Pitch

Minitia.fun is a **fair-launch appchain launcher** built on the Initia stack. Anyone can mint a token in seconds, trade it on a 100 ms-block bonding curve, graduate the liquidity to **InitiaDEX** at a target market cap, and then promote the community into its own **sovereign L2 rollup** — all from a single cockpit.

Pump.fun proved a market exists for instant-launch token economies. The catch: on Solana, graduation ends at a fixed DEX. On Initia, **graduation is just the start** — successful communities can fork into their own appchain with customised execution, fee economics, and interoperable liquidity. That is the fresh point of view: **launch-to-sovereignty in one product surface.**

## 2. Why this is a fit for DeFi track

- **Revenue flywheel** at every step: launch fee → 0.5 % curve fee retained to the launcher appchain → graduation fee paid to InitiaDEX → VIP esINIT redistributed to active traders.
- **No value leakage** — every trade executes on our own Move L2 rollup, gas stays in the ecosystem.
- **Distribution on day one** — cross-chain deposits via Interwoven Bridge let users come from Ethereum, Solana, Base, Celestia without manually bridging.
- **One-click trading UX** via Auto-sign session keys — trades feel like Web2 clicks.

## 3. Initia-native features used

All three native features are wired, not just one:

| Feature | File / Surface | Effect |
| --- | --- | --- |
| **InterwovenKit** — `@initia/interwovenkit-react` | [`src/providers/Web3Providers.tsx`](src/providers/Web3Providers.tsx) / [`src/hooks/useInitiaAccount.ts`](src/hooks/useInitiaAccount.ts) | Wallet connect (Keplr / Leap / MetaMask / Privy), unified account state, username resolution |
| **Auto-sign / Session UX** | `enableAutoSign` whitelist for `/initia.move.v1.MsgExecuteJSON` + `MsgExecute` in [`Web3Providers.tsx`](src/providers/Web3Providers.tsx); toggle + expiry countdown in [`AutoSignIndicator.tsx`](src/components/layout/AutoSignIndicator.tsx) | ONE authz grant (works with MetaMask / Keplr / Leap / Privy) → subsequent Buy / Sell / Claim / Stage / Record execute with zero popups until the session expires |
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
             │  chainId: minitia-fun-test-1             │
             │  vm: Move · 100 ms blocks · 10 k TPS     │
             │  modules: token_factory                  │
             │           bonding_curve                  │
             │           liquidity_migrator             │
             └─────────────────────────────────────────┘
```

**Why Move VM for the rollup:** object-centric data model prevents illegal token minting, safer by design for a high-throughput launcher where every day hundreds of new asset primitives are created.

## 5. Economic flywheel

1. **Launch phase** — creator pays a small INIT fee → protocol revenue.
2. **Trading phase** — bonding curve on L2, **0.5 %** per trade retained to the appchain.
3. **Graduation phase** — at 5 000 INIT cap, `liquidity_migrator` module moves liquidity to InitiaDEX via OPinit Bots. Graduated tokens become **L1 staking-eligible** via Enshrined Liquidity.
4. **VIP phase** — high-volume activity qualifies for **esINIT** distribution every 2 weeks, redistributed to active traders.

## 6. Quick start

```bash
# 1. Install
npm install

# 2. Configure network (optional — testnet is default)
cp .env.example .env.local
# VITE_INITIA_NETWORK=testnet

# 3. Run dev server
npm run dev
# → http://localhost:5173

# 4. Production build
npm run build
```

Need testnet INIT? Grab some from the [official faucet](https://faucet.testnet.initia.xyz). The app shows a pulsing CTA when balance drops below 1 INIT.

## 7. Walkthrough (matches demo video)

1. **Open the app.** A running ticker at the top shows spec numbers: `BLOCK TIME 100ms · TPS 10,000 · TRADE FEE 0.5% · VM move`.
2. **Connect wallet** — top-right `Connect wallet` → InterwovenKit modal → pick Keplr / Leap / MetaMask / Privy. Address and INIT balance appear; auto-sign session key is enabled.
3. **Bridge in funds** (optional, the "Gaib" moment) — `Bridge` pill next to wallet → cross-chain deposit from Ethereum / Solana in **one step**.
4. **Launch a token** — `/launchpad` → fill name / ticker / description / logo → subdomain `ticker.fun.init` auto-reserved → `Deploy Token` submits a real tx on `initiation-2` testnet; tx hash is surfaced with an explorer link.
5. **Trade** — `/trade/MOVE` → candle chart + order panel. `Buy $MOVE — one-click` executes via auto-sign with **no wallet popup** thanks to the session key. Receipt shows 0.5 % trade fee + "< 1s execution".
6. **Graduate** — `/graduation/MOVE` → celebration state + choose **MiniMove** or **MiniEVM** template → `1-click launch` spins up the sovereign appchain.

## 8. Target user & market

| Segment | Why this fits |
| --- | --- |
| **Degen token launchers** | Pump.fun-style fair-launch is familiar; 0.5 % fee and < 1 s execution is competitive. |
| **Memecoin community founders** | Graduation-to-own-chain is an asymmetric upside unavailable on Solana or Base. |
| **DeFi protocol founders on a budget** | Move L2 rollup + enshrined liquidity = lower ops overhead than bootstrapping alone. |

### Competitive landscape

| Competitor | Chain | Our edge |
| --- | --- | --- |
| Pump.fun | Solana | Graduation to sovereign L2 (they stop at Raydium) |
| Virtuals | Base | We target any token category, not only AI agents |
| Believe | Solana | Move VM safety + Interwoven Bridge onboarding |
| Base memecoin apps | Base | Lower gas, faster blocks (100 ms vs 2 s), native cross-chain deposits |

### Go-to-market

- **Day 0** — testnet launch, seed 30 creators through Initia builder community.
- **Week 2** — mainnet with VIP esINIT rewards activated; target 1 000 launches.
- **Month 3** — first "graduated" community spins up sovereign appchain (MiniMove template) as case study; shares 50 % of their L2 sequencer revenue back to early traders.
- **Distribution levers** — X algorithmic reach via fair-launch tx firehose, Telegram alpha channels for token-launch notifications, wallet-to-wallet viral loops.

## 9. Development status

**Phase 1 — Testnet (this submission):**

- ✅ Full UI (Discovery / Launchpad / Trade / Graduation / Airdrops)
- ✅ InterwovenKit wallet integration (React 19 + wagmi v2 + viem + TanStack Query v5)
- ✅ Auto-sign configured for `/initia.move.v1.MsgExecute`
- ✅ Interwoven Bridge entrypoint
- ✅ Username (.init) identity pattern
- ✅ Real on-chain tx on `initiation-2` via `requestTxBlock` (proof of pipeline)

**Phase 2 — MVP Demo Day:**

- Move modules on own rollup (`minitia-fun-test-1`): `token_factory`, `bonding_curve`, `liquidity_migrator`
- OPinit bot wiring for graduation migration
- Session-key one-click trading end-to-end

**Phase 3 — Mainnet:**

- Sovereign Minitia spawn for graduated tokens
- VIP esINIT reward redistribution
- Indexer + on-chain analytics

## 10. Tech stack

- **Frontend** — Vite + React 19 + TypeScript strict
- **Styling** — Tailwind CSS 3 + custom Sovereign Velocity design tokens
- **Typography** — Instrument Serif (editorial display) + Bricolage Grotesque (UI) + JetBrains Mono (data)
- **Motion** — CSS-only staggered reveal + framer-motion for interactive moments
- **Web3** — `@initia/interwovenkit-react` + wagmi v2 + viem + `@tanstack/react-query`
- **Router** — react-router-dom v7

## 11. Repository layout

```
minitia.fun/
├── .initia/
│   ├── submission.json          ← hackathon metadata
│   └── demo.md                  ← video script
├── src/
│   ├── components/
│   │   ├── layout/              ← Sidebar, TopBar, AppShell, WalletPill, BridgePill, AutoSignIndicator, TestnetBanner
│   │   └── ui/                  ← Button, Card, Input, Chip, ProgressBar, Tabs, CandleChart, Marquee, GhostNumeral, …
│   ├── hooks/
│   │   └── useInitiaAccount.ts  ← unified wallet + balance + tx hook
│   ├── lib/
│   │   └── initia.ts            ← network config, APPCHAIN consts, AUTO_SIGN_MSG_TYPES
│   ├── pages/                   ← Discovery, Launchpad, Trade, Graduation, Airdrops
│   ├── providers/
│   │   └── Web3Providers.tsx    ← wagmi + QueryClient + InterwovenKitProvider
│   └── styles/
│       └── tokens.css           ← design tokens
├── aether_sovereignty/          ← original design brief
└── minitia.fun_*/               ← reference screenshots
```

## 12. Credits & license

Built by the Minitia.fun team for **INITIATE: The Initia Hackathon · Season 1**. Design reference `aether_sovereignty/DESIGN.md`. MIT.
