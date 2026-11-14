# Розгортання

[English](deployment.md) · **Українська**

Як запустити Zero Waste Fridge у продакшені. Локальний запуск — у [README](../README.uk.md#повний-стек-локально); усі налаштування описано в [configuration.uk.md](configuration.uk.md).

## Що розгортаємо

```
            HTTPS                     HTTP :8080
Браузер ───────────► reverse proxy ───────────────► zwf-api.jar ──► PostgreSQL
                     (nginx / Caddy)                 │  /       вітрина
                                                     │  /lms/   кабінет (SPA)
                                                     │  /api/   REST + оновлення в реальному часі (SSE)
                                                     ├──► SMTP (листи)
                                                     ├──► DeepSeek API (необов'язково, AI-рецепти)
                                                     └──► сервіси Web Push (необов'язково)
```

- **Один процес.** Jar Spring Boot містить обидва зібрані фронти й сам їх роздає: окремий вебсервер для статики не потрібен, CORS теж.
- **Стан — у PostgreSQL**: дані, сесії, каталог рецептів. Сам застосунок нічого не зберігає, його можна перезапускати будь-коли — користувачі не розлогіняться.
- **Міграції — під час старту.** Нова версія сама оновлює схему БД.

Потрібно: Java 25 (або Docker), PostgreSQL (у розробці й тестах — 17), SMTP-скринька, домен з HTTPS.

## 1. Зібрати jar

Jar треба збирати **разом із фронтами**. Оберіть один спосіб.

**З JDK 25 і Node 20+:**

```bash
pnpm install --frozen-lockfile
```

```bash
pnpm build
```

**Без локального JDK** — фронти локально, jar у Docker:

```bash
pnpm install --frozen-lockfile && pnpm build:web
```

```bash
docker run --rm -v "$PWD":/work -w /work/apps/api -v zwf-gradle-home:/home/gradle/.gradle gradle:9.8.2-jdk25 gradle --no-daemon -q bootJar -PrequireWeb
```

Результат — `apps/api/build/libs/zwf-api.jar`. `-PrequireWeb` зупиняє збірку, якщо бандлів фронтів немає, тож jar без інтерфейсу випадково не вийде. Коли джоба бекенду в CI увімкнена, GitHub Actions теж публікує jar як артефакт `zwf-api-jar`.

## 2. Підготувати PostgreSQL

Створіть базу й користувача-власника (таблиці застосунок створить сам):

```sql
CREATE USER zwf WITH PASSWORD 'довгий-випадковий-пароль';
CREATE DATABASE zwf OWNER zwf;
```

Керований PostgreSQL (AWS RDS, Google Cloud SQL, Azure, Neon, Supabase…) працює так само — потрібна лише JDBC-адреса. Якщо провайдер вимагає TLS, додайте `?sslmode=require` до `DB_URL`.

## 3. Файл зі змінними оточення

Секрети тримайте у файлі, який читає лише сервісний користувач, наприклад `/etc/zwf/zwf.env` (`chmod 600`):

```bash
SPRING_PROFILES_ACTIVE=prod
PUBLIC_URL=https://fridge.example.com
DB_URL=jdbc:postgresql://localhost:5432/zwf
DB_USER=zwf
DB_PASSWORD=довгий-випадковий-пароль
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USERNAME=no-reply@example.com
SMTP_PASSWORD=пароль-smtp
MAIL_FROM=Zero Waste Fridge <no-reply@example.com>
# Необов'язково
DEEPSEEK_API_KEY=sk-...
VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
VAPID_SUBJECT=mailto:admin@example.com
ZWF_TIME_ZONE=Europe/Kyiv
```

Як отримати ключі VAPID і DeepSeek: [configuration.uk.md](configuration.uk.md#web-push).

## 4. Запустити застосунок

### Варіант A: systemd на Linux-сервері

Встановіть Java 25 (наприклад, Eclipse Temurin), скопіюйте jar у `/opt/zwf/zwf-api.jar` і створіть `/etc/systemd/system/zwf.service`:

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

### Варіант B: Docker

Запустіть jar в офіційному образі Java:

```bash
docker run -d --name zwf --restart unless-stopped -p 127.0.0.1:8080:8080 \
  --env-file /etc/zwf/zwf.env \
  -v /opt/zwf:/app:ro \
  eclipse-temurin:25-jre java -jar /app/zwf-api.jar
```

Якщо PostgreSQL працює на хості, вкажіть у `DB_URL` `host.docker.internal` (Docker Desktop) або IP хоста — або запустіть обидва в одному проєкті Docker Compose:

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

### Варіант C: PaaS (Render, Railway, Fly.io тощо)

Оберіть середовище Java 25 (або образ Docker вище), задайте змінні з кроку 3 і підключіть керований PostgreSQL. Застосунок слухає `PORT`, який більшість платформ задає самі. Для перевірки стану використовуйте `/actuator/health/readiness`.

## 5. HTTPS перед застосунком

У `prod` сесійна cookie має прапорець `Secure`, тому сайт **обов'язково** має працювати через HTTPS. Заголовкам `X-Forwarded-*` від проксі застосунок довіряє.

Потік оновлень у реальному часі (`/api/household/stream`, Server-Sent Events) потребує вимкненої буферизації в проксі й таймауту читання, довшого за пінг (25 секунд).

**nginx** (сертифікати через `certbot --nginx`):

```nginx
server {
    listen 443 ssl http2;
    server_name fridge.example.com;
    # ssl_certificate / ssl_certificate_key — додає certbot

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

**Caddy** (сам отримує сертифікати; SSE працює без додаткових налаштувань):

```
fridge.example.com {
    reverse_proxy 127.0.0.1:8080
}
```

## 6. Перевірити, що все працює

| Перевірка | Очікувано |
|---|---|
| `curl https://fridge.example.com/actuator/health` | `{"status":"UP"}` |
| Відкрити `https://fridge.example.com/` | Вітрина |
| Відкрити `https://fridge.example.com/lms/` → зареєструватися | Порожній холодильник |
| «Забули пароль?» на сторінці входу | Приходить лист, посилання відкриває `https://fridge.example.com/lms/reset-password?...` |
| Налаштування → push (з ключами VAPID) | Браузер просить дозвіл; нагадування приходять системними сповіщеннями |
| Рецепти → обрати 3 продукти → Згенерувати (з ключем DeepSeek) | Рецепт із бейджем «Згенеровано AI» |
| `https://fridge.example.com/swagger-ui.html` | 404 — документація API в `prod` прихована |

## 7. Оновлення

1. Зробіть бекап БД (див. нижче).
2. Зберіть новий jar (крок 1) і замініть `/opt/zwf/zwf-api.jar`.
3. Перезапустіть: `sudo systemctl restart zwf` або `docker restart zwf`.

Міграції виконуються під час старту; користувачі лишаються в системі, бо сесії зберігаються в БД. Якщо міграція не вдалася, застосунок не стартує, а стара схема лишається як була — перегляньте лог, виправте й перезапустіть. Повернення на старіший jar після міграції не підтримується — відновіть бекап.

## 8. Бекапи

Усе цінне — у PostgreSQL:

```bash
pg_dump --format=custom --file=/var/backups/zwf/zwf-$(date +%F).dump "postgresql://zwf@localhost:5432/zwf"
```

Запускайте щодня (cron або таймер systemd), зберігайте кілька копій поза сервером і час від часу перевіряйте відновлення:

```bash
pg_restore --clean --if-exists --dbname="postgresql://zwf@localhost:5432/zwf" /var/backups/zwf/zwf-2026-11-14.dump
```

Керовані PostgreSQL мають бекапи на будь-який момент часу — увімкніть їх.

## 9. Чекліст продакшену

- [ ] `SPRING_PROFILES_ACTIVE=prod`, `PUBLIC_URL` — справжня адреса з `https://`.
- [ ] HTTPS працює; HTTP перенаправляє на HTTPS.
- [ ] Надійний пароль БД; база недоступна з інтернету.
- [ ] SMTP перевірено (лист скидання пароля приходить і не потрапляє в спам — налаштуйте SPF/DKIM для домену відправника).
- [ ] Секрети — лише у файлі оточення чи сховищі секретів, не в репозиторії й не в історії терміналу.
- [ ] Щоденні бекапи й перевірене відновлення.
- [ ] Логи зберігаються (`journalctl` / `docker logs` або ваш сервіс логів).
- [ ] Необов'язково: ключ DeepSeek з лімітом витрат; ключі VAPID згенеровано один раз і надійно збережено.
- [ ] `ZWF_TIME_ZONE` відповідає вашим користувачам.
