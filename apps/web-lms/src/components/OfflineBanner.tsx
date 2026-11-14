import { onlineManager } from "@tanstack/react-query";
import { useI18n } from "@zwf/i18n/react";
import { Wifi, WifiOff } from "lucide-react";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";

/** Стан мережі з React Query: він же ставить запити й мутації на паузу офлайн і довантажує після. */
export function useOnline(): boolean {
  return useSyncExternalStore(onlineManager.subscribe.bind(onlineManager), () => onlineManager.isOnline(), () => true);
}

/** F-92: офлайн-індикатор під шапкою; після відновлення — коротке «З'єднання відновлено». */
export function OfflineBanner() {
  const { t } = useI18n();
  const online = useOnline();
  const wasOffline = useRef(false);
  const [restored, setRestored] = useState(false);

  useEffect(() => {
    if (!online) {
      wasOffline.current = true;
      setRestored(false);
      return;
    }
    if (!wasOffline.current) return;
    wasOffline.current = false;
    setRestored(true);
    const timer = setTimeout(() => setRestored(false), 3000);
    return () => clearTimeout(timer);
  }, [online]);

  if (online && !restored) return null;
  return (
    <div
      role="status"
      aria-live="polite"
      className={
        online
          ? "flex items-center justify-center gap-2 bg-primary-container px-4 py-2 text-xs font-medium text-on-primary-container"
          : "flex items-center justify-center gap-2 bg-warning-container px-4 py-2 text-center text-xs font-medium text-on-warning-container"
      }
    >
      {online ? <Wifi className="size-4 shrink-0" aria-hidden /> : <WifiOff className="size-4 shrink-0" aria-hidden />}
      {online ? t("status.backOnline") : t("status.offline")}
    </div>
  );
}
