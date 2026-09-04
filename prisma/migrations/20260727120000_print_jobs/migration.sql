-- CreateTable
CREATE TABLE "print_jobs" (
    "id" BIGSERIAL NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "order_id" BIGINT NOT NULL,
    "payment_reference" TEXT NOT NULL,
    "trade_no" TEXT NOT NULL,
    "printer_sn" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "is_reprint" BOOLEAN NOT NULL DEFAULT false,
    "attempt_count" INTEGER NOT NULL DEFAULT 0,
    "last_attempt_at" TIMESTAMP(3),
    "next_retry_at" TIMESTAMP(3),
    "sunmi_code" TEXT,
    "sunmi_msg" TEXT,
    "last_error" TEXT,

    CONSTRAINT "print_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "print_jobs_trade_no_key" ON "print_jobs"("trade_no");

-- CreateIndex
CREATE INDEX "print_jobs_payment_reference_idx" ON "print_jobs"("payment_reference");

-- CreateIndex
CREATE INDEX "print_jobs_status_next_retry_at_idx" ON "print_jobs"("status", "next_retry_at");

-- CreateIndex
CREATE INDEX "print_jobs_order_id_idx" ON "print_jobs"("order_id");

-- AddForeignKey
ALTER TABLE "print_jobs" ADD CONSTRAINT "print_jobs_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
