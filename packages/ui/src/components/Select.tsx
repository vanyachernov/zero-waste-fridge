"use client";

import {
  forwardRef,
  useEffect,
  useId,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { cn } from "../cn";

export interface SelectOption<T extends string = string> {
  value: T;
  label: string;
  disabled?: boolean;
}

export interface SelectProps<T extends string = string>
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onChange" | "value" | "type" | "children"> {
  options: readonly SelectOption<T>[];
  value: T | "";
  onChange: (value: T) => void;
  /** Іконка або емодзі ліворуч («🥦 Овочі & Зелень», «🏬 Сільпо»). */
  leading?: ReactNode;
  invalid?: boolean;
  placeholder?: string;
}

/** До першого виміру — поза потоком сторінки (інакше список на мить подовжує документ). */
const HIDDEN: CSSProperties = { position: "fixed", top: 0, left: 0, visibility: "hidden" };

const chevron = (
  <svg viewBox="0 0 24 24" aria-hidden className="pointer-events-none size-4 shrink-0 text-muted" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m6 9 6 6 6-6" />
  </svg>
);

const check = (
  <svg viewBox="0 0 24 24" aria-hidden className="size-4 shrink-0 text-primary" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12.5 10 17 19 7.5" />
  </svg>
);

/**
 * F-07: випадний список у стилі UI-Kit (замість системного `<select>`, який у кожному браузері свій).
 * WAI-ARIA «select-only combobox»: фокус лишається на кнопці, активний пункт — через `aria-activedescendant`;
 * ↑/↓/Home/End, Enter/Space, Escape, Tab і пошук першими літерами. Список — у порталі з `position: fixed`,
 * тож картки з `overflow: hidden` його не обрізають; унизу екрана відкривається вгору.
 */
function SelectInner<T extends string>(
  { options, value, onChange, leading, invalid, placeholder, className, disabled, id, onBlur, ...props }: SelectProps<T>,
  ref: React.ForwardedRef<HTMLButtonElement>,
) {
  const autoId = useId();
  const buttonId = id ?? `${autoId}-select`;
  const listId = `${autoId}-listbox`;
  const optionId = (i: number) => `${autoId}-option-${i}`;
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  useImperativeHandle(ref, () => buttonRef.current!, []);

  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [position, setPosition] = useState<CSSProperties>(HIDDEN);
  const typed = useRef({ text: "", at: 0 });

  const selectedIndex = options.findIndex((o) => o.value === value);
  const selected = selectedIndex >= 0 ? options[selectedIndex] : undefined;
  const enabled = (i: number) => i >= 0 && i < options.length && !options[i]!.disabled;
  const step = (from: number, dir: 1 | -1) => {
    for (let i = from + dir; i >= 0 && i < options.length; i += dir) if (enabled(i)) return i;
    return from;
  };
  const first = () => step(-1, 1);
  const last = () => step(options.length, -1);

  const openList = (at = selectedIndex >= 0 ? selectedIndex : first()) => {
    if (disabled) return;
    setActive(at);
    setOpen(true);
  };
  const choose = (i: number) => {
    if (!enabled(i)) return;
    setOpen(false);
    if (options[i]!.value !== value) onChange(options[i]!.value);
  };

  // Позиція відносно кнопки: під нею або (немає місця) над нею, не вужче за кнопку
  const place = () => {
    const button = buttonRef.current;
    const list = listRef.current;
    if (!button || !list) return;
    const rect = button.getBoundingClientRect();
    const height = Math.min(list.scrollHeight, 288);
    const below = window.innerHeight - rect.bottom;
    const up = below < height + 12 && rect.top > below;
    setPosition({
      position: "fixed",
      top: up ? Math.max(8, rect.top - height - 4) : rect.bottom + 4,
      left: Math.max(8, Math.min(rect.left, window.innerWidth - Math.max(rect.width, 200) - 8)),
      minWidth: rect.width,
      maxWidth: `calc(100vw - 16px)`,
    });
  };

  useLayoutEffect(() => {
    if (!open) {
      setPosition(HIDDEN);
      return;
    }
    place();
    const onScroll = (e: Event) => {
      if (!(e.target instanceof Node && listRef.current?.contains(e.target))) setOpen(false);
    };
    const onPointer = (e: PointerEvent) => {
      const target = e.target as Node;
      if (!listRef.current?.contains(target) && !buttonRef.current?.contains(target)) setOpen(false);
    };
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", place);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", place);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [open]);

  // Активний пункт завжди видно — прокручуємо лише сам список, не сторінку
  useEffect(() => {
    const list = listRef.current;
    const option = active >= 0 ? document.getElementById(optionId(active)) : null;
    if (!open || !list || !option) return;
    if (option.offsetTop < list.scrollTop) list.scrollTop = option.offsetTop;
    else if (option.offsetTop + option.offsetHeight > list.scrollTop + list.clientHeight) {
      list.scrollTop = option.offsetTop + option.offsetHeight - list.clientHeight;
    }
  }, [open, active, position]);

  const typeahead = (key: string) => {
    const now = Date.now();
    typed.current = { text: (now - typed.current.at > 700 ? "" : typed.current.text) + key.toLowerCase(), at: now };
    const from = open ? active : selectedIndex;
    const order = [...options.keys()].map((k) => (k + Math.max(from, 0) + (typed.current.text.length === 1 ? 1 : 0)) % options.length);
    const hit = order.find((i) => enabled(i) && options[i]!.label.toLowerCase().replace(/^[^\p{L}\p{N}]+/u, "").startsWith(typed.current.text));
    if (hit === undefined) return;
    if (open) setActive(hit);
    else if (options[hit]!.value !== value) onChange(options[hit]!.value);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (disabled) return;
    const k = e.key;
    if (!open) {
      if (k === "ArrowDown" || k === "ArrowUp" || k === "Enter" || k === " ") {
        e.preventDefault();
        openList(k === "ArrowUp" && selectedIndex < 0 ? last() : undefined);
      } else if (k === "Home" || k === "End") {
        e.preventDefault();
        openList(k === "Home" ? first() : last());
      } else if (k.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) typeahead(k);
      return;
    }
    if (k === "ArrowDown" || k === "ArrowUp") {
      e.preventDefault();
      setActive((a) => step(a, k === "ArrowDown" ? 1 : -1));
    } else if (k === "Home" || k === "End") {
      e.preventDefault();
      setActive(k === "Home" ? first() : last());
    } else if (k === "PageDown" || k === "PageUp") {
      e.preventDefault();
      setActive((a) => {
        let next = a;
        for (let n = 0; n < 10; n++) next = step(next, k === "PageDown" ? 1 : -1);
        return next;
      });
    } else if (k === "Enter" || k === " ") {
      e.preventDefault();
      choose(active);
    } else if (k === "Escape") {
      e.preventDefault();
      setOpen(false);
    } else if (k === "Tab") {
      choose(active);
    } else if (k.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      typeahead(k);
    }
  };

  return (
    <>
      <button
        ref={buttonRef}
        id={buttonId}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-activedescendant={open && active >= 0 ? optionId(active) : undefined}
        aria-invalid={invalid || undefined}
        disabled={disabled}
        onClick={() => (open ? setOpen(false) : openList())}
        onKeyDown={onKeyDown}
        onBlur={onBlur}
        className={cn(
          "touch-hit flex h-10 w-full cursor-pointer items-center gap-2 rounded-md border bg-surface-container-lowest px-3 text-left text-sm transition-colors outline-none",
          "hover:border-outline-variant focus-visible:border-primary focus-visible:bg-surface-container-low focus-visible:ring-2 focus-visible:ring-primary/15",
          open && "border-primary ring-2 ring-primary/15",
          invalid ? "border-error bg-error-container/30" : !open && "border-border",
          disabled && "cursor-not-allowed bg-surface-container-highest opacity-70",
          className,
        )}
        {...props}
      >
        {leading && (
          <span className="shrink-0 text-muted" aria-hidden>
            {leading}
          </span>
        )}
        <span className={cn("min-w-0 flex-1 truncate", !selected && "text-muted")}>{selected?.label ?? placeholder ?? ""}</span>
        <span className={cn("transition-transform", open && "rotate-180")}>{chevron}</span>
      </button>
      {open &&
        createPortal(
          <ul
            ref={listRef}
            id={listId}
            role="listbox"
            aria-labelledby={buttonId}
            tabIndex={-1}
            style={position}
            className="z-50 max-h-72 overflow-y-auto overscroll-contain rounded-lg border border-border bg-surface-container-lowest p-1 shadow-modal motion-safe:animate-backdrop-in"
          >
            {options.map((o, i) => (
              <li
                key={o.value}
                id={optionId(i)}
                role="option"
                data-value={o.value}
                aria-selected={o.value === value}
                aria-disabled={o.disabled || undefined}
                // Не забираємо фокус у кнопки (інакше спрацює blur до вибору)
                onPointerDown={(e) => e.preventDefault()}
                onPointerMove={() => enabled(i) && active !== i && setActive(i)}
                onClick={() => choose(i)}
                className={cn(
                  "flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm",
                  i === active && "bg-surface-container-low",
                  o.value === value ? "font-semibold text-on-surface" : "text-on-surface-variant",
                  o.disabled && "cursor-not-allowed opacity-50",
                )}
              >
                <span className="min-w-0 flex-1 truncate">{o.label}</span>
                {o.value === value && check}
              </li>
            ))}
          </ul>,
          // Усередині <dialog> (top layer) — туди ж, інакше список опиниться під модалкою
          buttonRef.current?.closest("dialog") ?? document.body,
        )}
    </>
  );
}

export const Select = forwardRef(SelectInner) as <T extends string>(
  props: SelectProps<T> & { ref?: React.ForwardedRef<HTMLButtonElement> },
) => ReturnType<typeof SelectInner>;
