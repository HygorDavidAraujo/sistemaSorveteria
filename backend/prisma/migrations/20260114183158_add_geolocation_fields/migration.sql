-- AlterTable
ALTER TABLE "company_info" ADD COLUMN     "latitude" DOUBLE PRECISION,
ADD COLUMN     "longitude" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "customers" ADD COLUMN     "latitude" DOUBLE PRECISION,
ADD COLUMN     "longitude" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "delivery_order_items" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "delivery_orders" ADD COLUMN     "delivery_latitude" DOUBLE PRECISION,
ADD COLUMN     "delivery_longitude" DOUBLE PRECISION,
ADD COLUMN     "distance_km" DECIMAL(8,2);
