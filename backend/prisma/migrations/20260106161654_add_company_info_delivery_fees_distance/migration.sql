/*
  Warnings:

  - You are about to drop the column `customer_address_id` on the `delivery_orders` table. All the data in the column will be lost.
  - You are about to drop the `customer_addresses` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "FeeType" AS ENUM ('neighborhood', 'distance');

-- DropForeignKey
ALTER TABLE "customer_addresses" DROP CONSTRAINT "customer_addresses_customer_id_fkey";

-- DropForeignKey
ALTER TABLE "delivery_orders" DROP CONSTRAINT "delivery_orders_customer_address_id_fkey";

-- AlterTable
ALTER TABLE "customers" ADD COLUMN     "city" VARCHAR(100),
ADD COLUMN     "complement" VARCHAR(255),
ADD COLUMN     "neighborhood" VARCHAR(100),
ADD COLUMN     "number" VARCHAR(20),
ADD COLUMN     "reference_point" TEXT,
ADD COLUMN     "state" VARCHAR(2),
ADD COLUMN     "street" VARCHAR(255),
ADD COLUMN     "zip_code" VARCHAR(10),
ALTER COLUMN "customer_type" DROP NOT NULL;

-- AlterTable
ALTER TABLE "delivery_fees" ADD COLUMN     "base_fee" DECIMAL(10,2),
ADD COLUMN     "fee_per_km" DECIMAL(10,2),
ADD COLUMN     "fee_type" "FeeType" NOT NULL DEFAULT 'neighborhood',
ADD COLUMN     "max_distance" DOUBLE PRECISION,
ALTER COLUMN "neighborhood" DROP NOT NULL,
ALTER COLUMN "city" DROP NOT NULL;

-- AlterTable
ALTER TABLE "delivery_orders" DROP COLUMN "customer_address_id";

-- DropTable
DROP TABLE "customer_addresses";

-- CreateTable
CREATE TABLE "company_info" (
    "id" UUID NOT NULL,
    "cnpj" VARCHAR(18) NOT NULL,
    "business_name" VARCHAR(255) NOT NULL,
    "trade_name" VARCHAR(255) NOT NULL,
    "state_registration" VARCHAR(50),
    "municipal_registration" VARCHAR(50),
    "street" VARCHAR(255) NOT NULL,
    "number" VARCHAR(20) NOT NULL,
    "complement" VARCHAR(255),
    "neighborhood" VARCHAR(100) NOT NULL,
    "city" VARCHAR(100) NOT NULL,
    "state" VARCHAR(2) NOT NULL,
    "zip_code" VARCHAR(10) NOT NULL,
    "email" VARCHAR(255),
    "phone" VARCHAR(20),
    "whatsapp" VARCHAR(20),
    "logo_url" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "company_info_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "company_info_cnpj_key" ON "company_info"("cnpj");

-- RenameIndex
ALTER INDEX "idx_customers_category" RENAME TO "customers_customer_category_idx";

-- RenameIndex
ALTER INDEX "idx_customers_last_access" RENAME TO "customers_last_access_at_idx";
