import { createMemoryHistory } from "@tanstack/react-router";
import { QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { configureApi, mockAuthControl, type MockMode } from "@zwf/api-client";
import { I18nProvider } from "@zwf/i18n/react";
import type { ReactElement } from "react";
import { expect } from "vitest";
import { AppProviders, createQueryClient, createUnauthorizedHandler } from "@lms/app";
import { createAppRouter } from "@lms/router";

/**
 * Інтеграційний рендер усього SPA: справжній роутер (basepath /lms, memory history), TanStack Query,
 * i18n і api-client у режимі мок-бекенду — той самий шлях, що й `pnpm dev` з `VITE_API_MOCK=true`.
 */
export function renderApp(path = "/", options: { signedIn?: boolean; mock?: MockMode } = {}) {
  if (options.signedIn) mockAuthControl.signIn();
  const queryClient = createQueryClient();
  const router = createAppRouter(queryClient, { history: createMemoryHistory({ initialEntries: [`/lms${path}`] }) });
  configureApi({ mock: options.mock ?? true, onUnauthorized: createUnauthorizedHandler(router, queryClient) });
  const user = userEvent.setup();
  const view = render(<AppProviders router={router} queryClient={queryClient} />);
  return { ...view, router, queryClient, user, path: () => router.state.location.href };
}

/** Рендер окремого компонента з i18n і Query (без роутера). */
export function renderWithProviders(ui: ReactElement) {
  const queryClient = createQueryClient();
  const user = userEvent.setup();
  const view = render(
    <I18nProvider locale="uk">
      <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
    </I18nProvider>,
  );
  return { ...view, queryClient, user };
}

export async function waitForPath(router: { state: { location: { href: string } } }, expected: string) {
  await waitFor(() => expect(router.state.location.href).toBe(expected));
}

export { screen };
