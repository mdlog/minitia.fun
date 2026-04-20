import type { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { ArrowUpRight, Zap } from "lucide-react";
import { ExplorerSearchBar } from "@/components/explorer/SearchBar";
import { GlobalActivityTicker } from "./GlobalActivityTicker";
import { TestnetBanner } from "./TestnetBanner";
import { WalletPill } from "./WalletPill";
import { AutoSignIndicator } from "./AutoSignIndicator";
import { APPCHAIN } from "@/lib/initia";

/**
 * Minimal shell for the standalone explorer at explorer.minitia.fun.
 * No sidebar, no marketing hero -- just brand + live context + quick
 * search on non-landing pages, and a lean footer with verification
 * fallbacks. Everything else is the page body.
 */
export function ExplorerShell({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const onLanding = pathname === "/" || pathname === "/explorer";

  return (
    <div className="relative min-h-screen overflow-hidden surface-base">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[-12rem] top-[-10rem] h-[26rem] w-[26rem] rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute right-[-10rem] top-24 h-[24rem] w-[24rem] rounded-full bg-secondary/10 blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-[1480px] flex-col gap-4 px-3 pb-10 pt-3 md:px-5">
        <TestnetBanner />

        <div className="sticky top-3 z-30">
          <GlobalActivityTicker />
        </div>

        <header className="rounded-[20px] glass ghost-border shadow-ambient px-4 py-3 md:px-5">
          <div className="flex flex-wrap items-center gap-3 md:flex-nowrap md:gap-4">
            <Link to="/" className="flex items-center gap-2 shrink-0">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-editorial/15 text-editorial">
                <Zap className="h-4 w-4" />
              </span>
              <div className="flex flex-col leading-tight">
                <span className="font-mono text-[0.58rem] uppercase tracking-[0.22em] text-editorial">
                  minitia.fun
                </span>
                <span className="font-editorial italic text-title-md text-editorial-ink">
                  explorer
                </span>
              </div>
            </Link>

            <span
              className="hidden rounded-full bg-white/[0.04] px-2.5 py-1 font-mono text-[0.56rem] uppercase tracking-[0.22em] text-on-surface-muted md:inline-flex"
              title="active rollup"
            >
              {APPCHAIN.chainId}
            </span>

            {!onLanding && (
              <div className="min-w-0 flex-1 md:max-w-[480px]">
                <ExplorerSearchBar />
              </div>
            )}

            <div className="ml-auto flex items-center gap-2">
              <AutoSignIndicator />
              <a
                href="https://minitia.fun"
                target="_blank"
                rel="noreferrer"
                className="hidden items-center gap-1.5 rounded-xl bg-white/[0.05] px-3 py-2 font-mono text-[0.6rem] uppercase tracking-[0.22em] text-on-surface-variant ghost-border hover:bg-white/[0.08] snappy md:inline-flex"
              >
                open app <ArrowUpRight className="h-3 w-3" />
              </a>
              <WalletPill />
            </div>
          </div>
        </header>

        <main className="flex-1">
          <div className="mx-auto w-full">{children}</div>
        </main>

        <footer className="flex flex-wrap items-center gap-2 px-2 font-mono text-[0.58rem] uppercase tracking-[0.22em] text-on-surface-muted">
          <span className="text-editorial">minitia.fun/explorer</span>
          <span>·</span>
          <span>{APPCHAIN.chainId}</span>
          <span>·</span>
          <a
            href={`${APPCHAIN.rpc}/status`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 hover:text-editorial-ink"
          >
            rpc /status <ArrowUpRight className="h-3 w-3" />
          </a>
          <span className="mx-1 h-3 w-px bg-white/[0.08]" />
          <a
            href="https://celat.one"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-editorial hover:text-editorial-ink"
            title="Celatone — Move-aware third-party explorer"
          >
            celat.one <ArrowUpRight className="h-3 w-3" />
          </a>
          <a
            href="https://scan.testnet.initia.xyz/initiation-2"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 hover:text-editorial-ink"
            title="Initia L1 testnet — settlement layer"
          >
            L1 scan <ArrowUpRight className="h-3 w-3" />
          </a>
        </footer>
      </div>
    </div>
  );
}
