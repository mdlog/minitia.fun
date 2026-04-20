import { useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  CheckCircle2,
  Droplet,
  ExternalLink,
  ImagePlus,
  Loader2,
  Rocket,
  Trash2,
  Wallet,
} from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { Input } from "@/components/ui/Input";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Textarea } from "@/components/ui/Textarea";
import { useAppchainBalance } from "@/hooks/useAppchainBalance";
import { useAppchainFaucet } from "@/hooks/useAppchainFaucet";
import { useInitiaAccount } from "@/hooks/useInitiaAccount";
import { useRollupLaunchToken, type LaunchTokenResult } from "@/hooks/useRollupLaunchToken";
import { cn } from "@/lib/cn";
import {
  APPCHAIN,
  APPCHAIN_FAUCET_AVAILABLE,
  APPCHAIN_RPC_AVAILABLE,
} from "@/lib/initia";

const DRAFT_KEY = "minitia.launchpad_draft.v2";
const MAX_LOGO_BYTES = 2 * 1024 * 1024;
const DEFAULT_MAX_SUPPLY = "1000000000";

interface Draft {
  name: string;
  ticker: string;
  desc: string;
  logo: string;
  maxSupply: string;
}

function loadDraft(): Draft {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw)
      return { name: "", ticker: "", desc: "", logo: "", maxSupply: DEFAULT_MAX_SUPPLY };
    const parsed = JSON.parse(raw);
    return {
      name: typeof parsed.name === "string" ? parsed.name : "",
      ticker: typeof parsed.ticker === "string" ? parsed.ticker : "",
      desc: typeof parsed.desc === "string" ? parsed.desc : "",
      logo: typeof parsed.logo === "string" ? parsed.logo : "",
      maxSupply:
        typeof parsed.maxSupply === "string" && parsed.maxSupply.length > 0
          ? parsed.maxSupply
          : DEFAULT_MAX_SUPPLY,
    };
  } catch {
    return { name: "", ticker: "", desc: "", logo: "", maxSupply: DEFAULT_MAX_SUPPLY };
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
  const [maxSupply, setMaxSupply] = useState<string>(initial.maxSupply);
  const [logoError, setLogoError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<LaunchTokenResult | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      try {
        localStorage.setItem(
          DRAFT_KEY,
          JSON.stringify({ name, ticker, desc, logo, maxSupply }),
        );
      } catch {
        /* ignore */
      }
    }, 400);
    return () => clearTimeout(t);
  }, [name, ticker, desc, logo, maxSupply]);

  const onPickLogo = () => {
    setLogoError(null);
    fileRef.current?.click();
  };

  const onLogoFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
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
    const result = await launch({
      name,
      ticker,
      description: desc,
      maxSupply: maxSupply || DEFAULT_MAX_SUPPLY,
    });
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
      setMaxSupply(DEFAULT_MAX_SUPPLY);
    }
  };

  const maxSupplyNum = Number(maxSupply || "0");
  const checks = [
    { key: "name", label: "Token name", ok: name.length >= 3 },
    { key: "ticker", label: "Ticker symbol", ok: ticker.length >= 2 },
    { key: "desc", label: "Description", ok: desc.length >= 20 },
    { key: "supply", label: "Total supply", ok: maxSupplyNum > 0 },
  ];
  const ready = checks.every((c) => c.ok);
  const subdomain = (ticker.trim() || "ticker").toLowerCase();

  return (
    <div className="flex flex-col gap-5 pb-8">
      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <Card padded="lg" className="flex flex-col gap-5">
          <SectionHeader
            title="Token details"
            description="Define the token metadata and bonding-curve configuration."
          />
          <div className="grid gap-4 md:grid-cols-[160px_minmax(0,1fr)]">
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={onPickLogo}
                aria-label={logo ? "Replace logo" : "Upload logo"}
                className="group flex aspect-square w-full items-center justify-center overflow-hidden rounded-lg bg-[#0F0F11] ghost-border transition-colors hover:bg-white/[0.04]"
              >
                {logo ? (
                  <img
                    src={logo}
                    alt="Token logo"
                    className="h-full w-full object-cover"
                    draggable={false}
                  />
                ) : (
                  <div className="flex flex-col items-center gap-1.5 text-[#52525B] group-hover:text-on-surface-variant">
                    <ImagePlus className="h-5 w-5" />
                    <span className="text-[11px]">Upload logo</span>
                    <span className="text-[10px] text-[#3F3F46]">PNG · 512px · 2MB</span>
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
                  className="inline-flex items-center justify-center gap-1 rounded-md py-1 text-[11px] text-on-surface-variant hover:text-error"
                >
                  <Trash2 className="h-3 w-3" />
                  Remove
                </button>
              )}
              {logoError && <span className="text-[11px] text-[#FB7185]">{logoError}</span>}
            </div>

            <div className="grid gap-3">
              <div className="grid gap-3 md:grid-cols-2">
                <Input
                  label="Name"
                  name="token-name"
                  placeholder="HyperDrive"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
                <Input
                  label="Ticker"
                  name="ticker"
                  leading="$"
                  placeholder="DRIVE"
                  value={ticker}
                  onChange={(e) => setTicker(e.target.value.toUpperCase().slice(0, 8))}
                />
              </div>
              <Textarea
                label="Description"
                name="description"
                placeholder="What is this token and why does it matter?"
                value={desc}
                onChange={(e) => setDesc(e.target.value.slice(0, 180))}
                hint={`${desc.length}/180`}
              />
            </div>
          </div>

          <div className="h-px bg-white/[0.05]" />

          <div className="grid gap-3 md:grid-cols-2">
            <Input
              label="Total supply"
              name="max-supply"
              value={maxSupply}
              onChange={(e) => setMaxSupply(e.target.value.replace(/[^0-9]/g, ""))}
              trailing={<span className="font-mono text-[11px]">tokens</span>}
              hint={
                maxSupplyNum > 0
                  ? `${maxSupplyNum.toLocaleString()} tokens · hard cap on circulating supply`
                  : "Must be greater than zero"
              }
            />
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-medium text-on-surface-variant">Subdomain</label>
              <div className="flex items-center rounded-lg bg-[#0F0F11] px-3 py-2.5 ghost-border">
                <ExternalLink className="h-3.5 w-3.5 text-[#52525B]" />
                <span className="ml-2 font-mono text-[13.5px] text-[#60A5FA]">{subdomain}</span>
                <span className="font-mono text-[13.5px] text-on-surface-muted">.fun.init</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-lg bg-[#0A0A0C] px-3 py-2 ghost-border text-[11.5px] text-on-surface-muted">
            <span className="font-medium uppercase tracking-[0.08em]">Launch target</span>
            <span className="font-mono text-on-surface">{APPCHAIN.chainId}</span>
          </div>
        </Card>

        <div className="flex flex-col gap-3">
          <Card padded="md" className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-on-surface-variant">Preview</span>
              <Chip tone={ready ? "success" : "warning"} dot>
                {ready ? "Ready" : "Draft"}
              </Chip>
            </div>
            <div className="flex items-center gap-3 rounded-lg bg-[#0A0A0C] p-4 ghost-border">
              {logo ? (
                <img
                  src={logo}
                  alt={`${ticker || "token"} logo`}
                  className="h-11 w-11 shrink-0 rounded-md object-cover ghost-border"
                  draggable={false}
                />
              ) : (
                <Avatar symbol={ticker || "??"} size="lg" />
              )}
              <div className="min-w-0">
                <div className="truncate text-[14px] font-semibold text-on-surface">
                  {name || "Untitled token"}
                </div>
                <div className="font-mono text-[11px] text-on-surface-muted">
                  ${ticker || "TICKER"}
                </div>
              </div>
            </div>
            {desc && <p className="text-[12.5px] leading-[1.55] text-on-surface-variant">{desc}</p>}

            <div className="flex items-baseline justify-between rounded-md bg-[#0A0A0C] px-3 py-2 ghost-border">
              <span className="text-[11px] font-medium text-on-surface-variant">Total supply</span>
              <span className="font-mono text-[13px] tabular-nums text-on-surface">
                {maxSupplyNum > 0 ? maxSupplyNum.toLocaleString() : "—"}
              </span>
            </div>

            <div className="h-px bg-white/[0.05]" />

            <div className="flex flex-col gap-2">
              {checks.map((c) => (
                <div key={c.key} className="flex items-center gap-2 text-[12px]">
                  <span
                    className={cn(
                      "flex h-3.5 w-3.5 items-center justify-center rounded-full",
                      c.ok ? "bg-[#10B981]/20 text-[#34D399]" : "bg-white/[0.05] text-[#52525B]",
                    )}
                  >
                    <Check className="h-2.5 w-2.5" />
                  </span>
                  <span className={c.ok ? "text-on-surface-variant" : "text-[#52525B]"}>
                    {c.label}
                  </span>
                </div>
              ))}
            </div>

            {isConnected ? (
              <Button
                variant={ready ? "primary" : "neutral"}
                size="lg"
                fullWidth
                disabled={!ready || isPending || !APPCHAIN_RPC_AVAILABLE}
                leading={
                  isPending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Rocket className="h-3.5 w-3.5" />
                  )
                }
                onClick={onDeploy}
              >
                {isPending
                  ? "Broadcasting…"
                  : !APPCHAIN_RPC_AVAILABLE
                    ? "Rollup RPC not configured"
                    : ready
                      ? "Deploy token"
                      : "Complete all fields"}
              </Button>
            ) : (
              <Button
                variant="primary"
                size="lg"
                fullWidth
                leading={<Wallet className="h-3.5 w-3.5" />}
                onClick={openConnect}
              >
                Connect wallet to launch
              </Button>
            )}

            {isConnected && APPCHAIN_RPC_AVAILABLE && (
              <div className="flex items-center justify-between gap-3 rounded-lg bg-[#0A0A0C] px-3 py-2 ghost-border">
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10.5px] font-medium uppercase tracking-[0.08em] text-on-surface-muted">
                    {APPCHAIN.chainId} balance
                  </span>
                  <span className="font-mono text-[14px] tabular-nums text-on-surface">
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
                      setTimeout(() => balanceQuery.refetch(), 2000);
                    }}
                    disabled={isDripping}
                    className="inline-flex items-center gap-1 rounded-md bg-[#10B981]/10 px-2.5 py-1.5 font-mono text-[11px] text-[#34D399] transition-colors hover:bg-[#10B981]/15 disabled:opacity-50"
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

            {lastResult && (
              <div className="flex flex-col gap-2 rounded-lg bg-[#10B981]/10 px-3 py-3 ghost-border">
                <div className="flex items-center gap-2 text-[#34D399]">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span className="text-[11px] font-medium">
                    Launched · height {lastResult.height}
                  </span>
                </div>
                <div className="break-all font-mono text-[12.5px] text-on-surface">
                  {lastResult.subdomain}
                </div>
                <a
                  href={lastResult.explorerUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 break-all font-mono text-[11px] text-[#60A5FA] hover:text-on-surface"
                >
                  0x{lastResult.txHash.slice(0, 12)}…{lastResult.txHash.slice(-8)}
                  <ExternalLink className="h-3 w-3 shrink-0" />
                </a>
              </div>
            )}
          </Card>

          <Card padded="md" className="flex flex-col gap-2">
            <span className="text-[11px] font-medium text-on-surface-variant">Deploy cost</span>
            <div className="flex items-baseline justify-between">
              <span className="font-mono text-[20px] tabular-nums text-on-surface">~0.52</span>
              <span className="font-mono text-[11px] text-on-surface-muted">INIT</span>
            </div>
            <span className="text-[11px] text-[#52525B]">
              Covers deployment, subdomain, and initial curve seed.
            </span>
          </Card>
        </div>
      </section>
    </div>
  );
}
