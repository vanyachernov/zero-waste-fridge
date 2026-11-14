# Zero Waste Fridge

[English](README.md) · **Українська**

Вебзастосунок, який допомагає сім'ї не викидати їжу. Він стежить, що лежить у холодильнику і коли закінчується термін, нагадує про продукти, що скоро зіпсуються, підбирає (або генерує через AI) рецепти з 3–4 продуктів, які треба використати першими, і веде спільний список покупок для всієї сім'ї.

| | |
|---|---|
| **Холодильник** | Продукти з терміном придатності, термін після відкриття упаковки, бейджі свіжості, пошук, фільтри, списання (з'їдено / приготовано / викинуто) |
| **Розумні рецепти** | Рекомендації з критичних продуктів, конструктор «оберіть 3–4 продукти», генерація через DeepSeek із запасним варіантом із каталогу, «Приготувати і списати» |
| **Список покупок** | Спільний список, магазини, пріоритети, Smart Sync (закінчені продукти додаються самі), «Перенести куплене в холодильник» |
| **Сім'я** | Одне спільне домогосподарство, ролі (власник / член сім'ї), запрошення на email або кодом, стрічка дій, оновлення в реальному часі та присутність |
| **Сповіщення** | Дзвіночок у застосунку, щоденний лист у вибраний час, Web Push, тиха година |
| **Статистика & Екологія** | Врятовано і викинуто по місяцях і категоріях, частка врятованого, орієнтовні кг їжі та CO₂e, що найчастіше псується, внесок сім'ї |
| **Усюди** | Українська мова, світла й темна тема (зберігається в профілі), мобільна версія, доступність з клавіатури та для екранних читачів (WCAG 2.1 AA) |

## Зміст

- [Швидкий старт: демо без бекенду](#швидкий-старт-демо-без-бекенду)
- [Повний стек локально](#повний-стек-локально)
- [Налаштування](#налаштування)
- [Розгортання](#розгортання)
- [AI-рецепти (DeepSeek)](#ai-рецепти-deepseek)
- [Тести](#тести)
- [Структура проєкту](#структура-проєкту)
- [Документація](#документація)
- [Типові проблеми](#типові-проблеми)
- [Як долучитися](#як-долучитися)

## Технології

| Частина | Технологія |
|---|---|
| Бекенд | Java 25, Spring Boot 4.1 (Web MVC, Security, Session JDBC, Data JPA, Mail, Flyway), PostgreSQL 17, шаблони листів Thymeleaf, SSE, Web Push (VAPID) |
| Кабінет (`/lms/`) | React 19, Vite, TanStack Router + Query, Tailwind CSS v4 |
| Вітрина (`/`) | Next.js 15 (статичний експорт) |
| Спільні пакети | `@zwf/ui` (дизайн-токени + компоненти), `@zwf/api-client` (HTTP-клієнт + моки), `@zwf/i18n` |
| Інструменти | pnpm workspaces, Turborepo, Gradle, Vitest + Testing Library + axe-core, JUnit 5 + Testcontainers, JaCoCo, GitHub Actions |

## Вимоги

| Інструмент | Версія | Для чого |
|---|---|---|
| Node.js | ≥ 20 (рекомендовано 22, див. `.nvmrc`) | увесь фронтенд |
| pnpm | версія з `package.json` (`corepack enable` встановить її) | увесь фронтенд |
| Docker | будь-яка свіжа | PostgreSQL і Mailpit локально, інтеграційні тести бекенду, збірка без локального JDK |
| JDK | 25 (наприклад, `brew install --cask temurin@25`) | необов'язково — лише якщо хочете запускати Gradle без Docker |

## Швидкий старт: демо без бекенду

Кабінет має in-memory моки, які поводяться як справжній API, тож усе можна спробувати за хвилину:

```bash
corepack enable
```

```bash
pnpm install
```

```bash
pnpm dev
```

| Що | Адреса |
|---|---|
| Вітрина | http://localhost:3000 |
| Кабінет | http://localhost:5173/lms/ |

Увійдіть демо-акаунтом **olena@example.com / Secret-pass-123** (на сторінці входу є кнопка, що підставляє ці дані). У демо-сім'ї троє учасників (Олена, Максим, Софія — той самий пароль), заповнений холодильник і п'ять місяців історії для сторінки статистики. Дані моків живуть у пам'яті й скидаються після перезавантаження.

## Повний стек локально

Тут працює справжній Spring Boot із PostgreSQL. Є два способи — оберіть один.

### Варіант A: з локальним JDK 25

```bash
pnpm dev:api
```

Spring Boot сам піднімає PostgreSQL (порт 5433) і Mailpit з `apps/api/compose.yaml`, застосовує міграції БД і слухає http://localhost:8080. Потім у другому терміналі:

```bash
pnpm --filter @zwf/web-lms dev:backend
```

### Варіант B: лише Docker (без Java)

1. Запустіть PostgreSQL і Mailpit:

   ```bash
   docker compose -p zwf -f apps/api/compose.yaml up -d
   ```

2. Зберіть jar бекенду Gradle-ом у Docker:

   ```bash
   docker run --rm -v "$PWD":/work -w /work/apps/api -v zwf-gradle-home:/home/gradle/.gradle gradle:9.8.2-jdk25 gradle --no-daemon -q bootJar
   ```

3. Запустіть його (рядок з `DEEPSEEK_API_KEY` приберіть, якщо ключа немає — див. [AI-рецепти](#ai-рецепти-deepseek)):

   ```bash
   docker rm -f zwf-api-dev 2>/dev/null; docker run -d --name zwf-api-dev -p 8080:8080 \
     -v "$PWD/apps/api/build/libs":/app \
     -e SPRING_PROFILES_ACTIVE=dev -e SPRING_DOCKER_COMPOSE_ENABLED=false \
     -e DB_URL=jdbc:postgresql://host.docker.internal:5433/zwf \
     -e SPRING_MAIL_HOST=host.docker.internal -e SPRING_MAIL_PORT=1026 \
     -e DEEPSEEK_API_KEY="$(cat ~/.zwf-deepseek-key)" \
     gradle:9.8.2-jdk25 java -jar /app/zwf-api.jar
   ```

4. Запустіть кабінет проти нього:

   ```bash
   pnpm --filter @zwf/web-lms dev:backend
   ```

Після змін у бекенді повторіть кроки 2–3.

### Локальні адреси

| Адреса | Що це |
|---|---|
| http://localhost:5173/lms/ | Кабінет (Vite dev-сервер, проксує `/api` на бекенд) |
| http://localhost:8080 | Бекенд (також роздає зібрані фронти, див. [Розгортання](#розгортання)) |
| http://localhost:8080/swagger-ui.html | Swagger UI (у `prod` вимкнено) |
| http://localhost:8080/actuator/health | Перевірка стану |
| http://localhost:8026 | Mailpit — усі листи, які бекенд надсилає в dev (скидання пароля, запрошення, щоденний лист) |

### Моки чи справжній бекенд

`VITE_API_MOCK` визначає, що кабінет бере з моків: `true` (усе, за замовчуванням для `pnpm dev`), `false` (нічого — так у `dev:backend` і в продакшені) або перелік доменів через кому: `auth`, `fridge`, `shopping`, `household`, `recipes` (`data` = холодильник + покупки + рецепти). Моки дзеркалять правила й коди помилок бекенду і покриті тестами. Деталі: [docs/architecture.md](docs/architecture.md#mocks).

## Налаштування

Бекенд налаштовується змінними оточення. Найважливіші:

| Змінна | Обов'язкова в prod | За замовчуванням | Що робить |
|---|---|---|---|
| `SPRING_PROFILES_ACTIVE` | так (`prod`) | `dev` | `prod` вмикає захищені cookie, SMTP і ховає Swagger |
| `DB_URL`, `DB_USER`, `DB_PASSWORD` | так | `jdbc:postgresql://localhost:5433/zwf`, `zwf`, `zwf` | Підключення до PostgreSQL |
| `PUBLIC_URL` | так | `http://localhost:8080` | Публічна адреса сайту для посилань у листах |
| `SMTP_HOST` (+ `SMTP_PORT`, `SMTP_USERNAME`, `SMTP_PASSWORD`, `SMTP_AUTH`, `SMTP_STARTTLS`) | так | — | Відправлення пошти |
| `MAIL_FROM` | ні | `Zero Waste Fridge <no-reply@zerowastefridge.app>` | Відправник |
| `DEEPSEEK_API_KEY`, `DEEPSEEK_MODEL` | ні | —, `deepseek-flash` | Генерація рецептів через AI |
| `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` | ні | — | Web Push |
| `PORT` | ні | `8080` | HTTP-порт |

Повний перелік (часовий пояс, розклад нагадувань, cookie, змінні фронтенду) — у **[docs/configuration.uk.md](docs/configuration.uk.md)**.

## Розгортання

Продакшен-артефакт — **один jar**: `pnpm build` збирає обидва фронти й вбудовує їх у jar Spring Boot, який роздає вітрину на `/`, кабінет на `/lms/` і API на `/api/`. Потрібні Java 25, PostgreSQL (у розробці й тестах — 17) і SMTP-скринька; перед застосунком — HTTPS (nginx, Caddy, балансувальник хмари). `pnpm build` запускає Gradle, тож потрібен JDK 25 — або зберіть jar у Docker, як описано в інструкції з розгортання.

```bash
pnpm install --frozen-lockfile && pnpm build
```

```bash
SPRING_PROFILES_ACTIVE=prod \
DB_URL=jdbc:postgresql://db-host:5432/zwf DB_USER=zwf DB_PASSWORD=change-me \
PUBLIC_URL=https://fridge.example.com SMTP_HOST=smtp.example.com SMTP_USERNAME=… SMTP_PASSWORD=… \
java -jar apps/api/build/libs/zwf-api.jar
```

Міграції БД застосовуються автоматично під час старту. Покроково (Docker, systemd, reverse proxy, HTTPS, бекапи, оновлення, чекліст): **[docs/deployment.uk.md](docs/deployment.uk.md)**.

## AI-рецепти (DeepSeek)

«Згенерувати ідеальний рецепт» просить [DeepSeek](https://platform.deepseek.com) скласти рецепт з усіх обраних продуктів. Без ключа — або якщо DeepSeek не відповів, перевищив час чи закінчився баланс — бекенд підбирає найкращий рецепт із вбудованого каталогу на 30 рецептів, тож функція працює завжди.

1. Створіть API-ключ на https://platform.deepseek.com і поповніть баланс.
2. Збережіть його поза репозиторієм (команда спитає ключ, не показуючи його):

   ```bash
   read -s "?DeepSeek key: " K && echo "$K" > ~/.zwf-deepseek-key && chmod 600 ~/.zwf-deepseek-key && unset K
   ```

   У bash замість `read -s "?DeepSeek key: " K` використайте `read -s -p "DeepSeek key: " K`.

3. Передайте його бекенду як `DEEPSEEK_API_KEY` (див. [варіант B](#варіант-b-лише-docker-без-java) або налаштування продакшену).

На сторінці рецепта AI-рецепт має бейдж **«Згенеровано AI»**, запасний — **«З каталогу рецептів»**. Якщо очікували AI, а прийшов каталог, шукайте в лозі бекенду рядки `DeepSeek:` (401 — неправильний ключ, 402 — немає балансу). Як це влаштовано: [docs/architecture.md](docs/architecture.md#ai-recipes).

## Тести

| Команда | Що запускає | Потрібно |
|---|---|---|
| `pnpm test:web` | Unit- та інтеграційні тести фронтенду (Vitest, Testing Library, axe-core) | Node |
| `pnpm --filter @zwf/web-lms-tests test:coverage` | Те саме з покриттям (поріг: 90 % рядків / 80 % гілок) | Node |
| `pnpm --filter @zwf/api test` | Unit- та інтеграційні тести бекенду (Testcontainers) і поріг покриття JaCoCo (90 % / 80 %) | JDK 25 + Docker |
| `pnpm typecheck` | TypeScript у всіх пакетах | Node |

Без локального JDK тести бекенду запускаються в Docker:

```bash
docker run --rm -v "$PWD":/work -w /work/apps/api -v zwf-gradle-home:/home/gradle/.gradle -v /var/run/docker.sock:/var/run/docker.sock -e TESTCONTAINERS_HOST_OVERRIDE=host.docker.internal -e TESTCONTAINERS_RYUK_DISABLED=true gradle:9.8.2-jdk25 gradle --no-daemon -q check
```

Тести ніколи не звертаються до справжнього DeepSeek — вони піднімають фейковий сервер. Домовленості: [tests/README.md](tests/README.md).

## Структура проєкту

```
zero-waste-fridge/
├── apps/
│   ├── api/          # Бекенд Spring Boot; роздає обидва фронти з jar
│   ├── web-lms/      # Кабінет (SPA під /lms/)
│   └── web-public/   # Вітрина (статичний експорт Next.js)
├── packages/
│   ├── ui/           # Дизайн-токени (Tailwind v4 @theme) і спільні React-компоненти
│   ├── api-client/   # Типізований фасад API, HTTP-клієнт (сесійна cookie + CSRF), моки
│   └── i18n/         # Типізовані переклади (українська; англійська — часткова)
├── tests/            # Усі автотести: tests/api (JUnit), tests/web-lms (Vitest)
├── docs/             # Інструкції, довідник API, дорожня карта
└── .github/workflows # CI
```

## Документація

| Документ | Для кого |
|---|---|
| [docs/user-guide.uk.md](docs/user-guide.uk.md) | Користувачам: усі екрани й можливості |
| [docs/configuration.uk.md](docs/configuration.uk.md) | Адміністраторам: усі налаштування й змінні оточення |
| [docs/deployment.uk.md](docs/deployment.uk.md) | Адміністраторам: розгортання в продакшені покроково |
| [docs/api.md](docs/api.md) | Розробникам: довідник REST API, формат помилок, потік реального часу (англійською) |
| [docs/architecture.md](docs/architecture.md) | Розробникам: як усе влаштовано (англійською) |
| [tests/README.md](tests/README.md) | Розробникам: структура тестів і домовленості |
| [docs/ROADMAP.md](docs/ROADMAP.md) | Команді: задачі та їхній стан |

## Типові проблеми

| Симптом | Причина і рішення |
|---|---|
| `docker: Conflict. The container name "/zwf-api-dev" is already in use` | Спершу видаліть старий контейнер: `docker rm -f zwf-api-dev` (команда запуску вище вже це робить) |
| Кабінет показує «Щось пішло не так» / 502 на `/api` | Бекенд не запущено або він не на `BACKEND_URL` (за замовчуванням `http://localhost:8080`); дивіться `docker logs zwf-api-dev` |
| Порт 5173 чи 8080 зайнятий | Зупиніть інший процес або змініть `PORT` і `BACKEND_URL` |
| Помилка Flyway «Validate failed» під час старту | Локальну БД мігрувала новіша або змінена міграція; для dev-бази виконайте `docker compose -p zwf -f apps/api/compose.yaml down -v` (видаляє локальні дані) і запустіть знову |
| Рецепти завжди «З каталогу рецептів» | Немає `DEEPSEEK_API_KEY`, неправильний ключ (401) або немає балансу (402) — дивіться лог бекенду |
| Перемикач push у «Налаштуваннях» неактивний | На бекенді немає ключів `VAPID_*` або браузер не підтримує push |
| Листи не приходять | У dev вони в Mailpit (http://localhost:8026); у prod перевірте `SMTP_*` |

## Як долучитися

- `main` — лише релізи; `dev` — інтеграційна гілка.
- Працюйте в гілках `feature/<ID>-<коротко>` від `dev` і відкривайте PR у `dev`. ID задач — з [docs/ROADMAP.md](docs/ROADMAP.md).
- Перед PR: `pnpm typecheck`, `pnpm test:web`, `check` бекенду. CI запускає джобу фронтенду на кожен push; джоба бекенду працює, коли змінна репозиторію `API_CI` дорівнює `true`, або вручну.
