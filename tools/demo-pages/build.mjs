#!/usr/bin/env node
/**
 * D-16: збирає демо-сайт для GitHub Pages у demo-site/.
 *
 *   /<repo>/        вітрина (Next.js static export)
 *   /<repo>/lms/    кабінет на in-memory моках (VITE_API_MOCK=true, без бекенду й бази)
 *   /<repo>/404.html  копія кабінету: Pages віддає її на будь-яку невідому адресу, тож прямі посилання
 *                     й оновлення сторінки на /<repo>/lms/recipes працюють (роутер сам читає адресу)
 *
 * Базовий шлях — DEMO_BASE_PATH (за замовчуванням /zero-waste-fridge, як назва репозиторію).
 */
import { execSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const base = (process.env.DEMO_BASE_PATH ?? "/zero-waste-fridge").replace(/\/$/, "");
const out = join(root, "demo-site");

const run = (cmd, env = {}) => execSync(cmd, { cwd: root, stdio: "inherit", env: { ...process.env, ...env } });

console.log(`Demo site under "${base || "/"}"`);

run("pnpm --filter @zwf/web-public build", {
  NEXT_PUBLIC_BASE_PATH: base,
  NEXT_PUBLIC_LMS_URL: `${base}/lms/`,
});
run("pnpm --filter @zwf/web-lms exec vite build --mode demo --outDir dist-demo --emptyOutDir", {
  LMS_BASE: `${base}/lms/`,
});

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
cpSync(join(root, "apps/web-public/out"), out, { recursive: true });
cpSync(join(root, "apps/web-lms/dist-demo"), join(out, "lms"), { recursive: true });
cpSync(join(out, "lms/index.html"), join(out, "404.html"));
// Без Jekyll: інакше Pages сховає теки, що починаються з «_» (наприклад, _next/)
writeFileSync(join(out, ".nojekyll"), "");

if (!existsSync(join(out, "index.html")) || !existsSync(join(out, "lms/index.html"))) {
  throw new Error("demo-site is incomplete");
}
console.log(`Done: ${out}`);
