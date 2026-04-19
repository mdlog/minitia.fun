import { matchPath, NavLink, useLocation } from "react-router-dom";
import { Bell, PanelLeftClose, PanelLeftOpen, Search, Sparkles } from "lucide-react";
import { Chip } from "@/components/ui/Chip";
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
      section: "Trading Desk",
      title: `${symbol} Market`,
      description:
        "Follow price action, monitor market depth, and execute with clearer controls.",
      badge: "Liquidity Live",
    };
  }

  const graduationMatch = matchPath("/graduation/:symbol", pathname);
  if (graduationMatch) {
    const symbol = graduationMatch.params.symbol?.toUpperCase() ?? "MOVE";
    return {
      section: "Graduation",
      title: `${symbol} Promotion`,
      description:
        "Review launch performance, migration readiness, and the next expansion path.",
      badge: "Milestone Ready",
    };
  }

  if (pathname === "/launchpad") {
    return {
      section: "Launch Operations",
      title: "Launchpad Studio",
      description:
        "Shape the token story, metadata, and go-live experience before publishing.",
      badge: "Drafting Flow",
    };
  }

  if (pathname === "/airdrops") {
    return {
      section: "Creator Rewards",
      title: "Claim Center",
      description:
        "Trading fees from your bonding-curve pools accumulate here. Drain any time.",
      badge: "Pool Fees",
    };
  }

  if (pathname === "/explorer") {
    return {
      section: "Observability",
      title: "Explorer Console",
      description:
        "Monitor recent blocks, Move executions, and the health of the live Minitia appchain.",
      badge: "Chain Live",
    };
  }

  const userMatch = matchPath("/u/:address", pathname);
  if (userMatch) {
    return {
      section: "Identity",
      title: "Wallet Profile",
      description:
        "Review a creator's launches, trading footprint, and recent on-chain activity in one view.",
      badge: "Activity Lens",
    };
  }

  return {
    section: "Overview",
    title: "Discovery Console",
    description:
      "A more focused front page for trending launches, network health, and market pulse.",
    badge: "Protocol Stable",
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
    <header className="sticky top-3 z-40">
      <div className="rounded-[28px] glass px-4 py-4 ghost-border shadow-ambient md:px-5">
        <div className="flex flex-col gap-4 2xl:flex-row 2xl:items-center 2xl:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            {onToggleSidebar && (
              <button
                type="button"
                onClick={onToggleSidebar}
                aria-label={sidebarOpen ? "Hide sidebar" : "Show sidebar"}
                aria-expanded={sidebarOpen}
                className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/[0.05] text-on-surface-variant snappy transition-colors hover:bg-white/[0.08] hover:text-on-surface ghost-border lg:inline-flex"
              >
                {sidebarOpen ? (
                  <PanelLeftClose className="h-4 w-4" />
                ) : (
                  <PanelLeftOpen className="h-4 w-4" />
                )}
              </button>
            )}

            <NavLink to="/" className={cn("flex items-center", sidebarOpen ? "lg:hidden" : "")}>
              <Logo showSub={false} size="sm" />
            </NavLink>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[0.68rem] font-mono uppercase tracking-[0.24em] text-editorial">
                  {page.section}
                </span>
                <Chip tone="info" dense leading={<Sparkles className="h-3 w-3" />}>
                  {page.badge}
                </Chip>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-3 md:gap-4">
                <h1 className="text-headline-sm font-display tracking-tight text-on-surface md:text-headline-md">
                  {page.title}
                </h1>
                <span className="hidden h-1.5 w-1.5 rounded-full bg-secondary md:inline-flex" />
                <p className="hidden max-w-2xl text-body-sm leading-relaxed text-on-surface-variant md:block">
                  {page.description}
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center lg:justify-end 2xl:flex-nowrap">
            <div className="hidden 2xl:flex 2xl:min-w-[360px]">
              <label className="relative block w-full">
                <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface-muted" />
                <input
                  type="search"
                  placeholder="Search tokens, launchpads, or Initia addresses"
                  className={cn(
                    "w-full rounded-2xl bg-white/[0.05] py-3 pl-11 pr-16 text-body-sm text-on-surface outline-none ghost-border",
                    "placeholder:text-on-surface-muted focus-visible:ring-2 focus-visible:ring-primary/30",
                  )}
                />
                <span className="absolute right-3 top-1/2 hidden -translate-y-1/2 rounded-lg bg-white/[0.05] px-2 py-1 text-[0.68rem] font-mono uppercase tracking-[0.16em] text-on-surface-muted 2xl:inline-flex">
                  Cmd K
                </span>
              </label>
            </div>

            <div className="hidden min-w-[200px] rounded-2xl bg-white/[0.05] px-3 py-2.5 text-left ghost-border md:block">
              <span className="text-[0.65rem] font-mono uppercase tracking-[0.2em] text-on-surface-muted">
                Network Pulse
              </span>
              <div className="mt-1 flex items-center justify-between gap-3">
                <span className="text-body-sm text-on-surface">Sequencer stable</span>
                <span className="flex items-center gap-1 text-[0.68rem] font-mono uppercase tracking-[0.18em] text-secondary">
                  <span className="h-2 w-2 rounded-full bg-secondary" />
                  Live
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2">
              <AutoSignIndicator />
              <BridgePill />

              <button
                type="button"
                aria-label="Notifications"
                className="relative flex h-11 w-11 items-center justify-center rounded-2xl bg-white/[0.05] text-on-surface-variant snappy transition-colors hover:bg-white/[0.08] hover:text-on-surface ghost-border"
              >
                <Bell className="h-4 w-4" />
                <span className="absolute right-3 top-3 h-2 w-2 rounded-full bg-tertiary" />
              </button>

              <WalletPill />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
