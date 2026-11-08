import type { QueryClient } from "@tanstack/react-query";
import { createRootRouteWithContext, createRoute, createRouter, Outlet, redirect, type RouterHistory } from "@tanstack/react-router";
import { isApiError } from "@zwf/api-client";
import type { AuthTab } from "./auth/AuthTabs";
import { LoginPage } from "./auth/LoginPage";
import { meQuery, productsQuery } from "./lib/queries";
import { safeRedirect } from "./lib/redirect";
import { AppErrorScreen, AppPendingScreen } from "./routes/AppStatusScreens";
import { AppShell } from "./routes/AppShell";
import { FridgePage } from "./routes/FridgePage";
import { RecipesPage } from "./routes/RecipesPage";
import { ShoppingPage } from "./routes/ShoppingPage";

export interface RouterContext {
  queryClient: QueryClient;
}

const rootRoute = createRootRouteWithContext<RouterContext>()({ component: Outlet });

// ---------- Публічні сторінки (без AppShell) ----------

/**
 * Чи є сесія — без зайвих запитів: якщо `/me` уже відповів 401 (і після цього не було входу),
 * не питаємо сервер знову на кожне перемикання вкладок чи полів форми.
 */
async function isSignedIn(queryClient: QueryClient): Promise<boolean> {
  const state = queryClient.getQueryState(meQuery.queryKey);
  if (state?.data) return true;
  if (state?.status === "error" && isApiError(state.error, 401)) return false;
  return queryClient.ensureQueryData(meQuery).then(
    () => true,
    () => false,
  );
}

export interface LoginSearch {
  tab?: Exclude<AuthTab, "login">;
  /** Внутрішній шлях SPA, куди повернутися після входу (F-11). */
  redirect?: string;
}

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/login",
  validateSearch: (search: Record<string, unknown>): LoginSearch => ({
    ...(search.tab === "register" ? { tab: "register" as const } : {}),
    ...(typeof search.redirect === "string" && safeRedirect(search.redirect) !== "/" ? { redirect: safeRedirect(search.redirect) } : {}),
  }),
  // Уже залогінений користувач на /login одразу потрапляє в кабінет
  beforeLoad: async ({ context, search }) => {
    if (await isSignedIn(context.queryClient)) throw redirect({ href: safeRedirect(search.redirect) });
  },
  component: LoginPage,
});

// ---------- Кабінет (AppShell) ----------

/**
 * F-11: усе під цим layout-маршрутом доступне лише з сесією. Без неї — /login?redirect=<звідки прийшли>,
 * після входу користувач повертається туди ж.
 */
const appRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: "_authenticated",
  beforeLoad: async ({ context, location }) => {
    try {
      await context.queryClient.ensureQueryData(meQuery);
    } catch (error) {
      if (isApiError(error, 401)) {
        throw redirect({ to: "/login", search: location.href === "/" ? {} : { redirect: location.href } });
      }
      throw error;
    }
  },
  pendingComponent: AppPendingScreen,
  errorComponent: AppErrorScreen,
  component: AppShell,
});

const fridgeRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "/",
  loader: ({ context }) => context.queryClient.ensureQueryData(productsQuery),
  component: FridgePage,
});

export interface RecipesSearch {
  ids?: string[];
}

const recipesRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "/recipes",
  validateSearch: (search: Record<string, unknown>): RecipesSearch => {
    const raw = search.ids;
    const ids = (Array.isArray(raw) ? raw : typeof raw === "string" ? raw.split(",") : [])
      .map(String)
      .filter(Boolean)
      .slice(0, 4);
    return ids.length ? { ids } : {};
  },
  loader: ({ context }) => context.queryClient.ensureQueryData(productsQuery),
  component: RecipesPage,
});

const shoppingRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "/shopping",
  component: ShoppingPage,
});

const routeTree = rootRoute.addChildren([loginRoute, appRoute.addChildren([fridgeRoute, recipesRoute, shoppingRoute])]);

export function createAppRouter(queryClient: QueryClient, options: { history?: RouterHistory } = {}) {
  return createRouter({
    routeTree,
    basepath: "/lms",
    context: { queryClient },
    history: options.history,
    defaultPreload: "intent",
    defaultPreloadStaleTime: 0,
    scrollRestoration: true,
  });
}

export type AppRouter = ReturnType<typeof createAppRouter>;

declare module "@tanstack/react-router" {
  interface Register {
    router: AppRouter;
  }
}
