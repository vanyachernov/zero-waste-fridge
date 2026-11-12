import { api, configureApi, isApiError, mockAuthControl, mockNotificationsControl } from "@zwf/api-client";
import { beforeEach, describe, expect, it } from "vitest";

/** Мок сповіщень дзеркалить B-32 / B-34. */
const codeOf = (p: Promise<unknown>) =>
  p.then(
    () => "ok",
    (e: unknown) => (isApiError(e) ? `${e.status} ${e.code ?? ""} ${JSON.stringify(e.fieldErrors)}`.trim() : String(e)),
  );

describe("mock notifications backend", () => {
  beforeEach(() => {
    configureApi({ mock: true });
    mockAuthControl.signIn();
  });

  it("unread first, then newest; read and read all", async () => {
    const feed = await api.notifications.list();
    expect(feed.unread).toBe(2);
    expect(feed.items.map((n) => [n.product?.name, n.read])).toEqual([
      ["Шпинат Baby свіжий", false],
      ["Грецький йогурт 5%", false],
      ["Фарш яловичий свіжий", true],
    ]);
    await api.notifications.read("n1");
    expect(await api.notifications.unreadCount()).toEqual({ count: 1 });
    expect(await api.notifications.readAll()).toEqual({ updated: 1 });
    expect(await codeOf(api.notifications.read("nope"))).toBe("404 NOTIFICATION_NOT_FOUND {}");

    mockNotificationsControl.push({ id: "p4", name: "Філе" }, 1);
    expect((await api.notifications.list()).items[0]).toMatchObject({ read: false, daysLeft: 1, product: { name: "Філе" } });
  });

  it("settings validate like the backend; push is off without VAPID", async () => {
    expect(await api.notifications.settings()).toEqual({ inApp: true, emailDigest: true, push: false, digestHour: 8, quietHours: null });
    expect(await codeOf(api.notifications.saveSettings({ inApp: true, emailDigest: true, push: false, digestHour: 24, quietHours: { from: 5, to: 5 } }))).toBe(
      '400 VALIDATION_FAILED {"digestHour":"Range","quietHours.to":"SAME_AS_FROM"}',
    );
    const saved = await api.notifications.saveSettings({ inApp: false, emailDigest: true, push: false, digestHour: 20, quietHours: { from: 22, to: 7 } });
    expect(await api.notifications.settings()).toEqual(saved);
    expect(await api.notifications.pushPublicKey()).toEqual({ publicKey: null });
  });

  it("presence: me and Maksym shopping in the demo family", async () => {
    await api.realtime.setShopping("АТБ");
    expect((await api.realtime.presence()).online).toEqual([
      { id: "u2", name: "Максим Кравченко", shoppingAt: "Сільпо" },
      { id: "u1", name: "Олена Кравченко", shoppingAt: "АТБ" },
    ]);
  });
});
