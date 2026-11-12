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
  it("reports typed value", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <Select
        aria-label="Категорія"
        value="dairy"
        onChange={onChange}
        leading="🥛"
        options={[
          { value: "dairy", label: "Молочні продукти" },
          { value: "meat", label: "М'ясо & Риба" },
        ]}
      />,
    );

    await user.selectOptions(screen.getByRole("combobox", { name: "Категорія" }), "meat");
    expect(onChange).toHaveBeenCalledWith("meat");
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
