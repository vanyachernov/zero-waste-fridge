-- B-44: магазини домогосподарства (Сільпо, АТБ, Еко-лавка…) для позицій списку покупок.
CREATE TABLE store (
    id           UUID        PRIMARY KEY,
    household_id UUID        NOT NULL REFERENCES household (id) ON DELETE CASCADE,
    name         VARCHAR(60) NOT NULL,
    created_at   TIMESTAMPTZ NOT NULL,
    CONSTRAINT store_name_ck CHECK (length(trim(name)) > 0)
);

-- «Сільпо» і «сільпо» — один магазин
CREATE UNIQUE INDEX store_household_name_uk ON store (household_id, lower(name));

-- Видалили магазин — позиції лишаються, просто без магазину
ALTER TABLE shopping_item ADD COLUMN store_id UUID REFERENCES store (id) ON DELETE SET NULL;
CREATE INDEX shopping_item_store_ix ON shopping_item (store_id);
