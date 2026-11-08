import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const backend = env.BACKEND_URL ?? "http://localhost:8080";

  return {
    // SPA живе під /lms/ — і в dev, і після деплою у Spring Boot (classpath:/static/lms/)
    base: "/lms/",
    plugins: [react(), tailwindcss()],
    server: {
      port: 5173,
      strictPort: true,
      // Проксі на Spring Boot: cookie сесії стають first-party для localhost:5173
      proxy: {
        "/api": { target: backend, changeOrigin: true },
        "/login": { target: backend, changeOrigin: true },
        "/logout": { target: backend, changeOrigin: true },
      },
    },
    build: { outDir: "dist", sourcemap: true },
  };
});
