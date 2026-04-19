import { useCallback, useEffect, useState, type ReactNode } from "react";
import { GlobalActivityTicker } from "./GlobalActivityTicker";
import { MobileDock } from "./MobileDock";
import { Sidebar } from "./Sidebar";
import { TestnetBanner } from "./TestnetBanner";
import { TopBar } from "./TopBar";

const SIDEBAR_STORAGE_KEY = "minitia.sidebarOpen";

function loadSidebarOpen(): boolean {
  if (typeof window === "undefined") return true;
  const v = window.localStorage.getItem(SIDEBAR_STORAGE_KEY);
  return v === null ? true : v === "1";
}

export function AppShell({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(loadSidebarOpen);

  useEffect(() => {
    window.localStorage.setItem(SIDEBAR_STORAGE_KEY, sidebarOpen ? "1" : "0");
  }, [sidebarOpen]);

  const toggleSidebar = useCallback(() => setSidebarOpen((v) => !v), []);

  return (
    <div className="relative min-h-screen overflow-hidden surface-base">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[-12rem] top-[-10rem] h-[26rem] w-[26rem] rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute right-[-10rem] top-24 h-[24rem] w-[24rem] rounded-full bg-secondary/10 blur-3xl" />
        <div className="absolute bottom-[-10rem] left-1/3 h-[20rem] w-[20rem] rounded-full bg-editorial/10 blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-[1760px] gap-5 px-3 pb-24 pt-3 md:px-5 md:pb-10">
        <Sidebar open={sidebarOpen} />

        <div className="flex min-w-0 flex-1 flex-col gap-6">
          <TestnetBanner />
          <div className="sticky top-3 z-30">
            <GlobalActivityTicker />
          </div>
          <TopBar sidebarOpen={sidebarOpen} onToggleSidebar={toggleSidebar} />

          <main className="flex-1">
            <div className="mx-auto w-full max-w-[1320px]">{children}</div>
          </main>

          <footer className="section-panel px-5 py-5 ghost-border md:px-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex flex-col gap-1.5">
                <span className="text-[0.68rem] font-mono uppercase tracking-[0.24em] text-editorial">
                  Minitia Operations Console
                </span>
                <p className="text-body-sm text-on-surface-variant">
                  Built for launch velocity, clearer market monitoring, and smoother graduation workflows on Initia.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-[0.68rem] font-mono uppercase tracking-[0.18em] text-on-surface-muted">
                <span className="rounded-full bg-white/[0.05] px-3 py-1.5 ghost-border">Initia L2 ready</span>
                <span className="rounded-full bg-white/[0.05] px-3 py-1.5 ghost-border">Live market surfaces</span>
                <span className="rounded-full bg-white/[0.05] px-3 py-1.5 ghost-border">Cleaner operator UX</span>
              </div>
            </div>
          </footer>
        </div>
      </div>

      <MobileDock />
    </div>
  );
}
