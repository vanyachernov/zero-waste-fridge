# Zero Waste Fridge — frontend monorepo

Вебзастосунок для відстеження термінів придатності продуктів: показує, що скоро зіпсується, підбирає рецепти з 3–4 обраних продуктів і формує список покупок.

```
zero-waste-fridge/
├── apps/
│   ├── web-public/      # Вітрина: Next.js (App Router) → static export (out/), SEO, без SSR
│   └── web-lms/         # Кабінет: Vite + React + TanStack Router + TanStack Query, SPA під /lms/
├── packages/
│   ├── ui/              # Дизайн-токени Tailwind v4 (@theme) + спільні React-компоненти
│   ├── api-client/      # HTTP-клієнт (HttpOnly-cookie + CSRF), моки, конфіг orval
│   └── i18n/            # Типізовані переклади (uk — основна, en — часткова)
├── turbo.json           # Пайплайни: dev / build / typecheck / generate
└── pnpm-workspace.yaml
```

## Вимоги

- Node.js ≥ 20 (рекомендовано 22, див. `.nvmrc`)
- pnpm (версія закріплена в `packageManager` у кореневому `package.json`; `corepack enable` підтягне її автоматично)

## Швидкий старт (dev-режим обох застосунків одночасно)

```bash
pnpm install
```

```bash
pnpm dev
```

Turborepo запустить паралельно:

| Застосунок | URL | Що це |
|---|---|---|
| `@zwf/web-public` | http://localhost:3000 | Вітрина (Next.js dev) |
| `@zwf/web-lms` | http://localhost:5173/lms/ | Кабінет (Vite dev) |

Кнопки «Відкрити кабінет» на вітрині в dev ведуть на `http://localhost:5173/lms/` (див. `apps/web-public/.env.development`).

Окремо:

```bash
pnpm dev:public
```

```bash
pnpm dev:lms
```

### Моки vs реальний бекенд

За замовчуванням кабінет у dev працює з in-memory моками (`VITE_API_MOCK=true` в `apps/web-lms/.env.development`), тож Spring Boot не потрібен.
Щоб ходити в реальний бекенд — поставте `VITE_API_MOCK=false`: Vite проксує `/api`, `/login`, `/logout` на `BACKEND_URL` (за замовчуванням `http://localhost:8080`), тому сесійна cookie залишається first-party.

## Інші команди

| Команда | Дія |
|---|---|
| `pnpm build` | Прод-збірка: `apps/web-public/out/` і `apps/web-lms/dist/` |
| `pnpm typecheck` | `tsc --noEmit` у всіх пакетах |
| `pnpm api:generate` | Генерація клієнта orval з `packages/api-client/openapi/openapi.yaml` у `src/generated/` |

## Дизайн-система (`packages/ui`)

Токени взято з Figma (сторінка «Вайфрейм» → UI-Kit, «Мій холодильник», «Розумні рецепти»). Вони описані в [`packages/ui/src/styles/theme.css`](packages/ui/src/styles/theme.css) через `@theme` Tailwind v4, тому кожен токен одразу стає утилітою (`bg-primary`, `text-on-surface-variant`, `rounded-lg`, `shadow-card` …).

| Токен | Значення | Де використовується |
|---|---|---|
| `primary` | `#006948` | Основні кнопки, активні чіпи, акценти |
| `primary-hover` | `#005137` | Hover основної кнопки |
| `error` | `#ba0035` | Прострочено / списання |
| `warning` | `#fe932c` | Скоро зіпсується |
| `outline-variant` | `#bccac0` | Disabled-поверхні, бордери чекбоксів |
| `surface-container-lowest` | `#ffffff` | Картки, інпути |
| Шрифт | Inter Variable | Підключається локально через `@fontsource-variable/inter` |

Темна тема з макетів «— Dark» вмикається класом `.dark` на `<html>`: він перевизначає ті самі CSS-змінні.

Підключення в застосунку:

```css
@import "tailwindcss";
@import "@zwf/ui/styles.css";
```

## Сценарій кабінету

1. **Додати продукт**: кнопка «Додати продукт» відкриває модалку (на мобільних це bottom sheet).
2. **Побачити, що псується**: список відсортовано за терміном, бейджі `Прострочено / Сьогодні / 1–2 дні / Свіже`, статистика вгорі.
3. **Відмітити 3–4 продукти**: чекбокси в таблиці (на мобільних це картки), понад 4 вибрати не можна. Знизу з'являється панель «Обрано: N з 4».
4. **Отримати рецепт**: «Підібрати рецепт» відкриває `/lms/recipes?ids=…`, де працює кулінарний конструктор і картки рецептів. Відсутні інгредієнти можна одним кліком додати до списку покупок.

## Інтеграція зі Spring Boot

- **Збірка**: `apps/web-public/out/**` копіюється в `classpath:/static/`, а `apps/web-lms/dist/**` — у `classpath:/static/lms/`.
- **SPA fallback**: усі `GET /lms/**`, що не є файлами, повертають `/lms/index.html` (наприклад, через `WebMvcConfigurer` + `PathResourceResolver`).
- **Автентифікація**: Spring Security із сесією в HttpOnly-cookie. Клієнт шле запити з `credentials: "include"`. Токени в JS не потрапляють.
- **CSRF**: `CookieCsrfTokenRepository.withHttpOnlyFalse()`. Клієнт сам дзеркалить `XSRF-TOKEN` у заголовок `X-XSRF-TOKEN` (`packages/api-client/src/http.ts`).
- **401**: клієнт редіректить на `/login?redirect=…`.
- **OpenAPI**: коли бекенд віддаватиме `/v3/api-docs` (springdoc), змініть `input.target` у `packages/api-client/orval.config.ts` і запустіть `pnpm api:generate`.
