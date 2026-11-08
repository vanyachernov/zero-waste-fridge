"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { cn } from "../cn";

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}

/** Нативний <dialog>: фокус-трап, Esc і backdrop «з коробки». На мобільних — bottom sheet. */
export function Modal({ open, onClose, title, description, children, footer, className }: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      className={cn(
        "m-0 mt-auto w-full max-w-none rounded-t-xl bg-surface-container-lowest p-0 text-on-surface shadow-modal backdrop:bg-on-surface/40 backdrop:backdrop-blur-[2px]",
        "sm:m-auto sm:max-w-lg sm:rounded-xl",
        className,
      )}
    >
      <div className="flex flex-col gap-5 p-6">
        <header className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold">{title}</h2>
            {description && <p className="mt-1 text-sm text-on-surface-variant">{description}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
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
