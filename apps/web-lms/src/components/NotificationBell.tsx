import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { api, queryKeys, type AppNotification } from "@zwf/api-client";
import { useI18n } from "@zwf/i18n/react";
import { cn } from "@zwf/ui";
import { Bell, CheckCheck, Settings, TriangleAlert } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { notificationText, notificationsQuery, unreadCountQuery } from "../lib/notifications";
import { relativeTime } from "../lib/time";

/** F-70: дзвіночок у шапці — лічильник непрочитаних і popover зі списком. */
export function NotificationBell() {
  const i18n = useI18n();
  const { t } = i18n;
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const panelId = useId();
  const unread = useQuery(unreadCountQuery);
  const feed = useQuery({ ...notificationsQuery, enabled: open });
  const count = unread.data?.count ?? 0;

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      const target = e.target as Node;
      if (!panelRef.current?.contains(target) && !buttonRef.current?.contains(target)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const refresh = () => {
    void qc.invalidateQueries({ queryKey: queryKeys.notifications });
  };
  const readAll = useMutation({ mutationFn: () => api.notifications.readAll(), onSettled: refresh });
  const openOne = useMutation({
    mutationFn: (n: AppNotification) => (n.read ? Promise.resolve() : api.notifications.read(n.id)),
    onSettled: refresh,
  });

  const go = (n: AppNotification) => {
    openOne.mutate(n);
    setOpen(false);
    void navigate({ to: "/", search: n.product ? { q: n.product.name } : {} });
  };

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        aria-label={count ? t("notifications.bellUnread", { n: count }) : t("notifications.bell")}
        onClick={() => setOpen((v) => !v)}
        className="relative cursor-pointer rounded-md p-2 text-on-surface-variant hover:bg-surface-container-low"
      >
        <Bell className="size-5" aria-hidden />
        {count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-pill bg-warning px-1 text-[10px] leading-none font-bold text-on-warning ring-2 ring-surface-container-lowest">
            {count > 9 ? "9+" : count}
          </span>
        )}
      </button>
      {open && (
        <div
          ref={panelRef}
          id={panelId}
          role="dialog"
          aria-label={t("notifications.title")}
          className="fixed inset-x-3 top-16 z-40 overflow-hidden rounded-xl border border-border bg-surface-container-lowest shadow-modal sm:absolute sm:inset-x-auto sm:top-full sm:right-0 sm:mt-2 sm:w-96"
        >
          <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
            <h2 className="font-bold">{t("notifications.title")}</h2>
            <button
              type="button"
              disabled={!count || readAll.isPending}
              onClick={() => readAll.mutate()}
              className="flex cursor-pointer items-center gap-1 text-xs font-semibold text-primary disabled:cursor-default disabled:text-muted"
            >
              <CheckCheck className="size-3.5" aria-hidden /> {t("notifications.readAll")}
            </button>
          </div>
          <ul className="max-h-96 divide-y divide-border overflow-y-auto">
            {feed.isPending ? (
              <li className="px-4 py-6 text-center text-sm text-muted">{t("common.loading")}</li>
            ) : !feed.data?.items.length ? (
              <li className="px-4 py-6 text-center text-sm text-muted">{t("notifications.empty")}</li>
            ) : (
              feed.data.items.map((n) => (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={() => go(n)}
                    className={cn("flex w-full cursor-pointer items-start gap-3 px-4 py-3 text-left hover:bg-surface-container-low", !n.read && "bg-primary-container/20")}
                  >
                    <span
                      className={cn(
                        "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full",
                        (n.daysLeft ?? 0) < 0 ? "bg-error-container text-on-error-container" : "bg-warning-container text-on-warning-container",
                      )}
                      aria-hidden
                    >
                      <TriangleAlert className="size-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className={cn("block text-sm", !n.read && "font-semibold")}>{notificationText(n, i18n)}</span>
                      <span className="block text-2xs text-on-surface-variant">
                        {relativeTime(n.createdAt, i18n)} · {t("notifications.hint")}
                      </span>
                    </span>
                    {!n.read && <span className="mt-2 size-2 shrink-0 rounded-full bg-primary" aria-label="•" />}
                  </button>
                </li>
              ))
            )}
          </ul>
          <Link
            to="/settings"
            onClick={() => setOpen(false)}
            className="flex items-center justify-center gap-1.5 border-t border-border px-4 py-2.5 text-xs font-semibold text-on-surface-variant hover:bg-surface-container-low"
          >
            <Settings className="size-3.5" aria-hidden /> {t("notifications.settings")}
          </Link>
        </div>
      )}
    </div>
  );
}
