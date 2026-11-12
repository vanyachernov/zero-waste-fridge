import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { api, queryKeys, type Category, type Member, type Presence, type ShoppingItem, type ShoppingList, type Store } from "@zwf/api-client";
import { useI18n } from "@zwf/i18n/react";
import { Avatar, Badge, Button, Card, Chip, Input, Menu, Select, buttonClasses, cn, useToast } from "@zwf/ui";
import { Check, ChevronDown, Home, LogOut, MapPin, Minus, Plus, Refrigerator, RefreshCcw, Search, Share2, ShoppingBasket, Sparkles, Trash2, UserPlus } from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
import { CATEGORY_EMOJI, CATEGORY_ORDER } from "../components/categoryEmoji";
import { MoveToFridgeModal } from "../components/MoveToFridgeModal";
import { SmartSyncModal } from "../components/SmartSyncModal";
import { errorMessage } from "../lib/errors";
import { can, householdQuery, membersQuery } from "../lib/household";
import { meQuery } from "../lib/queries";
import { changeQuantity, formatItemQty, parseQuickAdd, shareText } from "../lib/shopping";
import { useRealtimeStatus } from "../lib/realtime";
import { relativeTime } from "../lib/time";
import { useDocumentTitle } from "../lib/useDocumentTitle";

type Filter = { kind: "all" } | { kind: "store"; id: string } | { kind: "fridge" };

const listQuery = { queryKey: queryKeys.shoppingList, queryFn: () => api.shoppingList.get() };
const fromFridge = (i: ShoppingItem) => i.source === "AUTO" || i.source === "WRITE_OFF";

/** F-50…F-53 + I-40: «Розумний список покупок» за макетом. */
export function ShoppingPage() {
  const i18n = useI18n();
  const { t, plural } = i18n;
  useDocumentTitle(t("shopping.title"));
  const qc = useQueryClient();
  const toast = useToast();
  const list = useQuery(listQuery);
  const summary = useQuery({ queryKey: queryKeys.shoppingSummary, queryFn: () => api.shoppingList.summary() });
  const settings = useQuery({ queryKey: queryKeys.shoppingSettings, queryFn: () => api.shoppingList.settings() });
  const stores = useQuery({ queryKey: queryKeys.stores, queryFn: () => api.shoppingList.stores() });
  const household = useQuery(householdQuery);
  const members = useQuery(membersQuery);
  const presence = useQuery({ queryKey: queryKeys.presence, queryFn: () => api.realtime.presence() });
  const realtime = useRealtimeStatus();
  const setShopping = useMutation({
    mutationFn: (store: string | null) => api.realtime.setShopping(store),
    onSuccess: () => void qc.invalidateQueries({ queryKey: queryKeys.presence }),
    onError: (error) => toast.show({ message: errorMessage(error, i18n), tone: "error" }),
  });
  const [filter, setFilter] = useState<Filter>({ kind: "all" });
  const [showBought, setShowBought] = useState(true);
  const [smartOpen, setSmartOpen] = useState(false);
  const [moveOpen, setMoveOpen] = useState(false);

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: queryKeys.shoppingList });
  };
  const onError = (error: unknown) => {
    toast.show({ message: errorMessage(error, i18n), tone: "error" });
    invalidate();
  };

  /** Оптимістичні зміни: список оновлюється одразу, сервер — слідом. */
  const patchCache = (update: (list: ShoppingList) => ShoppingList) => {
    void qc.cancelQueries({ queryKey: queryKeys.shoppingList, exact: true });
    qc.setQueryData<ShoppingList>(queryKeys.shoppingList, (old) => (old ? update(old) : old));
  };

  const toggle = useMutation({
    mutationFn: (item: ShoppingItem) => api.shoppingList.toggle(item.id),
    onMutate: (item) =>
      patchCache((l) =>
        item.bought
          ? { toBuy: [...l.toBuy, { ...item, bought: false, boughtAt: null, boughtBy: null }], bought: l.bought.filter((x) => x.id !== item.id) }
          : { toBuy: l.toBuy.filter((x) => x.id !== item.id), bought: [{ ...item, bought: true, boughtAt: new Date().toISOString() }, ...l.bought] },
      ),
    onError,
    onSettled: invalidate,
  });

  const updateQty = useMutation({
    mutationFn: ({ item, quantity, unit }: { item: ShoppingItem; quantity: number; unit: ShoppingItem["unit"] }) =>
      api.shoppingList.update(item.id, { quantity, unit }),
    onMutate: ({ item, quantity, unit }) => patchCache((l) => ({ ...l, toBuy: l.toBuy.map((x) => (x.id === item.id ? { ...x, quantity, unit } : x)) })),
    onError,
    onSettled: invalidate,
  });

  const remove = useMutation({
    mutationFn: (item: ShoppingItem) => api.shoppingList.remove(item.id),
    onMutate: (item) => patchCache((l) => ({ toBuy: l.toBuy.filter((x) => x.id !== item.id), bought: l.bought.filter((x) => x.id !== item.id) })),
    onError,
    onSettled: invalidate,
  });

  const clearBought = useMutation({
    mutationFn: () => api.shoppingList.clearBought(),
    onMutate: () => patchCache((l) => ({ ...l, bought: [] })),
    onError,
    onSettled: invalidate,
  });

  const toBuy = list.data?.toBuy ?? [];
  const bought = list.data?.bought ?? [];
  const visible = useMemo(
    () =>
      toBuy.filter((i) => (filter.kind === "all" ? true : filter.kind === "fridge" ? fromFridge(i) : i.store?.id === filter.id)),
    [toBuy, filter],
  );
  const storesInList = useMemo(() => {
    const counts = new Map<string, { store: Store; n: number }>();
    toBuy.forEach((i) => i.store && counts.set(i.store.id, { store: i.store, n: (counts.get(i.store.id)?.n ?? 0) + 1 }));
    return [...counts.values()];
  }, [toBuy]);
  const fridgeItems = toBuy.filter(fromFridge);

  const share = async () => {
    const text = shareText(toBuy, i18n);
    try {
      if (navigator.share) {
        await navigator.share({ title: t("shopping.shareTitle"), text });
        return;
      }
      await navigator.clipboard.writeText(text);
      toast.show({ message: t("shopping.shareCopied"), tone: "success" });
    } catch (error) {
      if ((error as Error)?.name !== "AbortError") toast.show({ message: errorMessage(error, i18n), tone: "error" });
    }
  };

  return (
    <div className="flex flex-col gap-6 pb-24">
      {/* ---------- Заголовок ---------- */}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-2xs font-bold text-on-surface-variant">
            <Home className="size-3" aria-hidden /> {t("shopping.breadcrumbRoot")} <span className="text-outline-variant">/</span>
            <span className="text-primary">{t("shopping.title")}</span>
          </nav>
          <h1 className="mt-1 text-3xl font-extrabold tracking-tight sm:text-display">{t("shopping.heading")}</h1>
          <p className="mt-1 max-w-2xl text-sm text-on-surface-variant">{t("shopping.subtitle")}</p>
        </div>
        <div className="flex gap-2">
          {can(household.data?.permissions, "MANAGE_MEMBERS") && (
            <Link to="/family" className={buttonClasses("outline", "md", "rounded-xl")}>
              <UserPlus className="size-4 text-primary" aria-hidden /> {t("shopping.invite")}
            </Link>
          )}
          <Button className="rounded-xl" onClick={() => void share()} disabled={!toBuy.length}>
            <Share2 className="size-4" /> {t("shopping.share")}
          </Button>
        </div>
      </div>

      {/* ---------- Підсумки (B-45) ---------- */}
      <Card className="grid gap-4 p-4 sm:p-5 lg:grid-cols-[5fr_7fr]">
        <FamilyPresence
          members={members.data}
          online={presence.data?.online}
          connected={realtime.connected}
          lastEventAt={realtime.lastEventAt}
          stores={stores.data ?? []}
          onShopping={(store) => setShopping.mutate(store)}
        />
        <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
        <div className="rounded-xl bg-surface-container-low p-3">
          <p className="text-2xs text-on-surface-variant">{t("shopping.boughtOf")}</p>
          <p className="mt-1 flex flex-wrap items-baseline gap-1">
            <span className="text-[28px] leading-none font-bold text-primary">
              {t("shopping.boughtValue", { bought: summary.data?.bought ?? 0, total: summary.data?.total ?? 0 })}
            </span>
            <span className="text-2xs font-bold text-on-surface-variant">{t("shopping.positions")}</span>
            {summary.data?.estimatedTotal ? (
              <span className="text-2xs font-bold text-on-surface-variant">{t("shopping.estimate", { sum: summary.data.estimatedTotal })}</span>
            ) : null}
          </p>
        </div>
        <div className="rounded-xl bg-primary/10 p-3 sm:min-w-28">
          <p className="flex items-center gap-1 text-2xs font-bold text-primary">
            <Sparkles className="size-3" aria-hidden /> {t("shopping.autoImport")}
          </p>
          <p className="mt-1 flex items-baseline gap-1">
            <span className="text-[28px] leading-none font-bold text-primary">{summary.data?.autoCount ?? 0}</span>
            <span className="text-2xs font-bold text-on-surface-variant">{t("shopping.autoUnit")}</span>
          </p>
        </div>
        </div>
      </Card>

      {/* ---------- Smart Sync (B-43) ---------- */}
      <section
        aria-label={t("shopping.smartTitle")}
        className="flex flex-col gap-3 rounded-2xl border border-primary/20 bg-primary-container/30 p-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="flex items-start gap-4">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary text-on-primary shadow-card">
            <RefreshCcw className="size-5" aria-hidden />
          </span>
          <div>
            <p className="flex flex-wrap items-center gap-2 font-bold">
              {t("shopping.smartTitle")}
              <span className="rounded-pill bg-primary px-2 py-0.5 text-xs font-normal text-on-primary">Smart Sync</span>
            </p>
            <p className="mt-1 text-xs text-on-surface-variant">
              {settings.data && !settings.data.autoRefill
                ? t("shopping.smartOff")
                : fridgeItems.length
                  ? t("shopping.smartText", { names: fridgeItems.map((i) => i.name).join(", ") })
                  : t("shopping.smartTextNone")}
            </p>
          </div>
        </div>
        <Button variant="secondary" size="sm" className="self-start sm:self-auto" onClick={() => setSmartOpen(true)}>
          <RefreshCcw className="size-3.5" /> {t("shopping.smartSetup")}
        </Button>
      </section>

      <QuickAdd stores={stores.data ?? []} />

      {/* ---------- Треба купити ---------- */}
      <section aria-labelledby="to-buy" className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 id="to-buy" className="flex items-center gap-2 text-xl font-bold">
            <ShoppingBasket className="size-5 text-primary" aria-hidden />
            {t("shopping.toBuy")}
            <span className="rounded-pill bg-primary px-2 text-2xs leading-[18px] font-bold text-on-primary">{toBuy.length}</span>
          </h2>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label={t("shopping.filters")}>
            <Chip className="h-7 text-2xs" active={filter.kind === "all"} onClick={() => setFilter({ kind: "all" })}>
              {t("shopping.filterAll", { n: toBuy.length })}
            </Chip>
            {storesInList.map(({ store, n }) => (
              <Chip
                key={store.id}
                className="h-7 text-2xs"
                active={filter.kind === "store" && filter.id === store.id}
                onClick={() => setFilter({ kind: "store", id: store.id })}
              >
                {store.name} ({n})
              </Chip>
            ))}
            <Chip className="h-7 text-2xs" active={filter.kind === "fridge"} onClick={() => setFilter({ kind: "fridge" })}>
              {t("shopping.filterFridge", { n: fridgeItems.length })}
            </Chip>
          </div>
        </div>
        {list.isPending ? (
          <Card className="p-6 text-sm text-muted">{t("common.loading")}</Card>
        ) : list.isError ? (
          <Card className="flex items-center justify-between gap-3 p-6 text-sm">
            {errorMessage(list.error, i18n)}
            <Button variant="outline" size="sm" onClick={() => void list.refetch()}>
              {t("common.retry")}
            </Button>
          </Card>
        ) : visible.length === 0 ? (
          <Card className="p-6 text-center text-sm text-muted">{toBuy.length ? t("shopping.emptyFiltered") : t("shopping.empty")}</Card>
        ) : (
          <ul className="flex flex-col gap-2.5">
            {visible.map((item) => (
              <ItemRow
                key={item.id}
                item={item}
                onToggle={() => toggle.mutate(item)}
                onRemove={() => remove.mutate(item)}
                onQuantity={(direction) => {
                  const next = changeQuantity(item, direction);
                  if (next) updateQty.mutate({ item, ...next });
                }}
              />
            ))}
          </ul>
        )}
      </section>

      {/* ---------- Вже куплено ---------- */}
      {bought.length > 0 && (
        <section aria-labelledby="bought" className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-3">
            <h2 id="bought" className="text-xl font-bold">
              <button
                type="button"
                aria-expanded={showBought}
                onClick={() => setShowBought((v) => !v)}
                className="flex cursor-pointer items-center gap-2"
              >
                <ChevronDown className={cn("size-4 transition-transform", !showBought && "-rotate-90")} aria-hidden />
                {t("shopping.bought")}
                <span className="rounded-pill bg-surface-container px-2 text-2xs leading-[18px] font-bold text-on-surface-variant">{bought.length}</span>
              </button>
            </h2>
            <button
              type="button"
              onClick={() => clearBought.mutate()}
              className="flex cursor-pointer items-center gap-1 text-2xs font-bold text-on-surface-variant hover:text-error"
            >
              <Trash2 className="size-3" aria-hidden /> {t("shopping.clearBought")}
            </button>
          </div>
          {showBought && (
            <ul className="flex flex-col gap-2.5">
              {bought.map((item) => (
                <ItemRow key={item.id} item={item} onToggle={() => toggle.mutate(item)} onRemove={() => remove.mutate(item)} />
              ))}
            </ul>
          )}
        </section>
      )}

      {/* ---------- Закінчили покупки? (F-52) ---------- */}
      {bought.length > 0 && (
        <div className="fixed inset-x-0 bottom-[calc(4.25rem+env(safe-area-inset-bottom))] z-20 px-4 lg:bottom-6">
          <div className="mx-auto flex max-w-[1216px] flex-col gap-3 rounded-2xl bg-[#293040] p-4 text-white shadow-modal sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3.5">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary">
                <Refrigerator className="size-4.5" aria-hidden />
              </span>
              <div>
                <p className="font-bold">{t("shopping.doneTitle")}</p>
                <p className="text-xs text-white/75">
                  {t("shopping.doneText", { n: bought.length, unit: plural(bought.length, ["придбаний товар", "придбані товари", "придбаних товарів"]) })}
                </p>
              </div>
            </div>
            <Button onClick={() => setMoveOpen(true)} className="rounded-xl">
              <Refrigerator className="size-4" /> {t("shopping.doneCta")}
            </Button>
          </div>
        </div>
      )}

      <SmartSyncModal open={smartOpen} onClose={() => setSmartOpen(false)} />
      <MoveToFridgeModal open={moveOpen} items={bought} onClose={() => setMoveOpen(false)} />
    </div>
  );
}

/** F-63: «Максим зараз у «Сільпо»», хто онлайн, стан синхронізації і «Я в магазині». */
function FamilyPresence({
  members,
  online,
  connected,
  lastEventAt,
  stores,
  onShopping,
}: {
  members: Member[] | undefined;
  online: Presence["online"] | undefined;
  connected: boolean;
  lastEventAt: string | null;
  stores: Store[];
  onShopping: (store: string | null) => void;
}) {
  const i18n = useI18n();
  const { t, plural } = i18n;
  const onlineIds = new Set(online?.map((o) => o.id));
  const me = members?.find((m) => m.me);
  const shopper = online?.find((o) => o.shoppingAt);
  const myStore = online?.find((o) => o.id === me?.id)?.shoppingAt ?? null;
  const first = (name: string) => name.split(" ")[0] ?? name;
  const onlineCount = online?.length ?? 0;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-2xs font-bold tracking-wide text-muted uppercase">{t("shopping.familyAccess")}</p>
        <Badge tone={connected ? "primary" : "neutral"} dot>
          {connected ? t("realtime.synced", { ago: lastEventAt ? relativeTime(lastEventAt, i18n) : t("time.justNow") }) : t("realtime.offline")}
        </Badge>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex -space-x-2">
          {members?.slice(0, 4).map((m, index) => (
            <span key={m.id} className="relative">
              <Avatar name={m.name} src={m.avatarUrl} tone={(["primary", "warning", "neutral"] as const)[index % 3]} className="ring-2 ring-surface-container-lowest" />
              {onlineIds.has(m.id) && (
                <span className="absolute -right-0.5 -bottom-0.5 size-3 rounded-full bg-primary ring-2 ring-surface-container-lowest" aria-hidden />
              )}
            </span>
          ))}
        </div>
        <div className="min-w-0">
          {shopper && (
            <p className="truncate text-sm font-bold">{t("realtime.shoppingAt", { name: first(shopper.name), store: shopper.shoppingAt! })}</p>
          )}
          {members && (
            <p className="text-xs text-on-surface-variant">
              {t("shopping.members", {
                names: members.map((m) => (m.me ? `${first(m.name)} (${t("family.you")})` : first(m.name))).join(", "),
                n: members.length,
                unit: plural(members.length, ["учасник", "учасники", "учасників"]),
              })}
              {onlineCount > 0 && ` • ${t("realtime.online", { n: onlineCount, unit: plural(onlineCount, ["учасник", "учасники", "учасників"]) })}`}
            </p>
          )}
        </div>
      </div>
      {myStore ? (
        <Button variant="ghost" size="sm" className="self-start" onClick={() => onShopping(null)}>
          <LogOut className="size-3.5" /> {t("realtime.leftStore")}
        </Button>
      ) : (
        <Menu
          label={t("realtime.whichStore")}
          align="left"
          className="self-start"
          trigger={
            <span className="flex items-center gap-1.5 px-2 text-xs font-semibold text-primary">
              <MapPin className="size-3.5" aria-hidden /> {t("realtime.imShopping")}
            </span>
          }
          items={(stores.length ? stores.map((s) => s.name) : [t("shopping.anyStore")]).map((name) => ({ label: name, onSelect: () => onShopping(name) }))}
        />
      )}
    </div>
  );
}

function ItemRow({
  item,
  onToggle,
  onRemove,
  onQuantity,
}: {
  item: ShoppingItem;
  onToggle: () => void;
  onRemove: () => void;
  onQuantity?: (direction: 1 | -1) => void;
}) {
  const i18n = useI18n();
  const { t, messages } = i18n;
  const { data: me } = useQuery(meQuery);
  const qty = formatItemQty(item, i18n);
  const canDecrease = Boolean(onQuantity && changeQuantity(item, -1));

  const tags: { text: string; tone: "error" | "primary" | "warning" | "neutral" }[] = [];
  if (!item.bought) {
    if (item.source === "WRITE_OFF" || item.source === "AUTO") {
      const closed = item.sourceProduct?.closedAt;
      tags.push(
        closed
          ? { text: t("shopping.tagEndedAgo", { ago: relativeTime(closed, i18n) }), tone: "error" }
          : item.source === "AUTO"
            ? { text: t("shopping.tagAuto"), tone: "primary" }
            : { text: t("shopping.tagWrittenOff"), tone: "error" },
      );
      if (closed && item.source === "AUTO") tags.push({ text: t("shopping.tagAuto"), tone: "primary" });
    }
    if (item.source === "RECIPE") tags.push({ text: t("shopping.tagRecipe"), tone: "neutral" });
    if (item.priority === "HIGH") tags.push({ text: t("shopping.tagHigh"), tone: "warning" });
  }
  const meta = [
    item.category ? messages.categories[item.category] : null,
    item.store?.name ?? null,
    !item.bought && item.addedBy && item.addedBy.id !== me?.id ? t("shopping.addedBy", { name: item.addedBy.name }) : null,
  ].filter(Boolean);

  return (
    <li className={cn("flex items-center gap-3 rounded-xl p-3.5 sm:p-4", item.bought ? "bg-surface-container-low/70" : "bg-surface-container-lowest shadow-card")}>
      <button
        type="button"
        aria-label={t(item.bought ? "shopping.markNotBought" : "shopping.markBought", { name: item.name })}
        aria-pressed={item.bought}
        onClick={onToggle}
        className={cn(
          "flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-md transition-colors",
          item.bought ? "bg-primary text-on-primary" : "bg-secondary-container text-transparent hover:text-primary",
        )}
      >
        <Check className="size-3.5" aria-hidden />
      </button>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className={cn("font-bold", item.bought && "text-on-surface-variant line-through")}>{item.name}</span>
          {qty && <span className="rounded bg-surface-container px-1.5 text-2xs font-semibold text-on-surface-variant">{qty}</span>}
          {tags.map((tag) => (
            <Badge key={tag.text} tone={tag.tone}>
              {tag.text}
            </Badge>
          ))}
          {item.priceEstimate !== null && !item.bought && (
            <span className="text-2xs font-semibold text-on-surface-variant">{t("shopping.price", { sum: item.priceEstimate })}</span>
          )}
        </div>
        <p className="mt-0.5 truncate text-2xs text-on-surface-variant">
          {item.bought && item.boughtAt
            ? item.boughtBy
              ? t("shopping.boughtBy", { ago: relativeTime(item.boughtAt, i18n), name: item.boughtBy.name })
              : t("shopping.boughtAgo", { ago: relativeTime(item.boughtAt, i18n) })
            : meta.join(" • ")}
        </p>
      </div>
      {onQuantity && !item.bought && (
        <div className="flex items-center rounded-md bg-surface-container-low">
          <button
            type="button"
            aria-label={`${t("shopping.decrease")}: ${item.name}`}
            disabled={!canDecrease}
            onClick={() => onQuantity(-1)}
            className="flex size-7 cursor-pointer items-center justify-center rounded-sm text-on-surface-variant hover:bg-surface-container disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Minus className="size-3" />
          </button>
          <span className="min-w-6 text-center text-2xs font-bold" aria-live="polite">
            {item.quantity ?? 1}
          </span>
          <button
            type="button"
            aria-label={`${t("shopping.increase")}: ${item.name}`}
            onClick={() => onQuantity(1)}
            className="flex size-7 cursor-pointer items-center justify-center rounded-sm text-on-surface-variant hover:bg-surface-container"
          >
            <Plus className="size-3" />
          </button>
        </div>
      )}
      <button
        type="button"
        aria-label={t("shopping.remove", { name: item.name })}
        onClick={onRemove}
        className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-md text-muted hover:bg-error-container hover:text-on-error-container"
      >
        <Trash2 className="size-4" />
      </button>
    </li>
  );
}

const NEW_STORE = "__new__";

/** Рядок швидкого додавання: назва (з кількістю в кінці), категорія, магазин. */
function QuickAdd({ stores }: { stores: Store[] }) {
  const i18n = useI18n();
  const { t, messages } = i18n;
  const qc = useQueryClient();
  const toast = useToast();
  const [text, setText] = useState("");
  const [category, setCategory] = useState<Category | "">("");
  const [storeId, setStoreId] = useState("");

  const add = useMutation({
    mutationFn: () => {
      const parsed = parseQuickAdd(text);
      return api.shoppingList.add({ ...parsed, category: category || null, storeId: storeId || null });
    },
    onSuccess: (item) => {
      setText("");
      void qc.invalidateQueries({ queryKey: queryKeys.shoppingList });
      toast.show({ message: t("shopping.added", { name: item.name }), tone: "success" });
    },
    onError: (error) => toast.show({ message: errorMessage(error, i18n), tone: "error" }),
  });

  const addStore = useMutation({
    mutationFn: (name: string) => api.shoppingList.addStore(name),
    onSuccess: (store) => {
      void qc.invalidateQueries({ queryKey: queryKeys.stores });
      setStoreId(store.id);
    },
    onError: (error) => toast.show({ message: errorMessage(error, i18n), tone: "error" }),
  });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (text.trim()) add.mutate();
  };

  return (
    <Card className="p-4">
      <form onSubmit={submit} className="flex flex-col gap-3 lg:flex-row">
        <Input
          className="h-11 rounded-xl lg:flex-1"
          leading={<Search className="size-4" />}
          aria-label={t("shopping.addName")}
          placeholder={t("shopping.addPlaceholder")}
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <div className="grid grid-cols-2 gap-3 sm:flex">
          <Select
            aria-label={t("shopping.addCategory")}
            className="h-11 rounded-xl sm:w-48"
            leading={category ? CATEGORY_EMOJI[category] : "🧺"}
            value={category}
            onChange={setCategory}
            options={[{ value: "", label: t("shopping.noCategory") }, ...CATEGORY_ORDER.map((c) => ({ value: c, label: messages.categories[c] }))]}
          />
          <Select
            aria-label={t("shopping.addStore")}
            className="h-11 rounded-xl sm:w-40"
            leading="🏬"
            value={storeId}
            onChange={(value) => {
              if (value !== NEW_STORE) return setStoreId(value);
              const name = window.prompt(t("shopping.newStorePrompt"))?.trim();
              if (name) addStore.mutate(name);
            }}
            options={[{ value: "", label: t("shopping.anyStore") }, ...stores.map((s) => ({ value: s.id, label: s.name })), { value: NEW_STORE, label: t("shopping.newStore") }]}
          />
          <Button type="submit" className="col-span-2 h-11 rounded-xl" disabled={add.isPending || !text.trim()}>
            <Plus className="size-4" /> {t("shopping.addSubmit")}
          </Button>
        </div>
      </form>
    </Card>
  );
}

