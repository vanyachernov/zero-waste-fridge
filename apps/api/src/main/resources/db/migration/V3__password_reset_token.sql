-- B-06: одноразові токени скидання пароля. Зберігаємо лише SHA-256 від токена —
-- витік БД не дає змоги скористатися посиланнями з листів.
CREATE TABLE password_reset_token (
    id         UUID        PRIMARY KEY,
    user_id    UUID        NOT NULL REFERENCES app_user (id) ON DELETE CASCADE,
    token_hash VARCHAR(64) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at    TIMESTAMPTZ,
    CONSTRAINT password_reset_token_hash_uk UNIQUE (token_hash)
);

CREATE INDEX password_reset_token_user_ix ON password_reset_token (user_id, created_at DESC);
