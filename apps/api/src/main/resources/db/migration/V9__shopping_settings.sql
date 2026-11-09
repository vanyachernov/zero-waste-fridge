-- B-43: налаштування Smart Sync (автопоповнення списку покупок із залишків холодильника).
-- Рядка немає — діють значення за замовчуванням: увімкнено, без винятків.
CREATE TABLE shopping_settings (
    household_id        UUID         PRIMARY KEY REFERENCES household (id) ON DELETE CASCADE,
    auto_refill         BOOLEAN      NOT NULL,
    -- Коди категорій-винятків через кому: 'sauces,other'
    excluded_categories VARCHAR(120) NOT NULL DEFAULT '',
    updated_at          TIMESTAMPTZ  NOT NULL
);
