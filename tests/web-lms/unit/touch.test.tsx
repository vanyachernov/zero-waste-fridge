import { fireEvent, render, screen } from "@testing-library/react";
import { Modal } from "@zwf/ui";
import { describe, expect, it, vi } from "vitest";
import { SwipeRow } from "@lms/components/SwipeRow";

/** jsdom без PointerEvent: MouseEvent з потрібним pointerType. */
function pointer(el: Element, type: string, x: number, y: number, pointerType = "touch") {
  const event = new MouseEvent(type, { bubbles: true, clientX: x, clientY: y });
  Object.defineProperty(event, "pointerType", { value: pointerType });
  fireEvent(el, event);
}

function swipe(el: Element, fromX: number, toX: number, { y = 0, pointerType = "touch" } = {}) {
  pointer(el, "pointerdown", fromX, 0, pointerType);
  for (let x = fromX; x >= toX; x -= 20) pointer(el, "pointermove", x, y, pointerType);
  pointer(el, "pointerup", toX, y, pointerType);
}

/** F-84: жести на телефоні. */
describe("SwipeRow", () => {
  const renderRow = () => {
    const onSwipe = vi.fn();
    render(
      <SwipeRow label="Списати" onSwipe={onSwipe}>
        <p>Йогурт</p>
      </SwipeRow>,
    );
    const row = screen.getByText("Йогурт").parentElement!;
    // jsdom не рахує розмітку — задаємо ширину рядка
    Object.defineProperty(row, "offsetWidth", { value: 300 });
    return { row, onSwipe };
  };

  it("a long swipe to the left fires the action", () => {
    const { row, onSwipe } = renderRow();
    swipe(row, 280, 100);
    expect(onSwipe).toHaveBeenCalledOnce();
    expect(row.style.transform).toBe("");
  });

  it("a short swipe, a vertical scroll or a mouse drag does nothing", () => {
    const { row, onSwipe } = renderRow();
    swipe(row, 280, 220);
    swipe(row, 280, 260, { y: 200 });
    swipe(row, 280, 40, { pointerType: "mouse" });
    expect(onSwipe).not.toHaveBeenCalled();
  });
});

describe("Modal as a bottom sheet", () => {
  const renderSheet = () => {
    const onClose = vi.fn();
    render(
      <Modal open onClose={onClose} title="Списати продукт">
        <p>Вміст</p>
      </Modal>,
    );
    return { header: screen.getByRole("heading", { name: "Списати продукт", hidden: true }).closest("header")!, onClose };
  };

  it("pulling the header down past the threshold closes it", () => {
    const { header, onClose } = renderSheet();
    pointer(header, "pointerdown", 100, 100);
    pointer(header, "pointermove", 100, 150);
    expect(header.closest("dialog")!.style.transform).toBe("translateY(50px)");
    pointer(header, "pointermove", 100, 240);
    pointer(header, "pointerup", 100, 240);
    expect(onClose).toHaveBeenCalledOnce();
    expect(header.closest("dialog")!.style.transform).toBe("");
  });

  it("a short pull snaps back", () => {
    const { header, onClose } = renderSheet();
    pointer(header, "pointerdown", 100, 100);
    pointer(header, "pointermove", 100, 160);
    pointer(header, "pointerup", 100, 160);
    expect(onClose).not.toHaveBeenCalled();
  });
});
