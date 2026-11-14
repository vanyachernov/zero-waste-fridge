import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { api, convertQuantity, queryKeys, type RecipeDetail } from "@zwf/api-client";
import { useI18n } from "@zwf/i18n/react";
import { Button, Checkbox, Modal, useToast } from "@zwf/ui";
import { ChefHat, Minus, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { errorMessage } from "../lib/errors";
import { FormAlert } from "../auth/FormAlert";

const MAX_PORTIONS = 12;

/** Скільки спишеться: рецептна кількість на `portions` порцій в одиницях продукту; `null` — увесь продукт. */
export function plannedAmount(f: RecipeDetail["fromFridge"][number], servings: number, portions: number): number | null {
  if (f.quantity === null) return null;
  const scaled = Math.round(((f.quantity * portions) / servings) * 1000) / 1000;
  const amount = convertQuantity(scaled, f.unit, f.availableUnit);
  return amount !== null && amount > 0 && amount < f.available ? amount : null;
}

/** F-44: підтвердження «Приготувати і списати» — порції та продукти, які спишуться. */
export function CookDialog({ open, recipe, onClose }: { open: boolean; recipe: RecipeDetail; onClose: () => void }) {
  const i18n = useI18n();
  const { t, plural, messages } = i18n;
  const qc = useQueryClient();
  const toast = useToast();
  const navigate = useNavigate();
  const [portions, setPortions] = useState(recipe.servings);
  const [included, setIncluded] = useState<Set<string>>(() => new Set(recipe.fromFridge.map((f) => f.productId)));

  useEffect(() => {
    if (!open) return;
    setPortions(recipe.servings);
    setIncluded(new Set(recipe.fromFridge.map((f) => f.productId)));
  }, [open, recipe]);

  const cook = useMutation({
    mutationFn: () => api.recipes.cook(recipe.id, { portions, productIds: [...included] }),
    onSuccess: (result) => {
      void qc.invalidateQueries({ queryKey: queryKeys.products });
      void qc.invalidateQueries({ queryKey: queryKeys.recipes });
      void qc.invalidateQueries({ queryKey: queryKeys.savedStats });
      const n = result.cooked.length;
      toast.show({ message: t("recipes.cooked", { n, unit: plural(n, ["продукт", "продукти", "продуктів"]) }), tone: "success" });
      onClose();
      void navigate({ to: "/" });
    },
  });

  const toggle = (id: string) =>
    setIncluded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t("recipes.cookTitle")}
      description={t("recipes.cookText")}
      icon={<ChefHat />}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button onClick={() => cook.mutate()} disabled={!included.size || cook.isPending}>
            <ChefHat className="size-4" aria-hidden /> {t("recipes.cookConfirm")}
          </Button>
        </>
      }
    >
      <FormAlert message={cook.isError ? errorMessage(cook.error, i18n) : null} />
      <div className="flex items-center justify-between gap-3">
        <span id="cook-portions" className="text-sm font-semibold">
          {t("recipes.cookPortions")}
        </span>
        <div className="flex items-center gap-2" role="group" aria-labelledby="cook-portions">
          <Button variant="outline" size="icon" aria-label="−1" disabled={portions <= 1} onClick={() => setPortions((p) => p - 1)}>
            <Minus className="size-4" aria-hidden />
          </Button>
          <output className="w-8 text-center text-lg font-bold" aria-live="polite">
            {portions}
          </output>
          <Button variant="outline" size="icon" aria-label="+1" disabled={portions >= MAX_PORTIONS} onClick={() => setPortions((p) => p + 1)}>
            <Plus className="size-4" aria-hidden />
          </Button>
        </div>
      </div>
      <fieldset className="flex flex-col gap-1">
        <legend className="mb-1 text-sm font-semibold">{t("recipes.cookWillWriteOff")}</legend>
        {recipe.fromFridge.map((f) => {
          const amount = plannedAmount(f, recipe.servings, portions);
          const unit = messages.units[f.availableUnit];
          return (
            <label key={f.productId} className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 hover:bg-surface-container-low">
              <Checkbox checked={included.has(f.productId)} onChange={() => toggle(f.productId)} aria-label={f.name} />
              <span className="min-w-0 flex-1 truncate text-sm">{f.name}</span>
              <span className="shrink-0 text-xs text-on-surface-variant">
                {amount === null ? t("recipes.cookAll") : `${amount} ${unit} ${t("recipes.cookOf", { n: `${f.available} ${unit}` })}`}
              </span>
            </label>
          );
        })}
        {!included.size && <p className="text-xs text-error">{t("recipes.cookNothing")}</p>}
      </fieldset>
    </Modal>
  );
}
