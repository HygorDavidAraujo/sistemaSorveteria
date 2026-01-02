/*
  Warnings:

  - You are about to drop the column `cashback_type` on the `cashback_config` table. All the data in the column will be lost.
  - You are about to drop the column `min_purchase_value` on the `cashback_config` table. All the data in the column will be lost.
  - You are about to drop the column `min_points_redemption` on the `loyalty_config` table. All the data in the column will be lost.
  - You are about to drop the column `min_purchase_value` on the `loyalty_config` table. All the data in the column will be lost.
  - You are about to drop the column `points_to_real_ratio` on the `loyalty_config` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "cashback_config" DROP COLUMN "cashback_type",
DROP COLUMN "min_purchase_value",
ADD COLUMN     "apply_to_all_products" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "min_cashback_to_use" DECIMAL(10,2) NOT NULL DEFAULT 5,
ADD COLUMN     "min_purchase_for_cashback" DECIMAL(10,2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "loyalty_config" DROP COLUMN "min_points_redemption",
DROP COLUMN "min_purchase_value",
DROP COLUMN "points_to_real_ratio",
ADD COLUMN     "apply_to_all_products" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "min_points_to_redeem" INTEGER NOT NULL DEFAULT 100,
ADD COLUMN     "min_purchase_for_points" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "points_redemption_value" DECIMAL(5,4) NOT NULL DEFAULT 0.01;
