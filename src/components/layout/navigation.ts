import type { LucideIcon } from "lucide-react";
import { ArrowLeftRight, Compass, Gift, Rocket, Search, Trophy } from "lucide-react";

export interface NavItem {
  to: string;
  label: string;
  shortLabel: string;
  description: string;
  icon: LucideIcon;
  activePrefix: string;
  end?: boolean;
}

export const primaryNav: NavItem[] = [
  {
    to: "/",
    label: "Discovery",
    shortLabel: "Discover",
    description: "Track protocol momentum and live launches.",
    icon: Compass,
    activePrefix: "/",
    end: true,
  },
  {
    to: "/launchpad",
    label: "Launchpad",
    shortLabel: "Launch",
    description: "Create, stage, and publish a new token.",
    icon: Rocket,
    activePrefix: "/launchpad",
  },
  {
    to: "/trade/MOVE",
    label: "Trading",
    shortLabel: "Trade",
    description: "Monitor charts, liquidity, and order flow.",
    icon: ArrowLeftRight,
    activePrefix: "/trade",
  },
  {
    to: "/graduation/MOVE",
    label: "Graduation",
    shortLabel: "Graduate",
    description: "Promote breakout communities into their next phase.",
    icon: Trophy,
    activePrefix: "/graduation",
  },
  {
    to: "/airdrops",
    label: "Rewards",
    shortLabel: "Rewards",
    description: "Claim accumulated trading fees on pools you created.",
    icon: Gift,
    activePrefix: "/airdrops",
  },
  {
    to: "/explorer",
    label: "Explorer",
    shortLabel: "Explorer",
    description: "Live blocks and Move transactions on the appchain.",
    icon: Search,
    activePrefix: "/explorer",
  },
];

export function isNavItemActive(item: NavItem, pathname: string) {
  if (item.end) {
    return pathname === item.to;
  }

  return pathname === item.activePrefix || pathname.startsWith(`${item.activePrefix}/`);
}
