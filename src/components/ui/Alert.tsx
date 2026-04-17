import type { ReactNode } from "react";
import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";
import { cn } from "@/lib/cn";

type Tone = "info" | "success" | "warning" | "danger";

const toneStyles: Record<Tone, string> = {
  info: "bg-primary-container/35 text-on-primary-container",
  success: "bg-secondary-container/30 text-on-secondary-container",
  warning: "bg-tertiary-container/28 text-on-tertiary-container",
  danger: "bg-error-container/35 text-on-error-container",
};

const iconMap: Record<Tone, ReactNode> = {
  info: <Info className="h-4 w-4 shrink-0" />,
  success: <CheckCircle2 className="h-4 w-4 shrink-0" />,
  warning: <AlertTriangle className="h-4 w-4 shrink-0" />,
  danger: <XCircle className="h-4 w-4 shrink-0" />,
};

export function Alert({
  tone = "info",
  title,
  children,
  className,
}: {
  tone?: Tone;
  title?: string;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-[20px] px-4 py-4 ghost-border text-body-sm",
        toneStyles[tone],
        className,
      )}
      role="alert"
    >
      <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-black/10">
        {iconMap[tone]}
      </span>
      <div className="flex flex-col gap-1">
        {title && (
          <p className="text-[0.68rem] font-mono uppercase tracking-[0.2em] text-current/90">
            {title}
          </p>
        )}
        {children && <p className="leading-relaxed text-current/90">{children}</p>}
      </div>
    </div>
  );
}
