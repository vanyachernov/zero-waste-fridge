import { forwardRef, type ReactNode, type SelectHTMLAttributes } from "react";
import { cn } from "../cn";

export interface SelectOption<T extends string = string> {
  value: T;
  label: string;
  disabled?: boolean;
}

export interface SelectProps<T extends string = string> extends Omit<SelectHTMLAttributes<HTMLSelectElement>, "onChange" | "value"> {
  options: readonly SelectOption<T>[];
  value: T | "";
  onChange: (value: T) => void;
  /** Іконка або емодзі ліворуч («🥦 Овочі & Зелень», «🏬 Сільпо»). */
  leading?: ReactNode;
  invalid?: boolean;
  placeholder?: string;
}

/**
 * F-07: випадний список у стилі полів UI-Kit. Нативний `<select>` — клавіатура, екранні читачі
 * й мобільні колеса вибору працюють без власного коду; стилізуємо лише обгортку.
 */
function SelectInner<T extends string>(
  { options, value, onChange, leading, invalid, placeholder, className, disabled, ...props }: SelectProps<T>,
  ref: React.ForwardedRef<HTMLSelectElement>,
) {
  return (
    <div
      className={cn(
        "relative flex h-10 items-center gap-2 rounded-md border bg-surface-container-lowest pr-8 pl-3 text-sm transition-colors",
        "focus-within:border-primary focus-within:bg-surface-container-low focus-within:ring-2 focus-within:ring-primary/15",
        invalid ? "border-error bg-error-container/30" : "border-border",
        disabled && "cursor-not-allowed bg-surface-container-highest opacity-70",
        className,
      )}
    >
      {leading && (
        <span className="shrink-0 text-muted" aria-hidden>
          {leading}
        </span>
      )}
      <select
        ref={ref}
        value={value}
        disabled={disabled}
        aria-invalid={invalid || undefined}
        onChange={(e) => onChange(e.target.value as T)}
        className="h-full min-w-0 flex-1 cursor-pointer appearance-none bg-transparent outline-none disabled:cursor-not-allowed"
        {...props}
      >
        {placeholder !== undefined && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((o) => (
          <option key={o.value} value={o.value} disabled={o.disabled}>
            {o.label}
          </option>
        ))}
      </select>
      <svg
        viewBox="0 0 24 24"
        aria-hidden
        className="pointer-events-none absolute right-2.5 size-4 text-muted"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="m6 9 6 6 6-6" />
      </svg>
    </div>
  );
}

export const Select = forwardRef(SelectInner) as <T extends string>(
  props: SelectProps<T> & { ref?: React.ForwardedRef<HTMLSelectElement> },
) => ReturnType<typeof SelectInner>;
