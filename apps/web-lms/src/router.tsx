import type { QueryClient } from "@tanstack/react-query";
import { createRootRouteWithContext, createRoute, createRouter } from "@tanstack/react-router";
import { AppShell } from "./routes/AppShell";
import { FridgePage } from "./routes/FridgePage";
import { RecipesPage } from "./routes/RecipesPage";
import { ShoppingPage } from "./routes/ShoppingPage";
import { productsQuery } from "./lib/queries";

export interface RouterContext {
  queryClient: QueryClient;
}

const rootRoute = createRootRouteWithContext<RouterContext>()({ component: AppShell });

const fridgeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  loader: ({ context }) => context.queryClient.ensureQueryData(productsQuery),
  component: FridgePage,
});

export interface RecipesSearch {
  ids?: string[];
}

export const recipesRoute = createRoute({
  getParentRoute: () => rootRoute,
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
  getParentRoute: () => rootRoute,
  path: "/shopping",
  component: ShoppingPage,
});

const routeTree = rootRoute.addChildren([fridgeRoute, recipesRoute, shoppingRoute]);

export function createAppRouter(queryClient: QueryClient) {
  return createRouter({
    routeTree,
    basepath: "/lms",
    context: { queryClient },
    defaultPreload: "intent",
    defaultPreloadStaleTime: 0,
    scrollRestoration: true,
  });
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof createAppRouter>;
  }
}
