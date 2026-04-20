import { useCallback, useEffect, useState, type ReactNode } from "react";
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
    <div className="relative min-h-screen surface-base">
      <div className="mx-auto flex min-h-screen w-full max-w-[1560px] gap-4 px-3 py-3 pb-24 md:px-4 md:py-4 md:pb-4">
        <Sidebar open={sidebarOpen} />

        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <TestnetBanner />
          <TopBar sidebarOpen={sidebarOpen} onToggleSidebar={toggleSidebar} />

          <main className="flex-1">{children}</main>

          <footer className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-surface-container-low px-4 py-3 ghost-border">
            <div className="flex items-center gap-4 text-[11.5px] text-on-surface-muted">
              <span>© {new Date().getFullYear()} minitia.fun</span>
              <span>·</span>
              <span className="font-mono">v2.4.0</span>
              <span>·</span>
              <a className="cursor-pointer hover:text-on-surface">Docs</a>
              <a className="cursor-pointer hover:text-on-surface">GitHub</a>
              <a className="cursor-pointer hover:text-on-surface">Status</a>
            </div>
            <div className="flex items-center gap-2 font-mono text-[11px] text-[#52525B]">
              <span className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-secondary" />
                Sequencer
              </span>
              <span>·</span>
              <span>Block 2,481,204</span>
            </div>
          </footer>
        </div>
      </div>

      <MobileDock />
    </div>
  );
}
