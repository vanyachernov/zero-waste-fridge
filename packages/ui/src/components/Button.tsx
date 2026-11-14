import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "../cn";

export type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "danger" | "warning";
export type ButtonSize = "sm" | "md" | "lg" | "icon";

const variants: Record<ButtonVariant, string> = {
  // UI-Kit: Default #006948 → Hover #005137 (-translate-y-0.5 + shadow-md) → Active scale-95
  primary:
    "bg-primary text-on-primary hover:bg-primary-hover hover:-translate-y-0.5 hover:shadow-raised active:translate-y-0 active:scale-95 active:bg-primary-pressed",
  secondary:
    "bg-secondary-container text-on-secondary-container hover:brightness-95 active:scale-95",
  outline:
    "border border-border bg-surface-container-lowest text-on-surface hover:bg-surface-container-low active:scale-95",
  ghost: "text-on-surface-variant hover:bg-surface-container-low active:scale-95",
  danger: "bg-error text-on-error hover:brightness-110 active:scale-95",
  warning: "bg-warning text-on-warning hover:brightness-105 active:scale-95",
};

const sizes: Record<ButtonSize, string> = {
  sm: "h-8 gap-1.5 px-3 text-xs",
  md: "h-10 gap-2 px-5 text-sm",
  lg: "h-12 gap-2 px-6 text-base",
  icon: "size-9 p-0",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = "primary", size = "md", type = "button", ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(
        "touch-hit inline-flex shrink-0 cursor-pointer items-center justify-center rounded-md font-semibold whitespace-nowrap transition-all duration-150",
        "disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-outline-variant disabled:text-on-surface-variant disabled:opacity-60 disabled:shadow-none",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  );
});

/** Стилі кнопки для <a>/<Link>, щоб не дублювати класи. */
export function buttonClasses(variant: ButtonVariant = "primary", size: ButtonSize = "md", className?: string) {
  return cn(
    "inline-flex shrink-0 cursor-pointer items-center justify-center rounded-md font-semibold whitespace-nowrap transition-all duration-150",
    variants[variant],
    sizes[size],
    className,
  );
}
