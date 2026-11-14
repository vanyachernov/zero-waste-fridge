import { queryOptions } from "@tanstack/react-query";
import { api, queryKeys, type AppNotification } from "@zwf/api-client";
import type { Translator } from "@zwf/i18n";

/** Лічильник на дзвіночку: опитування раз на хвилину (SSE прискорює — B-54 / F-63). */
export const unreadCountQuery = queryOptions({
  queryKey: queryKeys.unreadCount,
  queryFn: () => api.notifications.unreadCount(),
  refetchInterval: 60_000,
});

export const notificationsQuery = queryOptions({ queryKey: queryKeys.notifications, queryFn: () => api.notifications.list() });

/** «Йогурт зіпсується завтра» — та сама логіка, що й у Service Worker (public/sw.js). */
export function notificationText(n: Pick<AppNotification, "product" | "daysLeft">, { t, plural }: Pick<Translator, "t" | "plural">): string {
  const name = n.product?.name ?? "";
  const days = n.daysLeft ?? 0;
  if (days < 0) return t("notifications.expiryExpired", { name });
  if (days === 0) return t("notifications.expiryToday", { name });
  if (days === 1) return t("notifications.expiryTomorrow", { name });
  return t("notifications.expiryInDays", { name, n: days, unit: plural(days, ["день", "дні", "днів"]) });
}
