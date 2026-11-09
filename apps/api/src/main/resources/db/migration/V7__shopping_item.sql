-- B-40: спільний список покупок домогосподарства.
CREATE TABLE shopping_item (
    id                UUID          PRIMARY KEY,
    household_id      UUID          NOT NULL REFERENCES household (id) ON DELETE CASCADE,
    name              VARCHAR(120)  NOT NULL,
    quantity          NUMERIC(10,3),
    unit              VARCHAR(8),
    category          VARCHAR(16),
    priority          VARCHAR(8)    NOT NULL DEFAULT 'NORMAL',
    -- Орієнтовна ціна в гривнях («~74 ₴»)
    price_estimate    NUMERIC(10,2),
    source            VARCHAR(16)   NOT NULL DEFAULT 'MANUAL',
    -- Продукт, після списання якого з'явилась позиція («Закінчився вчора в холодильнику»)
    source_product_id UUID          REFERENCES product (id) ON DELETE SET NULL,
    added_by          UUID          REFERENCES app_user (id) ON DELETE SET NULL,
    created_at        TIMESTAMPTZ   NOT NULL,
    updated_at        TIMESTAMPTZ   NOT NULL,
    bought_at         TIMESTAMPTZ,
    bought_by         UUID          REFERENCES app_user (id) ON DELETE SET NULL,
    CONSTRAINT shopping_item_name_ck CHECK (length(trim(name)) > 0),
    CONSTRAINT shopping_item_quantity_ck CHECK (quantity IS NULL OR quantity > 0),
    -- Кількість і одиниця — разом або жодної («Хліб» без кількості — нормально)
    CONSTRAINT shopping_item_quantity_unit_ck CHECK ((quantity IS NULL) = (unit IS NULL)),
    CONSTRAINT shopping_item_unit_ck CHECK (unit IN ('g', 'kg', 'ml', 'l', 'pcs')),
    CONSTRAINT shopping_item_category_ck CHECK (category IN ('vegetables', 'dairy', 'meat', 'fruits', 'sauces', 'other')),
    CONSTRAINT shopping_item_priority_ck CHECK (priority IN ('NORMAL', 'HIGH')),
    CONSTRAINT shopping_item_price_ck CHECK (price_estimate IS NULL OR price_estimate >= 0),
    CONSTRAINT shopping_item_source_ck CHECK (source IN ('MANUAL', 'AUTO', 'RECIPE', 'WRITE_OFF')),
    CONSTRAINT shopping_item_bought_ck CHECK (bought_by IS NULL OR bought_at IS NOT NULL)
);

CREATE INDEX shopping_item_household_ix ON shopping_item (household_id, bought_at, created_at);
