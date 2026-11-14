# Deployment

**English** · [Українська](deployment.uk.md)

How to put Zero Waste Fridge into production. For a local setup see the [README](../README.md#run-the-full-stack-locally); every setting is described in [configuration.md](configuration.md).

## What you deploy

```
            HTTPS                     HTTP :8080
Browser ───────────► reverse proxy ───────────────► zwf-api.jar ──► PostgreSQL
                     (nginx / Caddy)                 │  /       landing site
                                                     │  /lms/   user app (SPA)
                                                     │  /api/   REST + live updates (SSE)
                                                     ├──► SMTP (emails)
                                                     ├──► DeepSeek API (optional, AI recipes)
                                                     └──► Web Push services (optional)
```

- **One process.** The Spring Boot jar contains both built frontends and serves them, so there is no separate web server for static files and no CORS.
- **State lives in PostgreSQL** — data, sessions and the recipe catalog. The app itself is stateless; you can restart it at any time without logging users out.
- **Migrations run on start.** A new version upgrades the database schema by itself.

Requirements: Java 25 (or Docker), PostgreSQL (17 is used in development and tests), an SMTP account, a domain with HTTPS.

## 1. Build the jar

The jar must be built **with the frontends inside**. Choose one way.

**With JDK 25 and Node 20+:**

```bash
pnpm install --frozen-lockfile
```

```bash
pnpm build
```

**Without a local JDK** — build the frontends, then the jar in Docker:

```bash
pnpm install --frozen-lockfile && pnpm build:web
```

```bash
docker run --rm -v "$PWD":/work -w /work/apps/api -v zwf-gradle-home:/home/gradle/.gradle gradle:9.8.2-jdk25 gradle --no-daemon -q bootJar -PrequireWeb
```

The result is `apps/api/build/libs/zwf-api.jar`. `-PrequireWeb` makes the build fail if the frontend bundles are missing, so you can't ship a jar without the UI by accident. When the CI backend job is enabled, GitHub Actions also publishes the jar as the `zwf-api-jar` artifact.

## 2. Prepare PostgreSQL

Create a database and a user that owns it (the app creates its tables):

```sql
CREATE USER zwf WITH PASSWORD 'a-long-random-password';
CREATE DATABASE zwf OWNER zwf;
```

A managed PostgreSQL (AWS RDS, Google Cloud SQL, Azure, Neon, Supabase…) works the same way — you only need the JDBC URL. Add `?sslmode=require` to `DB_URL` if your provider requires TLS.

## 3. Write the environment file

Keep secrets in a file readable only by the service account, e.g. `/etc/zwf/zwf.env` (`chmod 600`):

```bash
SPRING_PROFILES_ACTIVE=prod
PUBLIC_URL=https://fridge.example.com
DB_URL=jdbc:postgresql://localhost:5432/zwf
DB_USER=zwf
DB_PASSWORD=a-long-random-password
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USERNAME=no-reply@example.com
SMTP_PASSWORD=smtp-password
MAIL_FROM=Zero Waste Fridge <no-reply@example.com>
# Optional
DEEPSEEK_API_KEY=sk-...
VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
VAPID_SUBJECT=mailto:admin@example.com
ZWF_TIME_ZONE=Europe/Kyiv
```

How to get the VAPID keys and the DeepSeek key: [configuration.md](configuration.md#web-push).

## 4. Run the app

### Option A: systemd on a Linux server

Install Java 25 (e.g. Eclipse Temurin), copy the jar to `/opt/zwf/zwf-api.jar` and create `/etc/systemd/system/zwf.service`:

```ini
[Unit]
Description=Zero Waste Fridge
After=network-online.target postgresql.service
Wants=network-online.target

[Service]
User=zwf
EnvironmentFile=/etc/zwf/zwf.env
ExecStart=/usr/bin/java -Xms256m -Xmx512m -jar /opt/zwf/zwf-api.jar
SuccessExitStatus=143
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload && sudo systemctl enable --now zwf
```

```bash
journalctl -u zwf -f
```

### Option B: Docker

Run the jar in the official Java image:

```bash
docker run -d --name zwf --restart unless-stopped -p 127.0.0.1:8080:8080 \
  --env-file /etc/zwf/zwf.env \
  -v /opt/zwf:/app:ro \
  eclipse-temurin:25-jre java -jar /app/zwf-api.jar
```

If PostgreSQL runs on the host, use `host.docker.internal` (Docker Desktop) or the host's IP in `DB_URL`, or run both in one Docker Compose project:

```yaml
services:
  db:
    image: postgres:17-alpine
    environment:
      POSTGRES_DB: zwf
      POSTGRES_USER: zwf
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - zwf-db:/var/lib/postgresql/data
    restart: unless-stopped

  app:
    image: eclipse-temurin:25-jre
    command: ["java", "-jar", "/app/zwf-api.jar"]
    env_file: /etc/zwf/zwf.env
    environment:
      DB_URL: jdbc:postgresql://db:5432/zwf
    volumes:
      - /opt/zwf:/app:ro
    ports:
      - "127.0.0.1:8080:8080"
    depends_on:
      - db
    restart: unless-stopped

volumes:
  zwf-db:
```

### Option C: a PaaS (Render, Railway, Fly.io, Heroku-like)

Use a Java 25 runtime (or the Docker image above), set the variables from step 3, point it to a managed PostgreSQL. The app listens on `PORT`, which most platforms set themselves. Use `/actuator/health/readiness` as the health check.

## 5. Put HTTPS in front

The session cookie is `Secure` in `prod`, so the site **must** be served over HTTPS. The app trusts `X-Forwarded-*` headers from the proxy.

The live-updates stream (`/api/household/stream`, Server-Sent Events) needs proxy buffering off and a read timeout longer than the 25-second heartbeat.

**nginx** (certificates via `certbot --nginx`):

```nginx
server {
    listen 443 ssl http2;
    server_name fridge.example.com;
    # ssl_certificate / ssl_certificate_key — added by certbot

    client_max_body_size 1m;

    location /api/household/stream {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_buffering off;
        proxy_read_timeout 1h;
    }

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

server {
    listen 80;
    server_name fridge.example.com;
    return 301 https://$host$request_uri;
}
```

**Caddy** (gets certificates by itself; SSE works out of the box):

```
fridge.example.com {
    reverse_proxy 127.0.0.1:8080
}
```

## 6. Check that it works

| Check | Expected |
|---|---|
| `curl https://fridge.example.com/actuator/health` | `{"status":"UP"}` |
| Open `https://fridge.example.com/` | Landing site |
| Open `https://fridge.example.com/lms/` → register | You land in an empty fridge |
| "Forgot password" on the login page | Email arrives, the link opens `https://fridge.example.com/lms/reset-password?...` |
| Settings → push (with VAPID keys) | The browser asks for permission; reminders arrive as system notifications |
| Recipes → pick 3 products → Generate (with a DeepSeek key) | The recipe has the "Згенеровано AI" badge |
| `https://fridge.example.com/swagger-ui.html` | 404 — documentation is hidden in `prod` |

## 7. Updates

1. Back up the database (see below).
2. Build the new jar (step 1) and replace `/opt/zwf/zwf-api.jar`.
3. Restart: `sudo systemctl restart zwf` or `docker restart zwf`.

Migrations run on start; users stay signed in because sessions are in the database. If a migration fails, the app does not start and the old schema is untouched — check the log, fix, restart. Rolling back to an older jar after a migration is not supported; restore the backup instead.

## 8. Backups

Everything worth keeping is in PostgreSQL:

```bash
pg_dump --format=custom --file=/var/backups/zwf/zwf-$(date +%F).dump "postgresql://zwf@localhost:5432/zwf"
```

Run it daily (cron or a systemd timer), keep several copies off the server, and try a restore now and then:

```bash
pg_restore --clean --if-exists --dbname="postgresql://zwf@localhost:5432/zwf" /var/backups/zwf/zwf-2026-11-14.dump
```

Managed PostgreSQL services have point-in-time backups — turn them on.

## 9. Production checklist

- [ ] `SPRING_PROFILES_ACTIVE=prod`, `PUBLIC_URL` is the real `https://` address.
- [ ] HTTPS works; HTTP redirects to HTTPS.
- [ ] Strong database password; the database is not reachable from the internet.
- [ ] SMTP tested (password reset email arrives, not in spam — set up SPF/DKIM for the sender domain).
- [ ] Secrets are only in the env file / secret store, not in the repository or shell history.
- [ ] Daily backups and a tested restore.
- [ ] Logs are kept (`journalctl` / `docker logs` or your log service).
- [ ] Optional: DeepSeek key with a spending limit; VAPID keys generated once and stored safely.
- [ ] `ZWF_TIME_ZONE` matches your users.
