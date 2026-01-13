-- CreateEnum
CREATE TYPE "ProductCategoryType" AS ENUM ('common', 'assembled');

-- AlterTable
ALTER TABLE "categories" ADD COLUMN     "category_type" "ProductCategoryType" NOT NULL DEFAULT 'common';

-- CreateTable
CREATE TABLE "category_sizes" (
    "id" UUID NOT NULL,
    "category_id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "max_flavors" INTEGER NOT NULL DEFAULT 1,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "category_sizes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_size_prices" (
    "id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "category_size_id" UUID NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "product_size_prices_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "category_sizes_category_id_idx" ON "category_sizes"("category_id");

-- CreateIndex
CREATE INDEX "category_sizes_display_order_idx" ON "category_sizes"("display_order");

-- CreateIndex
CREATE UNIQUE INDEX "category_sizes_category_id_name_key" ON "category_sizes"("category_id", "name");

-- CreateIndex
CREATE INDEX "product_size_prices_product_id_idx" ON "product_size_prices"("product_id");

-- CreateIndex
CREATE INDEX "product_size_prices_category_size_id_idx" ON "product_size_prices"("category_size_id");

-- CreateIndex
CREATE UNIQUE INDEX "product_size_prices_product_id_category_size_id_key" ON "product_size_prices"("product_id", "category_size_id");

-- AddForeignKey
ALTER TABLE "category_sizes" ADD CONSTRAINT "category_sizes_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_size_prices" ADD CONSTRAINT "product_size_prices_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_size_prices" ADD CONSTRAINT "product_size_prices_category_size_id_fkey" FOREIGN KEY ("category_size_id") REFERENCES "category_sizes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
