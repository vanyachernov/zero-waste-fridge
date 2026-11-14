-- F-90: тема інтерфейсу в профілі, щоб вибір переходив між пристроями. NULL — як у системі.
ALTER TABLE app_user ADD COLUMN theme VARCHAR(5);
ALTER TABLE app_user ADD CONSTRAINT app_user_theme_ck CHECK (theme IN ('LIGHT', 'DARK'));
