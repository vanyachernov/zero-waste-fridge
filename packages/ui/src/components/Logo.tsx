import { cn } from "../cn";

export function LogoMark({ className }: { className?: string }) {
  return (
    <span
      className={cn("inline-flex size-8 items-center justify-center rounded-md bg-primary text-on-primary", className)}
      aria-hidden
    >
      <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="5" y="2.5" width="14" height="19" rx="2.5" />
        <path d="M5 10h14M8.5 6v1.5M8.5 13.5v3" />
      </svg>
    </span>
  );
}

export function Logo({ className, label = "Zero Waste Fridge" }: { className?: string; label?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark />
      <span className="text-base font-bold tracking-tight text-primary">{label}</span>
    </span>
  );
}
