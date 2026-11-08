import { screen, within } from "@testing-library/react";
import type { CurrentUser } from "@zwf/api-client";
import { describe, expect, it, vi } from "vitest";
import { initials, ProfileMenu } from "@lms/routes/ProfileMenu";
import { renderWithProviders } from "../support/render";

const user: CurrentUser = {
  id: "u1",
  name: "Олена Кравченко",
  email: "olena@example.com",
  avatarUrl: null,
  householdId: "h1",
  householdName: "Сім'я Кравченко",
  role: "OWNER",
};

describe("initials", () => {
  it.each([
    ["Олена Кравченко", "ОК"],
    ["  максим   кравченко-шевченко ", "МК"],
    ["Анна Марія Шевченко", "АМ"],
    ["Олена", "О"],
  ])("%s → %s", (name, expected) => expect(initials(name)).toBe(expected));
});

describe("ProfileMenu", () => {
  it("shows name, hero badge and initials on the trigger", () => {
    renderWithProviders(<ProfileMenu user={user} onLogout={vi.fn()} />);
    const trigger = screen.getByRole("button", { name: "Меню профілю" });

    expect(trigger).toHaveAttribute("aria-haspopup", "menu");
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(trigger).toHaveTextContent("Олена Кравченко");
    expect(trigger).toHaveTextContent("Zero-Waste Герой");
    expect(trigger).toHaveTextContent("ОК");
  });

  it("opens with email, household and role; unfinished sections are disabled", async () => {
    const { user: u } = renderWithProviders(<ProfileMenu user={user} onLogout={vi.fn()} />);

    await u.click(screen.getByRole("button", { name: "Меню профілю" }));

    const menu = screen.getByRole("menu", { name: "Меню профілю" });
    expect(within(menu).getByText("olena@example.com")).toBeVisible();
    expect(within(menu).getByText("Сім'я Кравченко")).toBeVisible();
    expect(within(menu).getByText("Власник")).toBeVisible();
    expect(within(menu).getByRole("menuitem", { name: /Моя сім'я/ })).toHaveAttribute("aria-disabled", "true");
    expect(within(menu).getByRole("menuitem", { name: /Налаштування/ })).toHaveAttribute("aria-disabled", "true");
    expect(screen.getByRole("button", { name: "Меню профілю" })).toHaveAttribute("aria-expanded", "true");
  });

  it("member role is labelled as Член сім'ї", async () => {
    const { user: u } = renderWithProviders(<ProfileMenu user={{ ...user, role: "MEMBER" }} onLogout={vi.fn()} />);
    await u.click(screen.getByRole("button", { name: "Меню профілю" }));
    expect(screen.getByText("Член сім'ї")).toBeVisible();
  });

  it("keyboard: ArrowDown opens and focuses the first enabled item, arrows cycle, Escape returns focus", async () => {
    const { user: u } = renderWithProviders(<ProfileMenu user={user} onLogout={vi.fn()} />);
    const trigger = screen.getByRole("button", { name: "Меню профілю" });

    trigger.focus();
    await u.keyboard("{ArrowDown}");

    expect(screen.getByRole("menuitemradio", { name: "Світла" })).toHaveFocus();
    await u.keyboard("{ArrowUp}");
    expect(screen.getByRole("menuitem", { name: "Вийти" })).toHaveFocus();
    await u.keyboard("{Escape}");
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it("closes on outside click", async () => {
    const { user: u } = renderWithProviders(
      <div>
        <ProfileMenu user={user} onLogout={vi.fn()} />
        <p>outside</p>
      </div>,
    );
    await u.click(screen.getByRole("button", { name: "Меню профілю" }));

    await u.click(screen.getByText("outside"));

    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("theme radios switch the theme", async () => {
    const { user: u } = renderWithProviders(<ProfileMenu user={user} onLogout={vi.fn()} />);
    await u.click(screen.getByRole("button", { name: "Меню профілю" }));

    expect(screen.getByRole("menuitemradio", { name: "Системна" })).toHaveAttribute("aria-checked", "true");
    await u.click(screen.getByRole("menuitemradio", { name: "Темна" }));

    expect(screen.getByRole("menuitemradio", { name: "Темна" })).toHaveAttribute("aria-checked", "true");
    expect(document.documentElement).toHaveClass("dark");
  });

  it("logout item calls the handler", async () => {
    const onLogout = vi.fn();
    const { user: u } = renderWithProviders(<ProfileMenu user={user} onLogout={onLogout} />);
    await u.click(screen.getByRole("button", { name: "Меню профілю" }));

    await u.click(screen.getByRole("menuitem", { name: "Вийти" }));

    expect(onLogout).toHaveBeenCalledOnce();
  });

  it("logout pending disables the item; error is announced", async () => {
    const { user: u } = renderWithProviders(
      <ProfileMenu user={user} onLogout={vi.fn()} logoutPending logoutError="Немає з'єднання" />,
    );
    await u.click(screen.getByRole("button", { name: "Меню профілю" }));

    expect(screen.getByRole("menuitem", { name: "Вийти" })).toBeDisabled();
    expect(screen.getByRole("alert")).toHaveTextContent("Немає з'єднання");
  });
});
