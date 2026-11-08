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

export interface FieldProps {
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
  className?: string;
  /**
   * id поля вводу. Якщо задано — `<label htmlFor>` охоплює лише підпис, а підказка/помилка
   * доступні через `aria-describedby={fieldMessageId(id)}`. Без id — label обгортає все (як раніше).
   */
  htmlFor?: string;
  /** Елемент праворуч від підпису (напр. посилання «Забули пароль?»). */
  labelAside?: ReactNode;
}

export const fieldMessageId = (id: string) => `${id}-message`;

export function Field({ label, hint, error, children, className, htmlFor, labelAside }: FieldProps) {
  const message = error ?? hint;
  const messageClass = error ? "text-2xs font-medium text-error" : "text-2xs text-muted";

  if (htmlFor) {
    return (
      <div className={cn("flex flex-col gap-1.5", className)}>
        <div className="flex items-baseline justify-between gap-2">
          <label htmlFor={htmlFor} className="text-xs font-semibold text-on-surface">
            {label}
          </label>
          {labelAside}
        </div>
        {children}
        {message && (
          <p id={fieldMessageId(htmlFor)} className={messageClass} role={error ? "alert" : undefined}>
            {message}
          </p>
        )}
      </div>
    );
  }

  return (
    <label className={cn("flex flex-col gap-1.5", className)}>
      <span className="text-xs font-semibold text-on-surface">{label}</span>
      {children}
      {message && <span className={messageClass}>{message}</span>}
    </label>
  );
}
