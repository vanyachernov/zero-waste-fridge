"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { cn } from "../cn";

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
  /** Іконка в кольоровому квадраті ліворуч від заголовка (макети «Додати» / «Списати продукт»). */
  icon?: ReactNode;
  iconTone?: "primary" | "error" | "neutral";
  /** `lg` — 600 px, як модалки продукту. */
  size?: "md" | "lg";
  /** Підпис кнопки закриття для екранних читачів. */
  closeLabel?: string;
}

const iconTones = {
  primary: "bg-primary-container text-on-primary-container",
  error: "bg-error-container text-on-error-container",
  neutral: "bg-surface-container text-on-surface",
};

/** Нативний <dialog>: фокус-трап, Esc і backdrop «з коробки». На мобільних — bottom sheet. */
export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  className,
  icon,
  iconTone = "primary",
  size = "md",
  closeLabel = "Закрити",
}: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const id = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      // showModal() фокусує першу кнопку (✕). Нам потрібне перше поле форми або елемент з data-autofocus
      const target = dialog.querySelector<HTMLElement>("[data-autofocus], input:not([disabled]):not([type=hidden]), select:not([disabled]), textarea:not([disabled])");
      target?.focus();
    }
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={`${id}-title`}
      aria-describedby={description ? `${id}-description` : undefined}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      className={cn(
        "m-0 mt-auto max-h-[92dvh] w-full max-w-none overflow-y-auto rounded-t-xl bg-surface-container-lowest p-0 text-on-surface shadow-modal backdrop:bg-on-surface/40 backdrop:backdrop-blur-[2px]",
        "sm:m-auto sm:rounded-2xl",
        size === "lg" ? "sm:max-w-[600px]" : "sm:max-w-lg",
        className,
      )}
    >
      <div className="flex flex-col gap-5 p-6 sm:p-7">
        <header className="flex items-start gap-3.5">
          {icon && (
            <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-[10px] [&>svg]:size-5", iconTones[iconTone])} aria-hidden>
              {icon}
            </span>
          )}
          <div className="min-w-0 flex-1">
            <h2 id={`${id}-title`} className="text-[22px] leading-tight font-bold">
              {title}
            </h2>
            {description && (
              <p id={`${id}-description`} className="mt-1 text-[13px] text-on-surface-variant">
                {description}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={closeLabel}
            className="-m-1 rounded-md p-1 text-muted hover:bg-surface-container-low hover:text-on-surface"
          >
            <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </header>
        {children}
        {footer && <footer className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">{footer}</footer>}
      </div>
    </dialog>
  );
}
