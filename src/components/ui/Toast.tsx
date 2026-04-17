import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { CheckCircle2, ExternalLink, Info, Loader2, X, XCircle } from "lucide-react";
import { cn } from "@/lib/cn";

export type ToastTone = "success" | "error" | "info" | "loading";

export interface Toast {
  id: string;
  tone: ToastTone;
  title: string;
  description?: string;
  link?: { href: string; label: string };
  duration?: number;
}

type Ctx = {
  toasts: Toast[];
  push: (toast: Omit<Toast, "id">) => string;
  update: (id: string, patch: Partial<Omit<Toast, "id">>) => void;
  dismiss: (id: string) => void;
};

const ToastCtx = createContext<Ctx | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (toast: Omit<Toast, "id">) => {
      const id = `t-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      setToasts((prev) => [...prev, { ...toast, id }]);
      if (toast.tone !== "loading" && toast.duration !== 0) {
        setTimeout(() => dismiss(id), toast.duration ?? 6000);
      }
      return id;
    },
    [dismiss],
  );

  const update = useCallback((id: string, patch: Partial<Omit<Toast, "id">>) => {
    setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
    if (patch.tone && patch.tone !== "loading" && patch.duration !== 0) {
      setTimeout(() => dismiss(id), patch.duration ?? 6000);
    }
  }, [dismiss]);

  const value = useMemo(() => ({ toasts, push, update, dismiss }), [toasts, push, update, dismiss]);

  return (
    <ToastCtx.Provider value={value}>
      {children}
      <Toaster />
    </ToastCtx.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error("useToast must be inside <ToastProvider>");
  return ctx;
}

const toneStyles: Record<ToastTone, string> = {
  success: "bg-secondary-container/80 text-on-secondary-container",
  error: "bg-error-container/80 text-on-error-container",
  info: "bg-primary-container/80 text-on-primary-container",
  loading: "bg-surface-container-high text-on-surface",
};

const iconMap: Record<ToastTone, ReactNode> = {
  success: <CheckCircle2 className="h-4 w-4 shrink-0" />,
  error: <XCircle className="h-4 w-4 shrink-0" />,
  info: <Info className="h-4 w-4 shrink-0" />,
  loading: <Loader2 className="h-4 w-4 shrink-0 animate-spin" />,
};

function Toaster() {
  const { toasts, dismiss } = useToast();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && toasts.length > 0) dismiss(toasts[toasts.length - 1].id);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toasts, dismiss]);

  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-full max-w-sm flex-col gap-2"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          className={cn(
            "pointer-events-auto flex items-start gap-3 rounded-xl ghost-border px-4 py-3 shadow-ambient-lg animate-fade-in",
            toneStyles[t.tone],
          )}
        >
          <span className="mt-0.5">{iconMap[t.tone]}</span>
          <div className="flex-1 min-w-0">
            <div className="text-body-md font-medium break-words">{t.title}</div>
            {t.description && (
              <div className="mt-0.5 text-body-sm text-current/80 break-words">{t.description}</div>
            )}
            {t.link && (
              <a
                href={t.link.href}
                target="_blank"
                rel="noreferrer"
                className="mt-1.5 inline-flex items-center gap-1 text-body-sm underline hover:text-on-surface"
              >
                {t.link.label}
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
          <button
            type="button"
            onClick={() => dismiss(t.id)}
            aria-label="Dismiss"
            className="text-current/60 hover:text-current snappy transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}
