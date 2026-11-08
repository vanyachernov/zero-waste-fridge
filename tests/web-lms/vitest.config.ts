import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const lmsSrc = fileURLToPath(new URL("../../apps/web-lms/src", import.meta.url));

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
    projects: [
      { extends: true, test: { name: "unit", include: ["unit/**/*.test.{ts,tsx}"] } },
      { extends: true, test: { name: "integration", include: ["integration/**/*.test.{ts,tsx}"], testTimeout: 20_000 } },
    ],
  },
});
