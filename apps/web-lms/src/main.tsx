import { configureApi } from "@zwf/api-client";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { AppProviders, createQueryClient, createUnauthorizedHandler } from "./app";
import { createAppRouter } from "./router";
import "./styles.css";

const queryClient = createQueryClient();
const router = createAppRouter(queryClient);

configureApi({
  baseUrl: "/api",
  mock: import.meta.env.VITE_API_MOCK === "true",
  // Сесія (HttpOnly-cookie) закінчилась посеред роботи → на вхід, потім назад
  onUnauthorized: createUnauthorizedHandler(router, queryClient),
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AppProviders router={router} queryClient={queryClient} />
  </StrictMode>,
);
