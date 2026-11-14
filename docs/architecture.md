# Architecture

How the parts of Zero Waste Fridge fit together. For endpoints see [api.md](api.md); for settings see [configuration.md](configuration.md).

## Overview

```
apps/web-public (Next.js, static)  ─┐
apps/web-lms    (React SPA)        ─┼─ built into ─► apps/api (Spring Boot jar) ─► PostgreSQL
packages/ui, api-client, i18n      ─┘                 │
                                                       ├─ /        landing site     (classpath:/static/)
                                                       ├─ /lms/**  SPA + fallback   (classpath:/static/lms/)
                                                       └─ /api/**  REST, SSE
```

- **Monorepo:** pnpm workspaces + Turborepo for the TypeScript side, Gradle for the backend. `apps/api/package.json` wraps Gradle tasks so `turbo` sees the backend as a workspace; `pnpm build` builds the frontends first and then the jar.
- **One origin in production.** The jar serves everything, so the session cookie is first-party and there is no CORS. In development Vite proxies `/api` to the backend for the same reason.

## Backend (`apps/api`)

Package-by-feature under `ua.zwf.api`:

| Package | Responsibility |
|---|---|
| `auth`, `user` | registration, sign-in, sessions, password reset, profile, theme |
| `household` | households, members, roles and permissions, invites, join codes, activity |
| `product` | fridge products, opened-package shelf life, write-offs and the product event log |
| `shopping` | shopping list, stores, Smart Sync, moving purchases to the fridge |
| `recipe` | recipe catalog, matching, DeepSeek generation, cooking |
| `stats` | "saved" counter and the statistics overview |
| `notification`, `push`, `mail` | reminders, daily digest, Web Push, email templates |
| `realtime` | Server-Sent Events stream, presence, change broadcasting |
| `tip`, `dictionary` | tip of the day, reference data |
| `config`, `common` | properties, static hosting / SPA fallback, error handling, `Today` |

Key decisions:

- **Sessions in PostgreSQL** (Spring Session JDBC) — the app is stateless and can restart or scale without logging users out.
- **Flyway migrations** own the schema; Hibernate runs with `ddl-auto: validate`.
- **Errors** are Problem Details with stable `code`s ([api.md](api.md#errors)); the frontend translates them.
- **Permissions** are checked with `@RequiresPermission(...)` on controller methods against the role stored in the database.
- **"Today"** is a bean (`Today`) bound to `ZWF_TIME_ZONE`, so expiry days do not depend on the server's time zone.
- **The product event log** (`product_event`: added, updated, opened, written off with outcome and quantity) feeds the activity feed, the "saved" counter and statistics.
- **Live updates:** an interceptor publishes `changed {topic}` after every successful unsafe request under `/api/products`, `/api/shopping-list`, `/api/household` and recipe cooking; clients refetch the topic. Presence and notifications go through the same SSE stream.

### AI recipes

`POST /api/recipes/generate` goes through the `RecipeGenerator` interface:

1. `DeepSeekRecipeGenerator` (active when `DEEPSEEK_API_KEY` is set) calls DeepSeek's OpenAI-compatible `/chat/completions` with the selected products (ids, names, amounts, days left), JSON mode and thinking disabled.
2. The model's JSON is **not trusted**: numbers and units are bounded, unknown units drop the quantity, and every selected product must appear in the recipe exactly once. A blank or invalid answer, 429 or 5xx is retried once; 401/402/422 are not retried.
3. A valid recipe is saved for the household (`source: AI`) and returned with live matching against the fridge.
4. Otherwise `RecipeService` picks the catalog recipe that uses the most selected products (then the best score); if none uses any, the answer is 422 `NO_RECIPE`.

**Matching** (`RecipeMatcher`, mirrored by the web mock): each ingredient has keywords (`шпинат`, `яйц`); a product matches when its lowercase name contains one. Expired products are never used; among candidates the one that expires first wins; each product covers one ingredient. Pantry items (salt, oil) are never "missing". The score is `critical × 100 + match % − 3 × missing`.

**Cooking** scales ingredient amounts to the chosen portions, converts g ↔ kg and ml ↔ l to the product's unit, and writes off the whole product when units are incompatible or the recipe needs more than is left — all in one transaction.

The catalog is `apps/api/src/main/resources/recipes/catalog.json` (30 recipes). It is read on start; new slugs are inserted.

## User app (`apps/web-lms`)

- **Routing:** TanStack Router with `basepath /lms`. Everything under the `_authenticated` layout checks the session (`GET /api/auth/me`) and redirects to `/lms/login?redirect=…` (internal paths only). Filters, selections and periods live in the URL search params; search-only navigations keep the scroll position.
- **Data:** TanStack Query. Query keys come from `queryKeys` in `@zwf/api-client`; the realtime stream invalidates them by topic. A global 401 handler clears the cache and goes to the login page.
- **Errors:** a route error boundary keeps the header and navigation; 404 page; offline banner (Query pauses and resumes requests).
- **UI:** `@zwf/ui` components (Button, Field/Input, custom Select, Switch, SegmentedControl, Menu, Modal as a bottom sheet on phones, Toast…), Tailwind v4 tokens in `packages/ui/src/styles/theme.css`, dark theme via the `.dark` class. Popups (Menu, Select) render in a portal so overflow does not clip them.
- **Push:** service worker `public/sw.js`, subscription in `src/lib/push.ts`.
- **Accessibility:** WAI-ARIA patterns for menus, comboboxes, radio groups and dialogs; skip link; axe-core checks every page in tests; chart colors validated for colour-blind separation and contrast.

### Mocks

`@zwf/api-client` exposes one facade (`api.products.list()`, `api.recipes.generate()`…). Each domain switches between HTTP and an in-memory mock by `VITE_API_MOCK`:

| Domain | Covers |
|---|---|
| `auth` | sign-in, registration, password reset, profile, theme |
| `fridge` | products, write-offs, summary, tip, dictionaries |
| `shopping` | shopping list, stores, settings |
| `household` | family, invites, activity, notifications, presence |
| `recipes` | recipes, saved counter, statistics |

Mocks mirror backend rules and error codes — the recipe mock even reads the same `catalog.json` — and are covered by their own tests, so UI tested on mocks behaves the same against the backend. The demo family (Olena, Maksym, Sofia; password `Secret-pass-123`) has a stocked fridge and five months of write-off history.

## Landing site (`apps/web-public`)

Next.js App Router with `output: "export"`: plain static HTML, no server. The build lands in `apps/web-public/out/` and is served by the jar at `/`; `404.html` becomes the site-wide HTML 404 page. Links to the app use `NEXT_PUBLIC_LMS_URL`.

## Static hosting in the jar

The Gradle task `syncWebStatic` copies `apps/web-public/out/**` to `static/` and `apps/web-lms/dist/**` to `static/lms/`.

- `GET /lms/<route>` without an extension returns `lms/index.html` (SPA fallback); a missing file with an extension is a real 404.
- `/about` and `/about/` return `about/index.html`.
- `/lms/assets/**` and `/_next/static/**` are cached for a year (`immutable`); HTML is `no-cache`.

## Tests and CI

- `tests/web-lms` — Vitest + Testing Library + axe-core; integration tests render the whole SPA with the real router on mocks.
- `tests/api` — JUnit 5; unit tests without Spring, integration tests with Spring Boot on a random port and PostgreSQL in Testcontainers, real HTTP with cookies and CSRF. DeepSeek is replaced by a local fake server.
- Coverage gates: 90 % lines / 80 % branches for both (Vitest v8, JaCoCo).
- CI (`.github/workflows/ci.yml`): the web job (typecheck, tests, build) runs on every push and PR to `dev` / `main`; the backend job (unit, integration, jar) runs when the repository variable `API_CI` is `true` or on manual dispatch. Gradle is taken from the `gradle:<version>-jdk25` image because downloads from services.gradle.org were flaky on CI runners.
