# Demo Video Script — Minitia.fun

Target length: **90 seconds**. Goal: show the "Gaib" flow (bridge-in → one-click buy < 1 s) and the full launch-to-graduate arc. Optimised for hackathon scoring — each beat maps to a rubric criterion.

---

## Shot list

| # | Duration | Screen | Voice-over | Scoring hook |
| --- | --- | --- | --- | --- |
| 1 | 0:00 – 0:08 | Fullscreen hero · `/` · ticker running (`BLOCK TIME 100ms · TPS 10,000 · TRADE FEE 0.5% · VM move`) | "Minitia.fun — launch a token in seconds, graduate it to your own sovereign L2 appchain on Initia." | Originality |
| 2 | 0:08 – 0:18 | Hero section — headline `Launch anything. Graduate fast.` → scroll to `§ 03 Hub & Spoke` showing MiniMove modules | "Built on the Initia Interwoven Stack — 100 ms blocks, 10 k TPS, Move VM for asset safety, three on-chain modules." | Technical |
| 3 | 0:18 – 0:28 | Click `Connect wallet` → InterwovenKit modal opens → pick Privy (social login) → address + balance appears in pill | "One-click connection via InterwovenKit — social login with Privy, or Keplr, Leap, MetaMask." | Integration |
| 4 | 0:28 – 0:40 | Click `Bridge` in TopBar → bridge drawer opens → demo a deposit from Ethereum mainnet USDC → confirm → back to cockpit with new balance | "Users don't need to know what a bridge is. Deposit from Ethereum, Solana, anywhere — one step." | **Bridge feature** |
| 5 | 0:40 – 0:55 | Nav to `/launchpad` → fill `HyperDrive` / `DRIVE` / description → watch readiness meter fill → preview card shows `$DRIVE` with `drive.fun.init` subdomain | "Launchpad — name, ticker, description. Every token gets a `.fun.init` username built on Initia Usernames." | **Usernames feature** |
| 6 | 0:55 – 1:05 | Click `Deploy Token` → Keplr popup for initial deploy → tx confirms → toast shows `Deployed in 0.8s` with explorer link | "The deployment transaction is on `initiation-2`. Here's the explorer link — this is the proof of end-to-end integration." | Working demo |
| 7 | 1:05 – 1:20 | Nav to `/trade/MOVE` → chart loads → click `Buy $MOVE — one-click` → **no wallet popup**, receipt updates immediately with `< 1s execution` badge | "Session keys are enabled for `MsgExecute`, so every trade auto-signs. Zero popups. One click. Under one second." | **Auto-sign feature** |
| 8 | 1:20 – 1:30 | Nav to `/graduation/MOVE` → celebration banner `$MOVE has graduated` → click MiniMove template → `1-click launch` | "When a token hits 5 000 INIT market cap, liquidity migrates to InitiaDEX. The community can spin up their own sovereign Minitia — this is where the flywheel closes." | Flywheel |

---

## Voice-over script (condensed)

> Most memecoin launchers stop at a DEX listing. **Minitia.fun** takes it further.
>
> Built on the **Initia Interwoven Stack** — 100 ms blocks, 10 thousand TPS, Move-VM rollup.
>
> Watch. I connect — **one click**, via InterwovenKit. I bridge in from Ethereum — **one step**, no swap, no chain hopping. I launch a token called **$DRIVE** — reserved at `drive.fun.init` through Initia Usernames. Deploy transaction lands on `initiation-2` in under a second.
>
> Now the trade. `Buy $DRIVE`. **No wallet popup.** Session keys auto-sign `MsgExecute`. Execution under a second.
>
> And when the bonding curve graduates — 5 000 INIT in volume — the community can spin up their own **sovereign L2**. That's the flywheel Solana and Base can't offer.
>
> Launch anything. Graduate fast. Sovereignty by default. **Minitia.fun**.

---

## Production notes

- **Screen recording**: 1920×1080 @ 60 fps; Chrome in incognito with devtools closed.
- **Audio**: Voice-over, light bed music (royalty-free, lofi electronic — matches editorial aesthetic). No music during transaction sounds.
- **On-screen captions**: time-code the rubric-hook labels in corner (e.g. "InterwovenKit · Auto-sign active · Bridge demo").
- **Tx hash freeze**: when the deploy / trade succeeds, pause 0.5 s on the explorer link so judges can read and verify.
- **Wallet recording**: use a clean test wallet seeded from the faucet. Show 12+ INIT starting balance.
- **Call-out watermark**: bottom-right — `minitia.fun · INITIATE Season 1 · DeFi track`.

## Opening title card (5 s pre-roll)

```
MINITIA.FUN
Instant Appchain Launcher
────────────────────────
INITIATE · Season 1 · DeFi
```

## Closing card (3 s)

```
Live demo →  https://minitia.fun
Repo      →  github.com/.../minitia.fun
Built on  →  Initia L1 · initiation-2 testnet
Track     →  DeFi

✦ Sovereignty by default
```
