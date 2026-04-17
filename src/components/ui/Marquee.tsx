import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function Marquee({
  items,
  className,
  separator = "✦",
}: {
  items: ReactNode[];
  className?: string;
  separator?: ReactNode;
}) {
  const track = (
    <div className="marquee__track" aria-hidden="false">
      {items.map((item, i) => (
        <span key={i} className="flex items-center gap-12 whitespace-nowrap">
          <span>{item}</span>
          <span className="text-editorial/70">{separator}</span>
        </span>
      ))}
    </div>
  );

  return (
    <div className={cn("marquee", className)}>
      {track}
      <div className="marquee__track" aria-hidden="true">
        {items.map((item, i) => (
          <span key={i} className="flex items-center gap-12 whitespace-nowrap">
            <span>{item}</span>
            <span className="text-editorial/70">{separator}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
