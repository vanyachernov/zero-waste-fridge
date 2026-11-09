import { cn } from "../cn";

export type AvatarTone = "primary" | "warning" | "neutral" | "muted";

const tones: Record<AvatarTone, string> = {
  primary: "bg-primary-container text-on-primary-container",
  warning: "bg-warning-container text-on-warning-container",
  neutral: "bg-surface-container text-on-surface",
  muted: "bg-surface-container-low text-muted",
};

/** «Олена Кравченко» → «ОК»; email → перша літера. */
export function initialsOf(name: string): string {
  const parts = name.trim().split(/[\s@._-]+/).filter(Boolean);
  if (name.includes("@")) return [...(parts[0] ?? "?")][0]!.toUpperCase();
  return parts
    .map((part) => [...part][0]!.toUpperCase())
    .join("")
    .slice(0, 2);
}

export interface AvatarProps {
  name: string;
  src?: string | null;
  tone?: AvatarTone;
  size?: "sm" | "md";
  className?: string;
}

export function Avatar({ name, src, tone = "primary", size = "md", className }: AvatarProps) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full font-bold",
        size === "md" ? "size-10 text-sm" : "size-8 text-xs",
        tones[tone],
        className,
      )}
    >
      {src ? <img src={src} alt="" className="size-full object-cover" /> : initialsOf(name)}
    </span>
  );
}
