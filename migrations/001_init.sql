-- Phase 0/1 schema: core tables for users, sellers, products, inventory, user_events.
-- Applied via scripts/migrate.ts. Safe to re-run (uses IF NOT EXISTS).

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS users (
    user_id     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        TEXT NOT NULL,
    email       TEXT NOT NULL UNIQUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sellers (
    seller_id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        TEXT NOT NULL,
    status      TEXT NOT NULL DEFAULT 'ACTIVE',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS products (
    product_id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_id    UUID NOT NULL REFERENCES sellers(seller_id),
    name         TEXT NOT NULL,
    description  TEXT,
    category_id  UUID,
    price        NUMERIC(10, 2) NOT NULL CHECK (price > 0),
    is_active    BOOLEAN NOT NULL DEFAULT true,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_products_category_id ON products (category_id);
CREATE INDEX IF NOT EXISTS idx_products_seller_id ON products (seller_id);
CREATE INDEX IF NOT EXISTS idx_products_price ON products (price);
CREATE INDEX IF NOT EXISTS idx_products_is_active ON products (is_active);

CREATE TABLE IF NOT EXISTS inventory (
    product_id  UUID PRIMARY KEY REFERENCES products(product_id),
    quantity    INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_events (
    event_id      UUID PRIMARY KEY,
    user_id       UUID NOT NULL REFERENCES users(user_id),
    event_type    TEXT NOT NULL,
    product_id    UUID,
    search_query  TEXT,
    timestamp     TIMESTAMPTZ NOT NULL DEFAULT now(),
    metadata      JSONB
);

CREATE INDEX IF NOT EXISTS idx_user_events_user_id_timestamp ON user_events (user_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_user_events_event_type ON user_events (event_type);
CREATE INDEX IF NOT EXISTS idx_user_events_product_id ON user_events (product_id);
