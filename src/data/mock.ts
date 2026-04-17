export type TrendingToken = {
  symbol: string;
  name: string;
  price: number;
  change24h: number;
  graduation: number;
  status: "graduated" | "active" | "hot";
  primaryAction: { label: string; tone: "primary" | "hyperglow" | "secondary" };
};

export const trendingTokens: TrendingToken[] = [
  {
    symbol: "MOVE",
    name: "Move.net",
    price: 0.000142,
    change24h: 12.4,
    graduation: 76,
    status: "active",
    primaryAction: { label: "Buy $MOVE", tone: "primary" },
  },
  {
    symbol: "MEOW",
    name: "Init.cat",
    price: 0.000088,
    change24h: 4.1,
    graduation: 52,
    status: "hot",
    primaryAction: { label: "Buy $MEOW", tone: "primary" },
  },
  {
    symbol: "VOID",
    name: "Voidsys",
    price: 0.000242,
    change24h: -3.2,
    graduation: 100,
    status: "graduated",
    primaryAction: { label: "Ape In", tone: "hyperglow" },
  },
];

export const marketStats = {
  totalVolume: 420_069,
  launchesToday: 156,
  volumeSeries: [14, 18, 12, 26, 42, 31, 55, 38, 48, 60, 72, 58],
};

export const networkStatus = {
  tpsSpeed: 1_482,
  avgGas: 0.0001,
  nodesOnline: 12_842,
};

// Trade page — candle data
export type Candle = { open: number; close: number; high: number; low: number };

export const moveCandles: Candle[] = [
  { open: 0.00045, close: 0.00048, high: 0.00051, low: 0.00044 },
  { open: 0.00048, close: 0.00046, high: 0.0005, low: 0.00043 },
  { open: 0.00046, close: 0.00052, high: 0.00055, low: 0.00045 },
  { open: 0.00052, close: 0.00049, high: 0.00054, low: 0.00047 },
  { open: 0.00049, close: 0.00056, high: 0.00059, low: 0.00048 },
  { open: 0.00056, close: 0.00054, high: 0.00058, low: 0.00051 },
  { open: 0.00054, close: 0.00061, high: 0.00064, low: 0.00053 },
  { open: 0.00061, close: 0.00058, high: 0.00063, low: 0.00056 },
  { open: 0.00058, close: 0.00065, high: 0.00068, low: 0.00057 },
  { open: 0.00065, close: 0.00063, high: 0.00067, low: 0.0006 },
  { open: 0.00063, close: 0.00062, high: 0.00066, low: 0.00059 },
  { open: 0.00062, close: 0.00068, high: 0.0007, low: 0.00061 },
  { open: 0.00068, close: 0.00072, high: 0.00074, low: 0.00066 },
  { open: 0.00072, close: 0.00069, high: 0.00073, low: 0.00067 },
  { open: 0.00069, close: 0.00076, high: 0.00078, low: 0.00068 },
  { open: 0.00076, close: 0.00074, high: 0.00077, low: 0.00072 },
  { open: 0.00074, close: 0.00082, high: 0.00084, low: 0.00073 },
  { open: 0.00082, close: 0.00079, high: 0.00083, low: 0.00077 },
  { open: 0.00079, close: 0.000862, high: 0.00089, low: 0.00078 },
  { open: 0.000862, close: 0.00085, high: 0.00088, low: 0.00083 },
  { open: 0.00085, close: 0.00094, high: 0.00096, low: 0.00084 },
  { open: 0.00094, close: 0.00098, high: 0.001, low: 0.00092 },
];

export type ActivityRow = {
  user: string;
  type: "Buy" | "Sell";
  amount: number;
  value: number;
  time: string;
};

export const recentActivity: ActivityRow[] = [
  { user: "init1...8f2a", type: "Buy", amount: 48_210, value: 29.8, time: "12s" },
  { user: "init1...b43c", type: "Sell", amount: 12_050, value: 7.45, time: "34s" },
  { user: "init1...c90d", type: "Buy", amount: 126_900, value: 78.5, time: "1m" },
  { user: "init1...f11e", type: "Buy", amount: 7_420, value: 4.6, time: "2m" },
  { user: "init1...7d02", type: "Sell", amount: 31_800, value: 19.7, time: "3m" },
];

// Airdrop mock
export type Airdrop = { token: string; amount: number; claimable: boolean; ends: string };
export const airdrops: Airdrop[] = [
  { token: "MOVE", amount: 1_250, claimable: true, ends: "2d 14h" },
  { token: "MEOW", amount: 480, claimable: true, ends: "5d 02h" },
  { token: "VOID", amount: 320, claimable: false, ends: "Claimed" },
];
