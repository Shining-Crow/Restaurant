-- Amore Mio paid orders (matches Prisma `Order` model / client dev brief).
CREATE TABLE IF NOT EXISTS "orders" (
    "id" BIGSERIAL PRIMARY KEY,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "customer_name" TEXT NOT NULL,
    "customer_phone" TEXT NOT NULL,
    "customer_email" TEXT,
    "order_type" TEXT NOT NULL,
    "delivery_address" TEXT,
    "preferred_time" TEXT,
    "items" JSONB NOT NULL,
    "subtotal" DECIMAL(10,2),
    "delivery_fee" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(10,2),
    "stripe_session_id" TEXT UNIQUE,
    "status" TEXT NOT NULL DEFAULT 'paid',
    "notes" TEXT
);

CREATE INDEX IF NOT EXISTS "orders_created_at_idx" ON "orders" ("created_at");
