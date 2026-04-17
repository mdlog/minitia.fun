import { useState } from "react";
import { useParams } from "react-router-dom";
import { AlertTriangle, Flame, Loader2, Wallet, Zap } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Stat } from "@/components/ui/Stat";
import { useInitiaAccount } from "@/hooks/useInitiaAccount";
import { useTxAction } from "@/hooks/useTxAction";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import { CandleChart } from "@/components/ui/CandleChart";
import { moveCandles, recentActivity } from "@/data/mock";
import { cn } from "@/lib/cn";
import { formatNumber, formatPercent, formatPrice } from "@/lib/format";

const timeframes = ["5m", "1H", "4H", "1D", "1W"];

export default function Trade() {
  const { symbol = "MOVE" } = useParams();
  const symbolUpper = symbol.toUpperCase();
  const [tf, setTf] = useState("4H");
  const [side, setSide] = useState<"BUY" | "SELL">("BUY");
  const [amount, setAmount] = useState("1.0");
  const [slippage, setSlippage] = useState(1.5);
  const [degen, setDegen] = useState(true);

  const price = 0.000862;
  const change = 12.4;
  const graduation = 76;

  return (
    <div className="flex flex-col gap-8 pb-6">
      {/* Token header — single line */}
      <section className="flex flex-wrap items-center gap-5">
        <Avatar symbol={symbolUpper} size="xl" />
        <div className="min-w-0 flex-1">
          <h1 className="flex items-baseline gap-3 text-[clamp(2rem,4.5vw,3.25rem)] leading-[0.95] text-editorial-ink">
            <span className="font-editorial italic text-editorial">{symbolUpper.toLowerCase()}</span>
            <span className="font-mono text-title-md font-normal text-on-surface-variant">
              / Movement
            </span>
          </h1>
          <p className="mt-1.5 font-mono text-body-sm text-on-surface-muted tracking-wide">
            init1q4...df72
          </p>
        </div>
        <div className="flex min-w-[240px] flex-col items-end gap-2">
          <ProgressBar value={graduation} tone="graduation" size="sm" />
          <span className="font-mono text-[0.62rem] uppercase tracking-[0.22em] text-on-surface-muted">
            {graduation}% to graduation
          </span>
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <Card tier="base" padded="md" className="flex flex-col gap-5">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="flex flex-wrap items-end gap-6">
              <div>
                <div className="text-[0.68rem] font-mono uppercase tracking-[0.22em] text-on-surface-muted">
                  Price
                </div>
                <div className="mt-2 text-display-sm font-display font-mono text-on-surface">
                  {formatPrice(price)}
                  <span className="ml-2 text-title-md text-on-surface-variant">INIT</span>
                </div>
              </div>
              <div>
                <div className="text-[0.68rem] font-mono uppercase tracking-[0.22em] text-on-surface-muted">
                  24h Change
                </div>
                <div className={cn("mt-2 text-headline-sm font-display font-mono", change >= 0 ? "text-secondary" : "text-error")}>
                  {formatPercent(change)}
                </div>
              </div>
            </div>

            <div className="flex gap-1 rounded-2xl bg-white/[0.04] p-1.5 ghost-border">
              {timeframes.map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setTf(value)}
                  className={cn(
                    "rounded-xl px-3 py-1.5 text-label-md uppercase font-mono snappy transition-all duration-200",
                    tf === value
                      ? "bg-gradient-primary text-primary-on shadow-[0_14px_22px_rgba(132,85,239,0.26)]"
                      : "text-on-surface-variant hover:bg-white/[0.04] hover:text-on-surface",
                  )}
                >
                  {value}
                </button>
              ))}
            </div>
          </div>

          <CandleChart data={moveCandles} height={360} />
        </Card>

        <Card tier="base" padded="md" className="h-fit">
          <Tabs value={side} onValueChange={(nextValue) => setSide(nextValue as "BUY" | "SELL")}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="BUY">Buy</TabsTrigger>
              <TabsTrigger value="SELL">Sell</TabsTrigger>
            </TabsList>

            <TabsContent value="BUY" className="mt-5">
              <OrderForm
                side="BUY"
                amount={amount}
                setAmount={setAmount}
                slippage={slippage}
                setSlippage={setSlippage}
                degen={degen}
                setDegen={setDegen}
                symbol={symbolUpper}
              />
            </TabsContent>

            <TabsContent value="SELL" className="mt-5">
              <OrderForm
                side="SELL"
                amount={amount}
                setAmount={setAmount}
                slippage={slippage}
                setSlippage={setSlippage}
                degen={degen}
                setDegen={setDegen}
                symbol={symbolUpper}
              />
            </TabsContent>
          </Tabs>
        </Card>
      </section>

      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <Card padded="md">
          <Stat label="Market cap" value="$1,420,931" emphasis="headline" />
        </Card>
        <Card padded="md">
          <Stat label="Liquidity" value="42.4k INIT" emphasis="headline" />
        </Card>
        <Card padded="md">
          <Stat label="Holders" value="1,842" emphasis="headline" sub="+64 today" trend="up" />
        </Card>
        <Card padded="md">
          <Stat label="Top 10 share" value="35.42%" emphasis="headline" />
        </Card>
      </section>

      <section className="flex flex-col gap-4">
        <div className="flex items-end gap-4">
          <span className="font-mono text-[0.62rem] uppercase tracking-[0.3em] text-editorial">
            § tape
          </span>
          <h2 className="text-[clamp(1.5rem,3vw,2.25rem)] font-editorial italic leading-[1] text-editorial-ink">
            Recent activity
          </h2>
        </div>
        <div className="h-px hairline" />
        <Card tier="base" padded="sm">
          <div className="overflow-x-auto">
            <table className="min-w-full text-body-md">
              <thead>
                <tr className="text-left text-[0.68rem] font-mono uppercase tracking-[0.2em] text-on-surface-muted">
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Side</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                  <th className="px-4 py-3 text-right">Value (INIT)</th>
                  <th className="px-4 py-3 text-right">Time</th>
                </tr>
              </thead>
              <tbody>
                {recentActivity.map((activity) => (
                  <tr key={`${activity.user}-${activity.time}`} className="rounded-2xl text-on-surface hover:bg-white/[0.03]">
                    <td className="px-4 py-3 font-mono text-on-surface-variant">{activity.user}</td>
                    <td className="px-4 py-3">
                      <Chip tone={activity.type === "Buy" ? "success" : "danger"} dense>
                        {activity.type}
                      </Chip>
                    </td>
                    <td className="px-4 py-3 text-right font-mono">{formatNumber(activity.amount)}</td>
                    <td className="px-4 py-3 text-right font-mono">{activity.value.toFixed(2)}</td>
                    <td className="px-4 py-3 text-right font-mono text-on-surface-muted">
                      {activity.time}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </section>
    </div>
  );
}

function OrderForm({
  side,
  amount,
  setAmount,
  slippage,
  setSlippage,
  degen,
  setDegen,
  symbol,
}: {
  side: "BUY" | "SELL";
  amount: string;
  setAmount: (value: string) => void;
  slippage: number;
  setSlippage: (value: number) => void;
  degen: boolean;
  setDegen: (value: boolean) => void;
  symbol: string;
}) {
  const quotePrice = 0.000862;
  const availableBalance = side === "BUY" ? 12.4 : 24850;
  const received = parseFloat(amount || "0") / quotePrice;

  const applyPreset = (preset: "25%" | "50%" | "MAX") => {
    const multiplier = preset === "25%" ? 0.25 : preset === "50%" ? 0.5 : 1;
    const digits = side === "BUY" ? 2 : 0;
    setAmount((availableBalance * multiplier).toFixed(digits));
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-4">
          <span className="text-[0.68rem] font-mono uppercase tracking-[0.22em] text-on-surface-variant">
            Amount {side === "BUY" ? "(INIT)" : `(${symbol})`}
          </span>
          <span className="text-body-sm font-mono text-on-surface-muted">
            Balance: {formatNumber(availableBalance, side === "BUY" ? 2 : 0)}{" "}
            {side === "BUY" ? "INIT" : symbol}
          </span>
        </div>

        <div className="rounded-[22px] surface-nested px-4 py-4 ghost-border">
          <div className="flex items-start justify-between gap-3">
            <input
              type="number"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              className="w-full bg-transparent text-title-lg font-mono text-on-surface outline-none placeholder:text-on-surface-muted"
              placeholder="0.00"
            />
            <div className="flex gap-1.5">
              {(["25%", "50%", "MAX"] as const).map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => applyPreset(preset)}
                  className="rounded-lg bg-white/[0.05] px-2 py-1 text-[0.65rem] font-mono uppercase tracking-[0.16em] text-on-surface-variant snappy transition-colors hover:text-on-surface"
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-4">
        <span className="text-[0.68rem] font-mono uppercase tracking-[0.22em] text-on-surface-variant">
          Slippage Tolerance
        </span>
        <div className="flex gap-1">
          {[0.5, 1, 1.5, 3].map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setSlippage(value)}
              aria-pressed={slippage === value}
              className={cn(
                "rounded-lg px-2.5 py-1.5 text-label-sm font-mono snappy transition-all duration-200",
                slippage === value
                  ? "bg-gradient-primary text-primary-on shadow-[0_12px_20px_rgba(132,85,239,0.24)]"
                  : "bg-white/[0.04] text-on-surface-variant hover:text-on-surface",
              )}
            >
              {value}%
            </button>
          ))}
        </div>
      </div>

      <button
        type="button"
        onClick={() => setDegen(!degen)}
        className={cn(
          "flex items-center justify-between rounded-[20px] px-4 py-3 snappy transition-all duration-200",
          degen ? "bg-tertiary-container/40 ghost-border" : "bg-white/[0.03]",
        )}
      >
        <span className="flex items-center gap-3">
          <Flame className={cn("h-4 w-4", degen ? "text-tertiary" : "text-on-surface-muted")} />
          <span className="text-[0.68rem] font-mono uppercase tracking-[0.22em] text-on-surface">
            Degen Mode
          </span>
        </span>
        <span
          className={cn(
            "relative h-5 w-10 rounded-full transition-colors duration-200",
            degen ? "bg-tertiary" : "bg-surface-container-highest",
          )}
        >
          <span
            className={cn(
              "absolute top-0.5 h-4 w-4 rounded-full bg-surface transition-all duration-200",
              degen ? "left-[1.15rem]" : "left-0.5",
            )}
          />
        </span>
      </button>

      <div className="grid gap-3 rounded-[20px] surface-nested px-4 py-4 ghost-border text-body-sm text-on-surface-variant">
        <div className="flex justify-between gap-4">
          <span>Rate</span>
          <span className="font-mono text-on-surface">
            1 INIT ≈ {(1 / quotePrice).toFixed(0)} {symbol}
          </span>
        </div>
        <div className="flex justify-between gap-4">
          <span>Minimum received</span>
          <span className="font-mono text-on-surface">
            {(received * (1 - slippage / 100)).toFixed(2)} {side === "BUY" ? symbol : "INIT"}
          </span>
        </div>
        <div className="flex justify-between gap-4">
          <span>Trade fee (0.5%)</span>
          <span className="font-mono text-on-surface">
            {(parseFloat(amount || "0") * 0.005).toFixed(4)} INIT
          </span>
        </div>
        <div className="flex justify-between gap-4">
          <span>Network fee</span>
          <span className="font-mono text-on-surface">~0.0001 INIT</span>
        </div>
        <div className="mt-1 flex items-center justify-between gap-4 border-t border-editorial/15 pt-3">
          <span className="flex items-center gap-1.5 text-[0.65rem] font-mono uppercase tracking-[0.22em] text-secondary">
            <Zap className="h-3 w-3" /> Auto-signed
          </span>
          <span className="font-editorial italic text-editorial">&lt; 1s execution</span>
        </div>
      </div>

      <TradeCtaButton side={side} amount={amount} symbol={symbol} />

      <span className="text-center text-[0.68rem] font-mono uppercase tracking-[0.2em] text-on-surface-muted">
        Session keys enabled · no popups · ≤ 100ms blocks
      </span>
    </div>
  );
}

function TradeCtaButton({
  side,
  amount,
  symbol,
}: {
  side: "BUY" | "SELL";
  amount: string;
  symbol: string;
}) {
  const { isConnected, openConnect } = useInitiaAccount();
  const { execute, isPending } = useTxAction();

  if (!isConnected) {
    return (
      <Button
        variant="primary"
        size="lg"
        fullWidth
        leading={<Wallet className="h-4 w-4" />}
        onClick={openConnect}
      >
        Connect wallet
      </Button>
    );
  }

  const run = () =>
    execute({
      kind: side === "BUY" ? "buy" : "sell",
      summary: `${side === "BUY" ? "Buy" : "Sell"} $${symbol}`,
      memoAction: side === "BUY" ? "curve_buy" : "curve_sell",
      metadata: {
        symbol,
        amount: parseFloat(amount || "0"),
        side: side.toLowerCase(),
      },
    });

  return (
    <Button
      variant={side === "BUY" ? "primary" : "danger"}
      size="lg"
      fullWidth
      disabled={isPending || parseFloat(amount || "0") <= 0}
      leading={
        isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : side === "SELL" ? (
          <AlertTriangle className="h-4 w-4" />
        ) : (
          <Zap className="h-4 w-4" />
        )
      }
      onClick={run}
    >
      {isPending
        ? "Broadcasting…"
        : side === "BUY"
          ? `Buy $${symbol} — one-click`
          : `Sell $${symbol}`}
    </Button>
  );
}
