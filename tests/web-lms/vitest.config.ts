import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const lmsSrc = fileURLToPath(new URL("../../apps/web-lms/src", import.meta.url));
const packagesDir = fileURLToPath(new URL("../../packages", import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@lms": lmsSrc },
    // Код застосунку і тести мають бачити один екземпляр React / TanStack
    dedupe: ["react", "react-dom", "@tanstack/react-query", "@tanstack/react-router"],
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./support/setup.ts"],
    css: false,
    restoreMocks: true,
    // Q-02: `pnpm --filter @zwf/web-lms-tests test:coverage` → coverage/index.html
    coverage: {
      provider: "v8",
      allowExternal: true,
      include: [`${lmsSrc}/**/*.{ts,tsx}`, `${packagesDir}/{api-client,i18n,ui}/src/**/*.{ts,tsx}`],
      exclude: ["**/generated/**", "**/*.d.ts", `${lmsSrc}/main.tsx`],
      reporter: ["text-summary", "html"],
      // Зараз ≈ 96 / 88 / 88 % — поріг із запасом, щоб покриття не просідало непомітно
      thresholds: { lines: 90, statements: 90, branches: 80, functions: 80 },
    },
    projects: [
      { extends: true, test: { name: "unit", include: ["unit/**/*.test.{ts,tsx}"] } },
      { extends: true, test: { name: "integration", include: ["integration/**/*.test.{ts,tsx}"], testTimeout: 20_000 } },
    ],
  },
});
