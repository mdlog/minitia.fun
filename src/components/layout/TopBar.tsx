import { matchPath, NavLink, useLocation } from "react-router-dom";
import { Bell, Search, Sparkles } from "lucide-react";
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
      section: "Rewards",
      title: "Claim Center",
      description:
        "Track active incentives, consolidate rewards, and avoid missed claims.",
      badge: "Claims Open",
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

export function TopBar() {
  const { pathname } = useLocation();
  const page = getPageMeta(pathname);

  return (
    <header className="sticky top-3 z-40">
      <div className="rounded-2xl glass px-4 py-4 ghost-border shadow-ambient md:px-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <NavLink to="/" className="flex items-center lg:hidden">
              <Logo showSub={false} />
            </NavLink>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[0.68rem] font-mono uppercase tracking-[0.24em] text-on-surface-muted">
                  {page.section}
                </span>
                <Chip tone="info" dense leading={<Sparkles className="h-3 w-3" />}>
                  {page.badge}
                </Chip>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <h1 className="text-headline-sm font-display text-on-surface md:text-headline-md">
                  {page.title}
                </h1>
                <span className="hidden h-1.5 w-1.5 rounded-full bg-secondary md:inline-flex" />
                <p className="hidden max-w-2xl text-body-sm text-on-surface-variant md:block">
                  {page.description}
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
            <div className="hidden xl:flex xl:min-w-[360px]">
              <label className="relative block w-full">
                <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface-muted" />
                <input
                  type="search"
                  placeholder="Search tokens, launchpads, or Initia addresses"
                  className={cn(
                    "w-full rounded-2xl bg-white/[0.04] py-3 pl-11 pr-16 text-body-sm text-on-surface outline-none ghost-border",
                    "placeholder:text-on-surface-muted focus-visible:ring-2 focus-visible:ring-primary/30",
                  )}
                />
                <span className="absolute right-3 top-1/2 hidden -translate-y-1/2 rounded-lg bg-white/[0.04] px-2 py-1 text-[0.68rem] font-mono uppercase tracking-[0.16em] text-on-surface-muted 2xl:inline-flex">
                  Cmd K
                </span>
              </label>
            </div>

            <div className="hidden min-w-[180px] rounded-2xl bg-white/[0.04] px-3 py-2.5 text-left md:block">
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
                className="relative flex h-11 w-11 items-center justify-center rounded-2xl bg-white/[0.04] text-on-surface-variant snappy transition-colors hover:bg-white/[0.06] hover:text-on-surface"
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
