"use client";

import { useRef, type KeyboardEvent, type ReactNode } from "react";
import { cn } from "../cn";

export interface SegmentOption<T extends string> {
  value: T;
  label: ReactNode;
  /** Підпис для екранних читачів, якщо `label` — лише іконка. */
  ariaLabel?: string;
}

export interface SegmentedControlProps<T extends string> {
  options: readonly SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  label: string;
  size?: "sm" | "md";
  className?: string;
  /** Розтягнути сегменти на всю ширину (рівні частки). */
  stretch?: boolean;
}

/**
 * F-07: сегментований перемикач — одиниці «г / кг / мл / л / шт», «Таблиця / Картки», «Усе / Частину».
 * Семантика `radiogroup`: стрілки переміщують вибір, Tab — лише на активний сегмент.
 */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  label,
  size = "md",
  className,
  stretch,
}: SegmentedControlProps<T>) {
  const ref = useRef<HTMLDivElement>(null);

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const keys = ["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp", "Home", "End"];
    if (!keys.includes(e.key)) return;
    e.preventDefault();
    const index = options.findIndex((o) => o.value === value);
    const next =
      e.key === "Home" ? 0
      : e.key === "End" ? options.length - 1
      : (index + (e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : -1) + options.length) % options.length;
    onChange(options[next]!.value);
    ref.current?.querySelectorAll<HTMLButtonElement>('[role="radio"]')[next]?.focus();
  };

  return (
    <div
      ref={ref}
      role="radiogroup"
      aria-label={label}
      onKeyDown={onKeyDown}
      className={cn(
        "inline-flex gap-0.5 rounded-md bg-surface-container p-[3px]",
        size === "md" ? "h-10" : "h-8",
        stretch && "flex w-full",
        className,
      )}
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={o.ariaLabel}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(o.value)}
            className={cn(
              "inline-flex min-w-8 cursor-pointer items-center justify-center gap-1.5 rounded-sm whitespace-nowrap transition-colors",
              stretch ? "min-w-0 px-1" : "px-2.5",
              "focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none",
              size === "md" ? "text-[13px]" : "text-xs",
              stretch && "flex-1",
              active
                ? "bg-surface-container-lowest font-bold text-on-surface shadow-card"
                : "text-on-surface-variant hover:text-on-surface",
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
