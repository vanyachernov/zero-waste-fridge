import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { api, queryKeys, type Category, type Product } from "@zwf/api-client";
import { useI18n } from "@zwf/i18n/react";
import { Badge, Button, Card, Checkbox, Chip, FreshnessBadge, Input, StatCard, cn } from "@zwf/ui";
import {
  AlertTriangle,
  ChefHat,
  ChevronDown,
  DoorOpen,
  LayoutGrid,
  Lightbulb,
  MoreVertical,
  Plus,
  ScanLine,
  Search,
  Snowflake,
  Table2,
  ThermometerSun,
  Trash2,
  X,
} from "lucide-react";
import { useDeferredValue, useMemo, useState } from "react";
import { AddProductModal } from "../components/AddProductModal";
import { ProductIcon } from "../components/ProductIcon";
import { daysLeft, formatQty, freshnessLabel, sortByUrgency } from "../lib/freshness";
import { productsQuery } from "../lib/queries";

const MAX_SELECTED = 4;
const CATEGORY_ORDER: Category[] = ["vegetables", "dairy", "meat", "fruits", "sauces"];

type View = "table" | "cards";

export function FridgePage() {
  const i18n = useI18n();
  const { t, messages, formatDate } = i18n;
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: products } = useSuspenseQuery(productsQuery);

  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [category, setCategory] = useState<Category | "all">("all");
  const [view, setView] = useState<View>("table");
  const [selected, setSelected] = useState<string[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [tipVisible, setTipVisible] = useState(true);

  const discard = useMutation({
    mutationFn: (id: string) => api.products.discard(id, "spoiled"),
    onSuccess: (_, id) => {
      setSelected((s) => s.filter((x) => x !== id));
      return qc.invalidateQueries({ queryKey: queryKeys.products });
    },
  });

  const enriched = useMemo(
    () => sortByUrgency(products).map((p) => ({ ...p, days: daysLeft(p.expiresAt) })),
    [products],
  );

  const stats = useMemo(
    () => ({
      total: enriched.length,
      soon: enriched.filter((p) => p.days >= 0 && p.days <= 2).length,
      expired: enriched.filter((p) => p.days < 0).length,
    }),
    [enriched],
  );

  const counts = useMemo(() => {
    const c: Partial<Record<Category, number>> = {};
    for (const p of enriched) c[p.category] = (c[p.category] ?? 0) + 1;
    return c;
  }, [enriched]);

  const visible = useMemo(() => {
    const q = deferredQuery.trim().toLowerCase();
    return enriched.filter(
      (p) =>
        (category === "all" || p.category === category) &&
        (!q || p.name.toLowerCase().includes(q) || p.brand?.toLowerCase().includes(q)),
    );
  }, [enriched, category, deferredQuery]);

  const toggle = (id: string) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : s.length >= MAX_SELECTED ? s : [...s, id]));

  const goToRecipes = (ids: string[]) => navigate({ to: "/recipes", search: { ids } });

  const urgentIds = enriched.filter((p) => p.days >= 0 && p.days <= 2).slice(0, 3).map((p) => p.id);

  return (
    <div className="flex flex-col gap-5">
      {/* ---------- Розумна порада дня ---------- */}
      {tipVisible && urgentIds.length > 0 && (
        <div className="flex flex-col gap-3 rounded-xl bg-secondary-container px-4 py-3 sm:flex-row sm:items-center sm:gap-4 sm:px-5">
          <div className="flex flex-1 items-start gap-3">
            <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-warning-container text-on-warning-container">
              <Lightbulb className="size-4" />
            </span>
            <div className="min-w-0">
              <p className="text-2xs font-bold tracking-wide text-primary uppercase">{t("fridge.tipLabel")}</p>
              <p className="text-sm text-on-secondary-container">
                {t("fridge.tipText", { hours: 24 })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <Button variant="outline" size="sm" onClick={() => goToRecipes(urgentIds)}>
              {t("fridge.tipCta")}
            </Button>
            <Button variant="ghost" size="icon" aria-label="Закрити" onClick={() => setTipVisible(false)}>
              <X className="size-4" />
            </Button>
          </div>
        </div>
      )}

      {/* ---------- Заголовок ---------- */}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <nav className="text-2xs text-muted" aria-label="Breadcrumb">
            {t("fridge.breadcrumbRoot")} <span className="mx-1">›</span>
            <span className="font-medium text-primary">{t("fridge.breadcrumb")}</span>
          </nav>
          <h1 className="mt-1 text-3xl font-extrabold tracking-tight sm:text-display">{t("fridge.title")}</h1>
          <p className="mt-1 text-sm text-on-surface-variant">{t("fridge.subtitle")}</p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex">
          <Button variant="outline">
            <ScanLine className="size-4 text-primary" /> {t("fridge.scan")}
          </Button>
          <Button onClick={() => setAddOpen(true)}>
            <Plus className="size-4" /> {t("fridge.add")}
          </Button>
        </div>
      </div>

      {/* ---------- Статистика ---------- */}
      <div className="grid gap-3 sm:grid-cols-3 sm:gap-4">
        <StatCard
          title={t("fridge.statTotal")}
          value={stats.total}
          unit={t("fridge.statTotalUnit")}
          hint={t("fridge.statTotalHint", { n: 3 })}
          aside={
            <span className="flex size-8 items-center justify-center rounded-md bg-surface-container-low text-on-surface-variant">
              <Table2 className="size-4" />
            </span>
          }
        />
        <StatCard
          title={t("fridge.statSoon")}
          value={stats.soon}
          unit={t("fridge.products")}
          tone="warning"
          hint={t("fridge.statSoonHint")}
          aside={<Badge tone="warning" dot>{stats.soon} шт</Badge>}
        />
        <StatCard
          title={t("fridge.statExpired")}
          value={stats.expired}
          unit={t("fridge.products")}
          tone="error"
          hint={t("fridge.statExpiredHint")}
          aside={<Badge tone="error" dot>Дія</Badge>}
        />
      </div>

      {/* ---------- Пошук і фільтри ---------- */}
      <Card className="flex flex-col gap-3 p-3 sm:p-4">
        <div className="flex flex-col gap-2 md:flex-row md:items-center">
          <Input
            className="md:max-w-md md:flex-1"
            leading={<Search className="size-4" />}
            trailing={<kbd className="hidden rounded border border-border px-1.5 text-2xs sm:inline">⌘K</kbd>}
            placeholder={t("fridge.search")}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label={t("fridge.search")}
          />
          <div className="flex items-center gap-2 md:ml-auto">
            <div className="hidden rounded-md border border-border p-0.5 md:flex" role="radiogroup">
              {(
                [
                  ["table", Table2, t("fridge.viewTable")],
                  ["cards", LayoutGrid, t("fridge.viewCards")],
                ] as const
              ).map(([v, Icon, label]) => (
                <button
                  key={v}
                  role="radio"
                  aria-checked={view === v}
                  onClick={() => setView(v)}
                  className={cn(
                    "inline-flex h-8 items-center gap-1.5 rounded-sm px-2.5 text-xs font-medium",
                    view === v ? "bg-surface-container text-on-surface" : "text-muted hover:text-on-surface",
                  )}
                >
                  <Icon className="size-3.5" /> {label}
                </button>
              ))}
            </div>
            <button className="inline-flex h-9 flex-1 items-center justify-between gap-2 rounded-md border border-border px-3 text-xs text-on-surface-variant md:flex-none">
              {t("fridge.sort")} <ChevronDown className="size-3.5" />
            </button>
          </div>
        </div>
        <div className="-mx-3 flex gap-2 overflow-x-auto px-3 pb-1 sm:-mx-4 sm:px-4 [&::-webkit-scrollbar]:hidden">
          <Chip active={category === "all"} count={enriched.length} onClick={() => setCategory("all")}>
            {t("fridge.all")}
          </Chip>
          {CATEGORY_ORDER.map((c) => (
            <Chip key={c} active={category === c} count={counts[c] ?? 0} onClick={() => setCategory(c)}>
              {messages.categories[c]}
            </Chip>
          ))}
        </div>
      </Card>

      {/* ---------- Список продуктів ---------- */}
      <p className="-mb-2 flex items-center gap-1.5 text-xs text-on-surface-variant">
        <ChefHat className="size-3.5 text-primary" /> {t("fridge.selectHint")}
      </p>

      {visible.length === 0 ? (
        <Card className="p-10 text-center text-sm text-muted">{t("fridge.empty")}</Card>
      ) : (
        <>
          {/* Таблиця — тільки десктоп і режим «Таблиця» */}
          <Card className={cn("hidden overflow-hidden", view === "table" && "md:block")}>
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-surface-container-low text-2xs font-semibold tracking-wide text-on-surface-variant uppercase">
                <tr>
                  <th className="w-12 py-3 pl-5" />
                  <th className="py-3 pr-4">{t("fridge.colProduct")}</th>
                  <th className="py-3 pr-4">{t("fridge.colQty")}</th>
                  <th className="py-3 pr-4">{t("fridge.colExpires")}</th>
                  <th className="py-3 pr-4">{t("fridge.colStatus")}</th>
                  <th className="py-3 pr-5 text-center">{t("fridge.colActions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {visible.map((p) => {
                  const checked = selected.includes(p.id);
                  const blocked = !checked && selected.length >= MAX_SELECTED;
                  return (
                    <tr
                      key={p.id}
                      className={cn("transition-colors hover:bg-surface-container-low", checked && "bg-primary-container/35")}
                    >
                      <td className="py-3 pl-5">
                        <Checkbox
                          checked={checked}
                          disabled={blocked}
                          onChange={() => toggle(p.id)}
                          aria-label={p.name}
                        />
                      </td>
                      <td className="py-3 pr-4">
                        <ProductCell product={p} />
                      </td>
                      <td className="py-3 pr-4 font-semibold whitespace-nowrap">{formatQty(p, i18n)}</td>
                      <td className="py-3 pr-4 text-xs whitespace-nowrap text-on-surface-variant">{formatDate(p.expiresAt)}</td>
                      <td className="py-3 pr-4">
                        <FreshnessBadge daysLeft={p.days} label={freshnessLabel(p.days, i18n)} />
                      </td>
                      <td className="py-3 pr-5">
                        <RowActions product={p} onDiscard={() => discard.mutate(p.id)} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="flex items-center justify-between border-t border-border px-5 py-3 text-xs text-on-surface-variant">
              <span>{t("fridge.shown", { shown: visible.length, total: enriched.length })}</span>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="sm" disabled>
                  {t("common.previous")}
                </Button>
                <span className="flex size-8 items-center justify-center rounded-md bg-surface-container font-semibold text-on-surface">1</span>
                <Button variant="outline" size="sm" disabled>
                  {t("common.next")}
                </Button>
              </div>
            </div>
          </Card>

          {/* Картки — мобільний вигляд і режим «Картки» */}
          <ul className={cn("grid gap-3 sm:grid-cols-2 lg:grid-cols-3", view === "table" && "md:hidden")}>
            {visible.map((p) => {
              const checked = selected.includes(p.id);
              const blocked = !checked && selected.length >= MAX_SELECTED;
              return (
                <li key={p.id}>
                  <label
                    className={cn(
                      "flex cursor-pointer items-start gap-3 rounded-lg border bg-surface-container-lowest p-4 shadow-card transition-colors",
                      checked ? "border-primary bg-primary-container/35" : "border-border",
                      blocked && "cursor-not-allowed opacity-60",
                    )}
                  >
                    <Checkbox className="mt-2" checked={checked} disabled={blocked} onChange={() => toggle(p.id)} />
                    <div className="flex min-w-0 flex-1 flex-col gap-2">
                      <ProductCell product={p} />
                      <div className="flex flex-wrap items-center justify-between gap-2 pl-12 text-xs">
                        <span className="font-semibold">{formatQty(p, i18n)}</span>
                        <span className="text-on-surface-variant">{formatDate(p.expiresAt)}</span>
                        <FreshnessBadge daysLeft={p.days} label={freshnessLabel(p.days, i18n)} />
                      </div>
                    </div>
                  </label>
                </li>
              );
            })}
          </ul>
        </>
      )}

      {/* ---------- Зони зберігання ---------- */}
      <div className="grid gap-3 sm:grid-cols-3 sm:gap-4">
        {(
          [
            ["fresh", Snowflake, "bg-primary-container text-on-primary-container"],
            ["middle", ThermometerSun, "bg-warning-container text-on-warning-container"],
            ["door", DoorOpen, "bg-secondary-container text-on-secondary-container"],
          ] as const
        ).map(([zone, Icon, tone]) => (
          <Card key={zone} className="flex gap-3 p-4">
            <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-md", tone)}>
              <Icon className="size-4.5" />
            </span>
            <div>
              <p className="text-sm font-bold">{messages.fridge.zones[zone].title}</p>
              <p className="mt-0.5 text-xs text-on-surface-variant">{messages.fridge.zones[zone].text}</p>
            </div>
          </Card>
        ))}
      </div>

      {/* ---------- Панель вибору → рецепт ---------- */}
      {selected.length > 0 && (
        <div className="fixed inset-x-0 bottom-[calc(4.25rem+env(safe-area-inset-bottom))] z-20 px-4 lg:bottom-6">
          <div className="mx-auto flex max-w-2xl items-center gap-3 rounded-xl border border-border bg-surface-container-lowest p-3 pl-4 shadow-modal">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold">{t("fridge.selected", { n: selected.length })}</p>
              <p className="truncate text-2xs text-on-surface-variant">
                {selected.map((id) => products.find((p) => p.id === id)?.name).filter(Boolean).join(" · ")}
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setSelected([])}>
              {t("fridge.clear")}
            </Button>
            <Button onClick={() => goToRecipes(selected)}>
              <ChefHat className="size-4" />
              <span className="hidden sm:inline">{t("fridge.getRecipe")}</span>
            </Button>
          </div>
        </div>
      )}

      <AddProductModal open={addOpen} onClose={() => setAddOpen(false)} />
    </div>
  );
}

function ProductCell({ product }: { product: Product }) {
  const { messages } = useI18n();
  return (
    <div className="flex min-w-0 items-center gap-3">
      <ProductIcon category={product.category} />
      <div className="min-w-0">
        <p className="truncate font-bold text-on-surface">{product.name}</p>
        {product.brand && <p className="truncate text-2xs font-medium text-on-surface-variant">{product.brand}</p>}
        <p className="truncate text-2xs text-muted">
          {messages.categories[product.category]}
          {product.zone && `, ${messages.zonesShort[product.zone]}`}
        </p>
      </div>
    </div>
  );
}

function RowActions({ product, onDiscard }: { product: Product & { days: number }; onDiscard: () => void }) {
  const { t } = useI18n();
  return (
    <div className="flex items-center justify-center gap-1">
      {product.days < 0 ? (
        <Button variant="ghost" size="icon" className="text-error" onClick={onDiscard} aria-label={t("fridge.discard")} title={t("fridge.discard")}>
          <Trash2 className="size-4" />
        </Button>
      ) : (
        <Link
          to="/recipes"
          search={{ ids: [product.id] }}
          className="inline-flex size-9 items-center justify-center rounded-md text-primary hover:bg-primary-container/50"
          aria-label={t("fridge.getRecipe")}
          title={t("fridge.getRecipe")}
        >
          {product.days <= 2 ? <AlertTriangle className="size-4 text-on-warning-container" /> : <ChefHat className="size-4" />}
        </Link>
      )}
      <Button variant="ghost" size="icon" aria-label="Ще">
        <MoreVertical className="size-4" />
      </Button>
    </div>
  );
}
