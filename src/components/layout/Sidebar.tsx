import { Link, useLocation } from "react-router-dom";
import { ArrowRight, HelpCircle, Settings, Zap } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Logo } from "@/components/ui/Logo";
import { cn } from "@/lib/cn";
import { isNavItemActive, primaryNav } from "./navigation";

export function Sidebar() {
  const { pathname } = useLocation();

  return (
    <aside className="sticky top-3 hidden h-[calc(100vh-1.5rem)] w-[248px] shrink-0 self-start lg:flex">
      <div className="flex h-full w-full flex-col gap-5 rounded-2xl surface-section px-4 py-5 ghost-border shadow-ambient">
        {/* Brand + status pill */}
        <div className="flex items-center justify-between gap-3">
          <Link to="/" className="inline-flex">
            <Logo showSub={false} />
          </Link>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary-container/70 px-2.5 py-1 text-[0.62rem] font-mono uppercase tracking-[0.2em] text-secondary">
            <span className="h-1.5 w-1.5 rounded-full bg-secondary shadow-glow-secondary" />
            Live
          </span>
        </div>

        {/* Nav list — icon + label only */}
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
                    : "hover:surface-card hover:bg-white/[0.03]",
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

        {/* Spacer */}
        <div className="flex-1" />

        {/* Compact Boost CTA */}
        <div className="rounded-xl surface-card-high ghost-border p-[1px]">
          <div className="rounded-xl surface-card-high px-4 py-4">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-secondary" />
              <span className="text-[0.68rem] font-mono uppercase tracking-[0.22em] text-secondary">
                Boost
              </span>
            </div>
            <Button asChild variant="glass" size="sm" className="mt-3 w-full justify-between">
              <Link to="/launchpad">
                Rewards
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
        </div>

        {/* Footer — icon-only utility */}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            aria-label="Workspace"
            className="flex items-center justify-center rounded-2xl bg-white/[0.03] py-2.5 text-on-surface-muted snappy transition-colors hover:bg-white/[0.06] hover:text-on-surface"
          >
            <Settings className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label="Support"
            className="flex items-center justify-center rounded-2xl bg-white/[0.03] py-2.5 text-on-surface-muted snappy transition-colors hover:bg-white/[0.06] hover:text-on-surface"
          >
            <HelpCircle className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
