import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/cn";
import { isNavItemActive, primaryNav } from "./navigation";

export function MobileDock() {
  const { pathname } = useLocation();

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-3 z-50 px-3 lg:hidden">
      <nav
        className="pointer-events-auto mx-auto grid max-w-4xl gap-1.5 rounded-[26px] glass px-2 py-2 ghost-border shadow-ambient"
        style={{ gridTemplateColumns: `repeat(${primaryNav.length}, minmax(0, 1fr))` }}
      >
        {primaryNav.map((item) => {
          const Icon = item.icon;
          const active = isNavItemActive(item, pathname);

          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "flex min-w-0 flex-col items-center gap-1 rounded-2xl px-2 py-2 text-center snappy transition-all duration-200",
                active
                  ? "bg-white/[0.1] text-on-surface shadow-[0_16px_32px_rgba(3,8,18,0.24)]"
                  : "text-on-surface-muted hover:bg-white/[0.05] hover:text-on-surface",
              )}
            >
              <Icon className={cn("h-4 w-4", active ? "text-secondary" : "text-on-surface-muted")} />
              <span className="truncate text-[0.65rem] font-mono uppercase tracking-[0.18em]">
                {item.shortLabel}
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
