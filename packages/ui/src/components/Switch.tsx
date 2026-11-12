import { useId, type ReactNode } from "react";
import { cn } from "../cn";

export interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: ReactNode;
  description?: ReactNode;
  disabled?: boolean;
  className?: string;
}

/** F-07: перемикач («Упаковку вже відкрито», «Автопоповнення»). WAI-ARIA `role="switch"`, Space/Enter перемикають. */
export function Switch({ checked, onChange, label, description, disabled, className }: SwitchProps) {
  const id = useId();
  return (
    <div className={cn("flex items-start gap-3", className)}>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-describedby={description ? `${id}-description` : undefined}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative mt-0.5 inline-flex h-[22px] w-10 shrink-0 cursor-pointer items-center rounded-pill transition-colors",
          "focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50",
          checked ? "bg-primary" : "bg-outline-variant",
        )}
      >
        <span
          aria-hidden
          className={cn(
            "absolute top-[3px] size-4 rounded-full bg-surface-container-lowest shadow-card transition-transform",
            checked ? "translate-x-[21px]" : "translate-x-[3px]",
          )}
        />
      </button>
      <div className="min-w-0">
        <label htmlFor={id} className="block cursor-pointer text-sm font-bold text-on-surface">
          {label}
        </label>
        {description && (
          <p id={`${id}-description`} className="text-xs text-on-surface-variant">
            {description}
          </p>
        )}
      </div>
    </div>
  );
}
