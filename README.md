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

За замовчуванням кабінет у dev працює з in-memory моками (`VITE_API_MOCK=true` в `apps/web-lms/.env.development`), тож Spring Boot не потрібен. Моки відтворюють ті самі статуси й коди помилок, що й бекенд B-02…B-06.

Демо-акаунт мока: **olena@example.com / Secret-pass-123**. На сторінці входу є кнопка, що підставляє ці дані. Лист «відновлення пароля» в мок-режимі нікуди не надсилається: посилання з нього показується на сторінці «Перевірте пошту» і в консолі браузера.

`VITE_API_MOCK` — це `true`, `false` або перелік доменів, які лишаються на моках:

| Значення | Що на моках |
|---|---|
| `true` (dev за замовчуванням) | усе: вхід, холодильник, покупки, сім'я, рецепти |
| `recipes` (`apps/web-lms/.env.backend`) | лише рецепти — решта зі Spring Boot |
| `data` | холодильник, покупки й рецепти (вхід і сім'я — справжні) |
| `false` (prod) | нічого |

Домени: `auth`, `fridge`, `shopping`, `household`, `recipes`, можна через кому. Моки дзеркалять правила бекенду й коди помилок; демо-дані мока — сім'я Кравченків (Олена — власниця, Максим і Софія — члени сім'ї, той самий пароль).

Запустіть бекенд (див. «Бекенд» вище), а потім:

```bash
pnpm --filter @zwf/web-lms dev:backend
```

Vite проксує `/api` на `BACKEND_URL` (за замовчуванням `http://localhost:8080`), тому сесійна cookie лишається first-party. Листи «відновлення пароля» тоді приходять у Mailpit. Для інших налаштувань створіть `apps/web-lms/.env.<mode>.local` і запустіть Vite з `--mode <mode>`.

## Інші команди

| Команда | Дія |
|---|---|
| `pnpm build:web` | Збірка лише фронтів: `apps/web-public/out/` і `apps/web-lms/dist/` (JDK не потрібен) |
| `pnpm build` | Повна збірка: фронти + `apps/api/build/libs/zwf-api.jar` із вбудованою статикою |
| `pnpm test` | Усі тести: фронтенд (Vitest) + бекенд (`./gradlew check`, потрібні JDK 25 і Docker) |
| `pnpm test:web` | Лише тести фронтенду (`tests/web-lms`), без Java і Docker |
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

## Автентифікація в кабінеті (F-10…F-13)

| Сторінка | Що робить |
|---|---|
| `/lms/login`, `/lms/login?tab=register` | Вхід і реєстрація за макетом Figma. Клієнтська валідація з тими ж правилами й кодами, що й на бекенді. Помилки сервера перекладаються за `code` |
| `/lms/forgot-password?email=…` | Запит посилання для відновлення. Повторно надіслати можна раз на хвилину |
| `/lms/reset-password?token=…` | Сторінка з листа: новий пароль і його підтвердження |
| Меню профілю в хедері | Email, сім'я, роль, тема (Світла / Темна / Системна), вихід |

- **Захист маршрутів**: усі сторінки кабінету перевіряють сесію через `GET /api/auth/me`. Без сесії вони ведуть на `/lms/login?redirect=<звідки>`, і після входу користувач повертається туди ж (приймаються лише внутрішні шляхи — захист від open redirect).
- **Сесія закінчилась посеред роботи**: будь-який 401 від API очищає кеш і веде на вхід, запам'ятавши поточну сторінку.
- **HTTP-клієнт** (`packages/api-client/src/http.ts`):
  - сам отримує cookie `XSRF-TOKEN` перед першим POST і додає заголовок `X-XSRF-TOKEN`;
  - ProblemDetail перетворюється на `ApiError` з `status`, `code` і `fieldErrors`.

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

## Холодильник (B-10…B-16)

Усі ендпоінти потребують сесії і працюють лише з продуктами домогосподарства поточного користувача. Чужий продукт виглядає як неіснуючий (404).

| Метод і шлях | Відповідь |
|---|---|
| `GET /api/products?q=&category=&freshness=&status=&sort=&page=&size=` | `{items, page, size, total, totalPages, categoryCounts}`. `category` і `freshness` (`expired`, `today`, `soon`, `fresh`) приймають кілька значень; `sort`: `expiry` (за замовчуванням), `name`, `added`, `category`; `page` з 1, `size` до 100 |
| `POST /api/products` | 201 + продукт. Обов'язкові `name`, `category`, `quantity`, `unit`, `expiresAt`; `zone` за замовчуванням — типова для категорії, `remindBeforeDays` — 2 |
| `GET /api/products/{id}` | продукт · 404 `PRODUCT_NOT_FOUND` |
| `PATCH /api/products/{id}` | продукт. Відсутнє поле не змінюється, `null` очищує `brand` / `purchasedAt` / `openedAt` · 409 `PRODUCT_CLOSED` для списаного |
| `POST /api/products/{id}/write-off` `{outcome, quantity?, addToShoppingList?}` | `{product, writtenOff, addedToShoppingList}`. `outcome`: `EATEN`, `COOKED`, `WASTED`; `quantity`: `"all"` (за замовчуванням) або число · 400 `EXCEEDS_REMAINING`. `addedToShoppingList: true`, якщо продукт тепер у списку покупок (за прапорцем або через Smart Sync) |
| `GET /api/products/summary` | `{total, addedThisWeek, soon, today, expired}` |
| `GET /api/tips/today` | `{date, kind, products, hint}` — продукти, що закінчуються сьогодні або завтра, та ідея страви |
| `GET /api/dictionaries` | категорії, зони з температурою, одиниці, варіанти нагадування, терміни після відкриття |

- **Коди** категорій, зон і одиниць — ті самі, що й на фронтенді (`dairy`, `door`, `kg`…). Статуси й результати списання — великими літерами (`ACTIVE`, `WASTED`).
- **Терміни** — календарні дати. `daysLeft` і `freshness` рахуються від «сьогодні» в поясі `zwf.time-zone` (за замовчуванням `Europe/Kyiv`), а не в UTC сервера. «Скоро» — до 48 годин (завтра й післязавтра).
- **Відкрита упаковка** (B-12): `effectiveExpiresAt = min(expiresAt, openedAt + днів після відкриття)`. Дні беруться з правил за назвою (йогурт — 5, молоко — 3), інакше з типового терміну категорії.
- **Клієнт для фронтенду**: ручний `packages/api-client/openapi/openapi.yaml` застарів. В I-10 типи краще згенерувати orval з `/v3/api-docs` (там є всі ендпоінти вище).
- **Помилки полів**: `NotNull`, `NotBlank`, `Size`, `Positive`, `Digits`, `NOT_ALLOWED`, `IN_FUTURE`, `BEFORE_PURCHASE`, `INVALID` (невідомий код, неправильна дата або query-параметр). Зламаний JSON — `MALFORMED_REQUEST`.

## Список покупок (B-40…B-45)

Спільний для всього домогосподарства. Позиції чужого домогосподарства — 404.

| Метод і шлях | Відповідь |
|---|---|
| `GET /api/shopping-list?store=&fromFridge=` | `{toBuy, bought}`: спочатку високий пріоритет, далі в порядку додавання; куплені — останні зверху |
| `POST /api/shopping-list` `{name, quantity?, unit?, category?, priority?, priceEstimate?, storeId?}` | 201 + позиція. Кількість і одиниця — разом або жодної |
| `PATCH /api/shopping-list/{id}` | позиція (відсутнє поле — без змін, `null` — очистити) |
| `DELETE /api/shopping-list/{id}` | 204 |
| `POST /api/shopping-list/{id}/toggle` | позиція: куплено ↔ треба купити, з `boughtBy` |
| `DELETE /api/shopping-list/bought` | `{deleted}` |
| `POST /api/shopping-list/move-to-fridge` `{items?: [{id, expiresAt?, zone?, category?}]}` | `{moved, products}`. Без `items` — усі куплені. Термін за замовчуванням — `defaultShelfLifeDays` категорії. Усе або нічого |
| `GET / PUT /api/shopping-list/settings` `{autoRefill, excludedCategories}` | Smart Sync: повністю списаний продукт → позиція `AUTO`. За замовчуванням увімкнено |
| `GET / POST / DELETE /api/shopping-list/stores` | магазини домогосподарства · 409 `STORE_EXISTS` |
| `GET /api/shopping-list/summary` | `{bought, total, estimatedTotal, autoCount}` |

## Сім'я (B-50…B-55)

Ролі з макета «Моя сім'я»: `OWNER` може все, `MEMBER` — холодильник, рецепти, список покупок і нагадування, але не керує учасниками. Право перевіряється за роллю з БД, заборонене — 403 `FORBIDDEN`.

| Метод і шлях | Хто | Відповідь |
|---|---|---|
| `GET /api/household` | усі | `{id, name, memberCount, role, permissions}` — `permissions` фронтенд використовує, щоб ховати недоступні дії |
| `PATCH /api/household {name}` | власник | перейменування |
| `DELETE /api/household {password}` | власник | видалити домогосподарство й усі дані; кожен учасник отримує власне порожнє |
| `GET /api/household/members` | усі | учасники з роллю та «Останньою дією» |
| `PATCH /api/household/members/{userId} {role}` | власник | 409 `LAST_OWNER`, якщо це останній власник |
| `DELETE /api/household/members/{userId}` | власник або сам учасник | видалити / вийти |
| `GET /api/household/activity?before=&limit=` | усі | стрічка дій, курсор `nextBefore` |
| `POST /api/household/invites {email, role?}` | власник | лист із посиланням `/lms/join?invite=…` (7 днів, лише для цього email) · 409 `INVITE_EXISTS` / `ALREADY_MEMBER` |
| `GET /api/household/invites` · `DELETE /invites/{id}` | усі · власник | очікувані запрошення · скасувати |
| `GET / POST /api/household/invites/code` | власник | код `ZWF-XXXX-XX` на 7 днів; POST генерує новий і анулює старий |
| `POST /api/household/join {code}` або `{invite}` | усі | вступ: 400 `INVALID_INVITE`, 403 `INVITE_EMAIL_MISMATCH`, 409 `LAST_OWNER` |

Користувач завжди в одному домогосподарстві. Хто вступає в сім'ю, будучи в своєму домогосподарстві сам, переносить туди свої продукти й список покупок (без магазинів), а старе видаляється.

## Сповіщення та реалтайм (B-31…B-34, B-54)

| Метод і шлях | Відповідь |
|---|---|
| `GET /api/notifications?limit=` | `{items, unread}` — непрочитані першими |
| `GET /api/notifications/unread-count` | `{count}` для дзвіночка |
| `POST /api/notifications/{id}/read` · `POST /api/notifications/read-all` | 204 · `{updated}` |
| `GET / PUT /api/me/notification-settings` | `{inApp, emailDigest, push, digestHour, quietHours}` |
| `GET /api/me/push/public-key` | `{publicKey}` (`null` — push вимкнено) |
| `POST / DELETE /api/me/push-subscriptions` | підписка браузера `{endpoint, keys: {p256dh, auth}}` |
| `GET /api/household/stream` | SSE: `changed {topic, actor}`, `presence {online}`, `notifications` |
| `GET / POST /api/household/presence` | хто онлайн · `{shoppingAt}` — «я в магазині» |

- **Нагадування** (щогодини, на 5-й хвилині): продукт, у якого `effectiveExpiresAt − remindBeforeDays ≤ сьогодні`, отримує одне сповіщення на термін для кожного учасника сім'ї з увімкненим дзвіночком або push.
- **Щоденний лист** — на початку вибраної години, якщо є прострочене, сьогоднішнє чи завтрашнє. У dev листи видно в Mailpit.
- **Push** — лише з ключами `VAPID_*`; кабінет реєструє Service Worker `/lms/sw.js` і підписується зі сторінки «Налаштування».
- Розклад: `zwf.reminders.cron`, `zwf.reminders.digest-cron`, вимкнути — `zwf.reminders.enabled=false` (так у тестах).

### Пошта

Листи — шаблони Thymeleaf у `apps/api/src/main/resources/mail/`: `<лист>.html` (зі спільним `layout.html`) і `<лист>.txt`. Є скидання пароля, запрошення до сім'ї та щоденний дайджест термінів.

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
| `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` | ні | Ключі Web Push (`npx web-push generate-vapid-keys`). Без них push вимкнено, решта сповіщень працює |
| `VAPID_SUBJECT` | ні | Контакт для push-сервісів, за замовчуванням `mailto:no-reply@zerowastefridge.app` |

## Тести

Усі тести лежать у [`/tests`](tests/README.md):

| Папка | Що всередині |
|---|---|
| `tests/api/unit` | JUnit + Mockito, без Spring і Docker |
| `tests/api/integration` | Spring Boot + PostgreSQL у Testcontainers + справжній HTTP з cookie та CSRF |
| `tests/web-lms/unit` | Vitest + Testing Library: функції, хуки, окремі компоненти |
| `tests/web-lms/integration` | Увесь SPA (роутер + Query + i18n) на мок-бекенді: повні сценарії користувача |

```bash
pnpm test:web
```

```bash
pnpm --filter @zwf/api test
```

## CI (D-03)

`.github/workflows/ci.yml` запускається на push і PR у `dev` та `main`:

1. **web** — `pnpm install --frozen-lockfile`, typecheck, тести фронтенду (`tests/web-lms`), build фронтів (з кешем Turborepo), бандли зберігаються як артефакт.
2. **api** — JDK 25, `gradle test` (unit), `gradle integrationTest` (Testcontainers), `gradle bootJar -PrequireWeb` з бандлами з першого кроку. Готовий `zwf-api.jar` теж зберігається як артефакт.

У CI Gradle не завантажується через `./gradlew`: його копіюють з офіційного Docker-образу `gradle:<версія>-jdk25`. Причина — хостинг дистрибутивів (`services.gradle.org` → GitHub Releases) періодично віддає 504, а Docker Hub із раннерів GitHub стабільний. Версію крок бере з `apps/api/gradle/wrapper/gradle-wrapper.properties`, тож CI і локальний `./gradlew` завжди збігаються. Щоб оновити Gradle, достатньо змінити `distributionUrl` у wrapper. Локально все працює через `./gradlew`.

## Git flow

- `main` — тільки релізи.
- `dev` — інтеграційна гілка.
- Задачі робимо в `feature/<ID>-<опис>` від `dev`, PR відкриваємо в `dev`. Список задач — у [docs/ROADMAP.md](docs/ROADMAP.md).
