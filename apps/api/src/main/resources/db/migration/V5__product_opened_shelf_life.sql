-- B-12: термін придатності після відкриття упаковки.
-- Зберігаємо, скільки днів було застосовано в момент відкриття: effective_expires_at відтворюється
-- з самого рядка, навіть якщо довідник термінів пізніше зміниться.
ALTER TABLE product ADD COLUMN opened_shelf_life_days SMALLINT;

ALTER TABLE product ADD CONSTRAINT product_opened_shelf_life_ck CHECK (
    (opened_at IS NULL AND opened_shelf_life_days IS NULL)
    -- IS NOT NULL обов'язковий: NULL BETWEEN … дає NULL, а CHECK пропускає NULL
    OR (opened_at IS NOT NULL AND opened_shelf_life_days IS NOT NULL AND opened_shelf_life_days BETWEEN 1 AND 365)
);
