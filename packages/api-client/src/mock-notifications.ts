import { ApiError } from "./http";
import { mockSessionUser, requireMockSession } from "./mock-auth";
import type { AppNotification, NotificationFeed, NotificationSettings, Presence, PushSubscriptionInput } from "./types";

/**
 * In-memory сповіщення й налаштування (B-32, B-34), push і presence (B-33, B-54) для розробки без бекенду.
 * Працюють разом з доменом `household`: їм теж потрібна мок-сесія.
 */

const delay = (ms = 80) => new Promise((r) => setTimeout(r, ms));
const DEFAULTS: NotificationSettings = { inApp: true, emailDigest: true, push: false, digestTime: "08:00", quietHours: null };
const HH_MM = /^([01]\d|2[0-3]):[0-5]\d$/;

type Stored = AppNotification & { userId: string; householdId: string };
let notifications: Stored[] = [];
let settings = new Map<string, NotificationSettings>();
let subscriptions = new Map<string, string>();
let seq = 700;

function seed() {
  const ago = (minutes: number) => new Date(Date.now() - minutes * 60_000).toISOString();
  const reminder = (id: string, product: string, productId: string, daysLeft: number, minutes: number, read = false): Stored => ({
    id, type: "EXPIRY_REMINDER", createdAt: ago(minutes), read, product: { id: productId, name: product }, daysLeft, userId: "u1", householdId: "h1",
  });
  notifications = [
    reminder("n1", "Шпинат Baby свіжий", "p2", 0, 35),
    reminder("n2", "Грецький йогурт 5%", "p3", 1, 95),
    reminder("n3", "Фарш яловичий свіжий", "p1", -1, 60 * 26, true),
  ];
  settings = new Map();
  subscriptions = new Map();
  seq = 700;
}
seed();

function me() {
  const user = mockSessionUser();
  if (!user) throw new ApiError(401, "Session is no longer valid", { code: "SESSION_EXPIRED" });
  return user;
}

const validation = (errors: Record<string, string>) => new ApiError(400, "Request validation failed", { code: "VALIDATION_FAILED", fieldErrors: errors });

export const mockNotifications = {
  async list(limit = 20): Promise<NotificationFeed> {
    requireMockSession();
    await delay();
    if (limit < 1 || limit > 100) throw validation({ limit: "Range" });
    const user = me();
    const mine = notifications
      .filter((n) => n.userId === user.id && n.householdId === user.householdId)
      .sort((a, b) => Number(a.read) - Number(b.read) || b.createdAt.localeCompare(a.createdAt));
    return {
      items: mine.slice(0, limit).map(({ userId: _u, householdId: _h, ...rest }) => rest),
      unread: mine.filter((n) => !n.read).length,
    };
  },

  async unreadCount(): Promise<{ count: number }> {
    return { count: (await mockNotifications.list(100)).unread };
  },

  async read(id: string): Promise<void> {
    requireMockSession();
    await delay(40);
    const n = notifications.find((x) => x.id === id && x.userId === me().id);
    if (!n) throw new ApiError(404, "Notification not found", { code: "NOTIFICATION_NOT_FOUND" });
    n.read = true;
  },

  async readAll(): Promise<{ updated: number }> {
    requireMockSession();
    await delay(40);
    const user = me();
    const unread = notifications.filter((n) => n.userId === user.id && n.householdId === user.householdId && !n.read);
    unread.forEach((n) => (n.read = true));
    return { updated: unread.length };
  },

  async settings(): Promise<NotificationSettings> {
    requireMockSession();
    await delay(40);
    return settings.get(me().id) ?? DEFAULTS;
  },

  async saveSettings(next: NotificationSettings): Promise<NotificationSettings> {
    requireMockSession();
    await delay(60);
    const errors: Record<string, string> = {};
    for (const key of ["inApp", "emailDigest", "push"] as const) if (typeof next?.[key] !== "boolean") errors[key] = "NotNull";
    const time = typeof next?.digestTime === "string" ? next.digestTime.trim() : (next?.digestTime ?? DEFAULTS.digestTime);
    if (typeof time !== "string" || !HH_MM.test(time)) errors.digestTime = "INVALID";
    const quiet = next?.quietHours;
    if (quiet) {
      if (!(quiet.from >= 0 && quiet.from <= 23)) errors["quietHours.from"] = "Range";
      if (!(quiet.to >= 0 && quiet.to <= 23)) errors["quietHours.to"] = "Range";
      if (quiet.from === quiet.to) errors["quietHours.to"] = "SAME_AS_FROM";
    }
    if (Object.keys(errors).length) throw validation(errors);
    const saved = { inApp: next.inApp, emailDigest: next.emailDigest, push: next.push, digestTime: time as string, quietHours: quiet ?? null };
    settings.set(me().id, saved);
    return saved;
  },

  /** У моку push «вимкнено на сервері» — як бекенд без ключів VAPID. */
  async pushPublicKey(): Promise<{ publicKey: string | null }> {
    requireMockSession();
    await delay(20);
    return { publicKey: null };
  },

  async subscribePush(subscription: PushSubscriptionInput): Promise<void> {
    requireMockSession();
    await delay(40);
    if (!subscription?.endpoint?.startsWith("https://")) throw validation({ endpoint: "INVALID" });
    subscriptions.set(subscription.endpoint, me().id);
  },

  async unsubscribePush(endpoint: string): Promise<void> {
    requireMockSession();
    await delay(40);
    if (subscriptions.get(endpoint) === me().id) subscriptions.delete(endpoint);
  },

  /** Без SSE у моку: онлайн лише ви (і Максим «у магазині» в демо-сім'ї). */
  async presence(): Promise<Presence> {
    requireMockSession();
    await delay(40);
    const user = me();
    const online = [{ id: user.id, name: user.name, shoppingAt: shopping.get(user.id) ?? null }];
    if (user.householdId === "h1" && user.id !== "u2") online.push({ id: "u2", name: "Максим Кравченко", shoppingAt: "Сільпо" });
    return { online: online.sort((a, b) => a.name.localeCompare(b.name, "uk")) };
  },

  async setShopping(store: string | null): Promise<void> {
    requireMockSession();
    await delay(40);
    if (store && store.trim().length > 60) throw validation({ shoppingAt: "Size" });
    if (store?.trim()) shopping.set(me().id, store.trim());
    else shopping.delete(me().id);
  },
};

const shopping = new Map<string, string>();

export const mockNotificationsControl = {
  reset() {
    seed();
    shopping.clear();
  },
  /** Як B-31: нове нагадування для поточного користувача. */
  push(product: { id: string; name: string }, daysLeft: number) {
    const user = mockSessionUser();
    if (!user) return;
    notifications.push({
      id: `n${++seq}`, type: "EXPIRY_REMINDER", createdAt: new Date().toISOString(), read: false, product, daysLeft, userId: user.id, householdId: user.householdId,
    });
  },
};
