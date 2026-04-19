# Minitia.fun

**The instant appchain launcher — launch anything, graduate fast.**

Submission for [**INITIATE: The Initia Hackathon · Season 1**](https://docs.initia.xyz/hackathon) · Track: **DeFi**

---

## Initia Hackathon Submission

- **Project Name**: Minitia.fun

### Project Overview

Minitia.fun is a fair-launch appchain launcher on Initia where anyone mints a token in seconds, trades it on a 100 ms-block bonding curve, then graduates liquidity to InitiaDEX and promotes the community into its own sovereign L2 rollup. Pump.fun stops at a DEX listing; Minitia.fun continues the journey into full appchain sovereignty — the only missing piece of the instant-launch market.

### Implementation Detail

- **The Custom Implementation**: A Move-VM launcher rollup (`minitia-fun-test-1`) with three custom modules — `token_factory` (object-centric metadata mint), `bonding_curve` (supply-based pricing with 0.5 % protocol fee), and `liquidity_migrator` (OPinit-driven migration to InitiaDEX at 5 000 INIT cap). The React 19 + Vite frontend wraps this with an editorial trading cockpit, real-time RPC block-height polling, toast-based transaction feedback, and persisted tx history per address in `localStorage`.
- **The Native Feature**: **Auto-signing (Session UX)** is the load-bearing feature. `InterwovenKitProvider` is configured with `enableAutoSign: { [chainId]: ["/initia.move.v1.MsgExecute"] }` in [`src/providers/Web3Providers.tsx`](src/providers/Web3Providers.tsx). After the first connection, every Buy / Sell on the Trade page executes under 1 s with **zero wallet popups** — the only way a fair-launch UX can feel like Web2. The Interwoven Bridge (`openBridge()`) and .init Usernames (`ticker.fun.init`) are also wired end-to-end for the full "Gaib" demo.

### How to Run Locally

1. `npm install` — installs React 19 + Vite + InterwovenKit + wagmi + viem + TanStack Query.
2. `cp .env.example .env.local` (optional; `VITE_INITIA_NETWORK=testnet` is the default).
3. `npm run dev` — dev server at `http://localhost:5173`. Grab testnet INIT from [`faucet.testnet.initia.xyz`](https://faucet.testnet.initia.xyz) when the in-app banner prompts.
4. Connect via Keplr / Leap / MetaMask / Privy, then click **Deploy Token** on the Launchpad page or **Buy $MOVE — one-click** on the Trade page to submit a real transaction on `initiation-2`. Tx hash appears as a toast with an explorer link and is persisted in your wallet dropdown's "Recent activity".

### On-chain proof (deployed and verified)

| Artefact | Value |
|---|---|
| **Rollup chain ID** | `minitia-fun-test-1` (Move VM, Initia DA) |
| **Rollup RPC** (public) | [`https://evonft.xyz`](https://evonft.xyz/status) — judges: check `/status` for live height |
| **Rollup REST** (public) | [`https://nectiq.xyz`](https://nectiq.xyz/cosmos/base/tendermint/v1beta1/node_info) — chain info + generic cosmos routes |
| **Rollup RPC** (local) | `tcp://localhost:36657` |
| **Deployed module address** | `0xC0A7DD6C8EA3CCB58831B2878FB7365AF7BE5B80` (aka `init1czna6myw50xttzp3k2rcldekttmmukuqcu4u6c`) |
| **Deploy tx** | `579664878BB873C8FAFE50350599D4ED54B9F6B46F4107157FDB3B28A638F0D1` (height 60, gas 243,342) |
| **Registry init tx** | `E5767637DA582D4141BB0DC6AC6D85EBB6E36C276365CA9CE5066D0F7971C308` (height 62) |
| **First `launch` tx ($MOVE)** | `CC1641D82204C999C0D789371BCEEAB29377DC80D678CEDA0A804394F357FC98` (height 64) |
| **Registry count (on-chain view)** | `1` (verified via `minitiad query move view … token_factory count`) |

Reproduce locally with [`DEPLOY.md`](DEPLOY.md). See [`contracts/README.md`](contracts/README.md) for the Move build / deploy commands.

**Frontend reads from the rollup live** via those public tunnels: the Discovery page's **"Our rollup, live"** card polls `/status` every 5 s for block height and `/tx_search` every 15 s for the on-chain launch count. Judges running `npm run dev` will see the rollup's real chain ID, height, and Move tx count update in real time — verifiable by hitting the tunnel URLs above.

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
| **Auto-sign / Session UX** | `enableAutoSign` policy for `/initia.move.v1.MsgExecute` in `Web3Providers.tsx` | One-click `Buy / Sell` without wallet popups on every trade |
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
