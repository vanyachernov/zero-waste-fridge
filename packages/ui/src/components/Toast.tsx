import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "../cn";

export type ToastTone = "success" | "error" | "info";

export interface ToastOptions {
  message: string;
  tone?: ToastTone;
  /** Кнопка дії («Скасувати»): натискання закриває toast. */
  action?: { label: string; onClick: () => void };
  /** мс; за замовчуванням 5000 (стільки живе «Списано · Скасувати»). */
  duration?: number;
}

interface ToastEntry extends ToastOptions {
  id: number;
}

interface ToastApi {
  show: (options: ToastOptions) => number;
  dismiss: (id: number) => void;
}

const Context = createContext<ToastApi | null>(null);

/** F-30: сповіщення внизу екрана. Один провайдер на застосунок; `useToast()` — у будь-якому компоненті. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastEntry[]>([]);
  const seq = useRef(0);

  const dismiss = useCallback((id: number) => setToasts((list) => list.filter((t) => t.id !== id)), []);
  const show = useCallback((options: ToastOptions) => {
    const id = ++seq.current;
    // Не більше трьох одночасно — найстаріший зникає
    setToasts((list) => [...list.slice(-2), { ...options, id }]);
    return id;
  }, []);

  return (
    <Context.Provider value={{ show, dismiss }}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-50 flex flex-col items-center gap-2 px-4 lg:bottom-6"
      >
        {toasts.map((t) => (
          <ToastView key={t.id} toast={t} onDismiss={() => dismiss(t.id)} />
        ))}
      </div>
    </Context.Provider>
  );
}

function ToastView({ toast, onDismiss }: { toast: ToastEntry; onDismiss: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, toast.duration ?? 5000);
    return () => clearTimeout(timer);
  }, [toast.duration, onDismiss]);

  return (
    <div
      role={toast.tone === "error" ? "alert" : "status"}
      className={cn(
        "pointer-events-auto flex w-full max-w-md items-center gap-3 rounded-lg px-4 py-3 text-sm shadow-modal",
        toast.tone === "error" ? "bg-error text-on-error" : "bg-on-surface text-surface",
      )}
    >
      <span className="min-w-0 flex-1">{toast.message}</span>
      {toast.action && (
        <button
          type="button"
          onClick={() => {
            toast.action!.onClick();
            onDismiss();
          }}
          className="shrink-0 cursor-pointer rounded-md px-2 py-1 font-bold text-primary-fixed-dim hover:bg-white/10"
        >
          {toast.action.label}
        </button>
      )}
      <button type="button" aria-label="Закрити" onClick={onDismiss} className="shrink-0 cursor-pointer opacity-70 hover:opacity-100">
        <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
          <path d="M6 6l12 12M18 6 6 18" />
        </svg>
      </button>
    </div>
  );
}

export function useToast(): ToastApi {
  const api = useContext(Context);
  if (!api) throw new Error("useToast must be used inside ToastProvider");
  return api;
}
