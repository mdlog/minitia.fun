import { createContext, useContext, useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";

type Ctx = { value: string; setValue: (v: string) => void };
const TabsCtx = createContext<Ctx | null>(null);

export function Tabs({
  defaultValue,
  value,
  onValueChange,
  children,
  className,
}: {
  defaultValue?: string;
  value?: string;
  onValueChange?: (v: string) => void;
  children: ReactNode;
  className?: string;
}) {
  const [internal, setInternal] = useState(defaultValue ?? "");
  const current = value ?? internal;

  const setter = (nextValue: string) => {
    if (value === undefined) setInternal(nextValue);
    onValueChange?.(nextValue);
  };

  return (
    <TabsCtx.Provider value={{ value: current, setValue: setter }}>
      <div className={className}>{children}</div>
    </TabsCtx.Provider>
  );
}

export function TabsList({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      role="tablist"
      className={cn("inline-flex gap-1 rounded-2xl bg-white/[0.05] p-1.5 ghost-border", className)}
    >
      {children}
    </div>
  );
}

export function TabsTrigger({
  value,
  children,
  className,
}: {
  value: string;
  children: ReactNode;
  className?: string;
}) {
  const ctx = useContext(TabsCtx);
  if (!ctx) throw new Error("TabsTrigger must be inside Tabs");

  const active = ctx.value === value;

  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={() => ctx.setValue(value)}
      className={cn(
        "rounded-xl px-4 py-2 text-label-md uppercase font-medium tracking-[0.12em] snappy transition-all duration-200",
        active
          ? "bg-gradient-primary text-primary-on shadow-glow-primary"
          : "text-on-surface-variant hover:bg-white/[0.05] hover:text-on-surface",
        className,
      )}
    >
      {children}
    </button>
  );
}

export function TabsContent({
  value,
  children,
  className,
}: {
  value: string;
  children: ReactNode;
  className?: string;
}) {
  const ctx = useContext(TabsCtx);
  if (!ctx) throw new Error("TabsContent must be inside Tabs");
  if (ctx.value !== value) return null;

  return <div className={className}>{children}</div>;
}
