-- B-10: продукти в холодильнику домогосподарства.
-- Коди категорій, зон і одиниць збігаються з фронтендом (packages/api-client/src/types.ts).

CREATE TABLE product (
    id                   UUID          PRIMARY KEY,
    household_id         UUID          NOT NULL REFERENCES household (id) ON DELETE CASCADE,
    -- Автор лишається в історії, навіть якщо акаунт видалено
    added_by             UUID          REFERENCES app_user (id) ON DELETE SET NULL,
    name                 VARCHAR(120)  NOT NULL,
    brand                VARCHAR(120),
    category             VARCHAR(16)   NOT NULL,
    zone                 VARCHAR(16)   NOT NULL,
    quantity             NUMERIC(10,3) NOT NULL,
    unit                 VARCHAR(8)    NOT NULL,
    purchased_at         DATE,
    expires_at           DATE          NOT NULL,
    opened_at            DATE,
    -- Термін з урахуванням відкритої упаковки (B-12): min(expires_at, opened_at + термін після відкриття)
    effective_expires_at DATE          NOT NULL,
    remind_before_days   SMALLINT      NOT NULL DEFAULT 2,
    status               VARCHAR(16)   NOT NULL DEFAULT 'ACTIVE',
    created_at           TIMESTAMPTZ   NOT NULL,
    updated_at           TIMESTAMPTZ   NOT NULL,
    closed_at            TIMESTAMPTZ,
    CONSTRAINT product_name_ck CHECK (length(trim(name)) > 0),
    CONSTRAINT product_category_ck CHECK (category IN ('vegetables', 'dairy', 'meat', 'fruits', 'sauces', 'other')),
    CONSTRAINT product_zone_ck CHECK (zone IN ('fresh', 'middle', 'door', 'freezer')),
    CONSTRAINT product_unit_ck CHECK (unit IN ('g', 'kg', 'ml', 'l', 'pcs')),
    CONSTRAINT product_quantity_ck CHECK (quantity > 0),
    CONSTRAINT product_remind_ck CHECK (remind_before_days IN (1, 2, 3, 7)),
    CONSTRAINT product_status_ck CHECK (status IN ('ACTIVE', 'CONSUMED', 'WASTED')),
    CONSTRAINT product_effective_ck CHECK (effective_expires_at <= expires_at),
    CONSTRAINT product_opened_ck CHECK (opened_at IS NULL OR purchased_at IS NULL OR opened_at >= purchased_at),
    CONSTRAINT product_closed_ck CHECK ((status = 'ACTIVE') = (closed_at IS NULL))
);

-- Головний запит холодильника: активні продукти домогосподарства, спочатку ті, що псуються
CREATE INDEX product_household_expiry_ix ON product (household_id, effective_expires_at) WHERE status = 'ACTIVE';
-- Статистика «додано за тиждень» і сортування за датою додавання
CREATE INDEX product_household_created_ix ON product (household_id, created_at DESC);
