import type { QueryClient } from "@tanstack/react-query";
import { createRootRouteWithContext, createRoute, createRouter, Outlet, type RouterHistory } from "@tanstack/react-router";
import type { AuthTab } from "./auth/AuthTabs";
import { LoginPage } from "./auth/LoginPage";
import { productsQuery } from "./lib/queries";
import { AppShell } from "./routes/AppShell";
import { FridgePage } from "./routes/FridgePage";
import { RecipesPage } from "./routes/RecipesPage";
import { ShoppingPage } from "./routes/ShoppingPage";

export interface RouterContext {
  queryClient: QueryClient;
}

const rootRoute = createRootRouteWithContext<RouterContext>()({ component: Outlet });

// ---------- Публічні сторінки (без AppShell) ----------

export interface LoginSearch {
  tab?: Exclude<AuthTab, "login">;
}

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/login",
  validateSearch: (search: Record<string, unknown>): LoginSearch => (search.tab === "register" ? { tab: "register" } : {}),
  component: LoginPage,
});

// ---------- Кабінет (AppShell) ----------

const appRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: "_authenticated",
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
