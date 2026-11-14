import { screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { niceTicks } from "@lms/routes/StatsPage";
import { renderApp, waitForPath } from "../../support/render";
import { pick } from "../../support/select";

/** F-200: «Статистика & Екологія» на мок-бекенді. */
describe("stats page", () => {
  it("navigation, this month, chart table, categories, most wasted, family", async () => {
    const { router, user } = renderApp("/", { signedIn: true });
    await user.click(within(await screen.findByRole("navigation", { name: "Main" })).getByRole("link", { name: "Статистика & Екологія" }));
    await waitForPath(router, "/stats");

    expect(await screen.findByRole("heading", { level: 1, name: "Статистика & Екологія" })).toBeVisible();
    expect(await screen.findByText("Частка врятованого")).toBeVisible();
    expect(screen.getByText(/CO₂e не викинуто/)).toBeVisible();

    // Таблиця значень під графіком — для читачів екрана
    const table = screen.getByRole("table", { name: "Таблиця значень" });
    expect(within(table).getAllByRole("row")).toHaveLength(7);

    expect(screen.getByRole("listitem", { name: /Молочні продукти: Врятовано \d+, Викинуто \d+/ })).toBeInTheDocument();
    const wasted = screen.getByRole("heading", { name: "Що найчастіше псується" }).closest("div")!;
    expect(within(wasted).getByText("Молоко 2.5%")).toBeVisible();
    expect(within(wasted).getByText(/3 рази · 3 л/)).toBeVisible();
    expect(screen.getByRole("heading", { name: "Внесок сім'ї цього місяця" })).toBeVisible();

    await pick(user, screen.getByRole("combobox", { name: "Період" }), "12");
    await waitForPath(router, "/stats?months=12");
    expect(within(await screen.findByRole("table", { name: "Таблиця значень" })).getAllByRole("row")).toHaveLength(13);
  });

  it("niceTicks: clean steps from zero", () => {
    expect(niceTicks(0)).toEqual([0, 1]);
    expect(niceTicks(3)).toEqual([0, 1, 2, 3]);
    expect(niceTicks(7)).toEqual([0, 2, 4, 6, 8]);
    expect(niceTicks(10)).toEqual([0, 5, 10]);
    expect(niceTicks(37)).toEqual([0, 10, 20, 30, 40]);
  });
});
