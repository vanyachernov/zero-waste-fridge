import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api, queryKeys, type Category, type ProductCreate, type StorageZone, type Unit } from "@zwf/api-client";
import { useI18n } from "@zwf/i18n/react";
import { Button, Field, Input, Modal } from "@zwf/ui";
import { Save } from "lucide-react";
import { useState, type FormEvent } from "react";

const CATEGORIES: Category[] = ["vegetables", "dairy", "meat", "fruits", "sauces", "other"];
const ZONES: StorageZone[] = ["fresh", "middle", "door", "freezer"];
const UNITS: Unit[] = ["g", "kg", "ml", "l", "pcs"];

const selectClass =
  "h-10 w-full rounded-md border border-border bg-surface-container-lowest px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15";

const inDays = (n: number) => new Date(Date.now() + n * 864e5).toISOString().slice(0, 10);

export function AddProductModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t, messages } = useI18n();
  const qc = useQueryClient();
  const [form, setForm] = useState<ProductCreate>({
    name: "",
    category: "vegetables",
    zone: "fresh",
    quantity: 1,
    unit: "pcs",
    expiresAt: inDays(5),
  });
  const [touched, setTouched] = useState(false);

  const mutation = useMutation({
    mutationFn: api.products.create,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.products });
      setForm((f) => ({ ...f, name: "" }));
      setTouched(false);
      onClose();
    },
  });

  const set = <K extends keyof ProductCreate>(key: K, value: ProductCreate[K]) => setForm((f) => ({ ...f, [key]: value }));
  const nameError = touched && !form.name.trim() ? t("addProduct.required") : undefined;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (!form.name.trim()) return;
    mutation.mutate({ ...form, name: form.name.trim() });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t("addProduct.title")}
      description={t("addProduct.description")}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {t("addProduct.cancel")}
          </Button>
          <Button type="submit" form="add-product" disabled={mutation.isPending}>
            <Save className="size-4" /> {t("addProduct.save")}
          </Button>
        </>
      }
    >
      <form id="add-product" onSubmit={submit} className="grid gap-4 sm:grid-cols-2" noValidate>
        <Field label={t("addProduct.name")} error={nameError} className="sm:col-span-2">
          <Input
            autoFocus
            value={form.name}
            invalid={!!nameError}
            placeholder={t("addProduct.namePlaceholder")}
            onChange={(e) => set("name", e.target.value)}
            onBlur={() => setTouched(true)}
          />
        </Field>
        <Field label={t("addProduct.category")}>
          <select className={selectClass} value={form.category} onChange={(e) => set("category", e.target.value as Category)}>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {messages.categories[c]}
              </option>
            ))}
          </select>
        </Field>
        <Field label={t("addProduct.zone")}>
          <select className={selectClass} value={form.zone} onChange={(e) => set("zone", e.target.value as StorageZone)}>
            {ZONES.map((z) => (
              <option key={z} value={z}>
                {messages.zonesShort[z]}
              </option>
            ))}
          </select>
        </Field>
        <div className="grid grid-cols-[1fr_6rem] gap-2">
          <Field label={t("addProduct.quantity")}>
            <Input type="number" min={0} step="any" inputMode="decimal" value={form.quantity} onChange={(e) => set("quantity", Number(e.target.value))} />
          </Field>
          <Field label={t("addProduct.unit")}>
            <select className={selectClass} value={form.unit} onChange={(e) => set("unit", e.target.value as Unit)}>
              {UNITS.map((u) => (
                <option key={u} value={u}>
                  {messages.units[u]}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <Field label={t("addProduct.expiresAt")}>
          <Input type="date" value={form.expiresAt} onChange={(e) => set("expiresAt", e.target.value)} />
        </Field>
      </form>
    </Modal>
  );
}
