import { act, screen, waitFor, within } from "@testing-library/react";
import { api, forceRealtimeForTests, mockNotificationsControl } from "@zwf/api-client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { renderApp, waitForPath } from "../../support/render";

/** F-70 / F-71 / F-63 + I-60. */
describe("notification bell (F-70)", () => {
  it("shows unread count, the list, read all and goes to the product", async () => {
    const { user, router } = renderApp("/", { signedIn: true });

    const bell = await screen.findByRole("button", { name: "Сповіщення: 2 непрочитаних" });
    await user.click(bell);
    const panel = screen.getByRole("dialog", { name: "Сповіщення" });
    expect(await within(panel).findByText("«Шпинат Baby свіжий» зіпсується сьогодні")).toBeVisible();
    expect(within(panel).getByText("«Грецький йогурт 5%» зіпсується завтра")).toBeVisible();
    expect(within(panel).getByText("«Фарш яловичий свіжий» уже прострочено")).toBeVisible();

    await user.click(within(panel).getByRole("button", { name: /Прочитати всі/ }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Сповіщення" })).toBeVisible());
    expect(within(panel).getByRole("button", { name: /Прочитати всі/ })).toBeDisabled();

    await user.click(within(panel).getByRole("button", { name: /«Грецький йогурт 5%» зіпсується завтра/ }));
    await waitFor(() => expect(router.state.location.search).toEqual({ q: "Грецький йогурт 5%" }));
    expect(router.state.location.pathname).toBe("/");
    expect(screen.queryByRole("dialog", { name: "Сповіщення" })).not.toBeInTheDocument();
  });

  it("closes with Escape and links to settings", async () => {
    const { user, router } = renderApp("/", { signedIn: true });
    const bell = await screen.findByRole("button", { name: /Сповіщення/ });

    await user.click(bell);
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog", { name: "Сповіщення" })).not.toBeInTheDocument();
    expect(bell).toHaveFocus();

    await user.click(bell);
    await user.click(screen.getByRole("link", { name: "Налаштування сповіщень" }));
    await waitForPath(router, "/settings");
  });
});

describe("settings page (F-71)", () => {
  it("saves channels, digest hour and quiet hours; push is unavailable without VAPID", async () => {
    const { user } = renderApp("/settings", { signedIn: true });

    expect(await screen.findByRole("heading", { name: "Налаштування" })).toBeVisible();
    const push = screen.getByRole("switch", { name: "Push-сповіщення" });
    expect(push).toBeDisabled();

    await user.click(screen.getByRole("switch", { name: "У застосунку" }));
    await user.selectOptions(screen.getByLabelText("Час листа"), "20");
    await user.click(screen.getByRole("switch", { name: "Тиха година" }));
    await user.selectOptions(screen.getByLabelText("До"), "6");
    await user.click(screen.getByRole("button", { name: "Зберегти" }));

    expect(await screen.findByText("Налаштування збережено")).toBeVisible();
    expect(await api.notifications.settings()).toEqual({ inApp: false, emailDigest: true, push: false, digestHour: 20, quietHours: { from: 22, to: 6 } });
  });

  it("shows server field errors", async () => {
    const { user } = renderApp("/settings", { signedIn: true });
    await user.click(await screen.findByRole("switch", { name: "Тиха година" }));
    await user.selectOptions(screen.getByLabelText("До"), "22");
    await user.click(screen.getByRole("button", { name: "Зберегти" }));

    expect(await screen.findByText("Кінець тихої години має відрізнятися від початку")).toBeVisible();
  });
});

/** Керована заглушка EventSource (у jsdom його немає). */
class FakeEventSource {
  static last: FakeEventSource | null = null;
  readonly listeners = new Map<string, ((e: MessageEvent<string>) => void)[]>();
  onopen: (() => void) | null = null;
  onerror: (() => void) | null = null;
  closed = false;
  constructor(readonly url: string) {
    FakeEventSource.last = this;
  }
  addEventListener(name: string, listener: (e: MessageEvent<string>) => void) {
    this.listeners.set(name, [...(this.listeners.get(name) ?? []), listener]);
  }
  emit(name: string, data: unknown) {
    this.listeners.get(name)?.forEach((l) => l(new MessageEvent(name, { data: JSON.stringify(data) })));
  }
  close() {
    this.closed = true;
  }
}

describe("realtime (F-63)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    FakeEventSource.last = null;
  });

  it("refetches the shopping list on changed events and shows presence and sync status", async () => {
    vi.stubGlobal("EventSource", FakeEventSource);
    forceRealtimeForTests(true);
    try {
      renderApp("/shopping", { signedIn: true });
      await screen.findByRole("heading", { name: "Розумний список покупок" });
      await waitFor(() => expect(FakeEventSource.last).not.toBeNull());
      const stream = FakeEventSource.last!;
      expect(stream.url).toBe("/api/household/stream");
      expect(screen.getByText("Оновлення в реальному часі недоступні")).toBeVisible();

      act(() => stream.onopen?.());
      expect(await screen.findByText(/Синхронізовано щойно/)).toBeVisible();

      act(() => stream.emit("presence", { online: [{ id: "u3", name: "Софія Кравченко", shoppingAt: "АТБ" }] }));
      expect(await screen.findByText("Софія зараз у «АТБ»")).toBeVisible();

      await api.shoppingList.add({ name: "Додав інший учасник" });
      act(() => stream.emit("changed", { topic: "shopping-list", actor: { id: "u2", name: "Максим" } }));
      expect(await screen.findByText("Додав інший учасник")).toBeVisible();

      mockNotificationsControl.push({ id: "p4", name: "Філе" }, 1);
      act(() => stream.emit("notifications", { userId: "u1" }));
      expect(await screen.findByRole("button", { name: "Сповіщення: 3 непрочитаних" })).toBeVisible();
    } finally {
      forceRealtimeForTests(false);
    }

  });
});
