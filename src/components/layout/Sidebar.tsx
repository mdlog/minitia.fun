import { Link, useLocation } from "react-router-dom";
import { Bell, HelpCircle, Search, Settings } from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { Chip } from "@/components/ui/Chip";
import { cn } from "@/lib/cn";
import { isNavItemActive, primaryNav } from "./navigation";

export function Sidebar({ open = true }: { open?: boolean }) {
  const { pathname } = useLocation();

  if (!open) return null;

  return (
    <aside className="sticky top-3 hidden h-[calc(100vh-1.5rem)] w-[232px] shrink-0 self-start lg:flex">
      <div className="flex h-full w-full flex-col gap-5 rounded-xl bg-surface-container-low p-3 ghost-border">
        <div className="flex items-center justify-between px-1 pt-1">
          <Link to="/">
            <Logo size="sm" />
          </Link>
        </div>

        <div className="px-1">
          <button
            type="button"
            className="flex w-full items-center gap-2 rounded-md bg-[#0A0A0C] px-2.5 py-2 text-left text-[12px] text-on-surface-muted ghost-border hover:text-on-surface-variant"
          >
            <Search className="h-3.5 w-3.5" />
            <span>Search tokens…</span>
            <span className="ml-auto font-mono text-[10px] text-[#52525B]">⌘K</span>
          </button>
        </div>

        <nav className="flex flex-col gap-0.5 px-1">
          <div className="px-2 pb-1 text-[10px] font-medium uppercase tracking-[0.08em] text-[#52525B]">
            Workspace
          </div>
          {primaryNav.map((item) => {
            const active = isNavItemActive(item, pathname);
            const Icon = item.icon;

            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "group flex items-center gap-2.5 rounded-md px-2.5 py-2 transition-colors duration-150",
                  active
                    ? "bg-white/[0.06] text-on-surface"
                    : "text-on-surface-variant hover:bg-white/[0.03] hover:text-on-surface",
                )}
              >
                <Icon
                  className={cn(
                    "h-4 w-4 shrink-0",
                    active
                      ? "text-[#60A5FA]"
                      : "text-on-surface-muted group-hover:text-on-surface-variant",
                  )}
                />
                <span className="flex-1 text-[13px] font-medium">{item.label}</span>
                {active && <span className="h-1 w-1 rounded-full bg-secondary" />}
              </Link>
            );
          })}
        </nav>

        <div className="flex-1" />

        <div className="mx-1 rounded-md bg-[#0A0A0C] p-3 ghost-border">
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-[10.5px] font-medium text-on-surface-variant">Network</span>
            <Chip tone="success" dot>
              Stable
            </Chip>
          </div>
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div className="flex flex-col">
              <span className="text-[#52525B]">Block</span>
              <span className="font-mono text-on-surface">100ms</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[#52525B]">TPS</span>
              <span className="font-mono text-on-surface">10,000</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1 px-1">
          <button
            type="button"
            aria-label="Settings"
            className="flex h-8 flex-1 items-center justify-center rounded-md text-on-surface-muted hover:bg-white/[0.04] hover:text-on-surface"
          >
            <Settings className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            aria-label="Help"
            className="flex h-8 flex-1 items-center justify-center rounded-md text-on-surface-muted hover:bg-white/[0.04] hover:text-on-surface"
          >
            <HelpCircle className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            aria-label="Notifications"
            className="flex h-8 flex-1 items-center justify-center rounded-md text-on-surface-muted hover:bg-white/[0.04] hover:text-on-surface"
          >
            <Bell className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
}
