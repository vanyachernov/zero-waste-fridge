-- B-34: як користувач хоче отримувати нагадування. Рядка немає — діють значення за замовчуванням
-- (у застосунку й щоденний лист — так, push — ні, лист о 8:00, без тихих годин).
CREATE TABLE notification_settings (
    user_id        UUID        PRIMARY KEY REFERENCES app_user (id) ON DELETE CASCADE,
    in_app         BOOLEAN     NOT NULL,
    email_digest   BOOLEAN     NOT NULL,
    push           BOOLEAN     NOT NULL,
    digest_hour    SMALLINT    NOT NULL,
    quiet_from     SMALLINT,
    quiet_to       SMALLINT,
    -- B-33: коли востаннє надіслано дайджест — не більше одного на день
    digest_sent_on DATE,
    updated_at     TIMESTAMPTZ NOT NULL,
    CONSTRAINT notification_settings_digest_hour_ck CHECK (digest_hour BETWEEN 0 AND 23),
    CONSTRAINT notification_settings_quiet_ck CHECK (
        (quiet_from IS NULL AND quiet_to IS NULL)
        OR (quiet_from BETWEEN 0 AND 23 AND quiet_to BETWEEN 0 AND 23 AND quiet_from <> quiet_to)
    )
);
