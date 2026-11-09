-- B-13: журнал подій продукту — основа для «Врятовано» (B-24), «Останньої дії» і «Додано Максимом» (B-53).
CREATE TABLE product_event (
    id           UUID          PRIMARY KEY,
    household_id UUID          NOT NULL REFERENCES household (id) ON DELETE CASCADE,
    product_id   UUID          NOT NULL REFERENCES product (id) ON DELETE CASCADE,
    actor_id     UUID          REFERENCES app_user (id) ON DELETE SET NULL,
    type         VARCHAR(16)   NOT NULL,
    outcome      VARCHAR(16),
    quantity     NUMERIC(10,3),
    unit         VARCHAR(8),
    occurred_at  TIMESTAMPTZ   NOT NULL,
    CONSTRAINT product_event_type_ck CHECK (type IN ('ADDED', 'UPDATED', 'OPENED', 'WRITTEN_OFF')),
    CONSTRAINT product_event_outcome_ck CHECK (outcome IN ('EATEN', 'COOKED', 'WASTED')),
    -- Списання завжди має результат і кількість; інші події — ні
    CONSTRAINT product_event_write_off_ck CHECK (
        (type = 'WRITTEN_OFF' AND outcome IS NOT NULL AND quantity IS NOT NULL AND quantity > 0 AND unit IS NOT NULL)
        OR (type <> 'WRITTEN_OFF' AND outcome IS NULL)
    )
);

CREATE INDEX product_event_household_ix ON product_event (household_id, occurred_at DESC);
CREATE INDEX product_event_product_ix ON product_event (product_id, occurred_at DESC);
