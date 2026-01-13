-- CreateTable
CREATE TABLE "payment_method_configs" (
    "id" UUID NOT NULL,
    "payment_method" "PaymentMethod" NOT NULL,
    "fee_percent" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "settlement_days" INTEGER,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "payment_method_configs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "payment_method_configs_payment_method_key" ON "payment_method_configs"("payment_method");
