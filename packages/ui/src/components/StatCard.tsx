import type { ReactNode } from "react";
import { cn } from "../cn";
import { Card } from "./Card";

export interface StatCardProps {
  title: string;
  value: ReactNode;
  unit?: string;
  hint?: ReactNode;
  tone?: "neutral" | "warning" | "error";
  aside?: ReactNode;
  className?: string;
}

const valueTone = {
  neutral: "text-on-surface",
  warning: "text-on-warning-container",
  error: "text-error",
};

const hintTone = {
  neutral: "text-primary",
  warning: "text-on-warning-container",
  error: "text-error",
};

export function StatCard({ title, value, unit, hint, tone = "neutral", aside, className }: StatCardProps) {
  return (
    <Card className={cn("flex flex-col gap-3 p-5", className)}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium text-on-surface-variant">{title}</p>
        {aside}
      </div>
      <p className="flex items-baseline gap-1.5">
        <span className={cn("text-3xl font-extrabold tracking-tight", valueTone[tone])}>{value}</span>
        {unit && <span className="text-sm text-on-surface-variant">{unit}</span>}
      </p>
      {hint && <p className={cn("text-2xs font-semibold", hintTone[tone])}>{hint}</p>}
    </Card>
  );
}
