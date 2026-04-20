import { matchPath, NavLink, useLocation } from "react-router-dom";
import { Bell, PanelLeftClose, PanelLeftOpen, RefreshCw } from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { AutoSignIndicator } from "./AutoSignIndicator";
import { BridgePill } from "./BridgePill";
import { WalletPill } from "./WalletPill";
import { cn } from "@/lib/cn";

function getPageMeta(pathname: string) {
  const tradeMatch = matchPath("/trade/:symbol", pathname);
  if (tradeMatch) {
    const symbol = tradeMatch.params.symbol?.toUpperCase() ?? "MOVE";
    return {
      crumb: "Trade",
      title: `${symbol} / INIT`,
      description: "Live order panel and orderbook",
    };
  }

  const graduationMatch = matchPath("/graduation/:symbol", pathname);
  if (graduationMatch) {
    const symbol = graduationMatch.params.symbol?.toUpperCase() ?? "MOVE";
    return {
      crumb: "Graduation",
      title: `${symbol} promotion`,
      description: "Migrate liquidity and promote to L2",
    };
  }

  if (pathname === "/launchpad") {
    return {
      crumb: "Launchpad",
      title: "New token",
      description: "Deploy an on-curve token in seconds",
    };
  }

  if (pathname === "/airdrops") {
    return {
      crumb: "Rewards",
      title: "Claim center",
      description: "Active incentives and open claims",
    };
  }

  if (pathname === "/explorer") {
    return {
      crumb: "Observability",
      title: "Explorer",
      description: "Recent blocks and Move transactions on the appchain",
    };
  }

  const userMatch = matchPath("/u/:address", pathname);
  if (userMatch) {
    return {
      crumb: "Identity",
      title: "Wallet profile",
      description: "Launches, trades, and on-chain activity",
    };
  }

  return {
    crumb: "Discovery",
    title: "Markets",
    description: "Trending launches and protocol pulse",
  };
}

export function TopBar({
  sidebarOpen = true,
  onToggleSidebar,
}: {
  sidebarOpen?: boolean;
  onToggleSidebar?: () => void;
}) {
  const { pathname } = useLocation();
  const page = getPageMeta(pathname);

  return (
    <header className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-surface-container-low px-4 py-3 ghost-border">
      <div className="flex min-w-0 items-center gap-3">
        {onToggleSidebar && (
          <button
            type="button"
            onClick={onToggleSidebar}
            aria-label={sidebarOpen ? "Hide sidebar" : "Show sidebar"}
            aria-expanded={sidebarOpen}
            className="hidden h-8 w-8 shrink-0 items-center justify-center rounded-md text-on-surface-variant transition-colors hover:bg-white/[0.04] hover:text-on-surface lg:inline-flex"
          >
            {sidebarOpen ? (
              <PanelLeftClose className="h-3.5 w-3.5" />
            ) : (
              <PanelLeftOpen className="h-3.5 w-3.5" />
            )}
          </button>
        )}

        <NavLink to="/" className={cn("flex items-center", sidebarOpen ? "lg:hidden" : "")}>
          <Logo size="sm" />
        </NavLink>

        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="text-[10.5px] font-medium uppercase tracking-[0.08em] text-[#52525B]">
            {page.crumb}
          </span>
          <div className="flex items-center gap-3">
            <h1 className="text-[16px] font-semibold tracking-tight text-on-surface">
              {page.title}
            </h1>
            <span className="hidden text-[12.5px] text-on-surface-muted md:inline">
              · {page.description}
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label="Refresh"
          className="flex h-8 w-8 items-center justify-center rounded-md text-on-surface-variant hover:bg-white/[0.04] hover:text-on-surface"
        >
          <RefreshCw className="h-3.5 w-3.5" />
        </button>
        <AutoSignIndicator />
        <BridgePill />
        <button
          type="button"
          aria-label="Notifications"
          className="relative flex h-8 w-8 items-center justify-center rounded-md text-on-surface-variant hover:bg-white/[0.04] hover:text-on-surface"
        >
          <Bell className="h-3.5 w-3.5" />
          <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-[#3B82F6]" />
        </button>
        <WalletPill />
      </div>
    </header>
  );
}
