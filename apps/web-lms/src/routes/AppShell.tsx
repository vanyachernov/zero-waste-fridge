import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, Outlet, useNavigate } from "@tanstack/react-router";
import { api } from "@zwf/api-client";
import { useI18n } from "@zwf/i18n/react";
import { Logo } from "@zwf/ui";
import { BarChart3, ChefHat, Leaf, Refrigerator, ShoppingCart, Users } from "lucide-react";
import { NotificationBell } from "../components/NotificationBell";
import { useHouseholdStream } from "../lib/realtime";
import { errorMessage } from "../lib/errors";
import { meQuery } from "../lib/queries";
import { ProfileMenu } from "./ProfileMenu";

const NAV = [
  { to: "/", key: "nav.fridge", short: "navShort.fridge", icon: Refrigerator, disabled: false },
  { to: "/recipes", key: "nav.recipes", short: "navShort.recipes", icon: ChefHat, disabled: false },
  { to: "/stats", key: "nav.stats", short: "navShort.stats", icon: BarChart3, disabled: true }, // розділ ще не реалізовано
  { to: "/shopping", key: "nav.shopping", short: "navShort.shopping", icon: ShoppingCart, disabled: false },
] as const;

/** F-81: мобільна навігація за макетом — без «Статистики» (вона в меню профілю), зате з «Сім'єю». */
const MOBILE_NAV = [
  { to: "/", short: "navShort.fridge", icon: Refrigerator },
  { to: "/recipes", short: "navShort.recipes", icon: ChefHat },
  { to: "/shopping", short: "navShort.shopping", icon: ShoppingCart },
  { to: "/family", short: "navShort.family", icon: Users },
] as const;

export function AppShell() {
  const i18n = useI18n();
  const { t, messages } = i18n;
  const { data: me } = useQuery(meQuery);
  // F-63: зміни інших учасників сім'ї приходять без перезавантаження
  useHouseholdStream(Boolean(me?.householdId));
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const logout = useMutation({
    mutationFn: () => api.auth.logout(),
    onSuccess: () => {
      queryClient.clear();
      void navigate({ to: "/login", replace: true });
    },
  });

  return (
    <div className="flex min-h-dvh flex-col">
      {/* F-91: перший Tab — одразу до вмісту, повз навігацію */}
      <a
        href="#main"
        className="sr-only z-50 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-on-primary focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        {t("a11y.skipToContent")}
      </a>
      <header className="sticky top-0 z-30 border-b border-border bg-surface-container-lowest/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-app items-center gap-4 px-4 sm:px-6 xl:gap-6">
          <Link to="/" aria-label={messages.brand.name}>
            <Logo />
          </Link>

          <nav className="hidden flex-1 items-center gap-0.5 lg:flex xl:gap-1" aria-label="Main">
            {NAV.map(({ to, key, disabled }) =>
              disabled ? (
                <span key={to} className="cursor-not-allowed rounded-md px-3 py-1.5 text-sm whitespace-nowrap text-muted" title="Скоро">
                  {t(key)}
                </span>
              ) : (
                <Link
                  key={to}
                  to={to}
                  activeOptions={{ exact: true, includeSearch: false }}
                  className="rounded-md border border-transparent px-3 py-1.5 text-sm font-medium whitespace-nowrap text-on-surface-variant transition-colors hover:text-primary"
                  activeProps={{ className: "!border-border bg-surface-container-low !text-on-surface" }}
                >
                  {t(key)}
                </Link>
              ),
            )}
          </nav>

          <div className="ml-auto flex items-center gap-3 sm:gap-4">
            <NotificationBell />
            {me && (
              <ProfileMenu
                user={me}
                onLogout={() => logout.mutate()}
                logoutPending={logout.isPending}
                logoutError={logout.isError ? errorMessage(logout.error, i18n) : null}
                onThemeChange={(theme) => {
                  queryClient.setQueryData(meQuery.queryKey, (user) => (user ? { ...user, theme } : user));
                  // Не вдалося зберегти — тема все одно діє на цьому пристрої
                  void api.auth.setTheme(theme).catch(() => undefined);
                }}
              />
            )}
          </div>
        </div>
      </header>

      <main id="main" tabIndex={-1} className="mx-auto w-full max-w-app flex-1 outline-none px-4 pt-5 pb-28 sm:px-6 lg:pb-10">
        <Outlet />
      </main>

      <footer className="hidden border-t border-border bg-surface-container-lowest lg:block">
        <div className="mx-auto flex max-w-app items-center justify-between px-6 py-4 text-xs text-muted">
          <span className="inline-flex items-center gap-1.5">
            <Leaf className="size-3.5 text-primary" />
            {messages.brand.name} © {new Date().getFullYear()}. {messages.brand.tagline}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-primary" /> Скан-модуль активний
          </span>
        </div>
      </footer>

      {/* Мобільна нижня навігація */}
      <nav
        aria-label="Mobile"
        className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t border-border bg-surface-container-lowest/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
      >
        {MOBILE_NAV.map(({ to, short, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            activeOptions={{ exact: true, includeSearch: false }}
            className="group flex min-h-14 flex-col items-center justify-center gap-1 pt-2 pb-1.5 text-[11px] font-medium text-muted outline-none"
            activeProps={{ className: "!text-on-surface" }}
          >
            <span className="flex h-7 w-13 items-center justify-center rounded-pill transition-colors group-hover:bg-surface-container-low group-focus-visible:ring-2 group-focus-visible:ring-primary group-data-[status=active]:bg-primary-container group-data-[status=active]:text-on-primary-container">
              <Icon className="size-5" aria-hidden />
            </span>
            <span className="max-w-full truncate px-1">{t(short)}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
