-- B-33: підписки Web Push (браузер / пристрій користувача). Ключі — з PushSubscription браузера.
CREATE TABLE push_subscription (
    id         UUID          PRIMARY KEY,
    user_id    UUID          NOT NULL REFERENCES app_user (id) ON DELETE CASCADE,
    endpoint   VARCHAR(1024) NOT NULL,
    p256dh     VARCHAR(255)  NOT NULL,
    auth       VARCHAR(255)  NOT NULL,
    created_at TIMESTAMPTZ   NOT NULL,
    CONSTRAINT push_subscription_endpoint_uk UNIQUE (endpoint)
);

CREATE INDEX push_subscription_user_ix ON push_subscription (user_id);
