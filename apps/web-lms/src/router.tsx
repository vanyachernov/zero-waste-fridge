import type { QueryClient } from "@tanstack/react-query";
import { createRootRouteWithContext, createRoute, createRouter, Outlet, redirect, type RouterHistory } from "@tanstack/react-router";
import { isApiError, type RecipeSort } from "@zwf/api-client";
import type { AuthTab } from "./auth/AuthTabs";
import { ForgotPasswordPage } from "./auth/ForgotPasswordPage";
import { LoginPage } from "./auth/LoginPage";
import { ResetPasswordPage } from "./auth/ResetPasswordPage";
import { toProductQuery, validateFridgeSearch } from "./lib/fridgeSearch";
import { activeProductsQuery, meQuery, productSummaryQuery, productsQuery, recipeQuery, recommendedRecipesQuery } from "./lib/queries";
import { safeRedirect } from "./lib/redirect";
import { AppErrorScreen, AppPendingScreen, NotFoundScreen, RouteErrorScreen } from "./routes/AppStatusScreens";
import { AppShell } from "./routes/AppShell";
import { FamilyPage } from "./routes/FamilyPage";
import { FridgePage } from "./routes/FridgePage";
import { JoinPage } from "./routes/JoinPage";
import { SettingsPage } from "./routes/SettingsPage";
import { RecipeDetailPage } from "./routes/RecipeDetailPage";
import { RecipesPage } from "./routes/RecipesPage";
import { ShoppingPage } from "./routes/ShoppingPage";

export interface RouterContext {
  queryClient: QueryClient;
}

const rootRoute = createRootRouteWithContext<RouterContext>()({ component: Outlet, notFoundComponent: NotFoundScreen });

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

export interface ForgotPasswordSearch {
  /** Підставляється з форми входу, щоб не вводити email двічі. */
  email?: string;
}

const forgotPasswordRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/forgot-password",
  validateSearch: (search: Record<string, unknown>): ForgotPasswordSearch =>
    typeof search.email === "string" && search.email.length <= 254 ? { email: search.email } : {},
  component: ForgotPasswordPage,
});

export interface ResetPasswordSearch {
  token?: string;
}

/** Сторінка з листа B-06. Доступна і з сесією, і без — бекенд однаково завершить усі сесії. */
const resetPasswordRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/reset-password",
  validateSearch: (search: Record<string, unknown>): ResetPasswordSearch =>
    typeof search.token === "string" && search.token.trim() ? { token: search.token.trim() } : {},
  component: ResetPasswordPage,
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
  validateSearch: validateFridgeSearch,
  loaderDeps: ({ search }) => toProductQuery(search),
  // Підвантажуємо паралельно, не блокуючи перехід: сторінка має скелетон і обробку помилок
  loader: ({ context, deps }) => {
    void context.queryClient.prefetchQuery(productsQuery(deps));
    void context.queryClient.prefetchQuery(productSummaryQuery);
  },
  component: FridgePage,
});

export interface RecipesSearch {
  ids?: string[];
  sort?: RecipeSort;
}

const RECIPE_SORTS: readonly RecipeSort[] = ["critical", "match", "time", "kcal"];

const recipesRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "/recipes",
  validateSearch: (search: Record<string, unknown>): RecipesSearch => {
    const raw = search.ids;
    const ids = (Array.isArray(raw) ? raw : typeof raw === "string" ? raw.split(",") : [])
      .map(String)
      .filter(Boolean)
      .slice(0, 4);
    const sort = RECIPE_SORTS.find((s) => s === search.sort);
    return { ...(ids.length ? { ids } : {}), ...(sort && sort !== "critical" ? { sort } : {}) };
  },
  // Підвантажуємо паралельно, не блокуючи перехід: на сторінці є скелетони
  loaderDeps: ({ search }) => ({ sort: search.sort ?? "critical" }),
  loader: ({ context, deps }) => {
    void context.queryClient.prefetchQuery(activeProductsQuery);
    void context.queryClient.prefetchQuery(recommendedRecipesQuery(deps.sort));
  },
  component: RecipesPage,
});

/** F-42: детальний рецепт. */
const recipeRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "/recipes/$id",
  loader: ({ context, params }) => {
    void context.queryClient.prefetchQuery(recipeQuery(params.id));
  },
  component: RecipeDetailPage,
});

const shoppingRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "/shopping",
  component: ShoppingPage,
});

const settingsRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "/settings",
  component: SettingsPage,
});

const familyRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "/family",
  component: FamilyPage,
});

export interface JoinSearch {
  /** Токен із посилання в листі-запрошенні (B-52). */
  invite?: string;
  code?: string;
}

/** F-61: з листа `/lms/join?invite=…` або вручну кодом. Без сесії — вхід і повернення сюди ж (F-11). */
const joinRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "/join",
  validateSearch: (search: Record<string, unknown>): JoinSearch => ({
    ...(typeof search.invite === "string" && search.invite.trim() ? { invite: search.invite.trim() } : {}),
    ...(typeof search.code === "string" && search.code.trim() ? { code: search.code.trim().slice(0, 16) } : {}),
  }),
  component: JoinPage,
});

const routeTree = rootRoute.addChildren([
  loginRoute,
  forgotPasswordRoute,
  resetPasswordRoute,
  appRoute.addChildren([fridgeRoute, recipesRoute, recipeRoute, shoppingRoute, familyRoute, joinRoute, settingsRoute]),
]);

export function createAppRouter(queryClient: QueryClient, options: { history?: RouterHistory } = {}) {
  return createRouter({
    routeTree,
    basepath: "/lms",
    context: { queryClient },
    history: options.history,
    defaultPreload: "intent",
    defaultPreloadStaleTime: 0,
    scrollRestoration: true,
    // F-92: помилка в розділі не валить увесь кабінет
    defaultErrorComponent: RouteErrorScreen,
  });
}

export type AppRouter = ReturnType<typeof createAppRouter>;

declare module "@tanstack/react-router" {
  interface Register {
    router: AppRouter;
  }
}
