# Zero Waste Fridge — monorepo

Вебзастосунок для відстеження термінів придатності продуктів: показує, що скоро зіпсується, підбирає рецепти з 3–4 обраних продуктів і формує список покупок.

```
zero-waste-fridge/
├── apps/
│   ├── api/             # Бекенд: Spring Boot 4 + PostgreSQL + Flyway + Spring Session (Gradle). Роздає обидва фронти
│   ├── web-public/      # Вітрина: Next.js (App Router) → static export (out/), SEO, без SSR
│   └── web-lms/         # Кабінет: Vite + React + TanStack Router + TanStack Query, SPA під /lms/
├── packages/
│   ├── ui/              # Дизайн-токени Tailwind v4 (@theme) + спільні React-компоненти
│   ├── api-client/      # HTTP-клієнт (HttpOnly-cookie + CSRF), моки, конфіг orval
│   └── i18n/            # Типізовані переклади (uk — основна, en — часткова)
├── docs/ROADMAP.md      # Задачі B/F/I/D/Q до релізу
├── .github/workflows/   # CI (D-03)
├── turbo.json           # Пайплайни: dev / build / test / typecheck / generate
└── pnpm-workspace.yaml
```

## Вимоги

- Node.js ≥ 20 (рекомендовано 22, див. `.nvmrc`)
- pnpm (версія закріплена в `packageManager` у кореневому `package.json`; `corepack enable` підтягне її автоматично)
- Для бекенду: JDK 25 (наприклад, `brew install --cask temurin@25`) і Docker (локальний Postgres і Testcontainers)

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

### Бекенд

```bash
pnpm dev:api
```

Це `./gradlew bootRun` з профілем `dev`: Spring Boot сам піднімає Postgres з `apps/api/compose.yaml` (порт 5433), застосовує Flyway-міграції і стартує на http://localhost:8080.

| URL | Що це |
|---|---|
| http://localhost:8080/actuator/health | Health-check |
| http://localhost:8080/swagger-ui.html | Swagger UI (тільки не в `prod`) |
| http://localhost:8080/v3/api-docs | OpenAPI-специфікація — джерело для orval |

### Моки vs реальний бекенд

За замовчуванням кабінет у dev працює з in-memory моками (`VITE_API_MOCK=true` в `apps/web-lms/.env.development`), тож Spring Boot не потрібен.
Щоб ходити в реальний бекенд — поставте `VITE_API_MOCK=false`: Vite проксує `/api`, `/login`, `/logout` на `BACKEND_URL` (за замовчуванням `http://localhost:8080`), тому сесійна cookie залишається first-party.

## Інші команди

| Команда | Дія |
|---|---|
| `pnpm build:web` | Збірка лише фронтів: `apps/web-public/out/` і `apps/web-lms/dist/` (JDK не потрібен) |
| `pnpm build` | Повна збірка: фронти + `apps/api/build/libs/zwf-api.jar` із вбудованою статикою |
| `pnpm test` | Тести бекенду (JUnit + Testcontainers, потрібен Docker) |
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

## Як бекенд роздає фронтенд (D-02)

Gradle-таск `syncWebStatic` копіює зібрані бандли в jar:

| Звідки | Куди в `classpath:/static/` |
|---|---|
| `apps/web-public/out/**` | `/` |
| `apps/web-public/out/404.html` | `error/404.html` (Spring Boot віддає її на будь-який HTML-404) |
| `apps/web-lms/dist/**` | `lms/` |

- **SPA fallback**: `GET /lms/<маршрут>` без розширення віддає `lms/index.html`. Відсутній файл з розширенням (`/lms/assets/x.js`) — це 404, а не HTML.
- **Вітрина**: `/about/` і `/about` віддають `about/index.html` (Next.js `trailingSlash`).
- **Кешування**: `/lms/assets/**` і `/_next/static/**` кешуються на рік (`immutable`), HTML — `no-cache`.
- `-PrequireWeb` (його використовують `pnpm build` і CI) зупиняє збірку, якщо бандлів немає. Без цього прапорця бекенд збирається й окремо, лише з попередженням.

Запуск прод-артефакту:

```bash
SPRING_PROFILES_ACTIVE=prod DB_URL=jdbc:postgresql://host:5432/zwf DB_USER=zwf DB_PASSWORD=*** java -jar apps/api/build/libs/zwf-api.jar
```

## Безпека та API-контракт

- **Автентифікація**: Spring Security із сесією Spring Session JDBC у HttpOnly-cookie `ZWF_SESSION` (`Secure` у `prod`). Клієнт шле запити з `credentials: "include"`, токени в JS не потрапляють.
- **401**: усе під `/api/**` без сесії повертає 401, і клієнт сам редіректить на сторінку входу. Логін і реєстрація — задачі B-02 і B-03.
- **CSRF** (B-04): `CookieCsrfTokenRepository.withHttpOnlyFalse()`. Клієнт уже дзеркалить `XSRF-TOKEN` у заголовок `X-XSRF-TOKEN` (`packages/api-client/src/http.ts`).
- **OpenAPI**: `/v3/api-docs`. Щоб генерувати клієнт з бекенду, змініть `input.target` у `packages/api-client/orval.config.ts` і запустіть `pnpm api:generate`.

## CI (D-03)

`.github/workflows/ci.yml` запускається на push і PR у `dev` та `main`:

1. **web** — `pnpm install --frozen-lockfile`, typecheck і build фронтів (з кешем Turborepo), бандли зберігаються як артефакт.
2. **api** — JDK 25, `gradle test` (Testcontainers), `gradle bootJar -PrequireWeb` з бандлами з першого кроку. Готовий `zwf-api.jar` теж зберігається як артефакт.

У CI Gradle не завантажується через `./gradlew`: його копіюють з офіційного Docker-образу `gradle:<версія>-jdk25`. Причина — хостинг дистрибутивів (`services.gradle.org` → GitHub Releases) періодично віддає 504, а Docker Hub із раннерів GitHub стабільний. Версію крок бере з `apps/api/gradle/wrapper/gradle-wrapper.properties`, тож CI і локальний `./gradlew` завжди збігаються. Щоб оновити Gradle, достатньо змінити `distributionUrl` у wrapper. Локально все працює через `./gradlew`.

## Git flow

- `main` — тільки релізи.
- `dev` — інтеграційна гілка.
- Задачі робимо в `feature/<ID>-<опис>` від `dev`, PR відкриваємо в `dev`. Список задач — у [docs/ROADMAP.md](docs/ROADMAP.md).
