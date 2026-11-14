import { cn } from "@zwf/ui";
import { Trash2 } from "lucide-react";
import { useRef, useState, type PointerEvent, type ReactNode } from "react";

/** Скільки треба протягнути (частка ширини), щоб спрацювала дія. */
const THRESHOLD = 0.35;

export interface SwipeRowProps {
  children: ReactNode;
  /** Свайп ліворуч далі за поріг. */
  onSwipe: () => void;
  /** Підпис під смітником, напр. «Списати». */
  label: string;
  className?: string;
}

/**
 * F-84: свайп рядка ліворуч → «Списати». Лише для дотику (миша й клавіатура користуються меню «⋮»),
 * вертикальна прокрутка лишається браузеру (`touch-action: pan-y`).
 */
export function SwipeRow({ children, onSwipe, label, className }: SwipeRowProps) {
  const [dx, setDx] = useState(0);
  const start = useRef<{ x: number; y: number; width: number; locked: boolean | null } | null>(null);

  const down = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== "touch") return;
    start.current = { x: e.clientX, y: e.clientY, width: e.currentTarget.offsetWidth, locked: null };
  };
  const move = (e: PointerEvent<HTMLDivElement>) => {
    const s = start.current;
    if (!s) return;
    const x = e.clientX - s.x;
    const y = e.clientY - s.y;
    // Перші 8 px вирішують, це свайп чи прокрутка
    if (s.locked === null && Math.hypot(x, y) > 8) s.locked = Math.abs(x) > Math.abs(y);
    if (s.locked) setDx(Math.min(0, x));
  };
  const up = () => {
    const s = start.current;
    start.current = null;
    if (s?.locked && -dx > s.width * THRESHOLD) onSwipe();
    setDx(0);
  };

  const progress = start.current ? Math.min(1, -dx / (start.current.width * THRESHOLD)) : 0;

  return (
    <div className={cn("relative overflow-hidden rounded-lg", className)}>
      <div
        aria-hidden
        className="absolute inset-0 flex items-center justify-end gap-2 rounded-lg bg-error pr-5 text-sm font-semibold text-on-error"
        style={{ opacity: dx ? 0.4 + progress * 0.6 : 0 }}
      >
        <Trash2 className="size-4" style={{ transform: `scale(${0.8 + progress * 0.3})` }} /> {label}
      </div>
      <div
        className={cn("relative touch-pan-y", !dx && "transition-transform duration-200")}
        style={{ transform: dx ? `translateX(${dx}px)` : undefined }}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
      >
        {children}
      </div>
    </div>
  );
}
