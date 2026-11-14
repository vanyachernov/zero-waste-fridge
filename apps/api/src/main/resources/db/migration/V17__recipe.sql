-- B-20 / B-22: рецепти. Каталог (спільний для всіх, household_id NULL) і згенеровані AI для конкретної сім'ї.
CREATE TABLE recipe (
    id           UUID         PRIMARY KEY,
    household_id UUID         REFERENCES household (id) ON DELETE CASCADE,
    slug         VARCHAR(80)  UNIQUE,
    source       VARCHAR(8)   NOT NULL,
    title        VARCHAR(160) NOT NULL,
    description  VARCHAR(600),
    image_url    VARCHAR(512),
    minutes      SMALLINT     NOT NULL,
    kcal         SMALLINT     NOT NULL,
    servings     SMALLINT     NOT NULL,
    difficulty   VARCHAR(8)   NOT NULL,
    savings_uah  INTEGER,
    created_at   TIMESTAMPTZ  NOT NULL,
    CONSTRAINT recipe_source_ck CHECK (
        (source = 'CATALOG' AND household_id IS NULL AND slug IS NOT NULL)
        OR (source = 'AI' AND household_id IS NOT NULL AND slug IS NULL)
    ),
    CONSTRAINT recipe_minutes_ck CHECK (minutes BETWEEN 1 AND 600),
    CONSTRAINT recipe_kcal_ck CHECK (kcal BETWEEN 0 AND 5000),
    CONSTRAINT recipe_servings_ck CHECK (servings BETWEEN 1 AND 12),
    CONSTRAINT recipe_difficulty_ck CHECK (difficulty IN ('EASY', 'MEDIUM', 'HARD'))
);

CREATE INDEX recipe_household_ix ON recipe (household_id, created_at DESC);

-- Інгредієнт знаходить продукт у холодильнику за ключовими словами в назві (або напряму за product_id у AI-рецептах).
-- pantry — базове (сіль, олія, вода): ніколи не «бракує».
CREATE TABLE recipe_ingredient (
    recipe_id   UUID          NOT NULL REFERENCES recipe (id) ON DELETE CASCADE,
    position    INTEGER       NOT NULL,
    name        VARCHAR(120)  NOT NULL,
    quantity    NUMERIC(10,3),
    unit        VARCHAR(8),
    note        VARCHAR(120),
    keywords    VARCHAR(300)  NOT NULL,
    pantry      BOOLEAN       NOT NULL,
    substitutes VARCHAR(300),
    product_id  UUID          REFERENCES product (id) ON DELETE SET NULL,
    PRIMARY KEY (recipe_id, position),
    CONSTRAINT recipe_ingredient_quantity_ck CHECK (quantity IS NULL OR quantity > 0),
    CONSTRAINT recipe_ingredient_unit_ck CHECK ((quantity IS NULL) = (unit IS NULL))
);

CREATE TABLE recipe_step (
    recipe_id UUID          NOT NULL REFERENCES recipe (id) ON DELETE CASCADE,
    position  INTEGER       NOT NULL,
    title     VARCHAR(120),
    text      VARCHAR(1000) NOT NULL,
    PRIMARY KEY (recipe_id, position)
);
