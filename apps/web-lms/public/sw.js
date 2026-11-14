/* F-72: Service Worker кабінету — показує push-нагадування (B-33) і відкриває кабінет за кліком.
 * Тексти — ті самі, що в lib/notifications.ts (дані приходять без тексту, як і в API). */

const plural = (n, [one, few, many]) => {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
  return many;
};

function text(data) {
  const name = data.productName || "Продукт";
  const days = Number(data.daysLeft ?? 0);
  if (days < 0) return `«${name}» уже прострочено`;
  if (days === 0) return `«${name}» зіпсується сьогодні`;
  if (days === 1) return `«${name}» зіпсується завтра`;
  return `«${name}» зіпсується через ${days} ${plural(days, ["день", "дні", "днів"])}`;
}

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = {};
  }
  event.waitUntil(
    self.registration.showNotification("Zero Waste Fridge", {
      body: text(data),
      icon: "/lms/favicon.svg",
      badge: "/lms/favicon.svg",
      tag: data.productId || data.id || "zwf",
      data: { url: data.url || "/lms/" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/lms/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) => {
      const open = windows.find((w) => w.url.includes("/lms/"));
      return open ? open.focus().then((w) => w.navigate(url)) : self.clients.openWindow(url);
    }),
  );
});
