import { useMutation, useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { Link, getRouteApi } from "@tanstack/react-router";
import { api, queryKeys, type Recipe } from "@zwf/api-client";
import { useI18n } from "@zwf/i18n/react";
import { Badge, Button, Card, FreshnessBadge, cn } from "@zwf/ui";
import { ArrowLeft, Check, CheckCircle2, Clock, Flame, Gauge, Lightbulb, ShoppingCart, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { daysLeft, freshnessLabel, sortByUrgency } from "../lib/freshness";
import { productsQuery, recipesQuery } from "../lib/queries";

const route = getRouteApi("/recipes");
const MAX = 4;

export function RecipesPage() {
  const i18n = useI18n();
  const { t } = i18n;
  const { ids = [] } = route.useSearch();
  const navigate = route.useNavigate();
  const { data: products } = useSuspenseQuery(productsQuery);
  const recipes = useQuery(recipesQuery(ids));
  const [openId, setOpenId] = useState<string | null>(null);

  const candidates = useMemo(
    () =>
      sortByUrgency(products)
        .map((p) => ({ ...p, days: daysLeft(p.expiresAt) }))
        .filter((p) => p.days >= 0),
    [products],
  );
  const byId = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);

  const setIds = (next: string[]) => navigate({ search: next.length ? { ids: next } : {}, replace: true });
  const toggle = (id: string) =>
    setIds(ids.includes(id) ? ids.filter((x) => x !== id) : ids.length >= MAX ? ids : [...ids, id]);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <Link to="/" className="flex w-fit items-center gap-1 text-xs font-medium text-on-surface-variant hover:text-primary">
          <ArrowLeft className="size-3.5" /> {t("recipes.back")}
        </Link>
        <Badge tone="primary" className="mt-3 uppercase">
          <Sparkles className="size-3" /> {t("recipes.eyebrow")}
        </Badge>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">{t("recipes.title")}</h1>
        <p className="mt-2 max-w-2xl text-sm text-on-surface-variant">{t("recipes.subtitle")}</p>
      </div>

      {/* ---------- Кулінарний конструктор ---------- */}
      <Card className="flex flex-col gap-4 p-4 sm:p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-extrabold sm:text-2xl">Кулінарний конструктор: оберіть від 3 до 4 продуктів</h2>
            <p className="text-xs text-on-surface-variant">{t("fridge.selectHint")}</p>
          </div>
          <Badge tone="primary" dot className="self-start px-3 py-1 text-xs sm:self-auto">
            {t("fridge.selected", { n: ids.length })}
          </Badge>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {candidates.map((p) => {
            const active = ids.includes(p.id);
            const blocked = !active && ids.length >= MAX;
            return (
              <button
                key={p.id}
                type="button"
                disabled={blocked}
                onClick={() => toggle(p.id)}
                aria-pressed={active}
                className={cn(
                  "flex items-center justify-between gap-2 rounded-md border px-3 py-2.5 text-left text-xs font-semibold transition-colors",
                  active
                    ? "border-primary bg-primary-container/40 text-on-surface"
                    : "border-border bg-surface-container-low text-on-surface-variant hover:border-outline-variant",
                  blocked && "cursor-not-allowed opacity-50",
                )}
              >
                <span className="flex min-w-0 items-center gap-2">
                  {active && <Check className="size-3.5 shrink-0 text-primary" />}
                  <span className="truncate">{p.name}</span>
                </span>
                <FreshnessBadge daysLeft={p.days} label={p.days <= 2 ? freshnessLabel(p.days, i18n) : `${p.days} дн`} />
              </button>
            );
          })}
        </div>
        {ids.length > 0 && (
          <p className="flex items-center gap-2 rounded-md bg-secondary-container px-3 py-2 text-xs text-on-secondary-container">
            <Lightbulb className="size-4 shrink-0 text-on-warning-container" />
            Чудово! Ви вибрали {ids.length} {i18n.plural(ids.length, ["складник", "складники", "складників"])}. Рецепти нижче
            оновлюються автоматично.
          </p>
        )}
      </Card>

      {/* ---------- Результати ---------- */}
      <section className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-bold">{t("recipes.fromSelected")}</h2>
          <Badge tone="primary">{t("recipes.aiBadge")}</Badge>
        </div>

        {ids.length === 0 ? (
          <Card className="p-10 text-center text-sm text-muted">{t("recipes.noSelection")}</Card>
        ) : recipes.isPending ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-busy>
            {Array.from({ length: 3 }, (_, i) => (
              <Card key={i} className="h-80 animate-pulse bg-surface-container-low" />
            ))}
            <span className="sr-only">{t("recipes.loading")}</span>
          </div>
        ) : recipes.isError ? (
          <Card className="flex flex-col items-center gap-3 p-10 text-sm">
            {t("common.error")}
            <Button variant="outline" size="sm" onClick={() => recipes.refetch()}>
              {t("common.retry")}
            </Button>
          </Card>
        ) : recipes.data.length === 0 ? (
          <Card className="p-10 text-center text-sm text-muted">{t("recipes.none")}</Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {recipes.data.map((r) => (
              <RecipeCard
                key={r.id}
                recipe={r}
                open={openId === r.id}
                onToggle={() => setOpenId(openId === r.id ? null : r.id)}
                productName={(id) => byId.get(id)?.name}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function RecipeCard({
  recipe,
  open,
  onToggle,
  productName,
}: {
  recipe: Recipe;
  open: boolean;
  onToggle: () => void;
  productName: (id: string) => string | undefined;
}) {
  const { t, messages } = useI18n();
  const qc = useQueryClient();
  const addMissing = useMutation({
    mutationFn: () => api.shoppingList.addMany(recipe.missing),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.shoppingList }),
  });

  return (
    <Card className={cn("flex flex-col overflow-hidden", open && "ring-2 ring-primary sm:col-span-2 lg:col-span-3")}>
      <div className={cn("relative bg-surface-container", open ? "aspect-[21/9]" : "aspect-[16/10]")}>
        {recipe.imageUrl && (
          <img src={recipe.imageUrl} alt="" loading="lazy" className="absolute inset-0 size-full object-cover" />
        )}
        <div className="absolute inset-x-3 top-3 flex justify-between gap-2">
          <Badge tone="primary" className="bg-surface-container-lowest/95">
            <CheckCircle2 className="size-3" /> {t("recipes.match", { n: recipe.matchPercent })}
          </Badge>
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-2xs text-on-surface-variant">
          <span className="inline-flex items-center gap-1"><Clock className="size-3" /> {t("recipes.minutes", { n: recipe.minutes })}</span>
          <span className="inline-flex items-center gap-1"><Gauge className="size-3" /> {messages.recipes.difficulty[recipe.difficulty]}</span>
          <span className="inline-flex items-center gap-1"><Flame className="size-3" /> {t("recipes.kcal", { n: recipe.kcal })}</span>
        </div>
        <h3 className="text-base leading-snug font-bold">{recipe.title}</h3>

        <div className="rounded-md bg-surface-container-low p-3">
          <p className="mb-2 inline-flex items-center gap-1 text-2xs font-semibold text-primary">
            <CheckCircle2 className="size-3" /> {t("recipes.fromFridge")}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {recipe.usedProductIds.map((id) => (
              <Badge key={id} tone="warning">{productName(id)}</Badge>
            ))}
            {recipe.missing.length === 0 ? (
              <Badge tone="primary">{t("recipes.allInStock")}</Badge>
            ) : (
              recipe.missing.map((m) => (
                <Badge key={m} tone="neutral">+ {m}</Badge>
              ))
            )}
          </div>
        </div>

        {open && (
          <div className="grid gap-6 border-t border-border pt-4 md:grid-cols-[1fr_1.4fr]">
            <div>
              <h4 className="mb-2 text-sm font-bold">{t("recipes.ingredients")}</h4>
              <ul className="space-y-1.5 text-sm text-on-surface-variant">
                {recipe.ingredients.map((i) => (
                  <li key={i} className="flex gap-2"><span className="text-primary">•</span>{i}</li>
                ))}
              </ul>
              {recipe.missing.length > 0 && (
                <Button
                  variant={addMissing.isSuccess ? "secondary" : "outline"}
                  size="sm"
                  className="mt-4"
                  disabled={addMissing.isPending || addMissing.isSuccess}
                  onClick={() => addMissing.mutate()}
                >
                  {addMissing.isSuccess ? <Check className="size-4" /> : <ShoppingCart className="size-4" />}
                  {addMissing.isSuccess ? t("recipes.added") : t("recipes.addMissing")}
                </Button>
              )}
            </div>
            <div>
              <h4 className="mb-2 text-sm font-bold">{t("recipes.steps")}</h4>
              <ol className="space-y-3 text-sm">
                {recipe.steps.map((s, i) => (
                  <li key={s} className="flex gap-3">
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-2xs font-bold text-on-primary">{i + 1}</span>
                    <span className="pt-0.5 text-on-surface-variant">{s}</span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        )}

        <Button className="mt-auto w-full" variant={open ? "secondary" : "primary"} onClick={onToggle}>
          {open ? "Згорнути" : "Переглянути рецепт"}
        </Button>
      </div>
    </Card>
  );
}
