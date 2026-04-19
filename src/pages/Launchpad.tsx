import { useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, Droplet, ExternalLink, Globe, ImagePlus, Loader2, Rocket, Trash2, Wallet } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { Input } from "@/components/ui/Input";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Textarea } from "@/components/ui/Textarea";
import { useAppchainBalance } from "@/hooks/useAppchainBalance";
import { useAppchainFaucet } from "@/hooks/useAppchainFaucet";
import { useInitiaAccount } from "@/hooks/useInitiaAccount";
import { useRollupLaunchToken, type LaunchTokenResult } from "@/hooks/useRollupLaunchToken";
import {
  APPCHAIN,
  APPCHAIN_FAUCET_AVAILABLE,
  APPCHAIN_RPC_AVAILABLE,
} from "@/lib/initia";

const DRAFT_KEY = "minitia.launchpad_draft.v1";
const MAX_LOGO_BYTES = 2 * 1024 * 1024; // 2 MB

interface Draft {
  name: string;
  ticker: string;
  desc: string;
  logo: string;
}

function loadDraft(): Draft {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return { name: "", ticker: "", desc: "", logo: "" };
    const parsed = JSON.parse(raw);
    return {
      name: typeof parsed.name === "string" ? parsed.name : "",
      ticker: typeof parsed.ticker === "string" ? parsed.ticker : "",
      desc: typeof parsed.desc === "string" ? parsed.desc : "",
      logo: typeof parsed.logo === "string" ? parsed.logo : "",
    };
  } catch {
    return { name: "", ticker: "", desc: "", logo: "" };
  }
}

export default function Launchpad() {
  const { isConnected, openConnect, initiaAddress } = useInitiaAccount();
  const { launch, isPending } = useRollupLaunchToken();
  const balanceQuery = useAppchainBalance(initiaAddress);
  const { drip, isPending: isDripping } = useAppchainFaucet();
  const initial = useMemo(loadDraft, []);
  const [name, setName] = useState(initial.name);
  const [ticker, setTicker] = useState(initial.ticker);
  const [desc, setDesc] = useState(initial.desc);
  const [logo, setLogo] = useState<string>(initial.logo);
  const [logoError, setLogoError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<LaunchTokenResult | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify({ name, ticker, desc, logo }));
      } catch {
        /* ignore */
      }
    }, 400);
    return () => clearTimeout(t);
  }, [name, ticker, desc, logo]);

  const onPickLogo = () => {
    setLogoError(null);
    fileRef.current?.click();
  };

  const onLogoFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-picking same file later
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setLogoError("Only PNG, JPG, SVG, or WebP are supported.");
      return;
    }
    if (file.size > MAX_LOGO_BYTES) {
      setLogoError("Max 2 MB.");
      return;
    }
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result ?? ""));
      reader.onerror = () => reject(reader.error ?? new Error("read failed"));
      reader.readAsDataURL(file);
    });
    setLogo(dataUrl);
  };

  const clearLogo = () => {
    setLogo("");
    setLogoError(null);
  };

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
      setLogo("");
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
    <div className="page-shell">
      <section className="page-hero px-6 py-8 md:px-8 md:py-9">
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px] xl:items-end">
          <div className="max-w-3xl">
            <div className="flex items-center gap-3 font-mono text-[0.62rem] uppercase tracking-[0.3em] text-editorial">
              <span>§ launchpad</span>
              <span className="h-px flex-1 hairline" />
            </div>
            <h1 className="mt-3 text-[clamp(2.5rem,6vw,4.5rem)] leading-[0.98] text-editorial-ink">
              <span className="font-editorial italic">Launch</span>{" "}
              <span className="font-display font-medium tracking-tight">your token</span>
              <span className="text-editorial">.</span>
            </h1>
            <p className="mt-4 max-w-2xl text-body-lg leading-[1.6] text-on-surface-variant">
              Prepare metadata, stage the visual identity, and publish to the Minitia rollup from a calmer, more structured studio flow.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
            <div className="metric-card px-5 py-4">
              <span className="text-[0.62rem] font-mono uppercase tracking-[0.24em] text-on-surface-muted">
                draft readiness
              </span>
              <div className="mt-2 flex items-end justify-between gap-3">
                <span className="font-editorial italic text-[2.35rem] leading-none text-editorial-ink">
                  {readiness}%
                </span>
                <Chip tone={readiness >= 80 ? "success" : "warning"} dense>
                  {readinessLabel}
                </Chip>
              </div>
            </div>

            <div className="metric-card px-5 py-4">
              <span className="text-[0.62rem] font-mono uppercase tracking-[0.24em] text-on-surface-muted">
                launch target
              </span>
              <div className="mt-2 text-body-md text-on-surface">
                {APPCHAIN.chainId}
              </div>
              <div className="mt-1 font-mono text-[0.62rem] uppercase tracking-[0.2em] text-on-surface-muted">
                {subdomain}.fun.init
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Card tier="base" padded="lg" className="flex flex-col gap-6">
          <div className="grid gap-5 lg:grid-cols-[220px_minmax(0,1fr)]">
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={onPickLogo}
                aria-label={logo ? "Replace logo" : "Upload logo"}
                className="group relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-[24px] border border-dashed border-white/12 bg-white/[0.03] snappy transition-all duration-200 hover:border-primary/40 hover:bg-white/[0.05]"
              >
                {logo ? (
                  <>
                    <img
                      src={logo}
                      alt="Token logo"
                      className="h-full w-full object-cover"
                      draggable={false}
                    />
                    <span className="absolute bottom-2 right-2 rounded-full bg-surface/70 px-2 py-1 font-mono text-[0.58rem] uppercase tracking-[0.22em] text-on-surface-variant opacity-0 group-hover:opacity-100 snappy">
                      replace
                    </span>
                  </>
                ) : (
                  <div className="flex flex-col items-center gap-2 text-on-surface-muted group-hover:text-on-surface">
                    <ImagePlus className="h-10 w-10" />
                    <span className="text-body-sm">Logo</span>
                    <span className="text-[0.58rem] font-mono uppercase tracking-[0.22em] text-on-surface-muted">
                      PNG · JPG · SVG · 2 MB max
                    </span>
                  </div>
                )}
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg,image/svg+xml,image/webp"
                onChange={onLogoFile}
                className="hidden"
                aria-hidden
              />
              {logo && (
                <button
                  type="button"
                  onClick={clearLogo}
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-white/[0.03] py-1.5 font-mono text-[0.62rem] uppercase tracking-[0.22em] text-on-surface-variant hover:text-error snappy"
                >
                  <Trash2 className="h-3 w-3" />
                  Remove
                </button>
              )}
              {logoError && (
                <span className="text-body-sm text-error">{logoError}</span>
              )}
            </div>

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
                {logo ? (
                  <img
                    src={logo}
                    alt={`${ticker || "token"} logo`}
                    className="h-14 w-14 shrink-0 rounded-full object-cover ring-1 ring-white/10"
                    draggable={false}
                  />
                ) : (
                  <Avatar symbol={ticker || "?"} size="lg" />
                )}
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

            {/* Faucet + balance status */}
            {isConnected && APPCHAIN_RPC_AVAILABLE && (
              <div className="flex items-center justify-between gap-3 rounded-2xl bg-white/[0.03] px-3 py-2.5">
                <div className="flex flex-col gap-0.5">
                  <span className="font-mono text-[0.58rem] uppercase tracking-[0.22em] text-on-surface-muted">
                    your balance · {APPCHAIN.chainId}
                  </span>
                  <span className="font-editorial italic text-title-md text-editorial-ink">
                    {balanceQuery.data !== undefined
                      ? `${Number(balanceQuery.data) / 1e6} MIN`
                      : "— MIN"}
                  </span>
                </div>
                {APPCHAIN_FAUCET_AVAILABLE && (
                  <button
                    type="button"
                    onClick={async () => {
                      await drip();
                      setTimeout(() => balanceQuery.refetch(), 2_000);
                    }}
                    disabled={isDripping}
                    className="inline-flex items-center gap-1.5 rounded-full bg-secondary-container/70 px-3 py-1.5 font-mono text-[0.62rem] uppercase tracking-[0.2em] text-secondary hover:bg-secondary-container snappy disabled:opacity-50"
                  >
                    {isDripping ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Droplet className="h-3 w-3" />
                    )}
                    {isDripping ? "Dripping…" : "Get 10 MIN"}
                  </button>
                )}
              </div>
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
