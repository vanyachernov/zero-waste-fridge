import type { Category } from "@zwf/api-client";
import { cn } from "@zwf/ui";
import { Apple, Beef, CupSoda, LeafyGreen, Milk, Package } from "lucide-react";

const MAP: Record<Category, { icon: typeof Apple; className: string }> = {
  meat: { icon: Beef, className: "bg-error-container text-on-error-container" },
  vegetables: { icon: LeafyGreen, className: "bg-primary-container text-on-primary-container" },
  dairy: { icon: Milk, className: "bg-secondary-container text-on-secondary-container" },
  fruits: { icon: Apple, className: "bg-warning-container text-on-warning-container" },
  sauces: { icon: CupSoda, className: "bg-caution-container text-on-caution-container" },
  other: { icon: Package, className: "bg-surface-container text-on-surface-variant" },
};

export function ProductIcon({ category, className }: { category: Category; className?: string }) {
  const { icon: Icon, className: tone } = MAP[category];
  return (
    <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-md", tone, className)} aria-hidden>
      <Icon className="size-4.5" />
    </span>
  );
}
