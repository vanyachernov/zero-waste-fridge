"use client";

import { createContext, useContext, useId, type ReactNode } from "react";
import { cn } from "../cn";

interface RadioCardGroupContext {
  name: string;
  value: string | null;
  onChange: (value: string) => void;
}

const Context = createContext<RadioCardGroupContext | null>(null);

export interface RadioCardGroupProps<T extends string> {
  value: T | null;
  onChange: (value: T) => void;
  label: string;
  children: ReactNode;
  className?: string;
}

/** F-07: група радіо-карток («Що сталося з продуктом?»). Нативні `<input type="radio">` — стрілки працюють самі. */
export function RadioCardGroup<T extends string>({ value, onChange, label, children, className }: RadioCardGroupProps<T>) {
  const name = useId();
  return (
    <Context.Provider value={{ name, value, onChange: onChange as (value: string) => void }}>
      <div role="radiogroup" aria-label={label} className={cn("flex flex-col gap-2.5", className)}>
        {children}
      </div>
    </Context.Provider>
  );
}

export interface RadioCardProps {
  value: string;
  title: ReactNode;
  description?: ReactNode;
  /** Праворуч: бейдж «Врятовано», «Відходи»… */
  aside?: ReactNode;
}

export function RadioCard({ value, title, description, aside }: RadioCardProps) {
  const group = useContext(Context);
  if (!group) throw new Error("RadioCard must be inside RadioCardGroup");
  const checked = group.value === value;
  return (
    <label
      className={cn(
        "flex cursor-pointer items-center gap-3 rounded-[10px] border bg-surface-container-lowest px-4 py-3 transition-colors",
        "has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary/30",
        checked ? "border-primary bg-primary-container/20" : "border-border hover:bg-surface-container-low",
      )}
    >
      <input
        type="radio"
        name={group.name}
        value={value}
        checked={checked}
        onChange={() => group.onChange(value)}
        className="size-4 shrink-0 cursor-pointer accent-primary"
      />
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-bold text-on-surface">{title}</span>
        {description && <span className="block text-xs text-on-surface-variant">{description}</span>}
      </span>
      {aside}
    </label>
  );
}
