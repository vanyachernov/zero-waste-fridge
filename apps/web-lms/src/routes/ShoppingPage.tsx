import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, queryKeys, type ShoppingItem } from "@zwf/api-client";
import { useI18n } from "@zwf/i18n/react";
import { Badge, Card, Checkbox, cn } from "@zwf/ui";
import { shoppingQuery } from "../lib/queries";
import { useDocumentTitle } from "../lib/useDocumentTitle";

const reasonTone = { recipe: "primary", "low-stock": "warning", manual: "neutral" } as const;

export function ShoppingPage() {
  const { t, messages } = useI18n();
  useDocumentTitle(t("shopping.title"));
  const qc = useQueryClient();
  const { data, isPending } = useQuery(shoppingQuery);

  const toggle = useMutation({
    mutationFn: api.shoppingList.toggle,
    onMutate: async (id: string) => {
      await qc.cancelQueries({ queryKey: queryKeys.shoppingList });
      qc.setQueryData<ShoppingItem[]>(queryKeys.shoppingList, (old) =>
        old?.map((s) => (s.id === id ? { ...s, done: !s.done } : s)),
      );
    },
    onSettled: () => qc.invalidateQueries({ queryKey: queryKeys.shoppingList }),
  });

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-5">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">{t("shopping.title")}</h1>
        <p className="mt-1 text-sm text-on-surface-variant">{t("shopping.subtitle")}</p>
      </div>
      <Card className="divide-y divide-border">
        {isPending ? (
          <p className="p-6 text-sm text-muted">{t("common.loading")}</p>
        ) : !data?.length ? (
          <p className="p-6 text-sm text-muted">{t("shopping.empty")}</p>
        ) : (
          [...data]
            .sort((a, b) => Number(a.done) - Number(b.done))
            .map((item) => (
              <label key={item.id} className="flex cursor-pointer items-center gap-3 px-4 py-3.5 hover:bg-surface-container-low">
                <Checkbox checked={item.done} onChange={() => toggle.mutate(item.id)} />
                <span className={cn("flex-1 text-sm font-medium", item.done && "text-muted line-through")}>
                  {item.name}
                  {item.quantity && <span className="ml-2 text-xs text-muted">{item.quantity}</span>}
                </span>
                {item.reason && <Badge tone={reasonTone[item.reason]}>{messages.shopping.reasons[item.reason]}</Badge>}
              </label>
            ))
        )}
      </Card>
    </div>
  );
}
