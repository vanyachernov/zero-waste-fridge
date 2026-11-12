import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, getRouteApi } from "@tanstack/react-router";
import { api, isApiError, queryKeys, type RecipeDetail, type RecipeMissing } from "@zwf/api-client";
import { useI18n } from "@zwf/i18n/react";
import { Badge, Button, Card, buttonClasses } from "@zwf/ui";
import { ArrowLeft, Check, ChefHat, CheckCircle2, Clock, Flame, Gauge, PiggyBank, RefreshCw, ShoppingCart, Sparkles, TriangleAlert, Users } from "lucide-react";
import { useState } from "react";
import { CookDialog } from "../components/CookDialog";
import { RecipeImage } from "../components/RecipeImage";
import { errorMessage } from "../lib/errors";
import { recipeQuery } from "../lib/queries";
import { useDocumentTitle } from "../lib/useDocumentTitle";
import { daysNote } from "./RecipesPage";

const route = getRouteApi("/_authenticated/recipes/$id");

/** «200 г», «3 шт» або примітка («за смаком»). */
export function amount(item: { quantity: number | null; unit: string | null; note: string | null }, units: Record<string, string>) {
  const qty = item.quantity !== null && item.unit ? `${item.quantity} ${units[item.unit] ?? item.unit}` : null;
  return [qty, item.note].filter(Boolean).join(" · ");
}

/** F-42 / F-83: детальний рецепт; на телефоні — «Крок 2 з 2» зі sticky «Приготувати і списати». */
export function RecipeDetailPage() {
  const { id } = route.useParams();
  const i18n = useI18n();
  const recipe = useQuery(recipeQuery(id));
  useDocumentTitle(recipe.data?.title ?? i18n.t("nav.recipes"));

  if (recipe.isPending) {
    return <Card className="h-96 animate-pulse bg-surface-container-low" aria-busy="true" aria-label={i18n.t("common.loading")} />;
  }
  if (recipe.isError) {
    const notFound = isApiError(recipe.error, 404);
    return (
      <Card role="alert" className="mx-auto flex max-w-lg flex-col items-center gap-3 p-8 text-center text-sm">
        <p className="text-on-surface-variant">{notFound ? i18n.t("recipes.notFound") : errorMessage(recipe.error, i18n)}</p>
        <div className="flex gap-2">
          {!notFound && (
            <Button variant="outline" onClick={() => void recipe.refetch()}>
              <RefreshCw className="size-4" aria-hidden /> {i18n.t("common.retry")}
            </Button>
          )}
          <Link to="/recipes" className={buttonClasses("primary", "md")}>
            {i18n.t("recipes.back")}
          </Link>
        </div>
      </Card>
    );
  }
  return <RecipeView recipe={recipe.data} />;
}

function RecipeView({ recipe }: { recipe: RecipeDetail }) {
  const i18n = useI18n();
  const { t, messages } = i18n;
  const [cooking, setCooking] = useState(false);
  const total = recipe.fromFridge.length + recipe.missing.length;

  return (
    <article className="mx-auto flex max-w-5xl flex-col gap-6 max-sm:pb-24">
      <Link to="/recipes" className="flex w-fit items-center gap-1 text-xs font-medium text-on-surface-variant hover:text-primary">
        <ArrowLeft className="size-3.5" aria-hidden /> {t("recipes.back")}
      </Link>

      {/* ---------- Hero ---------- */}
      <Card className="overflow-hidden">
        <RecipeImage recipe={recipe} className="aspect-[16/9] sm:aspect-[21/8]">
          <div className="absolute inset-x-3 top-3 flex flex-wrap gap-2">
            <Badge tone="primary" className="bg-surface-container-lowest/95">
              <Sparkles className="size-3" aria-hidden /> {recipe.source === "AI" ? t("recipes.aiGenerated") : t("recipes.fromCatalog")}
            </Badge>
            {recipe.savingsUah ? (
              <Badge tone="warning" className="bg-warning-container/95">
                <PiggyBank className="size-3" aria-hidden /> {t("recipes.savings", { n: recipe.savingsUah })}
              </Badge>
            ) : null}
          </div>
        </RecipeImage>
        <div className="flex flex-col gap-3 p-5 sm:p-6">
          <p className="text-2xs font-bold tracking-wide text-primary uppercase">
            <span className="sm:hidden">{t("recipes.step", { n: 2 })} · </span>
            {t("recipes.generated")}
          </p>
          <h1 className="text-2xl leading-tight font-extrabold sm:text-3xl">{recipe.title}</h1>
          {recipe.description && <p className="text-sm text-on-surface-variant">{recipe.description}</p>}
          <dl className="grid grid-cols-3 gap-2 sm:flex sm:gap-6">
            <Meta icon={<Clock className="size-4" />} label={t("recipes.time")} value={t("recipes.minutes", { n: recipe.minutes })} />
            <Meta icon={<Users className="size-4" />} label={t("recipes.portions")} value={String(recipe.servings)} />
            <Meta icon={<Flame className="size-4" />} label={t("recipes.kcalPortion", { n: "" }).trim()} value={String(recipe.kcal)} />
            <Meta icon={<Gauge className="size-4" />} label={messages.recipes.difficulty[recipe.difficulty]} value="" className="max-sm:hidden" />
          </dl>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_1.3fr]">
        <div className="flex flex-col gap-6">
          {/* ---------- З холодильника ---------- */}
          <Card className="flex flex-col gap-3 p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-bold">{t("recipes.fromFridgeCount", { n: recipe.fromFridge.length })}</h2>
              <Badge tone="primary">{t("recipes.alreadyHave", { n: recipe.fromFridge.length, total })}</Badge>
            </div>
            <ul className="flex flex-col divide-y divide-border">
              {recipe.fromFridge.map((f) => (
                <li key={f.productId} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                  <span className="flex min-w-0 items-center gap-2">
                    <CheckCircle2 className="size-4 shrink-0 text-primary" aria-hidden />
                    <span className="truncate font-medium">{f.name}</span>
                  </span>
                  <span className="shrink-0 text-right text-xs text-on-surface-variant">
                    {amount(f, messages.units) || "—"}
                    {f.daysLeft <= 1 && <span className="block text-2xs font-semibold text-on-warning-container">{daysNote(f.daysLeft, i18n)}</span>}
                  </span>
                </li>
              ))}
            </ul>
          </Card>

          {/* ---------- Чого бракує (F-43) ---------- */}
          {recipe.missing.length > 0 && <MissingCard missing={recipe.missing} />}

          {recipe.pantry.length > 0 && (
            <Card className="flex flex-col gap-2 p-5">
              <h2 className="font-bold">{t("recipes.pantryTitle")}</h2>
              <ul className="text-sm text-on-surface-variant">
                {recipe.pantry.map((p) => (
                  <li key={p.name}>
                    {p.name}
                    {p.note ? ` — ${p.note}` : ""}
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>

        {/* ---------- Кроки ---------- */}
        <Card className="flex flex-col gap-4 p-5 sm:p-6">
          <h2 className="text-lg font-bold">{t("recipes.stepsTitle")}</h2>
          <ol className="flex flex-col gap-4">
            {recipe.steps.map((s, i) => (
              <li key={i} className="flex gap-3">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-on-primary" aria-hidden>
                  {i + 1}
                </span>
                <div className="pt-0.5">
                  <p className="text-sm font-semibold">{s.title ?? t("recipes.stepLabel", { n: i + 1 })}</p>
                  <p className="text-sm text-on-surface-variant">{s.text}</p>
                </div>
              </li>
            ))}
          </ol>
          <Button size="lg" className="mt-2 max-sm:hidden" onClick={() => setCooking(true)} disabled={recipe.fromFridge.length === 0}>
            <ChefHat className="size-4" aria-hidden /> {t("recipes.cook")}
          </Button>
        </Card>
      </div>

      {/* F-83: sticky CTA на телефоні */}
      <div className="fixed inset-x-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-20 border-t border-border bg-surface-container-lowest/95 p-3 backdrop-blur sm:hidden">
        <Button className="w-full" size="lg" onClick={() => setCooking(true)} disabled={recipe.fromFridge.length === 0}>
          <ChefHat className="size-4" aria-hidden /> {t("recipes.cook")}
        </Button>
      </div>

      <CookDialog open={cooking} recipe={recipe} onClose={() => setCooking(false)} />
    </article>
  );
}

function Meta({ icon, label, value, className }: { icon: React.ReactNode; label: string; value: string; className?: string }) {
  return (
    <div className={`flex flex-col items-center rounded-lg bg-surface-container-low px-3 py-2 sm:flex-row sm:gap-2 sm:bg-transparent sm:p-0 ${className ?? ""}`}>
      <span className="text-primary" aria-hidden>
        {icon}
      </span>
      <dd className="text-base font-bold sm:order-2 sm:text-sm">{value}</dd>
      <dt className="text-2xs text-on-surface-variant sm:order-3">{label}</dt>
    </div>
  );
}

/** F-43: відсутнє → список покупок, по одному або все разом. */
function MissingCard({ missing }: { missing: RecipeMissing[] }) {
  const { t, messages } = useI18n();
  const qc = useQueryClient();
  const [added, setAdded] = useState<Set<string>>(new Set());
  const add = useMutation({
    mutationFn: async (items: RecipeMissing[]) => {
      for (const m of items) {
        await api.shoppingList.add({ name: m.name, ...(m.quantity !== null && m.unit ? { quantity: m.quantity, unit: m.unit } : {}) });
      }
      return items;
    },
    onSuccess: (items) => {
      setAdded((prev) => new Set([...prev, ...items.map((m) => m.name)]));
      void qc.invalidateQueries({ queryKey: queryKeys.shoppingList });
    },
  });
  const rest = missing.filter((m) => !added.has(m.name));

  return (
    <Card className="flex flex-col gap-3 border-warning/40 p-5">
      <h2 className="flex items-center gap-2 font-bold">
        <TriangleAlert className="size-4 text-on-warning-container" aria-hidden /> {t("recipes.missingTitle")}
      </h2>
      <ul className="flex flex-col divide-y divide-border">
        {missing.map((m) => {
          const done = added.has(m.name);
          return (
            <li key={m.name} className="flex items-center justify-between gap-3 py-2.5">
              <div className="min-w-0 text-sm">
                <p className="font-medium">{m.name}</p>
                <p className="text-2xs text-on-surface-variant">
                  {amount(m, messages.units)}
                  {m.substitutes.length ? `${amount(m, messages.units) ? " · " : ""}${t("recipes.orReplace", { items: m.substitutes.join(", ") })}` : ""}
                </p>
              </div>
              <Button
                variant={done ? "secondary" : "outline"}
                size="sm"
                disabled={done || add.isPending}
                onClick={() => add.mutate([m])}
                aria-label={done ? `${t("recipes.added")}: ${m.name}` : `${t("recipes.addToList")}: ${m.name}`}
              >
                {done ? <Check className="size-3.5" aria-hidden /> : null}
                {done ? t("recipes.added") : t("recipes.addToList")}
              </Button>
            </li>
          );
        })}
      </ul>
      <Button variant={rest.length ? "outline" : "secondary"} disabled={!rest.length || add.isPending} onClick={() => add.mutate(rest)}>
        {rest.length ? <ShoppingCart className="size-4" aria-hidden /> : <Check className="size-4" aria-hidden />}
        {rest.length ? t("recipes.addAllToList") : t("recipes.addedAll")}
      </Button>
      {add.isError && (
        <p role="alert" className="text-xs text-error">
          {t("common.error")}
        </p>
      )}
    </Card>
  );
}
