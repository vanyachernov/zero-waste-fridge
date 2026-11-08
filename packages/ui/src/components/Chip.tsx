import type { ButtonHTMLAttributes } from "react";
import { cn } from "../cn";

export interface ChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
  count?: number;
}

export function Chip({ active, count, className, children, ...props }: ChipProps) {
  return (
    <button
      type="button"
      aria-pressed={active}
      className={cn(
        "inline-flex h-8 shrink-0 cursor-pointer items-center gap-1 rounded-pill border px-3.5 text-xs font-medium whitespace-nowrap transition-colors",
        active
          ? "border-primary bg-primary text-on-primary"
          : "border-border bg-surface-container-lowest text-on-surface-variant hover:border-outline-variant hover:bg-surface-container-low",
        className,
      )}
      {...props}
    >
      {children}
      {count !== undefined && <span className={active ? "opacity-90" : "text-muted"}>({count})</span>}
    </button>
  );
}
