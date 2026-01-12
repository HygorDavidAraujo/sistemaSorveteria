-- AlterTable
ALTER TABLE "comandas" ADD COLUMN     "additional_fee" DECIMAL(10,2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "delivery_orders" ADD COLUMN     "additional_fee" DECIMAL(10,2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "sales" ADD COLUMN     "additional_fee" DECIMAL(10,2) NOT NULL DEFAULT 0;
