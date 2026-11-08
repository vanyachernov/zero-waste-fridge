import { defineConfig } from "orval";

/**
 * Генерація типізованого клієнта + хуків TanStack Query з OpenAPI-специфікації Spring Boot.
 *
 * Джерело: зараз — локальна заглушка `openapi/openapi.yaml`.
 * Коли бекенд буде готовий, замінити на `http://localhost:8080/v3/api-docs` (springdoc-openapi).
 */
export default defineConfig({
  zwf: {
    input: { target: "./openapi/openapi.yaml" },
    output: {
      mode: "tags-split",
      target: "./src/generated/endpoints",
      schemas: "./src/generated/model",
      client: "react-query",
      httpClient: "fetch",
      clean: true,
      override: {
        mutator: { path: "./src/http.ts", name: "http" },
        query: { useQuery: true, useMutation: true, signal: true },
      },
    },
  },
});
