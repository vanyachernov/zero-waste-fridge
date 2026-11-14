import type { RecipeCard } from "@zwf/api-client";
import { cn } from "@zwf/ui";
import { ChefHat } from "lucide-react";
import { useState, type ReactNode } from "react";

/** Фото рецепта; без фото (або якщо не завантажилось) — фірмовий градієнт із ковпаком шефа. */
export function RecipeImage({ recipe, className, children }: { recipe: Pick<RecipeCard, "imageUrl">; className?: string; children?: ReactNode }) {
  const [failed, setFailed] = useState(false);
  return (
    <div className={cn("relative overflow-hidden bg-gradient-to-br from-primary-container via-secondary-container to-warning-container", className)}>
      {recipe.imageUrl && !failed ? (
        <img src={recipe.imageUrl} alt="" loading="lazy" onError={() => setFailed(true)} className="absolute inset-0 size-full object-cover" />
      ) : (
        <ChefHat className="absolute top-1/2 left-1/2 size-14 -translate-x-1/2 -translate-y-1/2 text-on-primary-container/40" aria-hidden />
      )}
      {children}
    </div>
  );
}
