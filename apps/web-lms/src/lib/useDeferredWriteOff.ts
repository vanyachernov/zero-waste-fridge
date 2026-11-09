import { useQueryClient, type QueryClient } from "@tanstack/react-query";
import { api, queryKeys, type Product, type ProductPage, type WriteOffRequest } from "@zwf/api-client";
import { useI18n } from "@zwf/i18n/react";
import { useToast } from "@zwf/ui";
import { useCallback, useEffect, useRef } from "react";
import { errorMessage } from "./errors";
import { formatQty } from "./freshness";

/** Стільки ж, скільки живе toast «Списано · Скасувати». */
export const UNDO_MS = 5000;

interface Pending {
  timer: ReturnType<typeof setTimeout>;
  run: () => Promise<void>;
}

/** Оптимістично: продукт зникає (або зменшується) в усіх завантажених сторінках списку. */
function applyOptimistic(qc: QueryClient, product: Product, request: WriteOffRequest) {
  const partial = typeof request.quantity === "number" && request.quantity < product.quantity;
  qc.setQueriesData<ProductPage>({ queryKey: ["products", "list"] }, (page) => {
    if (!page) return page;
    if (partial) {
      return {
        ...page,
        items: page.items.map((p) => (p.id === product.id ? { ...p, quantity: Math.round((p.quantity - (request.quantity as number)) * 1000) / 1000 } : p)),
      };
    }
    if (!page.items.some((p) => p.id === product.id)) return page;
    return { ...page, items: page.items.filter((p) => p.id !== product.id), total: page.total - 1 };
  });
}

/**
 * F-30: «Списано · Скасувати». Бекенд не вміє відмінити списання, тож запит відкладаємо на {@link UNDO_MS}:
 * «Скасувати» просто прибирає його, а UI відновлюється з сервера. Якщо користувач іде зі сторінки
 * раніше — запит надсилається одразу, щоб дія не загубилась.
 */
export function useDeferredWriteOff() {
  const qc = useQueryClient();
  const toast = useToast();
  const i18n = useI18n();
  const pending = useRef(new Map<string, Pending>());

  useEffect(() => {
    const map = pending.current;
    return () => {
      for (const [id, entry] of map) {
        clearTimeout(entry.timer);
        void entry.run();
        map.delete(id);
      }
    };
  }, []);

  return useCallback(
    (product: Product, request: WriteOffRequest) => {
      const partial = typeof request.quantity === "number" && request.quantity < product.quantity;
      const run = async () => {
        pending.current.delete(product.id);
        try {
          await api.products.writeOff(product.id, request);
        } catch (error) {
          toast.show({ message: errorMessage(error, i18n), tone: "error" });
        } finally {
          await qc.invalidateQueries({ queryKey: queryKeys.products });
          if (request.addToShoppingList) await qc.invalidateQueries({ queryKey: queryKeys.shoppingList });
        }
      };

      void qc.cancelQueries({ queryKey: queryKeys.products });
      applyOptimistic(qc, product, request);
      const timer = setTimeout(() => void run(), UNDO_MS);
      pending.current.set(product.id, { timer, run });

      const message = partial
        ? i18n.t("fridge.toastWrittenOffPart", { qty: formatQty({ quantity: request.quantity as number, unit: product.unit }, i18n), name: product.name })
        : i18n.t("fridge.toastWrittenOff", { name: product.name });
      toast.show({
        message: request.addToShoppingList ? `${message} ${i18n.t("fridge.toastAddedToList")}` : message,
        duration: UNDO_MS,
        action: {
          label: i18n.t("fridge.undo"),
          onClick: () => {
            const entry = pending.current.get(product.id);
            if (!entry) return;
            clearTimeout(entry.timer);
            pending.current.delete(product.id);
            void qc.invalidateQueries({ queryKey: queryKeys.products });
          },
        },
      });
    },
    [qc, toast, i18n],
  );
}
