import { screen } from "@testing-library/react";
import axe from "axe-core";
import { describe, expect, it } from "vitest";
import { renderApp } from "../../support/render";

/**
 * F-91: axe-core на кожній сторінці кабінету. Контраст (`color-contrast`) jsdom не рахує — його перевіряємо
 * в браузері для обох тем (див. ROADMAP F-90), тут — ролі, назви, ARIA, структура.
 */
async function violations() {
  const result = await axe.run(document.body, {
    runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "best-practice"] },
    rules: {
      "color-contrast": { enabled: false },
      // Таблиця (десктоп) і картки (телефон) — альтернативи, одну ховає CSS, якого в jsdom немає,
      // тож дві однакові «Пагінації» тут видно обидві. У браузері правило проходить.
      "landmark-unique": { enabled: false },
    },
  });
  return result.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(" | ")}`);
}

const PAGES = [
  ["/", "Мій холодильник"],
  ["/recipes", "Розумні рецепти"],
  ["/shopping", "Розумний список покупок"],
  ["/family", "Моя сім'я"],
  ["/settings", "Налаштування"],
  ["/join", "Приєднатися до сім'ї"],
] as const;

describe("accessibility (axe)", () => {
  it.each(PAGES)("%s has no violations", async (path, heading) => {
    renderApp(path, { signedIn: true });
    await screen.findByRole("heading", { level: 1, name: new RegExp(heading) });
    await new Promise((r) => setTimeout(r, 300));
    expect(await violations()).toEqual([]);
  });

  it("login page has no violations", async () => {
    renderApp("/login");
    await screen.findByRole("heading", { level: 1 });
    expect(await violations()).toEqual([]);
  });

  it("skip link is the first stop and moves focus to the main content", async () => {
    const { user } = renderApp("/", { signedIn: true });
    await screen.findByRole("heading", { level: 1, name: "Мій холодильник" });

    await user.tab();
    const skip = screen.getByRole("link", { name: "Перейти до вмісту" });
    expect(skip).toHaveFocus();
    expect(skip).toHaveAttribute("href", "#main");
    expect(screen.getByRole("main")).toHaveAttribute("id", "main");
  });
});
