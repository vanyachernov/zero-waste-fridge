import { screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderApp } from "../../support/render";

/** F-80: компактний мобільний «Мій холодильник» за макетом (jsdom без CSS — перевіряємо розмітку). */
describe("mobile fridge (F-80)", () => {
  it("compact stats row, compact cards and the add button as a FAB", async () => {
    renderApp("/", { signedIn: true });
    await screen.findByRole("heading", { name: "Мій холодильник" });

    const stat = (label: string) => screen.getByText(label, { selector: "dt" }).parentElement!;
    await waitFor(() => expect(stat("Всього")).toHaveTextContent("11"));
    expect(stat("Скоро")).toHaveTextContent("3");
    expect(stat("Прострочено")).toHaveTextContent("1");

    await screen.findAllByText("Фарш яловичий свіжий");
    const cards = screen.getAllByRole("list").find((l) => l.tagName === "UL" && within(l).queryByText("Фарш яловичий свіжий"))!;
    const first = within(cards).getAllByRole("listitem")[0]!;
    expect(first).toHaveTextContent("Фарш яловичий свіжий");
    expect(first).toHaveTextContent("500 г · Зона свіжості");
    expect(within(first).getByRole("button", { name: "Дії з продуктом Фарш яловичий свіжий" })).toBeInTheDocument();

    const add = screen.getByRole("button", { name: "Додати продукт" });
    expect(add).toHaveClass("max-sm:fixed");
  });
});
