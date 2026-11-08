# Тести

Усі автоматичні тести монорепозиторію лежать тут, окремо від коду застосунків.

```
tests/
├── web-lms/                               # кабінет (apps/web-lms), workspace-пакет @zwf/web-lms-tests
│   ├── unit/…                             # Vitest + Testing Library: функції, хуки, окремі компоненти
│   ├── integration/…                      # увесь SPA на мок-бекенді: повні сценарії користувача
│   └── support/                           # setup (поліфіли jsdom), renderApp(), renderWithProviders()
└── api/                                   # бекенд (apps/api, Spring Boot)
    ├── unit/java/ua/zwf/api/…             # unit: чиста Java + Mockito, без Spring-контексту і Docker
    └── integration/
        ├── java/ua/zwf/api/…              # integration: Spring Boot на випадковому порту + PostgreSQL (Testcontainers)
        │   └── support/                   # IntegrationTest (базовий клас), ApiClient (HTTP + cookie + CSRF), TestData
        └── resources/                     # application-test.yaml, фейкова статика для тестів D-02
```

Пакети тестів дзеркалять пакети `apps/api/src/main/java`, тож unit-тест бачить package-private класи.

## Запуск

### Фронтенд

Java і Docker не потрібні.

```bash
pnpm test:web
```

```bash
pnpm --filter @zwf/web-lms-tests test:unit
```

```bash
pnpm --filter @zwf/web-lms-tests test:integration
```

```bash
pnpm --filter @zwf/web-lms-tests test:watch
```

### Бекенд

Потрібні JDK 25. Для інтеграційних тестів ще потрібен запущений Docker.

```bash
pnpm --filter @zwf/api test:unit
```

```bash
pnpm --filter @zwf/api test:integration
```

```bash
pnpm --filter @zwf/api test
```

Остання команда (`./gradlew check`) запускає обидва набори. У CI вони йдуть окремими кроками джоби `api`.

## Домовленості

### Фронтенд

- Файли називаються `*.test.ts(x)`. Код застосунку імпортується через аліас `@lms/…` (`apps/web-lms/src`).
- Інтеграційні тести рендерять увесь застосунок через `renderApp(path, { signedIn })`: справжній роутер з `basepath /lms`, TanStack Query, i18n і `@zwf/api-client` у режимі мока. Стан мок-бекенду скидається перед кожним тестом.
- Шукаємо елементи так, як їх бачить користувач (`getByRole`, `getByLabelText`). Це заодно перевіряє доступність.
- Моки зобов'язані поводитися як бекенд (`tests/web-lms/unit/api-client/mock-auth.test.ts`), інакше UI, перевірений на моках, зламається з реальним API.

### Бекенд

- **Unit-тести** називаються `*Test`. Вони не піднімають Spring і не ходять у мережу чи БД: залежності замінюємо Mockito або фейками, а час — фіксованим `Clock`.
- **Інтеграційні тести** називаються `*IT` і наслідують `support.IntegrationTest`. Конфігурація в усіх однакова, тож Spring кешує один контекст і один контейнер Postgres на весь прогін.
- БД між тестами не очищаємо. Кожен тест створює власних користувачів з унікальним email (`TestData.uniqueEmail()`).
- Потоки автентифікації перевіряємо через `ApiClient`: справжній HTTP, cookie `ZWF_SESSION` і `XSRF-TOKEN`, CSRF-заголовок — так само, як у SPA.
- Зовнішні сервіси (пошта) підміняються фейками в `support.IntegrationTestConfiguration`.
