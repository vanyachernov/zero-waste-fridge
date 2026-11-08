-- B-02: користувачі, домогосподарства (спільний холодильник) і членство з ролями.

CREATE TABLE app_user (
    id            UUID         PRIMARY KEY,
    email         VARCHAR(254) NOT NULL,
    name          VARCHAR(80)  NOT NULL,
    password_hash VARCHAR(100) NOT NULL,
    avatar_url    VARCHAR(512),
    created_at    TIMESTAMPTZ  NOT NULL,
    updated_at    TIMESTAMPTZ  NOT NULL,
    CONSTRAINT app_user_email_uk UNIQUE (email),
    -- email зберігається вже нормалізованим (lower-case), тому достатньо звичайного UNIQUE
    CONSTRAINT app_user_email_lower_ck CHECK (email = lower(email))
);

CREATE TABLE household (
    id         UUID         PRIMARY KEY,
    name       VARCHAR(120) NOT NULL,
    created_at TIMESTAMPTZ  NOT NULL
);

CREATE TABLE household_member (
    id           UUID        PRIMARY KEY,
    household_id UUID        NOT NULL REFERENCES household (id) ON DELETE CASCADE,
    user_id      UUID        NOT NULL REFERENCES app_user (id) ON DELETE CASCADE,
    role         VARCHAR(16) NOT NULL,
    joined_at    TIMESTAMPTZ NOT NULL,
    CONSTRAINT household_member_role_ck CHECK (role IN ('OWNER', 'MEMBER')),
    -- MVP: користувач належить рівно одному домогосподарству
    CONSTRAINT household_member_user_uk UNIQUE (user_id)
);

CREATE INDEX household_member_household_ix ON household_member (household_id);
