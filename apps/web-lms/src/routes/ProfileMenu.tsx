import type { CurrentUser } from "@zwf/api-client";
import { useI18n } from "@zwf/i18n/react";
import { Badge, cn } from "@zwf/ui";
import { Leaf, Loader2, LogOut, Monitor, Moon, Settings, Sun, Users } from "lucide-react";
import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { useTheme, type ThemePreference } from "../lib/theme";

export function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => [...part][0]!.toUpperCase())
    .join("")
    .slice(0, 2);
}

export interface ProfileMenuProps {
  user: CurrentUser;
  onLogout: () => void;
  logoutPending?: boolean;
  logoutError?: string | null;
}

const THEMES: { value: ThemePreference; icon: typeof Sun; key: "profile.themeLight" | "profile.themeDark" | "profile.themeSystem" }[] = [
  { value: "light", icon: Sun, key: "profile.themeLight" },
  { value: "dark", icon: Moon, key: "profile.themeDark" },
  { value: "system", icon: Monitor, key: "profile.themeSystem" },
];

/**
 * F-12: меню профілю в хедері. Доступність за патерном WAI-ARIA «menu button»:
 * Enter/Space/↓ відкривають, ↑/↓ переміщують фокус, Escape закриває й повертає фокус на кнопку.
 */
export function ProfileMenu({ user, onLogout, logoutPending = false, logoutError }: ProfileMenuProps) {
  const { t, messages } = useI18n();
  const [open, setOpen] = useState(false);
  const [theme, setTheme] = useTheme();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  const items = () => [...(menuRef.current?.querySelectorAll<HTMLElement>('[role^="menuitem"]:not([aria-disabled="true"])') ?? [])];

  const close = (restoreFocus = true) => {
    setOpen(false);
    if (restoreFocus) buttonRef.current?.focus();
  };

  useEffect(() => {
    if (!open) return;
    items()[0]?.focus();
    const onPointer = (e: PointerEvent) => {
      const target = e.target as Node;
      if (!menuRef.current?.contains(target) && !buttonRef.current?.contains(target)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    return () => document.removeEventListener("pointerdown", onPointer);
  }, [open]);

  const onMenuKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const list = items();
    const index = list.indexOf(document.activeElement as HTMLElement);
    if (e.key === "Escape") {
      e.preventDefault();
      close();
    } else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const next = (index + (e.key === "ArrowDown" ? 1 : -1) + list.length) % list.length;
      list[next]?.focus();
    } else if (e.key === "Home" || e.key === "End") {
      e.preventDefault();
      (e.key === "Home" ? list[0] : list.at(-1))?.focus();
    } else if (e.key === "Tab") {
      setOpen(false);
    }
  };

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={t("profile.menu")}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" && !open) {
            e.preventDefault();
            setOpen(true);
          }
        }}
        className="flex cursor-pointer items-center gap-3 rounded-lg p-1 text-left transition-colors hover:bg-surface-container-low sm:pl-2"
      >
        <span className="hidden text-right sm:block lg:hidden xl:block">
          <span className="block text-sm leading-tight font-semibold">{user.name}</span>
          <span className="inline-flex items-center gap-1 text-2xs font-medium text-primary">
            {t("profile.hero")} <Leaf className="size-3" aria-hidden />
          </span>
        </span>
        <span
          aria-hidden
          className="flex size-9 items-center justify-center overflow-hidden rounded-full bg-primary-container text-xs font-bold text-on-primary-container"
        >
          {user.avatarUrl ? <img src={user.avatarUrl} alt="" className="size-full object-cover" /> : initials(user.name)}
        </span>
      </button>

      {open && (
        <div
          ref={menuRef}
          id={menuId}
          role="menu"
          aria-label={t("profile.menu")}
          onKeyDown={onMenuKeyDown}
          className="absolute right-0 z-40 mt-2 w-72 overflow-hidden rounded-xl border border-border bg-surface-container-lowest shadow-modal"
        >
          <div className="border-b border-border px-4 py-3">
            <p className="truncate text-sm font-bold">{user.name}</p>
            <p className="truncate text-xs text-on-surface-variant">{user.email}</p>
            <p className="mt-2 flex items-center gap-2 text-2xs text-on-surface-variant">
              <span className="truncate">{user.householdName}</span>
              <Badge tone={user.role === "OWNER" ? "primary" : "info"}>{messages.profile.roles[user.role]}</Badge>
            </p>
          </div>

          <div className="py-1">
            {[
              { icon: Users, label: t("profile.family") },
              { icon: Settings, label: t("profile.settings") },
            ].map(({ icon: Icon, label }) => (
              <div
                key={label}
                role="menuitem"
                aria-disabled="true"
                tabIndex={-1}
                className="flex cursor-not-allowed items-center gap-3 px-4 py-2 text-sm text-muted"
              >
                <Icon className="size-4" aria-hidden />
                <span className="flex-1">{label}</span>
                <Badge>{t("profile.soon")}</Badge>
              </div>
            ))}
          </div>

          <div className="border-t border-border px-4 py-3" role="group" aria-label={t("profile.theme")}>
            <p className="mb-2 text-2xs font-semibold tracking-wide text-on-surface-variant uppercase">{t("profile.theme")}</p>
            <div className="grid grid-cols-3 gap-1 rounded-lg bg-surface-container p-1">
              {THEMES.map(({ value, icon: Icon, key }) => (
                <button
                  key={value}
                  type="button"
                  role="menuitemradio"
                  aria-checked={theme === value}
                  tabIndex={-1}
                  onClick={() => setTheme(value)}
                  className={cn(
                    "flex cursor-pointer flex-col items-center gap-1 rounded-md py-1.5 text-2xs transition-colors",
                    theme === value ? "bg-surface-container-lowest font-semibold text-on-surface shadow-card" : "text-muted hover:text-on-surface",
                  )}
                >
                  <Icon className="size-4" aria-hidden />
                  {t(key)}
                </button>
              ))}
            </div>
          </div>

          <div className="border-t border-border py-1">
            <button
              type="button"
              role="menuitem"
              tabIndex={-1}
              disabled={logoutPending}
              onClick={onLogout}
              className="flex w-full cursor-pointer items-center gap-3 px-4 py-2 text-sm font-medium text-error hover:bg-error-container/40 disabled:cursor-wait"
            >
              {logoutPending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <LogOut className="size-4" aria-hidden />}
              {t("profile.logout")}
            </button>
            {logoutError && (
              <p role="alert" className="px-4 pb-2 text-2xs text-error">
                {logoutError}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
