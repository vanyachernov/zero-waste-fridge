import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, getRouteApi } from "@tanstack/react-router";
import { api, queryKeys, type Category, type Product } from "@zwf/api-client";
import { useI18n } from "@zwf/i18n/react";
import { Badge, Button, Card, Checkbox, Chip, FreshnessBadge, Input, Menu, SegmentedControl, Select, StatCard, cn, useToast } from "@zwf/ui";
import {
  AlertTriangle,
  ChefHat,
  DoorOpen,
  LayoutGrid,
  PackageOpen,
  Pencil,
  Plus,
  RefreshCw,
  ScanLine,
  Search,
  Snowflake,
  Table2,
  ThermometerSun,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { CATEGORY_ORDER } from "../components/categoryEmoji";
import { ProductFormModal } from "../components/ProductFormModal";
import { ProductIcon } from "../components/ProductIcon";
import { SwipeRow } from "../components/SwipeRow";
import { TipBanner } from "../components/TipBanner";
import { WriteOffModal } from "../components/WriteOffModal";
import { errorMessage } from "../lib/errors";
import { toProductQuery, type FridgeSearch } from "../lib/fridgeSearch";
import { formatQty, freshnessLabel, todayIso } from "../lib/freshness";
import { productSummaryQuery, productsQuery } from "../lib/queries";
import { useDeferredWriteOff } from "../lib/useDeferredWriteOff";
import { useDocumentTitle } from "../lib/useDocumentTitle";

const route = getRouteApi("/_authenticated/");
const MAX_SELECTED = 4;

export function FridgePage() {
  const i18n = useI18n();
  const { t, messages, formatDate, formatShortDate } = i18n;
  useDocumentTitle(t("fridge.title"));
  const search = route.useSearch();
  const navigate = route.useNavigate();
  const qc = useQueryClient();
  const toast = useToast();

  const query = toProductQuery(search);
  const list = useQuery(productsQuery(query));
  const summary = useQuery(productSummaryQuery);
  const writeOff = useDeferredWriteOff();

  const [selected, setSelected] = useState<string[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Product | undefined>();
  const [writingOff, setWritingOff] = useState<Product | null>(null);

  const setSearch = (patch: Partial<FridgeSearch>, options: { resetPage?: boolean } = { resetPage: true }) =>
    navigate({
      search: (prev: FridgeSearch) => {
        const next: FridgeSearch = { ...prev, ...patch, ...(options.resetPage ? { page: undefined } : {}) };
        for (const key of Object.keys(next) as (keyof FridgeSearch)[]) if (next[key] === undefined) delete next[key];
        return next;
      },
      replace: true,
      // Фільтр / вибір у URL — не стрибати на початок сторінки
      resetScroll: false,
    });

  // ---------- Пошук: поле живе локально, у URL — із затримкою ----------
  const [text, setText] = useState(search.q ?? "");
  const searchRef = useRef<HTMLInputElement>(null);
  useEffect(() => setText(search.q ?? ""), [search.q]);
  useEffect(() => {
    const value = text.trim();
    if (value === (search.q ?? "")) return;
    const timer = setTimeout(() => setSearch({ q: value || undefined }), 250);
    return () => clearTimeout(timer);
  }, [text]);
  // ⌘K / Ctrl+K — до пошуку
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const page = list.data;
  const items = page?.items ?? [];
  useEffect(() => {
    if (items.length) setNames((n) => ({ ...n, ...Object.fromEntries(items.map((p) => [p.id, p.name])) }));
  }, [items]);

  const counts = page?.categoryCounts;
  const allCount = counts ? Object.values(counts).reduce((a, b) => a + b, 0) : undefined;
  const filtered = Boolean(search.q || search.category || search.freshness?.length);
  const emptyFridge = summary.data?.total === 0 && !filtered;
  const view = search.view ?? "table";

  const toggle = (id: string) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : s.length >= MAX_SELECTED ? s : [...s, id]));

  const openProduct = async (product: Product) => {
    try {
      const updated = await api.products.update(product.id, { openedAt: todayIso() });
      toast.show({ message: t("fridge.toastOpened", { name: updated.name, date: formatDate(updated.effectiveExpiresAt) }), tone: "success" });
      await qc.invalidateQueries({ queryKey: queryKeys.products });
    } catch (error) {
      toast.show({ message: errorMessage(error, i18n), tone: "error" });
    }
  };

  const actions = useMemo(
    () => ({
      edit: (p: Product) => {
        setEditing(p);
        setFormOpen(true);
      },
      open: (p: Product) => void openProduct(p),
      writeOff: (p: Product) => setWritingOff(p),
    }),
    [],
  );

  return (
    <div className="flex flex-col gap-5">
      <TipBanner />

      {/* ---------- Заголовок ---------- */}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <nav className="hidden text-2xs text-on-surface-variant sm:block" aria-label="Breadcrumb">
            <span className="font-bold">{t("fridge.breadcrumbRoot")}</span> <span className="mx-1">›</span>
            <span className="text-primary">{t("fridge.breadcrumb")}</span>
          </nav>
          <h1 className="text-2xl font-extrabold tracking-tight sm:mt-1 sm:text-display">{t("fridge.title")}</h1>
          <p className="text-xs text-on-surface-variant sm:hidden">{t("fridge.breadcrumb")}</p>
          <p className="mt-1 hidden text-sm text-on-surface-variant sm:block">{t("fridge.subtitle")}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="hidden sm:inline-flex" disabled title={t("profile.soon")}>
            <ScanLine className="size-4 text-primary" /> {t("fridge.scan")}
          </Button>
          {/* F-80: на мобільному та сама кнопка стає FAB «+» над нижньою навігацією */}
          <Button
            className={cn(
              "max-sm:fixed max-sm:right-4 max-sm:bottom-[calc(5rem+env(safe-area-inset-bottom))] max-sm:z-20 max-sm:size-14 max-sm:rounded-full max-sm:p-0 max-sm:shadow-modal",
              selected.length > 0 && "max-sm:hidden",
            )}
            onClick={() => {
              setEditing(undefined);
              setFormOpen(true);
            }}
          >
            <Plus className="size-4 max-sm:size-6" aria-hidden /> <span className="max-sm:sr-only">{t("fridge.add")}</span>
          </Button>
        </div>
      </div>

      {/* ---------- Статистика (B-14); на мобільному — компактний рядок 28 / 4 / 2 ---------- */}
      <dl className="grid grid-cols-3 gap-2 sm:hidden">
        {(
          [
            ["total", summary.data?.total, "text-on-surface"],
            ["soon", summary.data?.soon, "text-on-warning-container"],
            ["expired", summary.data?.expired, "text-error"],
          ] as const
        ).map(([key, value, tone]) => (
          <div key={key} className="flex flex-col-reverse items-center rounded-lg border border-border bg-surface-container-lowest px-2 py-2.5 shadow-card">
            <dt className="text-2xs text-on-surface-variant">{messages.fridge.statShort[key]}</dt>
            <dd className={cn("text-2xl leading-8 font-extrabold", tone)}>{value ?? "—"}</dd>
          </div>
        ))}
      </dl>
      <div className="hidden gap-3 sm:grid sm:grid-cols-3 sm:gap-4">
        <StatCard
          title={t("fridge.statTotal")}
          value={summary.data?.total ?? "—"}
          unit={t("fridge.statTotalUnit")}
          hint={summary.data?.addedThisWeek ? t("fridge.statTotalHint", { n: summary.data.addedThisWeek }) : t("fridge.statTotalHintNone")}
          aside={
            <span className="flex size-8 items-center justify-center rounded-md bg-surface-container-low text-on-surface-variant">
              <Table2 className="size-4" />
            </span>
          }
        />
        <StatCard
          title={t("fridge.statSoon")}
          value={summary.data?.soon ?? "—"}
          unit={t("fridge.products")}
          tone="warning"
          hint={t("fridge.statSoonHint")}
          aside={
            <Badge tone="warning" dot>
              {summary.data?.soon ?? 0} шт
            </Badge>
          }
        />
        <StatCard
          title={t("fridge.statExpired")}
          value={summary.data?.expired ?? "—"}
          unit={t("fridge.products")}
          tone="error"
          hint={t("fridge.statExpiredHint")}
          aside={
            <Badge tone="error" dot>
              Дія
            </Badge>
          }
        />
      </div>

      {/* ---------- Пошук, вигляд, сортування, категорії ---------- */}
      <Card className="flex flex-col gap-3 p-3 sm:p-4">
        <div className="flex flex-col gap-2 md:flex-row md:items-center">
          <Input
            ref={searchRef}
            className="md:max-w-xl md:flex-1"
            leading={<Search className="size-4" />}
            trailing={<kbd className="hidden rounded border border-border px-1.5 text-2xs sm:inline">⌘K</kbd>}
            placeholder={t("fridge.search")}
            value={text}
            onChange={(e) => setText(e.target.value)}
            aria-label={t("fridge.search")}
            type="search"
          />
          <div className="flex items-center gap-2 md:ml-auto">
            <SegmentedControl
              label={t("fridge.view")}
              size="sm"
              className="hidden md:inline-flex"
              value={view}
              onChange={(v) => setSearch({ view: v === "cards" ? "cards" : undefined }, { resetPage: false })}
              options={[
                { value: "table", label: <><Table2 className="size-3.5" aria-hidden /> {t("fridge.viewTable")}</> },
                { value: "cards", label: <><LayoutGrid className="size-3.5" aria-hidden /> {t("fridge.viewCards")}</> },
              ]}
            />
            <Select
              aria-label={t("fridge.sort")}
              className="h-9 flex-1 text-xs md:w-72 md:flex-none"
              value={search.sort ?? "expiry"}
              onChange={(sort) => setSearch({ sort: sort === "expiry" ? undefined : sort })}
              options={(["expiry", "name", "added", "category"] as const).map((s) => ({ value: s, label: `${t("fridge.sort")}: ${messages.fridge.sorts[s]}` }))}
            />
          </div>
        </div>
        <div className="-mx-3 flex gap-2 overflow-x-auto px-3 pb-1 sm:-mx-4 sm:px-4 [&::-webkit-scrollbar]:hidden">
          <Chip active={!search.category} count={allCount} onClick={() => setSearch({ category: undefined })}>
            {t("fridge.all")}
          </Chip>
          {CATEGORY_ORDER.map((c: Category) => (
            <Chip key={c} active={search.category === c} count={counts?.[c]} onClick={() => setSearch({ category: search.category === c ? undefined : c })}>
              {messages.categories[c]}
            </Chip>
          ))}
        </div>
        {search.freshness?.length ? (
          <div className="flex flex-wrap items-center gap-2">
            {search.freshness.map((f) => (
              <Badge key={f} tone={f === "expired" ? "error" : f === "fresh" ? "primary" : "warning"}>
                {f === "expired" ? t("freshness.expired") : f === "today" ? t("freshness.today") : f === "soon" ? t("fridge.statSoon") : t("freshness.fresh", { n: "3+", unit: "дн." })}
              </Badge>
            ))}
            <Button variant="ghost" size="sm" onClick={() => setSearch({ freshness: undefined })}>
              <X className="size-3.5" /> {t("fridge.resetFilters")}
            </Button>
          </div>
        ) : null}
      </Card>

      {/* ---------- Список продуктів ---------- */}
      {!emptyFridge && (
        <p className="-mb-2 hidden items-center gap-1.5 text-xs text-on-surface-variant sm:flex">
          <ChefHat className="size-3.5 text-primary" /> {t("fridge.selectHint")}
        </p>
      )}

      {list.isError && !page ? (
        <Card className="flex flex-col items-center gap-3 p-10 text-center">
          <p className="text-sm text-on-surface-variant">{t("fridge.loadError")}</p>
          <Button variant="outline" onClick={() => void list.refetch()}>
            <RefreshCw className="size-4" /> {t("common.retry")}
          </Button>
        </Card>
      ) : !page ? (
        <ListSkeleton />
      ) : emptyFridge ? (
        <Card className="flex flex-col items-center gap-3 p-10 text-center">
          <span className="flex size-14 items-center justify-center rounded-full bg-primary-container text-on-primary-container">
            <PackageOpen className="size-7" aria-hidden />
          </span>
          <h2 className="text-lg font-bold">{t("fridge.emptyFridgeTitle")}</h2>
          <p className="max-w-sm text-sm text-on-surface-variant">{t("fridge.emptyFridgeText")}</p>
          <Button onClick={() => setFormOpen(true)}>
            <Plus className="size-4" /> {t("fridge.emptyFridgeCta")}
          </Button>
        </Card>
      ) : items.length === 0 ? (
        <Card className="flex flex-col items-center gap-3 p-10 text-center text-sm text-muted">
          {t("fridge.empty")}
          {filtered && (
            <Button variant="outline" size="sm" onClick={() => navigate({ search: {}, replace: true, resetScroll: false })}>
              {t("fridge.resetFilters")}
            </Button>
          )}
        </Card>
      ) : (
        <>
          <Card className={cn("hidden overflow-hidden", view === "table" && "md:block", list.isPlaceholderData && "opacity-60")}>
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-surface-container-low text-2xs font-semibold tracking-wide text-on-surface-variant uppercase">
                <tr>
                  <th className="w-12 py-3 pl-5">
                    <span className="sr-only">{t("fridge.selectHint")}</span>
                  </th>
                  <th className="py-3 pr-4">{t("fridge.colProduct")}</th>
                  <th className="py-3 pr-4">{t("fridge.colQty")}</th>
                  <th className="py-3 pr-4">{t("fridge.colExpires")}</th>
                  <th className="py-3 pr-4">{t("fridge.colStatus")}</th>
                  <th className="py-3 pr-5 text-center">{t("fridge.colActions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {items.map((p) => {
                  const checked = selected.includes(p.id);
                  const blocked = !checked && selected.length >= MAX_SELECTED;
                  return (
                    <tr key={p.id} className={cn("transition-colors hover:bg-surface-container-low", checked && "bg-primary-container/35")}>
                      <td className="py-3 pl-5">
                        <Checkbox checked={checked} disabled={blocked} onChange={() => toggle(p.id)} aria-label={p.name} />
                      </td>
                      <td className="py-3 pr-4">
                        <ProductCell product={p} />
                      </td>
                      <td className="py-3 pr-4 font-semibold whitespace-nowrap">{formatQty(p, i18n)}</td>
                      <td className="py-3 pr-4 text-xs whitespace-nowrap text-on-surface-variant">
                        {formatDate(p.effectiveExpiresAt)}
                        {p.openedAt && <span className="block text-2xs text-muted">{t("fridge.opened", { date: formatDate(p.openedAt) })}</span>}
                      </td>
                      <td className="py-3 pr-4">
                        <FreshnessBadge daysLeft={p.daysLeft} label={freshnessLabel(p.daysLeft, i18n)} />
                      </td>
                      <td className="py-3 pr-5">
                        <RowActions product={p} actions={actions} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <Pagination page={page.page} totalPages={page.totalPages} shown={items.length} total={page.total} onPage={(n) => setSearch({ page: n > 1 ? n : undefined }, { resetPage: false })} />
          </Card>

          <ul className={cn("grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3 lg:grid-cols-3", view === "table" && "md:hidden", list.isPlaceholderData && "opacity-60")}>
            {items.map((p) => {
              const checked = selected.includes(p.id);
              const blocked = !checked && selected.length >= MAX_SELECTED;
              return (
                <li key={p.id} className="min-w-0">
                  <SwipeRow label={t("fridge.discard")} onSwipe={() => actions.writeOff(p)}>
                    <div
                      className={cn(
                        "flex min-w-0 items-center gap-2.5 rounded-lg border bg-surface-container-lowest py-2.5 pr-1 pl-3 shadow-card transition-colors sm:gap-3",
                        checked ? "border-primary bg-primary-container/35" : "border-border",
                      )}
                    >
                      {/* На телефоні вибір продуктів для рецепта — у майстрі генератора (F-82), не в списку */}
                      <Checkbox className="max-sm:hidden" checked={checked} disabled={blocked} onChange={() => toggle(p.id)} aria-label={p.name} />
                      <ProductIcon category={p.category} className="size-10 rounded-lg sm:size-11" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-on-surface">{p.name}</p>
                        <p className="truncate text-2xs text-on-surface-variant">
                          {formatQty(p, i18n)} · {messages.zonesShort[p.zone]}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        <FreshnessBadge daysLeft={p.daysLeft} label={freshnessLabel(p.daysLeft, i18n)} />
                        <span className="text-2xs text-muted">{formatShortDate(p.effectiveExpiresAt)}</span>
                      </div>
                      <RowActions product={p} actions={actions} compact />
                    </div>
                  </SwipeRow>
                </li>
              );
            })}
          </ul>
          <div className={cn(view === "table" && "md:hidden")}>
            <Pagination page={page.page} totalPages={page.totalPages} shown={items.length} total={page.total} onPage={(n) => setSearch({ page: n > 1 ? n : undefined }, { resetPage: false })} card />
          </div>
        </>
      )}

      {/* ---------- Зони зберігання (на мобільному макеті їх немає) ---------- */}
      <div className="hidden gap-3 sm:grid sm:grid-cols-3 sm:gap-4">
        {(
          [
            ["fresh", Snowflake],
            ["middle", ThermometerSun],
            ["door", DoorOpen],
          ] as const
        ).map(([zone, Icon]) => (
          <Card key={zone} className="flex gap-4 p-5">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-surface-container text-primary">
              <Icon className="size-5" aria-hidden />
            </span>
            <div>
              <p className="font-bold">{messages.fridge.zones[zone].title}</p>
              <p className="mt-0.5 text-xs text-on-surface-variant">{messages.fridge.zones[zone].text}</p>
            </div>
          </Card>
        ))}
      </div>

      {/* ---------- Панель вибору → рецепт (F-28) ---------- */}
      {selected.length > 0 && (
        <div className="fixed inset-x-0 bottom-[calc(4.25rem+env(safe-area-inset-bottom))] z-20 px-4 lg:bottom-6">
          <div className="mx-auto flex max-w-2xl items-center gap-3 rounded-xl border border-border bg-surface-container-lowest p-3 pl-4 shadow-modal">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold">{t("fridge.selected", { n: selected.length })}</p>
              <p className="truncate text-2xs text-on-surface-variant">{selected.map((id) => names[id]).filter(Boolean).join(" · ")}</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setSelected([])}>
              {t("fridge.clear")}
            </Button>
            <Button onClick={() => void navigate({ to: "/recipes", search: { ids: selected } })}>
              <ChefHat className="size-4" />
              <span className="hidden sm:inline">{t("fridge.getRecipe")}</span>
            </Button>
          </div>
        </div>
      )}

      <ProductFormModal open={formOpen} product={editing} onClose={() => setFormOpen(false)} />
      <WriteOffModal
        product={writingOff}
        onClose={() => setWritingOff(null)}
        onSubmit={(product, request) => {
          setSelected((s) => s.filter((id) => id !== product.id));
          writeOff(product, request);
        }}
      />
    </div>
  );
}

function ProductCell({ product }: { product: Product }) {
  const { messages } = useI18n();
  return (
    <div className="flex min-w-0 items-center gap-3">
      <ProductIcon category={product.category} className="size-10" />
      <div className="min-w-0">
        <p className="truncate font-bold text-on-surface">{product.name}</p>
        {product.brand && <p className="truncate text-2xs font-medium text-on-surface-variant">{product.brand}</p>}
        <p className="truncate text-2xs text-muted">
          {messages.categories[product.category]}, {messages.zonesShort[product.zone]}
        </p>
      </div>
    </div>
  );
}

interface RowActionHandlers {
  edit: (p: Product) => void;
  open: (p: Product) => void;
  writeOff: (p: Product) => void;
}

/** F-26: дія за статусом (прострочено → списати, критичний → рецепт) і меню «⋮». */
function RowActions({ product, actions, compact }: { product: Product; actions: RowActionHandlers; compact?: boolean }) {
  const { t } = useI18n();
  return (
    <div className={cn("flex items-center gap-1", !compact && "justify-center")}>
      {!compact &&
        (product.daysLeft < 0 ? (
          <Button variant="ghost" size="icon" className="text-error" onClick={() => actions.writeOff(product)} aria-label={`${t("fridge.discard")}: ${product.name}`} title={t("fridge.discard")}>
            <Trash2 className="size-4" />
          </Button>
        ) : (
          <Link
            to="/recipes"
            search={{ ids: [product.id] }}
            className="inline-flex size-9 items-center justify-center rounded-md text-primary hover:bg-primary-container/50"
            aria-label={`${t("fridge.toRecipe")}: ${product.name}`}
            title={t("fridge.toRecipe")}
          >
            {product.daysLeft <= 2 ? <AlertTriangle className="size-4 text-on-warning-container" /> : <ChefHat className="size-4" />}
          </Link>
        ))}
      <Menu
        label={t("fridge.actions", { name: product.name })}
        items={[
          { label: t("fridge.edit"), icon: <Pencil />, onSelect: () => actions.edit(product) },
          ...(product.openedAt ? [] : [{ label: t("fridge.open"), icon: <PackageOpen />, onSelect: () => actions.open(product) }]),
          { label: t("fridge.discard"), icon: <Trash2 />, onSelect: () => actions.writeOff(product), tone: "danger" as const },
        ]}
      />
    </div>
  );
}

function Pagination({ page, totalPages, shown, total, onPage, card }: { page: number; totalPages: number; shown: number; total: number; onPage: (n: number) => void; card?: boolean }) {
  const { t } = useI18n();
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1).filter((n) => n === 1 || n === totalPages || Math.abs(n - page) <= 1);
  return (
    <nav
      aria-label={t("fridge.pagination")}
      className={cn(
        "flex flex-col items-center justify-between gap-2 px-5 py-3 text-xs text-on-surface-variant sm:flex-row",
        card ? "rounded-lg border border-border bg-surface-container-lowest" : "border-t border-border bg-surface-container-low",
      )}
    >
      <span>{t("fridge.shown", { shown, total })}</span>
      {totalPages > 1 && (
        <div className="flex items-center gap-1">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onPage(page - 1)}>
            {t("common.previous")}
          </Button>
          {pages.map((n, i) => (
            <span key={n} className="contents">
              {i > 0 && n - pages[i - 1]! > 1 && <span aria-hidden>…</span>}
              <button
                type="button"
                aria-label={t("fridge.page", { n })}
                aria-current={n === page ? "page" : undefined}
                onClick={() => onPage(n)}
                className={cn(
                  "flex size-8 cursor-pointer items-center justify-center rounded-md",
                  n === page ? "bg-surface-container font-semibold text-on-surface" : "hover:bg-surface-container-low",
                )}
              >
                {n}
              </button>
            </span>
          ))}
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => onPage(page + 1)}>
            {t("common.next")}
          </Button>
        </div>
      )}
    </nav>
  );
}

/** F-29: скелетон замість таблиці під час першого завантаження. */
function ListSkeleton() {
  const { t } = useI18n();
  return (
    <Card className="flex flex-col divide-y divide-border" aria-busy="true" aria-label={t("common.loading")}>
      {Array.from({ length: 5 }, (_, i) => (
        <div key={i} className="flex animate-pulse items-center gap-3 px-5 py-4">
          <span className="size-10 rounded-md bg-surface-container" />
          <span className="h-3 w-48 rounded bg-surface-container" />
          <span className="ml-auto h-5 w-20 rounded-pill bg-surface-container" />
        </div>
      ))}
    </Card>
  );
}
