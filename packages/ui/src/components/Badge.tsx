import type { HTMLAttributes } from "react";
import { cn } from "../cn";

export type BadgeTone = "neutral" | "primary" | "error" | "warning" | "caution" | "info";

const tones: Record<BadgeTone, string> = {
  neutral: "bg-surface-container text-on-surface-variant",
  primary: "bg-primary-container text-on-primary-container",
  error: "bg-error-container text-on-error-container",
  warning: "bg-warning-container text-on-warning-container",
  caution: "bg-caution-container text-on-caution-container",
  info: "bg-secondary-container text-on-secondary-container",
};

const dots: Record<BadgeTone, string> = {
  neutral: "bg-outline",
  primary: "bg-primary",
  error: "bg-error",
  warning: "bg-warning",
  caution: "bg-warning",
  info: "bg-on-secondary-container",
};

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
  dot?: boolean;
}

export function Badge({ tone = "neutral", dot = false, className, children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-pill px-2.5 py-0.5 text-2xs font-semibold whitespace-nowrap",
        tones[tone],
        className,
      )}
      {...props}
    >
      {dot && <span className={cn("size-1.5 rounded-full", dots[tone])} aria-hidden />}
      {children}
    </span>
  );
}
