import { forwardRef, type InputHTMLAttributes, type ReactNode } from "react";
import { cn } from "../cn";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  leading?: ReactNode;
  trailing?: ReactNode;
  invalid?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, leading, trailing, invalid, ...props },
  ref,
) {
  return (
    <div
      className={cn(
        "flex h-10 items-center gap-2 rounded-md border bg-surface-container-lowest px-3 text-sm transition-colors",
        "focus-within:border-primary focus-within:bg-surface-container-low focus-within:ring-2 focus-within:ring-primary/15",
        invalid ? "border-error bg-error-container/30" : "border-border",
        props.disabled && "cursor-not-allowed bg-surface-container-highest opacity-70",
        className,
      )}
    >
      {leading && <span className="shrink-0 text-muted">{leading}</span>}
      <input
        ref={ref}
        aria-invalid={invalid || undefined}
        className="h-full min-w-0 flex-1 bg-transparent outline-none placeholder:text-muted disabled:cursor-not-allowed"
        {...props}
      />
      {trailing && <span className="shrink-0 text-muted">{trailing}</span>}
    </div>
  );
});

export function Field({
  label,
  hint,
  error,
  children,
  className,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("flex flex-col gap-1.5", className)}>
      <span className="text-xs font-semibold text-on-surface">{label}</span>
      {children}
      {error ? (
        <span className="text-2xs font-medium text-error">{error}</span>
      ) : (
        hint && <span className="text-2xs text-muted">{hint}</span>
      )}
    </label>
  );
}
