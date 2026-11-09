import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, queryKeys, type ShoppingItem, type StorageZone } from "@zwf/api-client";
import { useI18n } from "@zwf/i18n/react";
import { Button, Input, Modal, Select, useToast } from "@zwf/ui";
import { Refrigerator } from "lucide-react";
import { useEffect, useState } from "react";
import { FormAlert } from "../auth/FormAlert";
import { errorMessage, fieldMessage } from "../lib/errors";
import { addDaysIso, todayIso } from "../lib/freshness";
import { dictionariesQuery } from "../lib/queries";
import { formatItemQty } from "../lib/shopping";
import { isApiError } from "@zwf/api-client";

const ZONES: readonly StorageZone[] = ["fresh", "middle", "door", "freezer"];

interface Row {
  id: string;
  expiresAt: string;
  zone: StorageZone;
}

/** F-52: підтвердження «Додати в холодильник» — поправити термін і зону кожної позиції (B-42). */
export function MoveToFridgeModal({ items, open, onClose }: { items: ShoppingItem[]; open: boolean; onClose: () => void }) {
  const i18n = useI18n();
  const { t, messages, plural } = i18n;
  const qc = useQueryClient();
  const toast = useToast();
  const { data: dictionaries } = useQuery(dictionariesQuery);
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    if (!open || !dictionaries) return;
    const today = todayIso();
    setRows(
      items.map((item) => {
        const entry = dictionaries.categories.find((c) => c.code === (item.category ?? "other"))!;
        return { id: item.id, expiresAt: addDaysIso(today, entry.defaultShelfLifeDays), zone: entry.defaultZone };
      }),
    );
  }, [open, items, dictionaries]);

  const move = useMutation({
    mutationFn: () => api.shoppingList.moveToFridge({ items: rows.map(({ id, expiresAt, zone }) => ({ id, expiresAt, zone })) }),
    onSuccess: (result) => {
      void qc.invalidateQueries({ queryKey: queryKeys.shoppingList });
      void qc.invalidateQueries({ queryKey: queryKeys.products });
      toast.show({ message: t("shopping.moved", { n: result.moved, unit: plural(result.moved, ["продукт", "продукти", "продуктів"]) }), tone: "success" });
      onClose();
    },
  });

  const set = (id: string, patch: Partial<Row>) => setRows((list) => list.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  const rowError = (index: number) => (isApiError(move.error) ? move.error.fieldErrors[`items[${index}].expiresAt`] : undefined);
  const general = move.isError && !Object.keys(isApiError(move.error) ? move.error.fieldErrors : {}).length ? errorMessage(move.error, i18n) : null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      icon={<Refrigerator />}
      title={t("shopping.moveTitle")}
      description={t("shopping.moveDescription")}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            {t("addProduct.cancel")}
          </Button>
          <Button onClick={() => move.mutate()} disabled={move.isPending || !rows.length}>
            <Refrigerator className="size-4" /> {t("shopping.moveSubmit", { n: rows.length })}
          </Button>
        </>
      }
    >
      <FormAlert message={general} />
      <ul className="flex flex-col divide-y divide-border">
        {items.map((item, index) => {
          const row = rows.find((r) => r.id === item.id);
          if (!row) return null;
          const qty = formatItemQty(item, i18n);
          return (
            <li key={item.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold">{item.name}</p>
                <p className="text-2xs text-on-surface-variant">
                  {[qty, item.category ? messages.categories[item.category] : null].filter(Boolean).join(" · ")}
                </p>
                {rowError(index) && <p className="text-2xs font-medium text-error">{fieldMessage(rowError(index), i18n)}</p>}
              </div>
              <Input
                type="date"
                aria-label={t("shopping.moveExpires", { name: item.name })}
                className="sm:w-40"
                min={todayIso()}
                value={row.expiresAt}
                invalid={Boolean(rowError(index))}
                onChange={(e) => set(item.id, { expiresAt: e.target.value })}
              />
              <Select
                aria-label={t("shopping.moveZone", { name: item.name })}
                className="sm:w-44"
                value={row.zone}
                onChange={(zone) => set(item.id, { zone })}
                options={ZONES.map((z) => ({ value: z, label: messages.zonesShort[z] }))}
              />
            </li>
          );
        })}
      </ul>
    </Modal>
  );
}
