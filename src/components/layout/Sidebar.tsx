import { Link, useLocation } from "react-router-dom";
import { HelpCircle, Settings } from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { cn } from "@/lib/cn";
import { isNavItemActive, primaryNav } from "./navigation";

export function Sidebar({ open = true }: { open?: boolean }) {
  const { pathname } = useLocation();

  if (!open) return null;

  return (
    <aside className="sticky top-3 hidden h-[calc(100vh-1.5rem)] w-[248px] shrink-0 self-start lg:flex">
      <div className="section-panel flex h-full w-full flex-col gap-6 rounded-[28px] px-4 py-5 ghost-border shadow-ambient">
        <div className="flex items-center justify-between gap-3">
          <Link to="/" className="inline-flex">
            <Logo showSub={false} size="sm" />
          </Link>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary-container/70 px-2 py-0.5 text-[0.58rem] font-mono uppercase tracking-[0.2em] text-secondary ghost-border">
            <span className="h-1.5 w-1.5 rounded-full bg-secondary shadow-glow-secondary" />
            Live
          </span>
        </div>

        <nav className="flex flex-col gap-1">
          {primaryNav.map((item) => {
            const active = isNavItemActive(item, pathname);
            const Icon = item.icon;

            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "group flex items-center gap-3 rounded-2xl px-3 py-2.5 snappy transition-all duration-200",
                  active
                    ? "surface-card-high ghost-border"
                    : "hover:bg-white/[0.05]",
                )}
              >
                <div
                  className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl snappy transition-colors duration-200",
                    active
                      ? "bg-secondary-container text-secondary"
                      : "bg-white/[0.04] text-on-surface-muted group-hover:text-primary",
                  )}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <span
                  className={cn(
                    "flex-1 text-body-md font-medium tracking-tight",
                    active ? "text-on-surface" : "text-on-surface-variant group-hover:text-on-surface",
                  )}
                >
                  {item.label}
                </span>
                {active && <span className="h-1.5 w-1.5 rounded-full bg-secondary" />}
              </Link>
            );
          })}
        </nav>

        <div className="flex-1" />

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            aria-label="Workspace"
            className="flex items-center justify-center rounded-2xl bg-white/[0.05] py-2.5 text-on-surface-muted snappy transition-colors hover:bg-white/[0.08] hover:text-on-surface ghost-border"
          >
            <Settings className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label="Support"
            className="flex items-center justify-center rounded-2xl bg-white/[0.05] py-2.5 text-on-surface-muted snappy transition-colors hover:bg-white/[0.08] hover:text-on-surface ghost-border"
          >
            <HelpCircle className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
