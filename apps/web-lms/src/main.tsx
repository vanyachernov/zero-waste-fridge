import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "@tanstack/react-router";
import { configureApi } from "@zwf/api-client";
import { I18nProvider } from "@zwf/i18n/react";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createAppRouter } from "./router";
import "./styles.css";

configureApi({
  baseUrl: "/api",
  mock: import.meta.env.VITE_API_MOCK === "true",
  // Сесія (HttpOnly-cookie) протухла → на сторінку логіну Spring Security
  onUnauthorized: () => window.location.assign(`/login?redirect=${encodeURIComponent(window.location.pathname)}`),
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false },
  },
});

const router = createAppRouter(queryClient);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <I18nProvider locale="uk">
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </I18nProvider>
  </StrictMode>,
);
