-- Amore Mio: full platform tables (run on Supabase SQL editor or via `prisma migrate deploy`).

-- Menu (source of truth when frontend/admin is wired to API)
CREATE TABLE IF NOT EXISTS "menu_items" (
    "id" SERIAL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "category" TEXT NOT NULL,
    "tags" TEXT[] NOT NULL DEFAULT '{}',
    "available" BOOLEAN NOT NULL DEFAULT true,
    "popular" BOOLEAN NOT NULL DEFAULT false,
    "image_url" TEXT,
    "extras" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS "menu_items_category_idx" ON "menu_items" ("category");
CREATE INDEX IF NOT EXISTS "menu_items_available_idx" ON "menu_items" ("available");

-- Chef specials / offers
CREATE TABLE IF NOT EXISTS "specials" (
    "id" BIGSERIAL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "ribbon_label" TEXT,
    "image_url" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS "specials_active_sort_idx" ON "specials" ("active", "sort_order");

-- Table bookings
CREATE TABLE IF NOT EXISTS "bookings" (
    "id" BIGSERIAL PRIMARY KEY,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "customer_name" TEXT NOT NULL,
    "customer_phone" TEXT NOT NULL,
    "customer_email" TEXT,
    "booking_date" DATE NOT NULL,
    "booking_time" TEXT NOT NULL,
    "guest_count" TEXT NOT NULL,
    "special_requests" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending'
);
CREATE INDEX IF NOT EXISTS "bookings_status_date_idx" ON "bookings" ("status", "booking_date");
CREATE INDEX IF NOT EXISTS "bookings_created_at_idx" ON "bookings" ("created_at");

-- Takeaway enquiries (no payment)
CREATE TABLE IF NOT EXISTS "order_enquiries" (
    "id" BIGSERIAL PRIMARY KEY,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "customer_name" TEXT NOT NULL,
    "customer_phone" TEXT NOT NULL,
    "customer_email" TEXT,
    "order_type" TEXT NOT NULL,
    "delivery_address" TEXT,
    "preferred_time" TEXT,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'new'
);
CREATE INDEX IF NOT EXISTS "order_enquiries_status_created_idx" ON "order_enquiries" ("status", "created_at");

-- Opening hours (1 row per weekday, 1=Mon … 7=Sun)
CREATE TABLE IF NOT EXISTS "opening_hours" (
    "weekday" INTEGER PRIMARY KEY,
    "open_time" TEXT NOT NULL,
    "close_time" TEXT NOT NULL,
    "is_closed" BOOLEAN NOT NULL DEFAULT false,
    "note" TEXT
);

-- Site settings (key → value JSON or plain text)
CREATE TABLE IF NOT EXISTS "site_settings" (
    "key" TEXT PRIMARY KEY,
    "value" TEXT NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Audit log for staff actions (menu edits, booking status, etc.)
CREATE TABLE IF NOT EXISTS "audit_logs" (
    "id" BIGSERIAL PRIMARY KEY,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "actor" TEXT,
    "action" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT,
    "payload" JSONB
);
CREATE INDEX IF NOT EXISTS "audit_logs_created_at_idx" ON "audit_logs" ("created_at");
CREATE INDEX IF NOT EXISTS "audit_logs_entity_idx" ON "audit_logs" ("entity_type", "entity_id");

-- Align existing `orders` table with Prisma `Order.updated_at`
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'orders'
  ) THEN
    ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW();
  END IF;
END $$;

-- Default opening hours (Clay Cross — adjust in DB or admin later)
INSERT INTO "opening_hours" ("weekday", "open_time", "close_time", "is_closed")
VALUES
  (1, '16:00', '22:00', false),
  (2, '16:00', '22:00', false),
  (3, '16:00', '22:00', false),
  (4, '16:00', '22:00', false),
  (5, '16:00', '23:00', false),
  (6, '16:00', '23:00', false),
  (7, '16:00', '22:00', false)
ON CONFLICT ("weekday") DO NOTHING;

-- Default site settings keys (values editable in admin / SQL)
INSERT INTO "site_settings" ("key", "value", "updated_at") VALUES
  ('restaurant_name', 'Amore Mio', NOW()),
  ('restaurant_tagline', 'Italian Experience', NOW()),
  ('phone', '01246 938793', NOW()),
  ('address', '21 Market Street, Clay Cross, S45 9JE', NOW()),
  ('announcement_bar', 'To order takeaway, call us on 01246 938793 — we''re open from 4pm daily.', NOW()),
  ('delivery_fee', '2.50', NOW()),
  ('restaurant_email', 'hello@amoremio.co.uk', NOW())
ON CONFLICT ("key") DO NOTHING;
