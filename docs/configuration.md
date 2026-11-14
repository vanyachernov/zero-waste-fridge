# Configuration

**English** · [Українська](configuration.uk.md)

Everything that can be configured, where it lives and what the default is. The backend reads environment variables; each one maps to a Spring property (`ZWF_TIME_ZONE` ⇔ `zwf.time-zone`), so you can also pass `--zwf.time-zone=…` on the command line or use an `application-*.yaml`. For grouped settings Spring drops the dashes in the variable name: `zwf.ai.deepseek.base-url` ⇔ `ZWF_AI_DEEPSEEK_BASEURL`. The frontends take a few build-time variables.

## Profiles

`SPRING_PROFILES_ACTIVE` selects one of two profiles. Without it the backend runs as `dev`.

| | `dev` | `prod` |
|---|---|---|
| Local PostgreSQL + Mailpit from `apps/api/compose.yaml` | started automatically by `./gradlew bootRun` | — |
| Email | Mailpit (`localhost:1026`, UI on http://localhost:8026) | SMTP from `SMTP_*` (required) |
| Links in emails | `http://localhost:5173` (Vite dev server) | `PUBLIC_URL` (required) |
| Session cookie `Secure` | off (`COOKIE_SECURE`) | always on — HTTPS is required |
| Swagger UI and `/v3/api-docs` | on | off |
| Log level of `ua.zwf` | `debug` | `info` |

## Backend

### Required in production

| Variable | Example | Description |
|---|---|---|
| `SPRING_PROFILES_ACTIVE` | `prod` | Production profile |
| `DB_URL` | `jdbc:postgresql://db:5432/zwf` | JDBC URL of PostgreSQL |
| `DB_USER`, `DB_PASSWORD` | `zwf`, `…` | Database credentials. The user needs to create tables (migrations run on start) |
| `PUBLIC_URL` | `https://fridge.example.com` | Public address without a trailing slash; used in password-reset, invite and digest emails |
| `SMTP_HOST` | `smtp.example.com` | SMTP server. In `prod` the app does not start without it |

### Optional

| Variable | Default | Description |
|---|---|---|
| `PORT` | `8080` | HTTP port |
| `SMTP_PORT` | `587` | SMTP port |
| `SMTP_USERNAME`, `SMTP_PASSWORD` | empty | SMTP login |
| `SMTP_AUTH`, `SMTP_STARTTLS` | `true`, `true` | SMTP authentication and STARTTLS |
| `MAIL_FROM` | `Zero Waste Fridge <no-reply@zerowastefridge.app>` | Sender of all emails |
| `COOKIE_SECURE` | `false` | `Secure` flag of the session cookie outside `prod` |
| `ZWF_TIME_ZONE` | `Europe/Kyiv` | Time zone of "today": expiry days, reminders, the daily digest, monthly statistics |
| `DEEPSEEK_API_KEY` | empty | Enables AI recipe generation ([details](#ai-recipes)) |
| `DEEPSEEK_MODEL` | `deepseek-flash` | DeepSeek model id |
| `ZWF_AI_DEEPSEEK_BASEURL` | `https://api.deepseek.com` | OpenAI-compatible base URL (for a proxy or a compatible provider) |
| `ZWF_AI_DEEPSEEK_TIMEOUT` | `45s` | How long to wait for a recipe before falling back to the catalog |
| `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` | empty | Web Push keys ([details](#web-push)). Without them push is off; everything else works |
| `VAPID_SUBJECT` | `mailto:no-reply@zerowastefridge.app` | Contact sent to push services |
| `ZWF_REMINDERS_ENABLED` | `true` | Scheduled reminders and the daily digest |
| `ZWF_REMINDERS_CRON` | `0 5 * * * *` (hourly, minute 5) | When expiry reminders are created |
| `ZWF_REMINDERS_DIGEST_CRON` | `0 * * * * *` (every minute) | How often the daily digest checks whose chosen time has come |
| `ZWF_REALTIME_HEARTBEAT` | `25s` | Keep-alive ping of the live updates stream; keep it below your proxy's idle timeout |
| `ZWF_AUTH_PASSWORDRESETTTL` | `1h` | Lifetime of a password-reset link |
| `ZWF_AUTH_PASSWORDRESETCOOLDOWN` | `1m` | Minimum interval between reset emails to one user |
| `ZWF_MAIL_LOGCONTENT` | `false` | When SMTP is not configured, write full email text to the log. Dev only — emails contain one-time links |

Cron expressions are Spring's six-field format (`second minute hour day month weekday`) in `ZWF_TIME_ZONE`.

### Fixed behaviour (not configurable)

- **Sessions:** 12 hours of inactivity, or 30 days with "Remember me". Stored in PostgreSQL (Spring Session JDBC), so restarts do not log users out.
- **Passwords:** 8+ characters, at most 72 bytes (BCrypt).
- **Reverse proxy headers:** `X-Forwarded-Proto` / `-Host` / `-For` are trusted (`server.forward-headers-strategy=framework`), so the app builds correct `https://` URLs behind a proxy.
- **Health probes:** `/actuator/health`, `/actuator/health/liveness`, `/actuator/health/readiness`.

## AI recipes

| Setting | Effect |
|---|---|
| no `DEEPSEEK_API_KEY` | "Generate" picks the best recipe from the built-in catalog (30 recipes) |
| `DEEPSEEK_API_KEY` set | DeepSeek writes a recipe from the selected products; it is validated and saved for the family. On a wrong key (401), no balance (402), bad request (422), timeout, or twice-failed attempt (empty JSON, 429, 5xx) the catalog is used |

Get a key at https://platform.deepseek.com. The default `deepseek-flash` is fast and cheap; requests use JSON mode with "thinking" turned off. Never commit the key — pass it through the environment or a secret store.

## Web Push

Generate a key pair once and keep it for the lifetime of the deployment: if the keys change, existing browser subscriptions stop working and users must switch push on again.

```bash
npx web-push generate-vapid-keys --json > ~/.zwf-vapid.json
```

Pass `publicKey` as `VAPID_PUBLIC_KEY` and `privateKey` as `VAPID_PRIVATE_KEY`. Browsers allow push only on HTTPS (or `localhost`).

## Email

| Environment | How emails are sent |
|---|---|
| `dev` | Mailpit — open http://localhost:8026 to read them |
| `prod` | SMTP from `SMTP_*` |
| SMTP not configured | Not sent; a line is logged (full text only with `ZWF_MAIL_LOGCONTENT=true`) |

Templates (Thymeleaf, HTML + plain text) are in `apps/api/src/main/resources/mail/`: password reset, family invite, daily expiry digest.

## Frontend (build time)

| App | Variable | Default | Description |
|---|---|---|---|
| `apps/web-lms` | `VITE_API_MOCK` | `true` in `.env.development`, `false` in `.env.backend` and `.env.production` | `true` / `false` / comma-separated domains (`auth`, `fridge`, `shopping`, `household`, `recipes`, or `data`) served from in-memory mocks |
| `apps/web-lms` | `BACKEND_URL` | `http://localhost:8080` | Where the Vite dev server proxies `/api` (dev only) |
| `apps/web-public` | `NEXT_PUBLIC_LMS_URL` | `/lms/` | Where "Open the app" links go (dev: `http://localhost:5173/lms/`) |

For a custom local setup create `apps/web-lms/.env.<mode>.local` and run `vite --mode <mode>`; `*.local` files are not committed.

## Database

PostgreSQL 17 is used in development and tests. The schema is managed by Flyway migrations in `apps/api/src/main/resources/db/migration` and applied automatically on start; Hibernate only validates it. Never edit an applied migration — add a new `V<n>__<name>.sql`. The recipe catalog (`recipes/catalog.json`) is loaded on start: new recipes (by `slug`) are inserted, existing ones are left alone.
