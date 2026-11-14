# Налаштування

[English](configuration.md) · **Українська**

Усе, що можна налаштувати, де воно живе і яке значення за замовчуванням. Бекенд читає змінні оточення; кожна відповідає властивості Spring (`ZWF_TIME_ZONE` ⇔ `zwf.time-zone`), тож можна також передати `--zwf.time-zone=…` у командному рядку або використати `application-*.yaml`. Для згрупованих налаштувань Spring прибирає дефіси в назві змінної: `zwf.ai.deepseek.base-url` ⇔ `ZWF_AI_DEEPSEEK_BASEURL`. Фронти беруть кілька змінних під час збірки.

## Профілі

`SPRING_PROFILES_ACTIVE` вибирає один із двох профілів. Без неї бекенд працює як `dev`.

| | `dev` | `prod` |
|---|---|---|
| Локальні PostgreSQL + Mailpit з `apps/api/compose.yaml` | `./gradlew bootRun` піднімає сам | — |
| Пошта | Mailpit (`localhost:1026`, інтерфейс http://localhost:8026) | SMTP із `SMTP_*` (обов'язково) |
| Посилання в листах | `http://localhost:5173` (Vite dev-сервер) | `PUBLIC_URL` (обов'язково) |
| `Secure` у сесійній cookie | вимкнено (`COOKIE_SECURE`) | завжди ввімкнено — потрібен HTTPS |
| Swagger UI і `/v3/api-docs` | увімкнено | вимкнено |
| Рівень логів `ua.zwf` | `debug` | `info` |

## Бекенд

### Обов'язкові в продакшені

| Змінна | Приклад | Опис |
|---|---|---|
| `SPRING_PROFILES_ACTIVE` | `prod` | Продакшен-профіль |
| `DB_URL` | `jdbc:postgresql://db:5432/zwf` | JDBC-адреса PostgreSQL |
| `DB_USER`, `DB_PASSWORD` | `zwf`, `…` | Доступ до БД. Користувач має право створювати таблиці (міграції виконуються під час старту) |
| `PUBLIC_URL` | `https://fridge.example.com` | Публічна адреса без «/» в кінці; для листів скидання пароля, запрошень і щоденного листа |
| `SMTP_HOST` | `smtp.example.com` | SMTP-сервер. У `prod` без нього застосунок не стартує |

### Необов'язкові

| Змінна | За замовчуванням | Опис |
|---|---|---|
| `PORT` | `8080` | HTTP-порт |
| `SMTP_PORT` | `587` | Порт SMTP |
| `SMTP_USERNAME`, `SMTP_PASSWORD` | порожньо | Логін SMTP |
| `SMTP_AUTH`, `SMTP_STARTTLS` | `true`, `true` | Автентифікація SMTP і STARTTLS |
| `MAIL_FROM` | `Zero Waste Fridge <no-reply@zerowastefridge.app>` | Відправник усіх листів |
| `COOKIE_SECURE` | `false` | Прапорець `Secure` сесійної cookie поза `prod` |
| `ZWF_TIME_ZONE` | `Europe/Kyiv` | Часовий пояс «сьогодні»: дні до кінця терміну, нагадування, щоденний лист, статистика за місяць |
| `DEEPSEEK_API_KEY` | порожньо | Вмикає генерацію рецептів через AI ([деталі](#ai-рецепти)) |
| `DEEPSEEK_MODEL` | `deepseek-flash` | Модель DeepSeek |
| `ZWF_AI_DEEPSEEK_BASEURL` | `https://api.deepseek.com` | OpenAI-сумісна адреса (для проксі чи сумісного провайдера) |
| `ZWF_AI_DEEPSEEK_TIMEOUT` | `45s` | Скільки чекати рецепт, перш ніж узяти з каталогу |
| `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` | порожньо | Ключі Web Push ([деталі](#web-push)). Без них push вимкнено, усе інше працює |
| `VAPID_SUBJECT` | `mailto:no-reply@zerowastefridge.app` | Контакт для push-сервісів |
| `ZWF_REMINDERS_ENABLED` | `true` | Нагадування за розкладом і щоденний лист |
| `ZWF_REMINDERS_CRON` | `0 5 * * * *` (щогодини, на 5-й хвилині) | Коли створюються нагадування про терміни |
| `ZWF_REMINDERS_DIGEST_CRON` | `0 * * * * *` (щохвилини) | Як часто щоденний лист перевіряє, у кого настав вибраний час |
| `ZWF_REALTIME_HEARTBEAT` | `25s` | Пінг потоку оновлень у реальному часі; має бути меншим за таймаут бездіяльності проксі |
| `ZWF_AUTH_PASSWORDRESETTTL` | `1h` | Скільки діє посилання для скидання пароля |
| `ZWF_AUTH_PASSWORDRESETCOOLDOWN` | `1m` | Мінімальний інтервал між листами скидання одному користувачу |
| `ZWF_MAIL_LOGCONTENT` | `false` | Якщо SMTP не налаштовано — писати повний текст листа в лог. Лише для dev: листи містять одноразові посилання |

Cron — шестипольний формат Spring (`секунда хвилина година день місяць день_тижня`) у поясі `ZWF_TIME_ZONE`.

### Незмінна поведінка

- **Сесії:** 12 годин бездіяльності або 30 днів із «Запам'ятати мене». Зберігаються в PostgreSQL (Spring Session JDBC), тож перезапуск не розлогінює користувачів.
- **Паролі:** від 8 символів, не більше 72 байт (BCrypt).
- **Заголовки reverse proxy:** `X-Forwarded-Proto` / `-Host` / `-For` враховуються (`server.forward-headers-strategy=framework`), тож за проксі застосунок будує правильні `https://`-адреси.
- **Health-перевірки:** `/actuator/health`, `/actuator/health/liveness`, `/actuator/health/readiness`.

## AI-рецепти

| Налаштування | Що відбувається |
|---|---|
| немає `DEEPSEEK_API_KEY` | «Згенерувати» підбирає найкращий рецепт із вбудованого каталогу (30 рецептів) |
| є `DEEPSEEK_API_KEY` | DeepSeek складає рецепт з обраних продуктів; рецепт перевіряється й зберігається для сім'ї. Неправильний ключ (401), немає балансу (402), некоректний запит (422), таймаут або дві невдалі спроби (порожній JSON, 429, 5xx) — береться каталог |

Ключ — на https://platform.deepseek.com. За замовчуванням `deepseek-flash` — швидка й дешева модель; запити йдуть у JSON-режимі з вимкненим «thinking». Ніколи не комітьте ключ — передавайте його через оточення або сховище секретів.

## Web Push

Згенеруйте пару ключів один раз і не змінюйте їх: якщо ключі зміняться, наявні підписки браузерів перестануть працювати і користувачам доведеться ввімкнути push знову.

```bash
npx web-push generate-vapid-keys --json > ~/.zwf-vapid.json
```

`publicKey` передайте як `VAPID_PUBLIC_KEY`, `privateKey` — як `VAPID_PRIVATE_KEY`. Браузери дозволяють push лише на HTTPS (або `localhost`).

## Пошта

| Оточення | Як надсилаються листи |
|---|---|
| `dev` | Mailpit — відкрийте http://localhost:8026 |
| `prod` | SMTP із `SMTP_*` |
| SMTP не налаштовано | Не надсилаються; у лог пишеться рядок (повний текст — лише з `ZWF_MAIL_LOGCONTENT=true`) |

Шаблони (Thymeleaf, HTML + текст) — у `apps/api/src/main/resources/mail/`: скидання пароля, запрошення до сім'ї, щоденний лист про терміни.

## Фронтенд (під час збірки)

| Застосунок | Змінна | За замовчуванням | Опис |
|---|---|---|---|
| `apps/web-lms` | `VITE_API_MOCK` | `true` у `.env.development`, `false` у `.env.backend` і `.env.production` | `true` / `false` / домени через кому (`auth`, `fridge`, `shopping`, `household`, `recipes` або `data`), які беруться з in-memory моків |
| `apps/web-lms` | `BACKEND_URL` | `http://localhost:8080` | Куди Vite dev-сервер проксує `/api` (лише dev) |
| `apps/web-public` | `NEXT_PUBLIC_LMS_URL` | `/lms/` | Куди ведуть посилання «Відкрити кабінет» (у dev — `http://localhost:5173/lms/`) |

Для власного локального налаштування створіть `apps/web-lms/.env.<mode>.local` і запустіть `vite --mode <mode>`; файли `*.local` не комітяться.

## База даних

У розробці й тестах — PostgreSQL 17. Схемою керують міграції Flyway у `apps/api/src/main/resources/db/migration`; вони застосовуються автоматично під час старту, Hibernate лише перевіряє схему. Ніколи не змінюйте вже застосовану міграцію — додайте нову `V<n>__<назва>.sql`. Каталог рецептів (`recipes/catalog.json`) завантажується під час старту: нові рецепти (за `slug`) додаються, наявні не змінюються.
