import { configureApi, parseMockMode } from "@zwf/api-client";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { AppProviders, createQueryClient, createUnauthorizedHandler } from "./app";
import { initTheme } from "./lib/theme";
import { createAppRouter } from "./router";
import "./styles.css";

initTheme();

const queryClient = createQueryClient();
const router = createAppRouter(queryClient);

configureApi({
  baseUrl: "/api",
  // true — усе на моках, false — усе на бекенді, data — справжній auth + моки продуктів/покупок
  mock: parseMockMode(import.meta.env.VITE_API_MOCK),
  // Сесія (HttpOnly-cookie) закінчилась посеред роботи → на вхід, потім назад
  onUnauthorized: createUnauthorizedHandler(router, queryClient),
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AppProviders router={router} queryClient={queryClient} />
  </StrictMode>,
);
