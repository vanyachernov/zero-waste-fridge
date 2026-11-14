import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, queryKeys, type Category, type Product, type ProductInput, type StorageZone, type Unit } from "@zwf/api-client";
import { useI18n } from "@zwf/i18n/react";
import { Button, Chip, Field, Input, Modal, SegmentedControl, Select, Switch, useToast } from "@zwf/ui";
import { BellRing, PackagePlus, PencilLine, Save, TriangleAlert } from "lucide-react";
import { useEffect, useId, useMemo, useState, type FormEvent } from "react";
import { errorMessage, fieldMessage, serverFieldErrors } from "../lib/errors";
import { addDaysIso, daysLeft, dayUnit, openedShelfLife, todayIso } from "../lib/freshness";
import { dictionariesQuery } from "../lib/queries";
import { CATEGORY_EMOJI, CATEGORY_ORDER } from "./categoryEmoji";
import { FormAlert } from "../auth/FormAlert";

const ZONES: readonly StorageZone[] = ["fresh", "middle", "door", "freezer"];
const UNITS: readonly Unit[] = ["g", "kg", "ml", "l", "pcs"];
const REMIND = ["1", "2", "3", "7"] as const;
const FIELDS = ["name", "brand", "category", "zone", "quantity", "unit", "purchasedAt", "expiresAt", "openedAt", "remindBeforeDays"] as const;
type FieldName = (typeof FIELDS)[number];

interface FormState {
  name: string;
  brand: string;
  category: Category;
  zone: StorageZone;
  quantity: string;
  unit: Unit;
  purchasedAt: string;
  expiresAt: string;
  opened: boolean;
  openedAt: string;
  remind: (typeof REMIND)[number];
}

function initialState(product: Product | undefined): FormState {
  const today = todayIso();
  if (product) {
    return {
      name: product.name,
      brand: product.brand ?? "",
      category: product.category,
      zone: product.zone,
      quantity: String(product.quantity),
      unit: product.unit,
      purchasedAt: product.purchasedAt ?? "",
      expiresAt: product.expiresAt,
      opened: product.openedAt !== null,
      openedAt: product.openedAt ?? today,
      remind: String(product.remindBeforeDays) as FormState["remind"],
    };
  }
  return {
    name: "",
    brand: "",
    category: "dairy",
    zone: "middle",
    quantity: "1",
    unit: "pcs",
    purchasedAt: today,
    expiresAt: addDaysIso(today, 7),
    opened: false,
    openedAt: today,
    remind: "2",
  };
}

export interface ProductFormModalProps {
  open: boolean;
  onClose: () => void;
  /** Є — редагування (F-27), немає — новий продукт (F-24). */
  product?: Product;
}

/** F-24 / F-27: модалка «Додати продукт» за макетом; та сама форма редагує продукт. */
export function ProductFormModal({ open, onClose, product }: ProductFormModalProps) {
  const i18n = useI18n();
  const { t, messages, formatDate } = i18n;
  const qc = useQueryClient();
  const toast = useToast();
  const formId = useId();
  const { data: dictionaries } = useQuery(dictionariesQuery);
  const [form, setForm] = useState<FormState>(() => initialState(product));
  const [touched, setTouched] = useState({ zone: Boolean(product), expiresAt: Boolean(product) });
  const [errors, setErrors] = useState<Partial<Record<FieldName, string>>>({});

  // Відкрили знову (інший продукт або новий) — форма з чистого аркуша
  useEffect(() => {
    if (!open) return;
    setForm(initialState(product));
    setTouched({ zone: Boolean(product), expiresAt: Boolean(product) });
    setErrors({});
  }, [open, product]);

  const mutation = useMutation({
    mutationFn: (input: ProductInput) => (product ? api.products.update(product.id, input) : api.products.create(input)),
    onSuccess: (saved) => {
      void qc.invalidateQueries({ queryKey: queryKeys.products });
      toast.show({ message: product ? t("fridge.toastSaved") : t("fridge.toastAdded", { name: saved.name }), tone: "success" });
      onClose();
    },
    onError: (error) => setErrors(serverFieldErrors(error, FIELDS)),
  });

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((f) => ({ ...f, [key]: value }));

  /** Категорія підтягує типову зону й термін, поки користувач їх не змінив сам. */
  const setCategory = (category: Category) => {
    const entry = dictionaries?.categories.find((c) => c.code === category);
    setForm((f) => ({
      ...f,
      category,
      zone: !touched.zone && entry ? entry.defaultZone : f.zone,
      expiresAt: !touched.expiresAt && entry ? addDaysIso(f.purchasedAt || todayIso(), entry.defaultShelfLifeDays) : f.expiresAt,
    }));
  };

  const left = form.expiresAt ? daysLeft(form.expiresAt) : null;
  const openedPreview = useMemo(() => {
    if (!form.opened || !dictionaries || !form.openedAt || !form.expiresAt) return null;
    const days = openedShelfLife(dictionaries, form.category, form.name);
    const afterOpening = addDaysIso(form.openedAt, days);
    return { days, shortened: afterOpening < form.expiresAt, date: afterOpening < form.expiresAt ? afterOpening : form.expiresAt };
  }, [form.opened, form.openedAt, form.expiresAt, form.category, form.name, dictionaries]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const quantity = Number(form.quantity.replace(",", "."));
    const local: Partial<Record<FieldName, string>> = {};
    if (!form.name.trim()) local.name = "NotBlank";
    if (!(quantity > 0)) local.quantity = "Positive";
    if (!form.expiresAt) local.expiresAt = "NotNull";
    setErrors(local);
    if (Object.keys(local).length) return;
    mutation.mutate({
      name: form.name.trim(),
      brand: form.brand.trim() || null,
      category: form.category,
      zone: form.zone,
      quantity,
      unit: form.unit,
      purchasedAt: form.purchasedAt || null,
      expiresAt: form.expiresAt,
      openedAt: form.opened ? form.openedAt || todayIso() : null,
      remindBeforeDays: Number(form.remind),
    });
  };

  const error = (field: FieldName) => fieldMessage(errors[field], i18n);
  const generalError = mutation.isError && !Object.keys(serverFieldErrors(mutation.error, FIELDS)).length ? errorMessage(mutation.error, i18n) : null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      icon={product ? <PencilLine /> : <PackagePlus />}
      title={product ? t("addProduct.editTitle") : t("addProduct.title")}
      description={t("addProduct.description")}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            {t("addProduct.cancel")}
          </Button>
          <Button type="submit" form={formId} disabled={mutation.isPending}>
            <Save className="size-4" /> {product ? t("addProduct.saveChanges") : t("addProduct.save")}
          </Button>
        </>
      }
    >
      <form id={formId} onSubmit={submit} className="flex flex-col gap-5" noValidate>
        <FormAlert message={generalError} />
        <Field label={`${t("addProduct.name")} *`} error={error("name")} htmlFor={`${formId}-name`}>
          <Input
            id={`${formId}-name`}
            value={form.name}
            invalid={Boolean(errors.name)}
            placeholder={t("addProduct.namePlaceholder")}
            onChange={(e) => set("name", e.target.value)}
          />
        </Field>
        <Field label={t("addProduct.brand")} error={error("brand")} htmlFor={`${formId}-brand`}>
          <Input id={`${formId}-brand`} value={form.brand} placeholder={t("addProduct.brandPlaceholder")} onChange={(e) => set("brand", e.target.value)} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={`${t("addProduct.category")} *`} error={error("category")} htmlFor={`${formId}-category`}>
            <Select
              id={`${formId}-category`}
              value={form.category}
              onChange={setCategory}
              leading={CATEGORY_EMOJI[form.category]}
              options={CATEGORY_ORDER.map((c) => ({ value: c, label: messages.categories[c] }))}
            />
          </Field>
          <Field label={t("addProduct.zone")} error={error("zone")} htmlFor={`${formId}-zone`}>
            <Select
              id={`${formId}-zone`}
              value={form.zone}
              onChange={(zone) => {
                setTouched((x) => ({ ...x, zone: true }));
                set("zone", zone);
              }}
              options={ZONES.map((z) => ({ value: z, label: messages.zonesShort[z] }))}
            />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={`${t("addProduct.quantity")} *`} error={error("quantity") ?? error("unit")} htmlFor={`${formId}-quantity`}>
            <div className="flex gap-2">
              <Input
                id={`${formId}-quantity`}
                className="w-[84px] shrink-0"
                inputMode="decimal"
                value={form.quantity}
                invalid={Boolean(errors.quantity)}
                onChange={(e) => set("quantity", e.target.value)}
              />
              <SegmentedControl
                label={t("addProduct.unit")}
                value={form.unit}
                onChange={(unit) => set("unit", unit)}
                options={UNITS.map((u) => ({ value: u, label: messages.units[u] }))}
                stretch
              />
            </div>
          </Field>
          <Field label={t("addProduct.purchasedAt")} error={error("purchasedAt")} htmlFor={`${formId}-purchased`}>
            <Input
              id={`${formId}-purchased`}
              type="date"
              max={todayIso()}
              value={form.purchasedAt}
              invalid={Boolean(errors.purchasedAt)}
              onChange={(e) => set("purchasedAt", e.target.value)}
            />
          </Field>
        </div>
        <Field label={`${t("addProduct.expiresAt")} *`} error={error("expiresAt")} htmlFor={`${formId}-expires`}>
          <Input
            id={`${formId}-expires`}
            type="date"
            value={form.expiresAt}
            invalid={Boolean(errors.expiresAt)}
            onChange={(e) => {
              setTouched((x) => ({ ...x, expiresAt: true }));
              set("expiresAt", e.target.value);
            }}
          />
          {left !== null && (
            <span
              className={
                left < 0
                  ? "w-fit rounded-pill bg-error-container px-2 py-0.5 text-2xs font-bold text-on-error-container"
                  : left <= 2
                    ? "w-fit rounded-pill bg-warning-container px-2 py-0.5 text-2xs font-bold text-on-warning-container"
                    : "w-fit rounded-pill bg-primary-container px-2 py-0.5 text-2xs font-bold text-on-primary-container"
              }
            >
              {left < 0 ? t("addProduct.expiredAgo") : left === 0 ? t("addProduct.expiresToday") : t("addProduct.daysLeft", { n: left, unit: dayUnit(left, i18n) })}
            </span>
          )}
        </Field>

        <hr className="border-border" />

        <div className="flex flex-col gap-3">
          <Switch checked={form.opened} onChange={(v) => set("opened", v)} label={t("addProduct.opened")} description={t("addProduct.openedHint")} />
          {form.opened && (
            <>
              <Field label={t("addProduct.openedAt")} error={error("openedAt")} htmlFor={`${formId}-opened`} className="sm:max-w-[264px]">
                <Input
                  id={`${formId}-opened`}
                  type="date"
                  max={todayIso()}
                  value={form.openedAt}
                  invalid={Boolean(errors.openedAt)}
                  onChange={(e) => set("openedAt", e.target.value)}
                />
              </Field>
              {openedPreview && (
                <p className="flex items-start gap-2.5 rounded-md bg-warning-container px-3 py-2.5 text-xs text-on-warning-container">
                  <TriangleAlert className="mt-px size-4 shrink-0" aria-hidden />
                  {t(openedPreview.shortened ? "addProduct.openedShortened" : "addProduct.openedKeeps", {
                    n: openedPreview.days,
                    unit: dayUnit(openedPreview.days, i18n),
                    date: formatDate(openedPreview.date),
                  })}
                </p>
              )}
            </>
          )}
        </div>

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-on-surface-variant">
            <BellRing className="size-3.5" aria-hidden /> {t("addProduct.remind")}
          </legend>
          <div className="flex flex-wrap gap-2">
            {REMIND.map((days) => (
              <Chip key={days} active={form.remind === days} onClick={() => set("remind", days)} className="h-7 px-3">
                {messages.addProduct.remindOptions[days]}
              </Chip>
            ))}
          </div>
          {error("remindBeforeDays") && <p className="text-2xs font-medium text-error">{error("remindBeforeDays")}</p>}
        </fieldset>
      </form>
    </Modal>
  );
}
