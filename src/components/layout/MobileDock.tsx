import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/cn";
import { isNavItemActive, primaryNav } from "./navigation";

export function MobileDock() {
  const { pathname } = useLocation();

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-3 z-50 px-3 lg:hidden">
      <nav
        className="pointer-events-auto mx-auto grid max-w-4xl gap-1 rounded-xl bg-surface-container-low px-2 py-2 ghost-border"
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
                "flex min-w-0 flex-col items-center gap-1 rounded-md px-2 py-1.5 text-center transition-colors duration-150",
                active
                  ? "bg-white/[0.06] text-on-surface"
                  : "text-on-surface-muted hover:bg-white/[0.03] hover:text-on-surface",
              )}
            >
              <Icon className={cn("h-4 w-4", active ? "text-[#60A5FA]" : "text-on-surface-muted")} />
              <span className="truncate text-[10px] font-medium">{item.shortLabel}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
