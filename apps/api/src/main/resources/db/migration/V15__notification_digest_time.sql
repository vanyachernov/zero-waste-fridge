-- B-34: час щоденного листа з точністю до хвилини (було лише година).
ALTER TABLE notification_settings ADD COLUMN digest_time TIME(0) NOT NULL DEFAULT '08:00';
UPDATE notification_settings SET digest_time = make_time(digest_hour, 0, 0);
ALTER TABLE notification_settings ALTER COLUMN digest_time DROP DEFAULT;
ALTER TABLE notification_settings DROP CONSTRAINT notification_settings_digest_hour_ck;
ALTER TABLE notification_settings DROP COLUMN digest_hour;
