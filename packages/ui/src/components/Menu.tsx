import { useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "../cn";

export interface MenuItem {
  label: string;
  icon?: ReactNode;
  onSelect: () => void;
  tone?: "default" | "danger";
  disabled?: boolean;
}

export interface MenuProps {
  /** Підпис кнопки для екранних читачів («Дії з продуктом Молоко»). */
  label: string;
  /** Вміст кнопки, за замовчуванням — «⋮». */
  trigger?: ReactNode;
  items: readonly MenuItem[];
  align?: "left" | "right";
  className?: string;
}

/**
 * F-07: випадне меню дій («⋮» у рядку таблиці, у рядку учасника). WAI-ARIA «menu button»:
 * Enter/Space/↓ відкривають, ↑/↓/Home/End рухаються, Escape закриває й повертає фокус.
 *
 * Список рендериться в портал з `position: fixed`, тож `overflow: hidden` таблиці чи картки його не обрізає;
 * якщо внизу екрана місця замало — відкривається вгору.
 */
export function Menu({ label, trigger, items, align = "right", className }: MenuProps) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const [position, setPosition] = useState<CSSProperties>({ visibility: "hidden" });

  // Позиція відносно кнопки: під нею або (немає місця) над нею, по правому чи лівому краю
  const place = () => {
    const button = buttonRef.current;
    const menu = menuRef.current;
    if (!button || !menu) return;
    const rect = button.getBoundingClientRect();
    const height = menu.offsetHeight;
    const gap = 4;
    const below = window.innerHeight - rect.bottom;
    const up = below < height + gap + 8 && rect.top > below;
    setPosition({
      position: "fixed",
      top: up ? Math.max(8, rect.top - height - gap) : rect.bottom + gap,
      ...(align === "right" ? { right: Math.max(8, window.innerWidth - rect.right) } : { left: Math.max(8, rect.left) }),
    });
  };

  useLayoutEffect(() => {
    if (!open) {
      setPosition({ visibility: "hidden" });
      return;
    }
    place();
    // Прокрутка сторінки закриває меню (як нативні списки), зміна розміру — переставляє
    const onScroll = (e: Event) => {
      if (!(e.target instanceof Node && menuRef.current?.contains(e.target))) setOpen(false);
    };
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", place);
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", place);
    };
  }, [open]);

  const enabled = () => [...(menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]:not([aria-disabled="true"])') ?? [])];

  useEffect(() => {
    if (!open) return;
    enabled()[0]?.focus();
    const onPointer = (e: PointerEvent) => {
      const target = e.target as Node;
      if (!menuRef.current?.contains(target) && !buttonRef.current?.contains(target)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    return () => document.removeEventListener("pointerdown", onPointer);
  }, [open]);

  const close = () => {
    setOpen(false);
    buttonRef.current?.focus();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const list = enabled();
    const index = list.indexOf(document.activeElement as HTMLElement);
    if (e.key === "Escape") {
      e.preventDefault();
      close();
    } else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      list[(index + (e.key === "ArrowDown" ? 1 : -1) + list.length) % list.length]?.focus();
    } else if (e.key === "Home" || e.key === "End") {
      e.preventDefault();
      (e.key === "Home" ? list[0] : list.at(-1))?.focus();
    } else if (e.key === "Tab") {
      setOpen(false);
    }
  };

  return (
    <div className={cn("relative inline-flex", className)}>
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={label}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" && !open) {
            e.preventDefault();
            setOpen(true);
          }
        }}
        className="touch-hit inline-flex size-9 cursor-pointer items-center justify-center rounded-md text-on-surface-variant transition-colors hover:bg-surface-container-low focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none"
      >
        {trigger ?? (
          <svg viewBox="0 0 24 24" className="size-4" fill="currentColor" aria-hidden>
            <circle cx="12" cy="5" r="1.8" />
            <circle cx="12" cy="12" r="1.8" />
            <circle cx="12" cy="19" r="1.8" />
          </svg>
        )}
      </button>
      {open &&
        createPortal(
        <div
          ref={menuRef}
          id={menuId}
          role="menu"
          aria-label={label}
          onKeyDown={onKeyDown}
          style={position}
          className="z-50 min-w-52 overflow-hidden rounded-lg border border-border bg-surface-container-lowest py-1 shadow-modal"
        >
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              tabIndex={-1}
              aria-disabled={item.disabled || undefined}
              onClick={() => {
                if (item.disabled) return;
                setOpen(false);
                buttonRef.current?.focus();
                item.onSelect();
              }}
              className={cn(
                "flex w-full cursor-pointer items-center gap-2.5 px-3.5 py-2 text-left text-sm outline-none focus:bg-surface-container-low",
                item.tone === "danger" ? "text-error" : "text-on-surface",
                item.disabled && "cursor-not-allowed opacity-50",
              )}
            >
              {item.icon && <span className="shrink-0 [&>svg]:size-4" aria-hidden>{item.icon}</span>}
              {item.label}
            </button>
          ))}
        </div>,
        // Усередині <dialog> (top layer) — туди ж, інакше меню опиниться під модалкою
        buttonRef.current?.closest("dialog") ?? document.body,
        )}
    </div>
  );
}
