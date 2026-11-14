-- B-32: сповіщення в застосунку. Тексти локалізує фронтенд за `type`; тут лише дані для них.
CREATE TABLE notification (
    id           UUID         PRIMARY KEY,
    user_id      UUID         NOT NULL REFERENCES app_user (id) ON DELETE CASCADE,
    household_id UUID         NOT NULL REFERENCES household (id) ON DELETE CASCADE,
    type         VARCHAR(32)  NOT NULL,
    -- Продукт, про який сповіщення («Йогурт зіпсується завтра»); назва — знімок на момент створення
    product_id   UUID         REFERENCES product (id) ON DELETE SET NULL,
    product_name VARCHAR(120),
    -- Днів до кінця терміну на момент сповіщення (0 — сьогодні, < 0 — прострочено)
    days_left    INTEGER,
    created_at   TIMESTAMPTZ  NOT NULL,
    read_at      TIMESTAMPTZ,
    CONSTRAINT notification_type_ck CHECK (type IN ('EXPIRY_REMINDER'))
);

-- Дзвіночок: непрочитані першими, нові зверху
CREATE INDEX notification_user_ix ON notification (user_id, read_at NULLS FIRST, created_at DESC);
