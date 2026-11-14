# Zero Waste Fridge

**English** · [Українська](README.uk.md)

A web app that helps a family stop throwing food away. It tracks what is in the fridge and when it expires, reminds you about food that is about to spoil, suggests (or generates with AI) recipes from 3–4 products that need to be used first, and keeps a shared shopping list for the whole family.

| | |
|---|---|
| **Fridge** | Products with expiry dates, opened-package shelf life, freshness badges, search, filters, write-off (eaten / cooked / wasted) |
| **Smart recipes** | Recommendations from critical products, a "pick 3–4 products" constructor, AI generation via DeepSeek with a catalog fallback, "Cook and write off" |
| **Shopping list** | Shared list, stores, priorities, Smart Sync (finished products are added automatically), "Move bought items to the fridge" |
| **Family** | One shared household, roles (owner / member), invites by email or code, activity feed, live updates and presence |
| **Notifications** | In-app bell, daily email digest at a chosen time, Web Push, quiet hours |
| **Statistics & Ecology** | Saved vs wasted by month and category, save rate, estimated kg of food and CO₂e, most wasted products, family contribution |
| **Everywhere** | Ukrainian UI, light and dark theme (saved in the profile), mobile layout, keyboard and screen-reader accessible (WCAG 2.1 AA) |

## Contents

- [Quick start: demo without a backend](#quick-start-demo-without-a-backend)
- [Run the full stack locally](#run-the-full-stack-locally)
- [Configuration](#configuration)
- [Deployment](#deployment)
- [AI recipes (DeepSeek)](#ai-recipes-deepseek)
- [Tests](#tests)
- [Project structure](#project-structure)
- [Documentation](#documentation)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)

## Tech stack

| Part | Technology |
|---|---|
| Backend | Java 25, Spring Boot 4.1 (Web MVC, Security, Session JDBC, Data JPA, Mail, Flyway), PostgreSQL 17, Thymeleaf mail templates, SSE, Web Push (VAPID) |
| User app (`/lms/`) | React 19, Vite, TanStack Router + Query, Tailwind CSS v4 |
| Landing site (`/`) | Next.js 15 (static export) |
| Shared packages | `@zwf/ui` (design tokens + components), `@zwf/api-client` (HTTP client + mocks), `@zwf/i18n` |
| Tooling | pnpm workspaces, Turborepo, Gradle, Vitest + Testing Library + axe-core, JUnit 5 + Testcontainers, JaCoCo, GitHub Actions |

## Requirements

| Tool | Version | Needed for |
|---|---|---|
| Node.js | ≥ 20 (22 recommended, see `.nvmrc`) | everything frontend |
| pnpm | the version pinned in `package.json` (`corepack enable` installs it) | everything frontend |
| Docker | any recent | PostgreSQL and Mailpit locally, backend integration tests, building without a local JDK |
| JDK | 25 (e.g. `brew install --cask temurin@25`) | optional — only if you want to run Gradle without Docker |

## Quick start: demo without a backend

The user app ships with in-memory mocks that behave like the real API, so you can try everything in a minute:

```bash
corepack enable
```

```bash
pnpm install
```

```bash
pnpm dev
```

| What | URL |
|---|---|
| Landing site | http://localhost:3000 |
| User app | http://localhost:5173/lms/ |

Sign in with the demo account **olena@example.com / Secret-pass-123** (the login page has a button that fills it in). The demo family has three members (Olena, Maksym, Sofia — same password), a stocked fridge and five months of history for the statistics page. Mock data lives in memory and resets on reload.

## Run the full stack locally

This runs the real Spring Boot backend with PostgreSQL. Two ways to do it — pick one.

### Option A: with a local JDK 25

```bash
pnpm dev:api
```

Spring Boot starts PostgreSQL (port 5433) and Mailpit from `apps/api/compose.yaml` by itself, applies the database migrations and listens on http://localhost:8080. Then, in a second terminal:

```bash
pnpm --filter @zwf/web-lms dev:backend
```

### Option B: Docker only (no Java installed)

1. Start PostgreSQL and Mailpit:

   ```bash
   docker compose -p zwf -f apps/api/compose.yaml up -d
   ```

2. Build the backend jar with Gradle inside Docker:

   ```bash
   docker run --rm -v "$PWD":/work -w /work/apps/api -v zwf-gradle-home:/home/gradle/.gradle gradle:9.8.2-jdk25 gradle --no-daemon -q bootJar
   ```

3. Run it (remove the `DEEPSEEK_API_KEY` line if you don't have a key — see [AI recipes](#ai-recipes-deepseek)):

   ```bash
   docker rm -f zwf-api-dev 2>/dev/null; docker run -d --name zwf-api-dev -p 8080:8080 \
     -v "$PWD/apps/api/build/libs":/app \
     -e SPRING_PROFILES_ACTIVE=dev -e SPRING_DOCKER_COMPOSE_ENABLED=false \
     -e DB_URL=jdbc:postgresql://host.docker.internal:5433/zwf \
     -e SPRING_MAIL_HOST=host.docker.internal -e SPRING_MAIL_PORT=1026 \
     -e DEEPSEEK_API_KEY="$(cat ~/.zwf-deepseek-key)" \
     gradle:9.8.2-jdk25 java -jar /app/zwf-api.jar
   ```

4. Start the user app against it:

   ```bash
   pnpm --filter @zwf/web-lms dev:backend
   ```

After rebuilding the jar, repeat steps 2–3.

### Local URLs

| URL | What |
|---|---|
| http://localhost:5173/lms/ | User app (Vite dev server, proxies `/api` to the backend) |
| http://localhost:8080 | Backend (also serves the built frontends, see [Deployment](#deployment)) |
| http://localhost:8080/swagger-ui.html | Swagger UI (disabled in `prod`) |
| http://localhost:8080/actuator/health | Health check |
| http://localhost:8026 | Mailpit — every email the backend sends in dev (password reset, invites, daily digest) |

### Mocks vs the real backend

`VITE_API_MOCK` chooses what the user app takes from mocks: `true` (everything, the default for `pnpm dev`), `false` (nothing — used by `dev:backend` and production), or a comma-separated list of domains: `auth`, `fridge`, `shopping`, `household`, `recipes` (`data` = fridge + shopping + recipes). Mocks mirror backend rules and error codes and are covered by tests. Details: [docs/architecture.md](docs/architecture.md#mocks).

## Configuration

The backend is configured with environment variables. The most important ones:

| Variable | Required in prod | Default | What it does |
|---|---|---|---|
| `SPRING_PROFILES_ACTIVE` | yes (`prod`) | `dev` | `prod` turns on secure cookies, SMTP and hides Swagger |
| `DB_URL`, `DB_USER`, `DB_PASSWORD` | yes | `jdbc:postgresql://localhost:5433/zwf`, `zwf`, `zwf` | PostgreSQL connection |
| `PUBLIC_URL` | yes | `http://localhost:8080` | Public address of the site, used in email links |
| `SMTP_HOST` (+ `SMTP_PORT`, `SMTP_USERNAME`, `SMTP_PASSWORD`, `SMTP_AUTH`, `SMTP_STARTTLS`) | yes | — | Outgoing mail |
| `MAIL_FROM` | no | `Zero Waste Fridge <no-reply@zerowastefridge.app>` | Sender |
| `DEEPSEEK_API_KEY`, `DEEPSEEK_MODEL` | no | —, `deepseek-flash` | AI recipe generation |
| `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` | no | — | Web Push notifications |
| `PORT` | no | `8080` | HTTP port |

The full list (time zone, reminder schedules, cookies, frontend variables) is in **[docs/configuration.md](docs/configuration.md)**.

## Deployment

The production artifact is **one jar**: `pnpm build` builds both frontends and embeds them into the Spring Boot jar, which then serves the landing site at `/`, the user app at `/lms/` and the API at `/api/`. You need Java 25, PostgreSQL (17 is what development and tests use) and an SMTP account; put HTTPS in front of it (nginx, Caddy, a cloud load balancer). `pnpm build` runs Gradle, so it needs JDK 25 — or build the jar in Docker as shown in the deployment guide.

```bash
pnpm install --frozen-lockfile && pnpm build
```

```bash
SPRING_PROFILES_ACTIVE=prod \
DB_URL=jdbc:postgresql://db-host:5432/zwf DB_USER=zwf DB_PASSWORD=change-me \
PUBLIC_URL=https://fridge.example.com SMTP_HOST=smtp.example.com SMTP_USERNAME=… SMTP_PASSWORD=… \
java -jar apps/api/build/libs/zwf-api.jar
```

Database migrations run automatically on start. Step-by-step instructions (Docker, systemd, reverse proxy, HTTPS, backups, updates, checklist): **[docs/deployment.md](docs/deployment.md)**.

## AI recipes (DeepSeek)

"Generate the perfect recipe" asks [DeepSeek](https://platform.deepseek.com) for a recipe that uses all selected products. Without a key — or if DeepSeek fails, times out or runs out of balance — the backend picks the best matching recipe from the built-in catalog of 30 recipes, so the feature always works.

1. Create an API key at https://platform.deepseek.com and top up the balance.
2. Store it outside the repository (the command asks for the key without echoing it):

   ```bash
   read -s "?DeepSeek key: " K && echo "$K" > ~/.zwf-deepseek-key && chmod 600 ~/.zwf-deepseek-key && unset K
   ```

   In bash use `read -s -p "DeepSeek key: " K` instead of `read -s "?DeepSeek key: " K`.

3. Pass it to the backend as `DEEPSEEK_API_KEY` (see [Option B](#option-b-docker-only-no-java-installed) above, or your production environment).

The recipe page shows a **"Згенеровано AI"** badge for AI recipes and **"З каталогу рецептів"** for the fallback. If you expected AI and got the catalog, check the backend log for lines starting with `DeepSeek:` (401 — wrong key, 402 — no balance). How it works: [docs/architecture.md](docs/architecture.md#ai-recipes).

## Tests

| Command | What runs | Needs |
|---|---|---|
| `pnpm test:web` | Frontend unit + integration tests (Vitest, Testing Library, axe-core) | Node |
| `pnpm --filter @zwf/web-lms-tests test:coverage` | Same with coverage (gate: 90 % lines / 80 % branches) | Node |
| `pnpm --filter @zwf/api test` | Backend unit + integration tests (Testcontainers) and JaCoCo coverage gate (90 % / 80 %) | JDK 25 + Docker |
| `pnpm typecheck` | TypeScript in all packages | Node |

Without a local JDK, run the backend tests in Docker:

```bash
docker run --rm -v "$PWD":/work -w /work/apps/api -v zwf-gradle-home:/home/gradle/.gradle -v /var/run/docker.sock:/var/run/docker.sock -e TESTCONTAINERS_HOST_OVERRIDE=host.docker.internal -e TESTCONTAINERS_RYUK_DISABLED=true gradle:9.8.2-jdk25 gradle --no-daemon -q check
```

The tests never call the real DeepSeek: they start a fake server. Conventions: [tests/README.md](tests/README.md).

## Project structure

```
zero-waste-fridge/
├── apps/
│   ├── api/          # Spring Boot backend; serves both frontends from the jar
│   ├── web-lms/      # User app (SPA under /lms/)
│   └── web-public/   # Landing site (static Next.js export)
├── packages/
│   ├── ui/           # Design tokens (Tailwind v4 @theme) and shared React components
│   ├── api-client/   # Typed API facade, HTTP client (session cookie + CSRF), mocks
│   └── i18n/         # Typed translations (Ukrainian; English is partial)
├── tests/            # All automated tests: tests/api (JUnit), tests/web-lms (Vitest)
├── docs/             # Guides, API reference, roadmap
└── .github/workflows # CI
```

## Documentation

| Document | For whom |
|---|---|
| [docs/user-guide.md](docs/user-guide.md) | People using the app: every screen and feature |
| [docs/configuration.md](docs/configuration.md) | Admins: every setting and environment variable |
| [docs/deployment.md](docs/deployment.md) | Admins: production deployment step by step |
| [docs/api.md](docs/api.md) | Developers: REST API reference, error format, realtime stream |
| [docs/architecture.md](docs/architecture.md) | Developers: how the pieces fit together |
| [tests/README.md](tests/README.md) | Developers: test layout and conventions |
| [docs/ROADMAP.md](docs/ROADMAP.md) | Team: task list and status (Ukrainian) |

Ukrainian versions: [README.uk.md](README.uk.md), [docs/user-guide.uk.md](docs/user-guide.uk.md), [docs/configuration.uk.md](docs/configuration.uk.md), [docs/deployment.uk.md](docs/deployment.uk.md).

## Troubleshooting

| Symptom | Cause and fix |
|---|---|
| `docker: Conflict. The container name "/zwf-api-dev" is already in use` | Remove the old container first: `docker rm -f zwf-api-dev` (the run command above already does it) |
| User app shows "Something went wrong" / 502 on `/api` | The backend is not running or not on `BACKEND_URL` (default `http://localhost:8080`); check `docker logs zwf-api-dev` |
| Port 5173 or 8080 is busy | Stop the other process, or change `server.port` / `PORT` and `BACKEND_URL` |
| Flyway error "Validate failed" on start | The database was migrated by a newer or edited migration; for a local dev database run `docker compose -p zwf -f apps/api/compose.yaml down -v` (deletes local data) and start again |
| Recipes always say "З каталогу рецептів" | No `DEEPSEEK_API_KEY`, wrong key (401) or no balance (402) — see the backend log |
| Push switch is disabled in Settings | The backend has no `VAPID_*` keys, or the browser does not support push |
| No emails | In dev they are in Mailpit (http://localhost:8026); in prod check `SMTP_*` |

## Contributing

- `main` holds releases only; `dev` is the integration branch.
- Work in `feature/<ID>-<short-name>` branches from `dev` and open pull requests into `dev`. Task IDs come from [docs/ROADMAP.md](docs/ROADMAP.md).
- Before a PR: `pnpm typecheck`, `pnpm test:web`, backend `check`. CI runs the frontend job on every push; the backend job runs when the repository variable `API_CI` is `true` or on manual dispatch.
