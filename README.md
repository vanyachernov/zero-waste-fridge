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
├── tests/               # Тести (зараз — бекенд: unit + integration)
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

Це `./gradlew bootRun` з профілем `dev`: Spring Boot сам піднімає Postgres (порт 5433) і Mailpit (SMTP 1026, UI http://localhost:8026) з `apps/api/compose.yaml`, застосовує Flyway-міграції і стартує на http://localhost:8080.

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
| `pnpm test` | Тести бекенду: unit + інтеграційні (`./gradlew check`, потрібен Docker) |
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

## Автентифікація та API-контракт (B-02…B-06)

Сесійна автентифікація: Spring Security + Spring Session JDBC, HttpOnly-cookie `ZWF_SESSION` (`Secure` у `prod`, `SameSite=Lax`). Клієнт шле запити з `credentials: "include"`, токени в JS не потрапляють.

| Метод і шлях | Доступ | Відповідь |
|---|---|---|
| `GET /api/auth/csrf` | усі | 204 + cookie `XSRF-TOKEN` |
| `POST /api/auth/register` `{name, email, password, rememberMe?}` | усі | 201 + профіль. Створює домогосподарство «Сім'я <прізвище>», роль `OWNER`, і одразу відкриває сесію |
| `POST /api/auth/login` `{email, password, rememberMe}` | усі | 200 + профіль · 401 `INVALID_CREDENTIALS` |
| `POST /api/auth/logout` | усі | 204, сесія знищена, новий `XSRF-TOKEN` |
| `GET /api/auth/me` | сесія | 200 + профіль `{id, name, email, avatarUrl, householdId, householdName, role}` · 401 |
| `POST /api/auth/password/forgot` `{email}` | усі | завжди 202. Лист із посиланням `…/lms/reset-password?token=…` |
| `POST /api/auth/password/reset` `{token, password}` | усі | 204 · 400 `INVALID_RESET_TOKEN` / `PASSWORD_POLICY` |

- **CSRF** (B-04): для POST/PUT/PATCH/DELETE потрібен заголовок `X-XSRF-TOKEN` зі значенням cookie `XSRF-TOKEN`. Cookie видається на будь-якому першому запиті й оновлюється після входу та виходу.
- **Сесії** (B-03): з «Запам'ятати мене» сесія живе 30 днів неактивності з постійною cookie. Без нього — 12 годин, а cookie зникає разом із закриттям браузера. Після входу ідентифікатор сесії змінюється (захист від фіксації сесії).
- **Пароль**: від 8 символів і не більше 72 байт UTF-8 (ліміт BCrypt). У БД зберігається `{bcrypt}…`.
- **Відновлення пароля** (B-06): токен на 256 біт, одноразовий, діє 1 годину. У БД зберігається лише його SHA-256. Не більше одного листа на хвилину, новий запит анулює старі посилання. Після скидання пароля завершуються всі сесії користувача.
- **Без перебору акаунтів**: `login` і `forgot` відповідають однаково для невідомого email і для неправильного пароля.
- **Формат помилок** `/api` — ProblemDetail (`application/problem+json`) з машинним `code`, а для помилок полів ще й `errors: {поле: код}`. Тексти помилок перекладає фронтенд.

  ```json
  { "status": 400, "detail": "Request validation failed", "code": "VALIDATION_FAILED",
    "errors": { "email": "Email", "name": "NotBlank" } }
  ```

- **OpenAPI**: `/v3/api-docs`. Щоб згенерувати клієнт з бекенду, змініть `input.target` у `packages/api-client/orval.config.ts` і запустіть `pnpm api:generate`.

### Пошта

| Оточення | Як відправляються листи |
|---|---|
| `dev` | Mailpit з `apps/api/compose.yaml` піднімається разом з Postgres. Усі листи видно на http://localhost:8026 |
| тести | `RecordingMailer` у пам'яті (`tests/api/integration/.../support`) |
| `prod` | SMTP зі змінних оточення (див. нижче) |
| SMTP не налаштовано | лист не відправляється, а лише логується |

### Змінні оточення для `prod`

| Змінна | Обов'язкова | Опис |
|---|---|---|
| `DB_URL`, `DB_USER`, `DB_PASSWORD` | так | PostgreSQL |
| `PUBLIC_URL` | так | Зовнішня адреса сайту для посилань у листах, напр. `https://zerowastefridge.app` |
| `SMTP_HOST` | так | SMTP-сервер |
| `SMTP_PORT`, `SMTP_USERNAME`, `SMTP_PASSWORD` | ні | За замовчуванням `587`, без авторизації |
| `SMTP_AUTH`, `SMTP_STARTTLS` | ні | За замовчуванням `true` |
| `MAIL_FROM` | ні | Відправник, за замовчуванням `Zero Waste Fridge <no-reply@zerowastefridge.app>` |

## Тести

Усі тести лежать у [`/tests`](tests/README.md): `tests/api/unit` (JUnit + Mockito, без Spring і Docker) і `tests/api/integration` (Spring Boot + PostgreSQL у Testcontainers + справжній HTTP з cookie та CSRF).

```bash
pnpm --filter @zwf/api test
```

## CI (D-03)

`.github/workflows/ci.yml` запускається на push і PR у `dev` та `main`:

1. **web** — `pnpm install --frozen-lockfile`, typecheck і build фронтів (з кешем Turborepo), бандли зберігаються як артефакт.
2. **api** — JDK 25, `gradle test` (unit), `gradle integrationTest` (Testcontainers), `gradle bootJar -PrequireWeb` з бандлами з першого кроку. Готовий `zwf-api.jar` теж зберігається як артефакт.

У CI Gradle не завантажується через `./gradlew`: його копіюють з офіційного Docker-образу `gradle:<версія>-jdk25`. Причина — хостинг дистрибутивів (`services.gradle.org` → GitHub Releases) періодично віддає 504, а Docker Hub із раннерів GitHub стабільний. Версію крок бере з `apps/api/gradle/wrapper/gradle-wrapper.properties`, тож CI і локальний `./gradlew` завжди збігаються. Щоб оновити Gradle, достатньо змінити `distributionUrl` у wrapper. Локально все працює через `./gradlew`.

## Git flow

- `main` — тільки релізи.
- `dev` — інтеграційна гілка.
- Задачі робимо в `feature/<ID>-<опис>` від `dev`, PR відкриваємо в `dev`. Список задач — у [docs/ROADMAP.md](docs/ROADMAP.md).
