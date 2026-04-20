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
      className={cn("inline-flex rounded-lg bg-[#0F0F11] p-0.5 ghost-border", className)}
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
        "h-8 rounded-md px-3 text-[12px] font-medium transition-colors duration-150",
        active
          ? "bg-white/[0.08] text-on-surface ghost-border"
          : "text-on-surface-variant hover:text-on-surface",
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
