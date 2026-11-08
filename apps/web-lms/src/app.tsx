import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "@tanstack/react-router";
import { isApiError } from "@zwf/api-client";
import { I18nProvider } from "@zwf/i18n/react";
import type { AppRouter } from "./router";

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        refetchOnWindowFocus: false,
        // 4xx (немає сесії, валідація) повтор не виправить — повторюємо лише мережеві/5xx помилки
        retry: (failures, error) => failures < 1 && !(isApiError(error) && error.status < 500),
      },
    },
  });
}

/** Усі провайдери застосунку — спільні для main.tsx та інтеграційних тестів. */
export function AppProviders({ router, queryClient }: { router: AppRouter; queryClient: QueryClient }) {
  return (
    <I18nProvider locale="uk">
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </I18nProvider>
  );
}
