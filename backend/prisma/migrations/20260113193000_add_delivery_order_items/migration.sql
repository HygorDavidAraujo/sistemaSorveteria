-- Add delivery_order_items table to persist delivery order line items

CREATE TABLE IF NOT EXISTS "delivery_order_items" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "delivery_order_id" uuid NOT NULL,
  "product_id" uuid NOT NULL,
  "product_name" varchar(255) NOT NULL,
  "quantity" decimal(10,3) NOT NULL,
  "unit_price" decimal(10,2) NOT NULL,
  "cost_price" decimal(10,2),
  "subtotal" decimal(10,2) NOT NULL,
  "created_at" timestamptz(6) NOT NULL DEFAULT now(),

  CONSTRAINT "delivery_order_items_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "delivery_order_items_delivery_order_id_fkey" FOREIGN KEY ("delivery_order_id") REFERENCES "delivery_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "delivery_order_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "delivery_order_items_delivery_order_id_idx" ON "delivery_order_items"("delivery_order_id");
CREATE INDEX IF NOT EXISTS "delivery_order_items_product_id_idx" ON "delivery_order_items"("product_id");
