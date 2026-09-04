-- Worldpay checkout: generic payment reference + pending default status.
ALTER TABLE "orders" RENAME COLUMN "stripe_session_id" TO "payment_reference";
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "payment_cross_reference" TEXT;
ALTER TABLE "orders" ALTER COLUMN "status" SET DEFAULT 'pending';
