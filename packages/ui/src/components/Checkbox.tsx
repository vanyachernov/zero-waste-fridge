import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "../cn";

export const Checkbox = forwardRef<HTMLInputElement, Omit<InputHTMLAttributes<HTMLInputElement>, "type">>(
  function Checkbox({ className, ...props }, ref) {
    return (
      <span className={cn("relative inline-flex size-5 shrink-0", className)}>
        <input
          ref={ref}
          type="checkbox"
          className="peer size-5 cursor-pointer appearance-none rounded-sm border-2 border-outline-variant bg-surface-container-lowest transition-colors checked:border-primary checked:bg-primary hover:border-primary disabled:cursor-not-allowed disabled:opacity-50"
          {...props}
        />
        <svg
          viewBox="0 0 16 16"
          aria-hidden
          className="pointer-events-none absolute inset-0 m-auto size-3.5 text-on-primary opacity-0 peer-checked:opacity-100"
        >
          <path d="M3.5 8.5 6.5 11.5 12.5 4.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    );
  },
);
