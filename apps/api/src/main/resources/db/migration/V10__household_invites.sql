-- B-52: запрошення до сім'ї — листом (особисте, за email) і кодом ZWF-XXXX-XX (для будь-кого, у кого він є).
CREATE TABLE household_invite (
    id           UUID         PRIMARY KEY,
    household_id UUID         NOT NULL REFERENCES household (id) ON DELETE CASCADE,
    email        VARCHAR(254) NOT NULL,
    role         VARCHAR(16)  NOT NULL,
    invited_by   UUID         REFERENCES app_user (id) ON DELETE SET NULL,
    -- У БД лише SHA-256 від токена з посилання, як і для скидання пароля
    token_hash   VARCHAR(64)  NOT NULL,
    created_at   TIMESTAMPTZ  NOT NULL,
    expires_at   TIMESTAMPTZ  NOT NULL,
    accepted_at  TIMESTAMPTZ,
    accepted_by  UUID         REFERENCES app_user (id) ON DELETE SET NULL,
    CONSTRAINT household_invite_token_uk UNIQUE (token_hash),
    CONSTRAINT household_invite_email_lower_ck CHECK (email = lower(email)),
    CONSTRAINT household_invite_role_ck CHECK (role IN ('OWNER', 'MEMBER'))
);

-- Одне відкрите запрошення на email у межах сім'ї
CREATE UNIQUE INDEX household_invite_open_uk ON household_invite (household_id, email) WHERE accepted_at IS NULL;

CREATE TABLE household_join_code (
    household_id UUID        PRIMARY KEY REFERENCES household (id) ON DELETE CASCADE,
    code         VARCHAR(12) NOT NULL,
    created_by   UUID        REFERENCES app_user (id) ON DELETE SET NULL,
    created_at   TIMESTAMPTZ NOT NULL,
    expires_at   TIMESTAMPTZ NOT NULL,
    CONSTRAINT household_join_code_uk UNIQUE (code),
    CONSTRAINT household_join_code_format_ck CHECK (code ~ '^ZWF-[A-Z2-9]{4}-[A-Z2-9]{2}$')
);
