import type { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { ArrowUpRight, Zap } from "lucide-react";
import { ExplorerSearchBar } from "@/components/explorer/SearchBar";
import { GlobalActivityTicker } from "./GlobalActivityTicker";
import { TestnetBanner } from "./TestnetBanner";
import { WalletPill } from "./WalletPill";
import { AutoSignIndicator } from "./AutoSignIndicator";
import { APPCHAIN } from "@/lib/initia";
import { cn } from "@/lib/cn";

const EXPLORER_VERSION = "0.1.0";

/**
 * Minimal shell for the standalone explorer at explorer.minitia.fun.
 *
 * Unlike the main AppShell, this:
 *  - drops the left sidebar (explorer is read-only, no nav surface needed)
 *  - keeps the TestnetBanner + GlobalActivityTicker + WalletPill so the
 *    explorer still participates in the live rollup context
 *  - provides a dedicated top bar with the explorer brand, quick search,
 *    and a link back to the main app
 */
export function ExplorerShell({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const onLanding = pathname === "/" || pathname === "/explorer";

  return (
    <div className="relative min-h-screen overflow-hidden surface-base">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[-12rem] top-[-10rem] h-[26rem] w-[26rem] rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute right-[-10rem] top-24 h-[24rem] w-[24rem] rounded-full bg-secondary/10 blur-3xl" />
        <div className="absolute bottom-[-10rem] left-1/3 h-[20rem] w-[20rem] rounded-full bg-editorial/10 blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-[1680px] flex-col gap-5 px-3 pb-10 pt-3 md:px-5">
        <TestnetBanner />

        <div className="sticky top-3 z-30">
          <GlobalActivityTicker />
        </div>

        <header className="rounded-[24px] glass ghost-border shadow-ambient px-4 py-4 md:px-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3">
              <Link to="/" className="flex items-center gap-2">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-editorial/15 text-editorial">
                  <Zap className="h-4 w-4" />
                </span>
                <div className="flex flex-col leading-tight">
                  <span className="font-mono text-[0.6rem] uppercase tracking-[0.22em] text-editorial">
                    minitia.fun
                  </span>
                  <span className="font-editorial italic text-title-lg text-editorial-ink">
                    explorer
                  </span>
                </div>
              </Link>
              <span
                className={cn(
                  "hidden rounded-full bg-white/[0.05] px-2.5 py-1 font-mono text-[0.58rem] uppercase tracking-[0.22em] text-on-surface-muted md:inline-flex",
                )}
                title={`explorer v${EXPLORER_VERSION}`}
              >
                v{EXPLORER_VERSION} · {APPCHAIN.chainId}
              </span>
            </div>

            <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
              {!onLanding && (
                <div className="min-w-[320px] max-w-[480px] flex-1">
                  <ExplorerSearchBar />
                </div>
              )}
              <div className="flex items-center justify-end gap-2">
                <AutoSignIndicator />
                <a
                  href="https://minitia.fun"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-2xl bg-white/[0.05] px-3 py-2 font-mono text-[0.62rem] uppercase tracking-[0.22em] text-on-surface-variant ghost-border hover:bg-white/[0.08] snappy"
                >
                  open app <ArrowUpRight className="h-3 w-3" />
                </a>
                <WalletPill />
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1">
          <div className="mx-auto w-full max-w-[1320px]">{children}</div>
        </main>

        <footer className="section-panel px-5 py-4 ghost-border md:px-6">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-col gap-1">
              <span className="text-[0.62rem] font-mono uppercase tracking-[0.22em] text-editorial">
                Minitia.fun Explorer
              </span>
              <p className="text-body-sm text-on-surface-variant">
                Read-only surface for the {APPCHAIN.chainId} rollup — blocks, transactions, and
                addresses straight from the RPC, no indexer.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 font-mono text-[0.6rem] uppercase tracking-[0.2em] text-on-surface-muted">
              <span className="rounded-full bg-white/[0.05] px-3 py-1.5 ghost-border">
                {APPCHAIN.rpc}
              </span>
              <a
                href={`${APPCHAIN.rpc}/status`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 rounded-full bg-white/[0.05] px-3 py-1.5 ghost-border hover:text-editorial-ink"
              >
                raw /status <ArrowUpRight className="h-3 w-3" />
              </a>
              <a
                href="https://celat.one"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 rounded-full bg-editorial/15 px-3 py-1.5 text-editorial ghost-border hover:bg-editorial/25"
                title="Third-party Move-aware explorer (Celatone by Alleslabs) — independent verification of module ABIs, view functions, and resource state"
              >
                advanced · celat.one <ArrowUpRight className="h-3 w-3" />
              </a>
              <a
                href="https://scan.testnet.initia.xyz/initiation-2"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 rounded-full bg-white/[0.05] px-3 py-1.5 ghost-border hover:text-editorial-ink"
                title="Initia L1 testnet explorer (initiation-2) — settlement layer for this rollup"
              >
                L1 scan <ArrowUpRight className="h-3 w-3" />
              </a>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
