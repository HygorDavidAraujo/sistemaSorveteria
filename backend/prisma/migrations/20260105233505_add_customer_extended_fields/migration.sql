-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('male', 'female', 'other', 'not_specified');

-- CreateEnum
CREATE TYPE "CustomerType" AS ENUM ('pf', 'pj');

-- CreateEnum
CREATE TYPE "CustomerCategory" AS ENUM ('new', 'occasional', 'regular', 'frequent', 'vip');

-- AlterTable
ALTER TABLE "customers" ADD COLUMN "birth_date" DATE,
ADD COLUMN "gender" "Gender",
ADD COLUMN "customer_type" "CustomerType" NOT NULL DEFAULT 'pf',
ADD COLUMN "accepts_marketing" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "preferred_contact_method" VARCHAR(50),
ADD COLUMN "last_access_at" TIMESTAMPTZ(6),
ADD COLUMN "customer_category" "CustomerCategory" NOT NULL DEFAULT 'new';

-- CreateIndex
CREATE INDEX "idx_customers_category" ON "customers"("customer_category");

-- CreateIndex
CREATE INDEX "idx_customers_last_access" ON "customers"("last_access_at");
