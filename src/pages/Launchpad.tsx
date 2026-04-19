import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, ExternalLink, Globe, ImagePlus, Loader2, Rocket, Wallet } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { Input } from "@/components/ui/Input";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Textarea } from "@/components/ui/Textarea";
import { useInitiaAccount } from "@/hooks/useInitiaAccount";
import { useRollupLaunchToken, type LaunchTokenResult } from "@/hooks/useRollupLaunchToken";
import { APPCHAIN, APPCHAIN_RPC_AVAILABLE } from "@/lib/initia";

const DRAFT_KEY = "minitia.launchpad_draft.v1";

interface Draft {
  name: string;
  ticker: string;
  desc: string;
}

function loadDraft(): Draft {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return { name: "", ticker: "", desc: "" };
    const parsed = JSON.parse(raw);
    return {
      name: typeof parsed.name === "string" ? parsed.name : "",
      ticker: typeof parsed.ticker === "string" ? parsed.ticker : "",
      desc: typeof parsed.desc === "string" ? parsed.desc : "",
    };
  } catch {
    return { name: "", ticker: "", desc: "" };
  }
}

export default function Launchpad() {
  const { isConnected, openConnect } = useInitiaAccount();
  const { launch, isPending } = useRollupLaunchToken();
  const initial = useMemo(loadDraft, []);
  const [name, setName] = useState(initial.name);
  const [ticker, setTicker] = useState(initial.ticker);
  const [desc, setDesc] = useState(initial.desc);
  const [lastResult, setLastResult] = useState<LaunchTokenResult | null>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify({ name, ticker, desc }));
      } catch {
        /* ignore */
      }
    }, 400);
    return () => clearTimeout(t);
  }, [name, ticker, desc]);

  const onDeploy = async () => {
    const result = await launch({ name, ticker, description: desc });
    if (result) {
      setLastResult(result);
      try {
        localStorage.removeItem(DRAFT_KEY);
      } catch {
        /* ignore */
      }
      setName("");
      setTicker("");
      setDesc("");
    }
  };

  const readiness = useMemo(() => {
    const score = [name.length >= 3, ticker.length >= 2, desc.length >= 20].filter(Boolean).length;
    return Math.min(98, 38 + score * 22);
  }, [name, ticker, desc]);

  const subdomain = (ticker.trim() || "ticker").toLowerCase();
  const readinessLabel = readiness >= 80 ? "Ready" : "Draft";

  const checklist = [
    { label: "Name", done: name.length >= 3 },
    { label: "Ticker", done: ticker.length >= 2 },
    { label: "Description", done: desc.length >= 20 },
  ];

  return (
    <div className="flex flex-col gap-8 pb-6">
      <section className="flex flex-col gap-3 max-w-2xl">
        <div className="flex items-center gap-3 font-mono text-[0.62rem] uppercase tracking-[0.3em] text-editorial">
          <span>§ launchpad</span>
          <span className="h-px flex-1 hairline" />
        </div>
        <h1 className="text-[clamp(2.5rem,6vw,4.5rem)] leading-[0.98] text-editorial-ink">
          <span className="font-editorial italic">Launch</span>{" "}
          <span className="font-display font-medium tracking-tight">your token</span>
          <span className="text-editorial">.</span>
        </h1>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Card tier="base" padded="lg" className="flex flex-col gap-6">
          <div className="grid gap-5 lg:grid-cols-[220px_minmax(0,1fr)]">
            <button
              type="button"
              className="group flex aspect-square w-full items-center justify-center rounded-[24px] border border-dashed border-white/12 bg-white/[0.03] snappy transition-all duration-200 hover:border-primary/40 hover:bg-white/[0.05]"
            >
              <div className="flex flex-col items-center gap-2 text-on-surface-muted group-hover:text-on-surface">
                <ImagePlus className="h-10 w-10" />
                <span className="text-body-sm">Logo</span>
              </div>
            </button>

            <div className="flex flex-col gap-5">
              <div className="grid gap-5 md:grid-cols-2">
                <Input
                  label="Name"
                  name="token-name"
                  placeholder="HyperDrive"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                />
                <Input
                  label="Ticker"
                  name="ticker"
                  placeholder="DRIVE"
                  leading={<span className="font-mono text-on-surface-variant">$</span>}
                  value={ticker}
                  onChange={(event) => setTicker(event.target.value.toUpperCase().slice(0, 8))}
                />
              </div>

              <Textarea
                label="Description"
                name="description"
                placeholder="What is this token and why does it matter?"
                value={desc}
                onChange={(event) => setDesc(event.target.value)}
                hint={`${desc.length}/180`}
              />
            </div>
          </div>

          <div className="rounded-[22px] surface-nested px-4 py-4 ghost-border flex flex-wrap items-center gap-3">
            <Globe className="h-4 w-4 text-on-surface-variant" />
            <span className="text-body-sm text-on-surface-variant">Subdomain</span>
            <span className="ml-auto text-body-md font-mono font-semibold text-gradient-sovereign">
              {subdomain}.fun.init
            </span>
          </div>
        </Card>

        <div className="flex flex-col gap-6 xl:sticky xl:top-28 xl:self-start">
          <Card tier="high" padded="lg" className="flex flex-col gap-5">
            <div className="flex items-center justify-between gap-4">
              <span className="text-[0.68rem] font-mono uppercase tracking-[0.22em] text-secondary">
                Preview
              </span>
              <Chip tone={readiness >= 80 ? "success" : "warning"}>{readinessLabel}</Chip>
            </div>

            <div className="rounded-[24px] bg-white/[0.03] px-5 py-5">
              <div className="flex items-center gap-4">
                <Avatar symbol={ticker || "?"} size="lg" />
                <div className="min-w-0">
                  <div className="truncate text-title-lg font-display text-on-surface">
                    {name || "Untitled"}
                  </div>
                  <div className="text-body-sm text-on-surface-variant">
                    ${ticker || "TICKER"}
                  </div>
                </div>
              </div>
              {desc && (
                <p className="mt-4 text-body-sm leading-relaxed text-on-surface-variant line-clamp-3">
                  {desc}
                </p>
              )}
            </div>

            <ProgressBar value={readiness} tone="graduation" size="md" showValue />

            <div className="flex flex-wrap gap-2">
              {checklist.map((item) => (
                <span
                  key={item.label}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[0.68rem] font-mono uppercase tracking-[0.18em] ${
                    item.done
                      ? "bg-secondary-container/60 text-secondary"
                      : "bg-white/[0.03] text-on-surface-muted"
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      item.done ? "bg-secondary" : "bg-on-surface-muted"
                    }`}
                  />
                  {item.label}
                </span>
              ))}
            </div>

            {isConnected ? (
              <Button
                variant="hyperglow"
                size="lg"
                leading={
                  isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Rocket className="h-4 w-4" />
                }
                fullWidth
                disabled={readiness < 80 || isPending || !APPCHAIN_RPC_AVAILABLE}
                onClick={onDeploy}
              >
                {isPending
                  ? "Broadcasting…"
                  : APPCHAIN_RPC_AVAILABLE
                    ? "Launch on rollup"
                    : "Rollup RPC not configured"}
              </Button>
            ) : (
              <Button
                variant="primary"
                size="lg"
                leading={<Wallet className="h-4 w-4" />}
                fullWidth
                onClick={openConnect}
              >
                Connect wallet to launch
              </Button>
            )}

            <div className="font-mono text-[0.62rem] uppercase tracking-[0.22em] text-on-surface-muted">
              target: {APPCHAIN.chainId}
            </div>

            {lastResult && (
              <div className="rounded-2xl bg-secondary-container/30 ghost-border px-4 py-4 flex flex-col gap-2">
                <div className="flex items-center gap-2 text-secondary">
                  <CheckCircle2 className="h-4 w-4" />
                  <span className="font-mono text-[0.62rem] uppercase tracking-[0.22em]">
                    Launched · height {lastResult.height}
                  </span>
                </div>
                <div className="font-editorial italic text-title-md text-editorial-ink break-all">
                  {lastResult.subdomain}
                </div>
                <a
                  href={lastResult.explorerUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 font-mono text-[0.62rem] uppercase tracking-[0.22em] text-secondary hover:text-editorial-ink snappy break-all"
                >
                  0x{lastResult.txHash.slice(0, 12)}…{lastResult.txHash.slice(-8)}
                  <ExternalLink className="h-3 w-3 shrink-0" />
                </a>
              </div>
            )}
          </Card>
        </div>
      </section>
    </div>
  );
}
