import type { ReactNode } from "react";
import { GlobalActivityTicker } from "./GlobalActivityTicker";
import { MobileDock } from "./MobileDock";
import { Sidebar } from "./Sidebar";
import { TestnetBanner } from "./TestnetBanner";
import { TopBar } from "./TopBar";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-screen overflow-hidden surface-base">


      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-[1680px] gap-4 px-3 pb-24 pt-3 md:px-4 md:pb-8">
        <Sidebar />

        <div className="flex min-w-0 flex-1 flex-col gap-5">
          <TestnetBanner />
          <div className="sticky top-2 z-30">
            <GlobalActivityTicker />
          </div>
          <TopBar />

          <main className="flex-1 px-1 md:px-2">
            <div className="mx-auto w-full max-w-[1320px]">{children}</div>
          </main>

          <footer className="rounded-xl surface-section px-5 py-4 ghost-border">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="flex flex-col gap-1">
                <span className="text-[0.68rem] font-mono uppercase tracking-[0.24em] text-on-surface-muted">
                  Minitia Professional Console
                </span>
                <p className="text-body-sm text-on-surface-variant">
                  Built for launch velocity, live trading clarity, and cleaner graduation workflows.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-[0.68rem] font-mono uppercase tracking-[0.18em] text-on-surface-muted">
                <span className="rounded-full bg-white/[0.04] px-3 py-1.5">Initia L2 Ready</span>
                <span className="rounded-full bg-white/[0.04] px-3 py-1.5">Zero-friction UX</span>
                <span className="rounded-full bg-white/[0.04] px-3 py-1.5">Professional Cockpit</span>
              </div>
            </div>
          </footer>
        </div>
      </div>

      <MobileDock />
    </div>
  );
}
