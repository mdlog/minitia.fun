import { useParams } from "react-router-dom";
import { ArrowRight, Cpu, Flame, Layers, Loader2, Rocket } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { useTxAction } from "@/hooks/useTxAction";

const templates = [
  {
    key: "minimove",
    title: "MiniMove Template",
    tag: "Move-Optimized",
    gradient: "bg-[radial-gradient(circle_at_30%_20%,#8455EF,transparent_60%),radial-gradient(circle_at_80%_70%,#00EEFC,transparent_55%),radial-gradient(circle_at_10%_80%,#FF59E3,transparent_55%)]",
    description:
      "Leverage Move VM's safety and resource-oriented architecture. Perfect for high-throughput DeFi protocols and complex NFT logic.",
    icon: Cpu,
  },
  {
    key: "minievm",
    title: "MiniEVM Template",
    tag: "EVM-Compatible",
    gradient: "bg-[radial-gradient(circle_at_70%_30%,#FF59E3,transparent_60%),radial-gradient(circle_at_20%_80%,#8455EF,transparent_55%),radial-gradient(circle_at_90%_90%,#00EEFC,transparent_55%)]",
    description:
      "Deploy Ethereum compatibility with Initia's throughput. Port your Solidity contracts and tools instantly to your own chain.",
    icon: Layers,
  },
];

export default function Graduation() {
  const { symbol = "MOVE" } = useParams();
  const { execute, isPending } = useTxAction();

  const launch = (runtime: "minimove" | "minievm") =>
    execute({
      kind: "launch",
      summary: `Launch ${runtime} appchain for $${symbol.toUpperCase()}`,
      memoAction: "launch_appchain",
      metadata: { runtime, token: symbol.toUpperCase() },
    });

  return (
    <div className="flex flex-col gap-10">
      {/* Celebration banner */}
      <Card tier="high" padded="lg" className="ghost-border-strong">
        <div className="flex flex-col gap-5">
          <Chip tone="glow" className="self-start animate-pulse-glow" leading={<Flame className="h-3 w-3" />}>
            5,000 INIT Milestone Reached
          </Chip>

          <h1 className="text-[clamp(3rem,8vw,6rem)] leading-[0.95] text-editorial-ink">
            <span className="font-mono text-title-md font-normal text-on-surface-variant">${symbol.toUpperCase()}</span>{" "}
            <span className="font-editorial italic text-editorial">has graduated</span>
            <span className="font-display text-secondary">.</span>
          </h1>

          <p className="text-body-lg text-on-surface-variant max-w-2xl">
            Liquidity migrated to <span className="text-editorial-ink font-medium">InitiaDEX</span>.
            Ready to scale into a sovereign L2 appchain.
          </p>
        </div>
      </Card>

      {/* Deploy Appchain */}
      <section className="flex flex-col gap-6">
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div className="max-w-2xl flex flex-col gap-3">
            <div className="flex items-center gap-3 font-mono text-[0.62rem] uppercase tracking-[0.3em] text-editorial">
              <span>§ runtime</span>
              <span className="h-px flex-1 hairline" />
            </div>
            <h2 className="text-[clamp(1.75rem,3.5vw,2.75rem)] font-editorial italic leading-[1] text-editorial-ink">
              Deploy your appchain
            </h2>
          </div>
          <Button variant="glass" size="md" trailing={<ArrowRight className="h-4 w-4" />}>
            Select Runtime
          </Button>
        </div>

        <div className="grid md:grid-cols-2 gap-5">
          {templates.map((tpl) => {
            const Icon = tpl.icon;
            return (
              <Card
                key={tpl.key}
                tier="base"
                padded="md"
                interactive
                className="flex flex-col gap-5 overflow-hidden"
              >
                {/* Hero image */}
                <div
                  className={`relative aspect-[16/9] rounded-md overflow-hidden ${tpl.gradient} bg-surface-container-high`}
                >
                  <div className="absolute inset-0 backdrop-blur-2xl" />
                  <Chip tone="glow" className="absolute top-3 left-3 z-10">
                    {tpl.tag}
                  </Chip>
                  <Icon className="absolute bottom-4 right-4 z-10 h-10 w-10 text-white/80" />
                </div>

                {/* Body */}
                <div className="flex flex-col gap-2">
                  <h3 className="text-headline-sm font-display">{tpl.title}</h3>
                  <p className="text-body-md text-on-surface-variant leading-relaxed">
                    {tpl.description}
                  </p>
                </div>

                <Button
                  variant="hyperglow"
                  size="md"
                  leading={
                    isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Rocket className="h-4 w-4" />
                  }
                  fullWidth
                  disabled={isPending}
                  onClick={() => launch(tpl.key as "minimove" | "minievm")}
                >
                  {isPending ? "Broadcasting…" : "1-click launch"}
                </Button>
              </Card>
            );
          })}
        </div>
      </section>
    </div>
  );
}
