import { Badge, type BadgeTone } from "./Badge";

export type FreshnessStatus = "expired" | "today" | "soon" | "fresh";

/** Класифікація продукту за кількістю днів до кінця терміну придатності. */
export function getFreshness(daysLeft: number): FreshnessStatus {
  if (daysLeft < 0) return "expired";
  if (daysLeft === 0) return "today";
  if (daysLeft <= 2) return "soon";
  return "fresh";
}

const toneByStatus: Record<FreshnessStatus, BadgeTone> = {
  expired: "error",
  today: "warning",
  soon: "caution",
  fresh: "primary",
};

export interface FreshnessBadgeProps {
  daysLeft: number;
  /** Готовий підпис (локалізований), напр. «Сьогодні», «2 дні», «Свіже (5 днів)». */
  label: string;
  className?: string;
}

export function FreshnessBadge({ daysLeft, label, className }: FreshnessBadgeProps) {
  return (
    <Badge tone={toneByStatus[getFreshness(daysLeft)]} dot className={className}>
      {label}
    </Badge>
  );
}
