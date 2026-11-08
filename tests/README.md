# Тести

Усі автоматичні тести монорепозиторію лежать тут, окремо від коду застосунків.

```
tests/
└── api/                                   # бекенд (apps/api, Spring Boot)
    ├── unit/java/ua/zwf/api/…             # unit: чиста Java + Mockito, без Spring-контексту і Docker
    └── integration/
        ├── java/ua/zwf/api/…              # integration: Spring Boot на випадковому порту + PostgreSQL (Testcontainers)
        │   └── support/                   # IntegrationTest (базовий клас), ApiClient (HTTP + cookie + CSRF), TestData
        └── resources/                     # application-test.yaml, фейкова статика для тестів D-02
```

Пакети тестів дзеркалять пакети `apps/api/src/main/java`, тож unit-тест бачить package-private класи.

## Запуск

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

- **Unit-тести** називаються `*Test`. Вони не піднімають Spring і не ходять у мережу чи БД: залежності замінюємо Mockito або фейками, а час — фіксованим `Clock`.
- **Інтеграційні тести** називаються `*IT` і наслідують `support.IntegrationTest`. Конфігурація в усіх однакова, тож Spring кешує один контекст і один контейнер Postgres на весь прогін.
- БД між тестами не очищаємо. Кожен тест створює власних користувачів з унікальним email (`TestData.uniqueEmail()`).
- Потоки автентифікації перевіряємо через `ApiClient`: справжній HTTP, cookie `ZWF_SESSION` і `XSRF-TOKEN`, CSRF-заголовок — так само, як у SPA.
- Зовнішні сервіси (пошта) підміняються фейками в `support.IntegrationTestConfiguration`.
