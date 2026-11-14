import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Avatar, initialsOf, Menu, RadioCard, RadioCardGroup, SegmentedControl, Select, Switch, ToastProvider, useToast } from "@zwf/ui";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

/** F-07: нові компоненти UI-Kit — доступність і клавіатура. */
describe("SegmentedControl", () => {
  function Units() {
    const [unit, setUnit] = useState("g");
    return (
      <SegmentedControl
        label="Одиниця"
        value={unit}
        onChange={setUnit}
        options={[
          { value: "g", label: "г" },
          { value: "kg", label: "кг" },
          { value: "pcs", label: "шт" },
        ]}
      />
    );
  }

  it("is a radiogroup with roving tabindex and arrow keys", async () => {
    const user = userEvent.setup();
    render(<Units />);

    const group = screen.getByRole("radiogroup", { name: "Одиниця" });
    expect(group).toBeVisible();
    expect(screen.getByRole("radio", { name: "г" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("radio", { name: "кг" })).toHaveAttribute("tabindex", "-1");

    await user.click(screen.getByRole("radio", { name: "кг" }));
    expect(screen.getByRole("radio", { name: "кг" })).toHaveAttribute("aria-checked", "true");

    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("radio", { name: "шт" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("radio", { name: "шт" })).toHaveFocus();
    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("radio", { name: "г" })).toHaveAttribute("aria-checked", "true");
    await user.keyboard("{End}");
    expect(screen.getByRole("radio", { name: "шт" })).toHaveAttribute("aria-checked", "true");
  });
});

describe("Switch", () => {
  it("toggles with click and keyboard, label and description are linked", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const { rerender } = render(
      <Switch checked={false} onChange={onChange} label="Упаковку вже відкрито" description="Термін скоротиться" />,
    );

    const toggle = screen.getByRole("switch", { name: "Упаковку вже відкрито" });
    expect(toggle).toHaveAttribute("aria-checked", "false");
    expect(toggle).toHaveAccessibleDescription("Термін скоротиться");
    await user.click(toggle);
    expect(onChange).toHaveBeenLastCalledWith(true);

    rerender(<Switch checked onChange={onChange} label="Упаковку вже відкрито" />);
    toggle.focus();
    await user.keyboard(" ");
    expect(onChange).toHaveBeenLastCalledWith(false);
  });
});

describe("RadioCardGroup", () => {
  it("selects one card at a time", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <RadioCardGroup label="Що сталося з продуктом?" value="EATEN" onChange={onChange}>
        <RadioCard value="EATEN" title="З'їдено вчасно" aside={<span>Врятовано</span>} />
        <RadioCard value="WASTED" title="Викинуто — зіпсувався" description="Враховується як відходи" />
      </RadioCardGroup>,
    );

    expect(screen.getByRole("radiogroup", { name: "Що сталося з продуктом?" })).toBeVisible();
    expect(screen.getByRole("radio", { name: /З'їдено вчасно/ })).toBeChecked();
    await user.click(screen.getByText("Викинуто — зіпсувався"));
    expect(onChange).toHaveBeenCalledWith("WASTED");
  });
});

describe("Select", () => {
  const OPTIONS = [
    { value: "dairy", label: "Молочні продукти" },
    { value: "meat", label: "М'ясо & Риба" },
    { value: "fruits", label: "Фрукти & Ягоди", disabled: true },
    { value: "other", label: "Інше" },
  ];

  function Category({ onChange = vi.fn() }: { onChange?: (v: string) => void }) {
    const [value, setValue] = useState("dairy");
    return (
      <div style={{ overflow: "hidden" }} data-testid="card">
        <Select
          aria-label="Категорія"
          value={value}
          leading="🥛"
          options={OPTIONS}
          onChange={(v) => {
            setValue(v);
            onChange(v);
          }}
        />
      </div>
    );
  }

  it("is a combobox with a listbox outside clipping containers; click picks an option", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Category onChange={onChange} />);

    const combobox = screen.getByRole("combobox", { name: "Категорія" });
    expect(combobox).toHaveTextContent("Молочні продукти");
    expect(combobox).toHaveAttribute("aria-expanded", "false");

    await user.click(combobox);
    const listbox = screen.getByRole("listbox", { name: "Категорія" });
    expect(screen.getByTestId("card")).not.toContainElement(listbox);
    expect(screen.getByRole("option", { name: "Молочні продукти" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("option", { name: "Фрукти & Ягоди" })).toHaveAttribute("aria-disabled", "true");

    await user.click(screen.getByRole("option", { name: "Фрукти & Ягоди" }));
    expect(onChange).not.toHaveBeenCalled();
    await user.click(screen.getByRole("option", { name: "М'ясо & Риба" }));
    expect(onChange).toHaveBeenCalledWith("meat");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    expect(combobox).toHaveTextContent("М'ясо & Риба");
  });

  it("keyboard: arrows skip disabled options, Enter picks, Escape closes, typing jumps", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Category onChange={onChange} />);
    const combobox = screen.getByRole("combobox", { name: "Категорія" });
    combobox.focus();

    await user.keyboard("{ArrowDown}");
    expect(combobox).toHaveAttribute("aria-expanded", "true");
    const active = () => document.getElementById(combobox.getAttribute("aria-activedescendant")!)?.textContent;
    expect(active()).toBe("Молочні продукти");
    await user.keyboard("{ArrowDown}{ArrowDown}");
    expect(active()).toBe("Інше");
    await user.keyboard("{Escape}");
    expect(combobox).toHaveAttribute("aria-expanded", "false");
    expect(onChange).not.toHaveBeenCalled();
    expect(combobox).toHaveFocus();

    await user.keyboard("{ArrowDown}{End}{Enter}");
    expect(onChange).toHaveBeenLastCalledWith("other");

    // Закритий список: літера обирає наступний пункт на неї (після «Інше» по колу — «Молочні»)
    await user.keyboard("м");
    expect(onChange).toHaveBeenLastCalledWith("dairy");
  });

  it("shows the placeholder until something is chosen and closes on outside click", async () => {
    const user = userEvent.setup();
    render(<Select aria-label="Магазин" value="" placeholder="Будь-який" onChange={vi.fn()} options={OPTIONS} />);
    const combobox = screen.getByRole("combobox", { name: "Магазин" });
    expect(combobox).toHaveTextContent("Будь-який");
    await user.click(combobox);
    expect(screen.getByRole("listbox")).toBeVisible();
    await user.click(document.body);
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });
});

describe("Menu", () => {
  it("opens with keyboard, moves focus, runs action and restores focus", async () => {
    const user = userEvent.setup();
    const edit = vi.fn();
    const remove = vi.fn();
    render(
      <Menu
        label="Дії з продуктом Молоко"
        items={[
          { label: "Редагувати", onSelect: edit },
          { label: "Недоступно", onSelect: vi.fn(), disabled: true },
          { label: "Списати", onSelect: remove, tone: "danger" },
        ]}
      />,
    );

    const button = screen.getByRole("button", { name: "Дії з продуктом Молоко" });
    button.focus();
    await user.keyboard("{ArrowDown}");
    expect(screen.getByRole("menu")).toBeVisible();
    expect(screen.getByRole("menuitem", { name: "Редагувати" })).toHaveFocus();

    await user.keyboard("{ArrowDown}");
    expect(screen.getByRole("menuitem", { name: "Списати" })).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(remove).toHaveBeenCalledOnce();
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    expect(button).toHaveFocus();

    await user.click(button);
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    expect(edit).not.toHaveBeenCalled();
  });

  /** Кнопка «⋮» у рядку таблиці з `overflow: hidden` — меню не має обрізатися. */
  function inClippedTable() {
    render(
      <div style={{ overflow: "hidden" }} data-testid="card">
        <Menu label="Дії" items={[{ label: "Редагувати", onSelect: vi.fn() }]} />
      </div>,
    );
    const button = screen.getByRole("button", { name: "Дії" });
    return { button, place: (top: number, bottom: number) => (button.getBoundingClientRect = () => ({ top, bottom, left: 900, right: 936, width: 36, height: 36, x: 900, y: top, toJSON: () => ({}) })) };
  }

  it("renders outside the clipping container and opens below the button", async () => {
    const user = userEvent.setup();
    const { button, place } = inClippedTable();
    place(100, 136);
    await user.click(button);

    const menu = screen.getByRole("menu");
    expect(screen.getByTestId("card")).not.toContainElement(menu);
    expect(menu.parentElement).toBe(document.body);
    expect(menu.style.position).toBe("fixed");
    expect(menu.style.top).toBe("140px");
  });

  it("flips up near the bottom of the screen and closes on page scroll", async () => {
    const user = userEvent.setup();
    const { button, place } = inClippedTable();
    place(window.innerHeight - 40, window.innerHeight - 4);
    Object.defineProperty(HTMLElement.prototype, "offsetHeight", { configurable: true, get: () => 120 });
    try {
      await user.click(button);
      expect(screen.getByRole("menu").style.top).toBe(`${window.innerHeight - 40 - 120 - 4}px`);
    } finally {
      delete (HTMLElement.prototype as { offsetHeight?: number }).offsetHeight;
    }

    act(() => void window.dispatchEvent(new Event("scroll")));
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });
});

describe("Avatar", () => {
  it("shows initials or photo", () => {
    expect(initialsOf("Олена Кравченко")).toBe("ОК");
    expect(initialsOf("andriy.k@gmail.com")).toBe("A");
    expect(initialsOf("  Максим  ")).toBe("М");
    const { container } = render(<Avatar name="Олена Кравченко" src="/a.png" />);
    expect(container.querySelector("img")).toHaveAttribute("src", "/a.png");
  });
});

describe("Toast", () => {
  function Trigger({ onUndo }: { onUndo: () => void }) {
    const toast = useToast();
    return (
      <button type="button" onClick={() => toast.show({ message: "Списано: Молоко", action: { label: "Скасувати", onClick: onUndo } })}>
        go
      </button>
    );
  }

  it("shows message with action and disappears after 5 seconds", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      const onUndo = vi.fn();
      render(
        <ToastProvider>
          <Trigger onUndo={onUndo} />
        </ToastProvider>,
      );

      await user.click(screen.getByRole("button", { name: "go" }));
      expect(screen.getByRole("status")).toHaveTextContent("Списано: Молоко");
      await user.click(screen.getByRole("button", { name: "Скасувати" }));
      expect(onUndo).toHaveBeenCalledOnce();
      expect(screen.queryByRole("status")).not.toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: "go" }));
      act(() => vi.advanceTimersByTime(5001));
      expect(screen.queryByRole("status")).not.toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });
});
