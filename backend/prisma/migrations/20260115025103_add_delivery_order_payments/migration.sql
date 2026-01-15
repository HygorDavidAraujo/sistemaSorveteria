-- CreateTable
CREATE TABLE "delivery_order_payments" (
    "id" UUID NOT NULL,
    "delivery_order_id" UUID NOT NULL,
    "payment_method" "PaymentMethod" NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "delivery_order_payments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "delivery_order_payments_delivery_order_id_idx" ON "delivery_order_payments"("delivery_order_id");

-- AddForeignKey
ALTER TABLE "delivery_order_payments" ADD CONSTRAINT "delivery_order_payments_delivery_order_id_fkey" FOREIGN KEY ("delivery_order_id") REFERENCES "delivery_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
