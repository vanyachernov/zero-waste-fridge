import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, getRouteApi, useNavigate } from "@tanstack/react-router";
import { isApiError, queryKeys, type Product, type RecipeCard, type RecipeSort } from "@zwf/api-client";
import { api } from "@zwf/api-client";
import { useI18n } from "@zwf/i18n/react";
import { Badge, Button, Card, Checkbox, FreshnessBadge, Select, buttonClasses, cn } from "@zwf/ui";
import { AlertTriangle, ChefHat, CheckCircle2, Clock, Flame, Gauge, Leaf, Lightbulb, RefreshCw, Sparkles } from "lucide-react";
import { useRef } from "react";
import { ProductIcon } from "../components/ProductIcon";
import { RecipeImage } from "../components/RecipeImage";
import { errorMessage } from "../lib/errors";
import { formatQty, freshnessLabel } from "../lib/freshness";
import { activeProductsQuery, productSummaryQuery, recommendedRecipesQuery, savedStatsQuery } from "../lib/queries";
import { useDocumentTitle } from "../lib/useDocumentTitle";

const route = getRouteApi("/_authenticated/recipes");
export const MIN_SELECTED = 3;
export const MAX_SELECTED = 4;
const SORTS: RecipeSort[] = ["critical", "match", "time", "kcal"];

/** F-40 / F-41 / F-45 / F-82: «Розумні рецепти» — рекомендації та кулінарний конструктор. */
export function RecipesPage() {
  const i18n = useI18n();
  const { t, plural } = i18n;
  useDocumentTitle(t("nav.recipes"));
  const { ids = [], sort = "critical" } = route.useSearch();
  const navigate = route.useNavigate();
  const goTo = useNavigate();
  const qc = useQueryClient();

  const products = useQuery(activeProductsQuery);
  const recommended = useQuery(recommendedRecipesQuery(sort));
  const saved = useQuery(savedStatsQuery);
  const summary = useQuery(productSummaryQuery);

  const listRef = useRef<HTMLDivElement>(null);
  const candidates = (products.data?.items ?? []).filter((p) => p.daysLeft >= 0);
  const byId = new Map(candidates.map((p) => [p.id, p]));
  const selected = ids.filter((id) => byId.has(id));
  const ready = selected.length >= MIN_SELECTED && selected.length <= MAX_SELECTED;

  const setSearch = (next: { ids?: string[]; sort?: RecipeSort }) =>
    navigate({
      search: (prev) => {
        const merged = { ...prev, ...next };
        return { ...(merged.ids?.length ? { ids: merged.ids } : {}), ...(merged.sort && merged.sort !== "critical" ? { sort: merged.sort } : {}) };
      },
      replace: true,
      // Фільтр / вибір у URL — не стрибати на початок сторінки
      resetScroll: false,
    });
  const toggle = (id: string) =>
    setSearch({ ids: selected.includes(id) ? selected.filter((x) => x !== id) : selected.length >= MAX_SELECTED ? selected : [...selected, id] });

  const generate = useMutation({
    mutationFn: () => api.recipes.generate(selected),
    onSuccess: (recipe) => {
      qc.setQueryData(queryKeys.recipe(recipe.id), recipe);
      void goTo({ to: "/recipes/$id", params: { id: recipe.id } });
    },
  });
  const noRecipe = isApiError(generate.error) && generate.error.code === "NO_RECIPE";
  const soon = summary.data?.soon ?? 0;

  return (
    <div className="flex flex-col gap-8 max-sm:pb-24">
      {/* ---------- Шапка (F-40) ---------- */}
      <div className="flex flex-col gap-3">
        <nav aria-label="Breadcrumb" className="hidden text-2xs text-on-surface-variant sm:block">
          <span className="font-bold">{t("recipes.breadcrumbRoot")}</span> › <span className="text-primary">{t("recipes.breadcrumb")}</span>
        </nav>
        <div className="flex flex-wrap gap-2">
          <Badge tone="primary" className="uppercase">
            <Sparkles className="size-3" aria-hidden /> {t("recipes.eyebrow")}
          </Badge>
        </div>
        <h1 className="text-2xl font-extrabold tracking-tight sm:text-4xl">{t("recipes.title")}</h1>
        <p className="max-w-3xl text-sm text-on-surface-variant">{t("recipes.subtitle")}</p>
        <div className="flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-pill bg-primary-container px-3 py-1 text-xs font-semibold text-on-primary-container">
            <Leaf className="size-3.5" aria-hidden />
            {t("recipes.savedThisMonth", { n: saved.data?.saved ?? 0, unit: plural(saved.data?.saved ?? 0, ["продукт", "продукти", "продуктів"]) })}
          </span>
          {soon > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-pill bg-warning-container px-3 py-1 text-xs font-semibold text-on-warning-container">
              <AlertTriangle className="size-3.5" aria-hidden />
              {t("recipes.needAttention", { n: soon, unit: plural(soon, ["продукт", "продукти", "продуктів"]) })}
            </span>
          )}
        </div>
      </div>

      {/* ---------- Рекомендації (F-40) ---------- */}
      <section aria-labelledby="recommended-title" className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h2 id="recommended-title" className="text-lg font-bold sm:text-xl">
                {t("recipes.recommendedTitle")}
              </h2>
              <Badge tone="primary">{t("recipes.aiBadge")}</Badge>
            </div>
            <p className="text-xs text-on-surface-variant">{t("recipes.recommendedText")}</p>
          </div>
          <Select
            aria-label={t("recipes.sort")}
            className="h-9 text-xs sm:w-80"
            value={sort}
            onChange={(v) => setSearch({ sort: v as RecipeSort })}
            options={SORTS.map((s) => ({ value: s, label: `${t("recipes.sort")}: ${i18n.messages.recipes.sorts[s]}` }))}
          />
        </div>
        {recommended.isPending ? (
          <div role="status" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true" aria-label={t("common.loading")}>
            {Array.from({ length: 3 }, (_, i) => (
              <Card key={i} className="h-96 animate-pulse bg-surface-container-low" />
            ))}
          </div>
        ) : recommended.isError ? (
          <Card className="flex flex-col items-center gap-3 p-8 text-center text-sm text-on-surface-variant">
            {t("recipes.loadError")}
            <Button variant="outline" size="sm" onClick={() => void recommended.refetch()}>
              <RefreshCw className="size-4" aria-hidden /> {t("common.retry")}
            </Button>
          </Card>
        ) : recommended.data.length === 0 ? (
          <Card className="p-8 text-center text-sm text-on-surface-variant">{t("recipes.noRecommended")}</Card>
        ) : (
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {recommended.data.map((r) => (
              <li key={r.id} className="min-w-0">
                <RecommendedCard recipe={r} />
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ---------- Кулінарний конструктор (F-41) / мобільний майстер «Крок 1 з 2» (F-82) ---------- */}
      <section aria-labelledby="constructor-title" ref={listRef}>
        <Card className="flex flex-col gap-4 p-4 sm:p-6">
          <div className="flex flex-col gap-1 sm:hidden">
            <p className="text-2xs font-bold tracking-wide text-primary uppercase">{t("recipes.step", { n: 1 })}</p>
            <div className="h-1.5 overflow-hidden rounded-pill bg-surface-container" aria-hidden>
              <div className="h-full w-1/2 rounded-pill bg-primary" />
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 id="constructor-title" className="text-lg font-extrabold sm:text-2xl">
                <span className="sm:hidden">{t("recipes.wizardHeading")}</span>
                <span className="max-sm:hidden">{t("recipes.constructorTitle")}</span>
              </h2>
              <p className="text-xs text-on-surface-variant">
                <span className="sm:hidden">{t("recipes.wizardText")}</span>
                <span className="max-sm:hidden">{t("recipes.constructorText")}</span>
              </p>
            </div>
            <Badge tone={ready ? "primary" : "neutral"} dot className="self-start px-3 py-1 text-xs" aria-live="polite">
              {t("recipes.selectedCount", { n: selected.length })}
              {ready ? ` (${t("recipes.readyToGenerate")})` : selected.length > 0 ? ` · ${t("recipes.pickMore", { n: MIN_SELECTED - selected.length })}` : ""}
            </Badge>
          </div>

          {products.isPending ? (
            <div role="status" className="h-40 animate-pulse rounded-lg bg-surface-container-low" aria-busy="true" aria-label={t("common.loading")} />
          ) : candidates.length === 0 ? (
            <p className="rounded-lg bg-surface-container-low p-6 text-center text-sm text-on-surface-variant">{t("recipes.noProducts")}</p>
          ) : (
            <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4" aria-label={t("recipes.constructorTitle")}>
              {candidates.map((p) => (
                <li key={p.id}>
                  <ProductChoice product={p} checked={selected.includes(p.id)} disabled={!selected.includes(p.id) && selected.length >= MAX_SELECTED} onToggle={() => toggle(p.id)} />
                </li>
              ))}
            </ul>
          )}

          {ready && !generate.isPending && (
            <p className="flex items-center gap-2 rounded-md bg-secondary-container px-3 py-2 text-xs text-on-secondary-container max-sm:hidden">
              <Lightbulb className="size-4 shrink-0 text-on-warning-container" aria-hidden />
              {t("recipes.readyHint", { n: selected.length, unit: plural(selected.length, ["складову", "складові", "складових"]) })}
            </p>
          )}

          {/* F-45: стани генерації */}
          {generate.isPending && (
            <div role="status" className="flex items-center gap-3 rounded-lg border border-primary/30 bg-primary-container/40 p-4">
              <ChefHat className="size-6 shrink-0 animate-bounce text-primary motion-reduce:animate-none" aria-hidden />
              <div>
                <p className="text-sm font-bold">{t("recipes.generating")}</p>
                <p className="text-xs text-on-surface-variant">{t("recipes.generatingText")}</p>
              </div>
            </div>
          )}
          {generate.isError && (
            <p role="alert" className="rounded-lg border border-error/30 bg-error-container/40 p-3 text-sm text-on-error-container">
              {noRecipe ? t("recipes.noRecipe") : isApiError(generate.error, 400) ? errorMessage(generate.error, i18n) : t("recipes.generateError")}
            </p>
          )}

          <div className="flex justify-center max-sm:hidden">
            <Button size="lg" disabled={!ready || generate.isPending} onClick={() => generate.mutate()}>
              <Sparkles className="size-4" aria-hidden /> {t("recipes.generate")}
            </Button>
          </div>
        </Card>
      </section>

      {/* F-82: футер майстра на телефоні — обране й «Згенерувати рецепт» */}
      <div className="fixed inset-x-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-20 border-t border-border bg-surface-container-lowest/95 px-4 py-3 backdrop-blur sm:hidden">
        <div className="mb-2 flex items-center justify-between gap-2 text-xs">
          <span className="min-w-0 truncate text-on-surface-variant">
            {selected.length ? selected.map((id) => byId.get(id)?.name.split(/\s+/)[0]).join(", ") : t("recipes.selectedCount", { n: 0 })}
          </span>
          {selected.length > 0 && (
            <button type="button" className="touch-hit shrink-0 font-semibold text-primary" onClick={() => listRef.current?.scrollIntoView({ behavior: "smooth" })}>
              {t("recipes.change")}
            </button>
          )}
        </div>
        <Button className="w-full" disabled={!ready || generate.isPending} onClick={() => generate.mutate()}>
          <Sparkles className="size-4" aria-hidden /> {t("recipes.generateShort")}
        </Button>
      </div>
    </div>
  );
}

function ProductChoice({ product, checked, disabled, onToggle }: { product: Product; checked: boolean; disabled: boolean; onToggle: () => void }) {
  const i18n = useI18n();
  const { t } = i18n;
  const hint =
    product.daysLeft === 0 ? t("recipes.expiresToday") : product.daysLeft <= 2 ? freshnessLabel(product.daysLeft, i18n) : formatQty(product, i18n);
  return (
    <label
      className={cn(
        "flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors",
        checked ? "border-primary bg-primary-container/40" : "border-border bg-surface-container-low hover:border-outline-variant",
        disabled && "cursor-not-allowed opacity-50",
      )}
    >
      <Checkbox checked={checked} disabled={disabled} onChange={onToggle} aria-label={product.name} />
      <ProductIcon category={product.category} className="size-9" />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold">{product.name}</span>
        <span className="block truncate text-2xs text-on-surface-variant">{hint}</span>
      </span>
      <FreshnessBadge daysLeft={product.daysLeft} label={product.daysLeft === 0 ? freshnessLabel(0, i18n) : t("recipes.daysShort", { n: product.daysLeft })} />
    </label>
  );
}

/** «(сьогодні!)», «(1 день)» біля назви продукту. */
export function daysNote(daysLeft: number, { t, plural }: ReturnType<typeof useI18n>) {
  return daysLeft === 0 ? `${t("freshness.today").toLowerCase()}!` : `${daysLeft} ${plural(daysLeft, ["день", "дні", "днів"])}`;
}

function RecommendedCard({ recipe }: { recipe: RecipeCard }) {
  const i18n = useI18n();
  const { t, plural, messages } = i18n;
  return (
    <Card className="flex h-full flex-col overflow-hidden">
      <RecipeImage recipe={recipe} className="aspect-[16/10]">
        <div className="absolute inset-x-3 top-3 flex flex-wrap justify-between gap-2">
          <Badge tone="primary" className="bg-surface-container-lowest/95">
            <CheckCircle2 className="size-3" aria-hidden /> {t("recipes.match", { n: recipe.matchPercent })}
          </Badge>
          {recipe.criticalCount > 0 && (
            <Badge tone="warning" className="bg-warning-container/95">
              {t("recipes.critical", { n: recipe.criticalCount, unit: plural(recipe.criticalCount, ["критичний продукт", "критичні продукти", "критичних продуктів"]) })}
            </Badge>
          )}
        </div>
      </RecipeImage>
      <div className="flex flex-1 flex-col gap-3 p-4">
        <RecipeMeta minutes={recipe.minutes} difficulty={messages.recipes.difficulty[recipe.difficulty]} kcal={recipe.kcal} />
        <h3 className="text-base leading-snug font-bold">{recipe.title}</h3>
        <div className="rounded-md bg-surface-container-low p-3 text-xs">
          <p className="mb-2 font-semibold text-primary">{t("recipes.fromFridge")}</p>
          <ul className="flex flex-wrap gap-1.5">
            {recipe.fromFridge.map((f) => (
              <li key={f.productId}>
                <Badge tone={f.daysLeft <= 2 ? "warning" : "neutral"}>
                  {f.name.split(/\s+/).slice(0, 2).join(" ")} ({daysNote(f.daysLeft, i18n)})
                </Badge>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-on-surface-variant">
            {recipe.missing.length === 0
              ? t("recipes.allInStock")
              : t("recipes.missingShort", { items: recipe.missing.map((m) => (m.quantity ? `${m.name} (${m.quantity} ${messages.units[m.unit!]})` : m.name)).join(", ") })}
          </p>
        </div>
        <Link to="/recipes/$id" params={{ id: recipe.id }} className={buttonClasses("outline", "md", "mt-auto w-full")}>
          {t("recipes.view")}
        </Link>
      </div>
    </Card>
  );
}

export function RecipeMeta({ minutes, difficulty, kcal }: { minutes: number; difficulty: string; kcal: number }) {
  const { t } = useI18n();
  return (
    <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-2xs text-on-surface-variant">
      <span className="inline-flex items-center gap-1">
        <Clock className="size-3" aria-hidden /> {t("recipes.minutes", { n: minutes })}
      </span>
      <span className="inline-flex items-center gap-1">
        <Gauge className="size-3" aria-hidden /> {difficulty}
      </span>
      <span className="inline-flex items-center gap-1">
        <Flame className="size-3" aria-hidden /> {t("recipes.kcal", { n: kcal })}
      </span>
    </p>
  );
}
