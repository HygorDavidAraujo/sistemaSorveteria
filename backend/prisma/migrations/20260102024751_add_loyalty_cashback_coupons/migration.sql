-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('admin', 'manager', 'cashier');

-- CreateEnum
CREATE TYPE "SaleType" AS ENUM ('unit', 'weight');

-- CreateEnum
CREATE TYPE "CashSessionStatus" AS ENUM ('open', 'cashier_closed', 'manager_closed');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('pdv', 'comanda', 'delivery');

-- CreateEnum
CREATE TYPE "SaleStatus" AS ENUM ('completed', 'cancelled', 'adjusted');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('cash', 'debit_card', 'credit_card', 'pix', 'other');

-- CreateEnum
CREATE TYPE "AdjustmentType" AS ENUM ('reopening', 'cancellation', 'value_correction', 'item_change');

-- CreateEnum
CREATE TYPE "ComandaStatus" AS ENUM ('open', 'closed', 'cancelled');

-- CreateEnum
CREATE TYPE "DeliveryStatus" AS ENUM ('received', 'preparing', 'out_for_delivery', 'delivered', 'cancelled');

-- CreateEnum
CREATE TYPE "LoyaltyTransactionType" AS ENUM ('earn', 'redeem', 'expire', 'adjustment', 'manual');

-- CreateEnum
CREATE TYPE "CashbackTransactionType" AS ENUM ('earn', 'redeem', 'expire', 'adjustment', 'manual');

-- CreateEnum
CREATE TYPE "CouponType" AS ENUM ('percentage', 'fixed_value');

-- CreateEnum
CREATE TYPE "CouponStatus" AS ENUM ('active', 'inactive', 'expired');

-- CreateEnum
CREATE TYPE "CategoryType" AS ENUM ('revenue', 'cost', 'expense');

-- CreateEnum
CREATE TYPE "TransactionFinancialType" AS ENUM ('revenue', 'expense', 'transfer');

-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('pending', 'paid', 'cancelled', 'overdue');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "full_name" VARCHAR(255) NOT NULL,
    "role" "UserRole" NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_login_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "created_by" UUID,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token" VARCHAR(500) NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customers" (
    "id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "phone" VARCHAR(20),
    "whatsapp" VARCHAR(20),
    "email" VARCHAR(255),
    "cpf" VARCHAR(14),
    "notes" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "total_purchases" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "purchase_count" INTEGER NOT NULL DEFAULT 0,
    "loyalty_points" INTEGER NOT NULL DEFAULT 0,
    "cashback_balance" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "total_cashback_earned" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "created_by" UUID,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_addresses" (
    "id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "label" VARCHAR(100),
    "street" VARCHAR(255) NOT NULL,
    "number" VARCHAR(20),
    "complement" VARCHAR(255),
    "neighborhood" VARCHAR(100),
    "city" VARCHAR(100) NOT NULL,
    "state" VARCHAR(2) NOT NULL,
    "zip_code" VARCHAR(10),
    "reference_point" TEXT,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_addresses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" UUID NOT NULL,
    "category_id" UUID,
    "code" VARCHAR(50),
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "sale_price" DECIMAL(10,2) NOT NULL,
    "cost_price" DECIMAL(10,2),
    "sale_type" "SaleType" NOT NULL,
    "unit" VARCHAR(20),
    "eligible_for_loyalty" BOOLEAN NOT NULL DEFAULT false,
    "loyalty_points_multiplier" DECIMAL(5,2) NOT NULL DEFAULT 1.0,
    "track_stock" BOOLEAN NOT NULL DEFAULT false,
    "current_stock" DECIMAL(10,3) NOT NULL DEFAULT 0,
    "min_stock" DECIMAL(10,3) NOT NULL DEFAULT 0,
    "cashback_percentage" DECIMAL(5,2),
    "earns_cashback" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "created_by" UUID,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_costs" (
    "id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "cost_price" DECIMAL(10,2) NOT NULL,
    "valid_from" TIMESTAMPTZ(6) NOT NULL,
    "valid_to" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,

    CONSTRAINT "product_costs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cash_sessions" (
    "id" UUID NOT NULL,
    "session_number" SERIAL NOT NULL,
    "terminal_id" VARCHAR(50),
    "opened_by" UUID NOT NULL,
    "opened_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "initial_cash" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "opening_notes" TEXT,
    "cashier_closed_at" TIMESTAMPTZ(6),
    "cashier_closed_by" UUID,
    "cashier_cash_count" DECIMAL(10,2),
    "cashier_difference" DECIMAL(10,2),
    "cashier_notes" TEXT,
    "manager_closed_at" TIMESTAMPTZ(6),
    "manager_closed_by" UUID,
    "manager_validated" BOOLEAN NOT NULL DEFAULT false,
    "manager_notes" TEXT,
    "total_sales" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "total_cash" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "total_card" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "total_pix" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "total_other" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "status" "CashSessionStatus" NOT NULL DEFAULT 'open',

    CONSTRAINT "cash_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cash_session_payments" (
    "id" UUID NOT NULL,
    "cash_session_id" UUID NOT NULL,
    "payment_method" "PaymentMethod" NOT NULL,
    "expected_amount" DECIMAL(10,2) NOT NULL,
    "counted_amount" DECIMAL(10,2),
    "difference" DECIMAL(10,2),

    CONSTRAINT "cash_session_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales" (
    "id" UUID NOT NULL,
    "sale_number" SERIAL NOT NULL,
    "cash_session_id" UUID NOT NULL,
    "customer_id" UUID,
    "sale_type" "TransactionType" NOT NULL,
    "subtotal" DECIMAL(10,2) NOT NULL,
    "discount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "delivery_fee" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(10,2) NOT NULL,
    "loyalty_points_used" INTEGER NOT NULL DEFAULT 0,
    "loyalty_points_earned" INTEGER NOT NULL DEFAULT 0,
    "status" "SaleStatus" NOT NULL DEFAULT 'completed',
    "sale_date" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID NOT NULL,
    "is_adjusted" BOOLEAN NOT NULL DEFAULT false,
    "adjustment_reason" TEXT,
    "adjusted_at" TIMESTAMPTZ(6),
    "adjusted_by" UUID,

    CONSTRAINT "sales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sale_items" (
    "id" UUID NOT NULL,
    "sale_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "product_name" VARCHAR(255) NOT NULL,
    "quantity" DECIMAL(10,3) NOT NULL,
    "unit_price" DECIMAL(10,2) NOT NULL,
    "cost_price" DECIMAL(10,2),
    "subtotal" DECIMAL(10,2) NOT NULL,
    "discount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(10,2) NOT NULL,
    "loyalty_points_earned" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sale_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" UUID NOT NULL,
    "sale_id" UUID NOT NULL,
    "payment_method" "PaymentMethod" NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "card_brand" VARCHAR(50),
    "card_last_digits" VARCHAR(4),
    "installments" INTEGER NOT NULL DEFAULT 1,
    "pix_key" VARCHAR(255),
    "pix_transaction_id" VARCHAR(255),
    "transaction_date" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sale_adjustments" (
    "id" UUID NOT NULL,
    "sale_id" UUID NOT NULL,
    "adjustment_type" "AdjustmentType" NOT NULL,
    "reason" TEXT NOT NULL,
    "old_total" DECIMAL(10,2),
    "new_total" DECIMAL(10,2),
    "old_data" JSONB,
    "new_data" JSONB,
    "adjusted_by" UUID NOT NULL,
    "adjusted_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approved_by" UUID,

    CONSTRAINT "sale_adjustments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comandas" (
    "id" UUID NOT NULL,
    "comanda_number" INTEGER NOT NULL,
    "table_number" VARCHAR(20),
    "customer_name" VARCHAR(255),
    "customer_id" UUID,
    "cash_session_id" UUID NOT NULL,
    "subtotal" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "discount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "status" "ComandaStatus" NOT NULL DEFAULT 'open',
    "opened_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "opened_by" UUID NOT NULL,
    "closed_at" TIMESTAMPTZ(6),
    "closed_by" UUID,
    "is_adjusted" BOOLEAN NOT NULL DEFAULT false,
    "adjustment_reason" TEXT,

    CONSTRAINT "comandas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comanda_items" (
    "id" UUID NOT NULL,
    "comanda_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "product_name" VARCHAR(255) NOT NULL,
    "quantity" DECIMAL(10,3) NOT NULL,
    "unit_price" DECIMAL(10,2) NOT NULL,
    "cost_price" DECIMAL(10,2),
    "subtotal" DECIMAL(10,2) NOT NULL,
    "added_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "added_by" UUID NOT NULL,
    "is_cancelled" BOOLEAN NOT NULL DEFAULT false,
    "cancelled_at" TIMESTAMPTZ(6),
    "cancelled_by" UUID,
    "cancellation_reason" TEXT,

    CONSTRAINT "comanda_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comanda_payments" (
    "id" UUID NOT NULL,
    "comanda_id" UUID NOT NULL,
    "payment_method" "PaymentMethod" NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "transaction_date" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "comanda_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "delivery_orders" (
    "id" UUID NOT NULL,
    "order_number" SERIAL NOT NULL,
    "customer_id" UUID NOT NULL,
    "customer_address_id" UUID NOT NULL,
    "cash_session_id" UUID NOT NULL,
    "subtotal" DECIMAL(10,2) NOT NULL,
    "delivery_fee" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "discount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(10,2) NOT NULL,
    "delivery_status" "DeliveryStatus" NOT NULL DEFAULT 'received',
    "estimated_time" INTEGER,
    "delivery_person" VARCHAR(255),
    "customer_notes" TEXT,
    "internal_notes" TEXT,
    "ordered_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "preparing_at" TIMESTAMPTZ(6),
    "out_for_delivery_at" TIMESTAMPTZ(6),
    "delivered_at" TIMESTAMPTZ(6),
    "created_by" UUID NOT NULL,

    CONSTRAINT "delivery_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "delivery_fees" (
    "id" UUID NOT NULL,
    "neighborhood" VARCHAR(100) NOT NULL,
    "city" VARCHAR(100) NOT NULL,
    "fee" DECIMAL(10,2) NOT NULL,
    "min_order_value" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "free_delivery_above" DECIMAL(10,2),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "delivery_fees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "loyalty_config" (
    "id" UUID NOT NULL,
    "points_per_real" DECIMAL(5,2) NOT NULL,
    "min_purchase_value" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "points_expiration_days" INTEGER,
    "points_to_real_ratio" DECIMAL(5,2) NOT NULL,
    "min_points_redemption" INTEGER NOT NULL DEFAULT 100,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "loyalty_config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cashback_config" (
    "id" UUID NOT NULL,
    "cashback_type" VARCHAR(20) NOT NULL,
    "cashback_percentage" DECIMAL(5,2) NOT NULL,
    "min_purchase_value" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "max_cashback_per_purchase" DECIMAL(10,2),
    "cashback_expiration_days" INTEGER,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "cashback_config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cashback_transactions" (
    "id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "transaction_type" "CashbackTransactionType" NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "balance_after" DECIMAL(10,2) NOT NULL,
    "sale_id" UUID,
    "comanda_id" UUID,
    "delivery_order_id" UUID,
    "description" TEXT,
    "expires_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,

    CONSTRAINT "cashback_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "coupons" (
    "id" UUID NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "description" TEXT,
    "coupon_type" "CouponType" NOT NULL,
    "discount_value" DECIMAL(10,2) NOT NULL,
    "min_purchase_value" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "max_discount" DECIMAL(10,2),
    "usage_limit" INTEGER,
    "usage_count" INTEGER NOT NULL DEFAULT 0,
    "valid_from" TIMESTAMPTZ(6) NOT NULL,
    "valid_to" TIMESTAMPTZ(6),
    "status" "CouponStatus" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "created_by" UUID NOT NULL,

    CONSTRAINT "coupons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "coupon_usages" (
    "id" UUID NOT NULL,
    "coupon_id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "sale_id" UUID,
    "comanda_id" UUID,
    "delivery_order_id" UUID,
    "discount_applied" DECIMAL(10,2) NOT NULL,
    "used_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "coupon_usages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "loyalty_rewards" (
    "id" UUID NOT NULL,
    "product_id" UUID,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "points_required" INTEGER NOT NULL,
    "quantity_available" INTEGER,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "loyalty_rewards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "loyalty_transactions" (
    "id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "transaction_type" "LoyaltyTransactionType" NOT NULL,
    "points" INTEGER NOT NULL,
    "balance_after" INTEGER NOT NULL,
    "sale_id" UUID,
    "reward_id" UUID,
    "description" TEXT,
    "expires_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,

    CONSTRAINT "loyalty_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "financial_categories" (
    "id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "category_type" "CategoryType" NOT NULL,
    "dre_group" VARCHAR(50),
    "parent_category_id" UUID,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "financial_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "financial_transactions" (
    "id" UUID NOT NULL,
    "category_id" UUID NOT NULL,
    "transaction_type" "TransactionFinancialType" NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "description" TEXT NOT NULL,
    "reference_number" VARCHAR(100),
    "transaction_date" DATE NOT NULL,
    "due_date" DATE,
    "paid_at" TIMESTAMPTZ(6),
    "status" "TransactionStatus" NOT NULL DEFAULT 'pending',
    "sale_id" UUID,
    "comanda_id" UUID,
    "delivery_order_id" UUID,
    "tags" TEXT[],
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID NOT NULL,

    CONSTRAINT "financial_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounts_payable" (
    "id" UUID NOT NULL,
    "supplier_name" VARCHAR(255) NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "due_date" DATE NOT NULL,
    "paid_at" TIMESTAMPTZ(6),
    "financial_category_id" UUID NOT NULL,
    "status" "TransactionStatus" NOT NULL DEFAULT 'pending',
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID NOT NULL,

    CONSTRAINT "accounts_payable_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounts_receivable" (
    "id" UUID NOT NULL,
    "customer_id" UUID,
    "customer_name" VARCHAR(255) NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "due_date" DATE NOT NULL,
    "received_at" TIMESTAMPTZ(6),
    "sale_id" UUID,
    "status" "TransactionStatus" NOT NULL DEFAULT 'pending',
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID NOT NULL,

    CONSTRAINT "accounts_receivable_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "user_id" UUID,
    "user_email" VARCHAR(255),
    "action" VARCHAR(100) NOT NULL,
    "entity_type" VARCHAR(100) NOT NULL,
    "entity_id" UUID,
    "description" TEXT,
    "old_values" JSONB,
    "new_values" JSONB,
    "ip_address" VARCHAR(50),
    "user_agent" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_key" ON "refresh_tokens"("token");

-- CreateIndex
CREATE INDEX "refresh_tokens_user_id_idx" ON "refresh_tokens"("user_id");

-- CreateIndex
CREATE INDEX "refresh_tokens_expires_at_idx" ON "refresh_tokens"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "customers_cpf_key" ON "customers"("cpf");

-- CreateIndex
CREATE INDEX "customers_name_idx" ON "customers"("name");

-- CreateIndex
CREATE INDEX "customers_phone_idx" ON "customers"("phone");

-- CreateIndex
CREATE INDEX "customers_cpf_idx" ON "customers"("cpf");

-- CreateIndex
CREATE INDEX "customers_is_active_idx" ON "customers"("is_active");

-- CreateIndex
CREATE INDEX "customer_addresses_customer_id_idx" ON "customer_addresses"("customer_id");

-- CreateIndex
CREATE UNIQUE INDEX "categories_name_key" ON "categories"("name");

-- CreateIndex
CREATE UNIQUE INDEX "products_code_key" ON "products"("code");

-- CreateIndex
CREATE INDEX "products_name_idx" ON "products"("name");

-- CreateIndex
CREATE INDEX "products_code_idx" ON "products"("code");

-- CreateIndex
CREATE INDEX "products_category_id_idx" ON "products"("category_id");

-- CreateIndex
CREATE INDEX "products_is_active_idx" ON "products"("is_active");

-- CreateIndex
CREATE INDEX "product_costs_product_id_idx" ON "product_costs"("product_id");

-- CreateIndex
CREATE INDEX "product_costs_valid_from_valid_to_idx" ON "product_costs"("valid_from", "valid_to");

-- CreateIndex
CREATE INDEX "cash_sessions_status_idx" ON "cash_sessions"("status");

-- CreateIndex
CREATE INDEX "cash_sessions_opened_at_manager_closed_at_idx" ON "cash_sessions"("opened_at", "manager_closed_at");

-- CreateIndex
CREATE INDEX "cash_sessions_terminal_id_idx" ON "cash_sessions"("terminal_id");

-- CreateIndex
CREATE INDEX "cash_session_payments_cash_session_id_idx" ON "cash_session_payments"("cash_session_id");

-- CreateIndex
CREATE INDEX "sales_sale_date_idx" ON "sales"("sale_date");

-- CreateIndex
CREATE INDEX "sales_customer_id_idx" ON "sales"("customer_id");

-- CreateIndex
CREATE INDEX "sales_cash_session_id_idx" ON "sales"("cash_session_id");

-- CreateIndex
CREATE INDEX "sales_sale_type_idx" ON "sales"("sale_type");

-- CreateIndex
CREATE INDEX "sales_status_idx" ON "sales"("status");

-- CreateIndex
CREATE INDEX "sale_items_sale_id_idx" ON "sale_items"("sale_id");

-- CreateIndex
CREATE INDEX "sale_items_product_id_idx" ON "sale_items"("product_id");

-- CreateIndex
CREATE INDEX "payments_sale_id_idx" ON "payments"("sale_id");

-- CreateIndex
CREATE INDEX "payments_payment_method_idx" ON "payments"("payment_method");

-- CreateIndex
CREATE INDEX "sale_adjustments_sale_id_idx" ON "sale_adjustments"("sale_id");

-- CreateIndex
CREATE INDEX "sale_adjustments_adjusted_at_idx" ON "sale_adjustments"("adjusted_at");

-- CreateIndex
CREATE INDEX "comandas_status_idx" ON "comandas"("status");

-- CreateIndex
CREATE INDEX "comandas_comanda_number_idx" ON "comandas"("comanda_number");

-- CreateIndex
CREATE INDEX "comandas_customer_id_idx" ON "comandas"("customer_id");

-- CreateIndex
CREATE INDEX "comandas_opened_at_idx" ON "comandas"("opened_at");

-- CreateIndex
CREATE UNIQUE INDEX "comandas_comanda_number_opened_at_key" ON "comandas"("comanda_number", "opened_at");

-- CreateIndex
CREATE INDEX "comanda_items_comanda_id_idx" ON "comanda_items"("comanda_id");

-- CreateIndex
CREATE INDEX "comanda_items_product_id_idx" ON "comanda_items"("product_id");

-- CreateIndex
CREATE INDEX "comanda_payments_comanda_id_idx" ON "comanda_payments"("comanda_id");

-- CreateIndex
CREATE INDEX "delivery_orders_customer_id_idx" ON "delivery_orders"("customer_id");

-- CreateIndex
CREATE INDEX "delivery_orders_delivery_status_idx" ON "delivery_orders"("delivery_status");

-- CreateIndex
CREATE INDEX "delivery_orders_ordered_at_idx" ON "delivery_orders"("ordered_at");

-- CreateIndex
CREATE INDEX "delivery_fees_city_neighborhood_idx" ON "delivery_fees"("city", "neighborhood");

-- CreateIndex
CREATE UNIQUE INDEX "idx_loyalty_config_active" ON "loyalty_config"("is_active");

-- CreateIndex
CREATE INDEX "cashback_transactions_customer_id_idx" ON "cashback_transactions"("customer_id");

-- CreateIndex
CREATE INDEX "cashback_transactions_created_at_idx" ON "cashback_transactions"("created_at");

-- CreateIndex
CREATE INDEX "cashback_transactions_expires_at_idx" ON "cashback_transactions"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "coupons_code_key" ON "coupons"("code");

-- CreateIndex
CREATE INDEX "coupons_code_idx" ON "coupons"("code");

-- CreateIndex
CREATE INDEX "coupons_status_idx" ON "coupons"("status");

-- CreateIndex
CREATE INDEX "coupons_valid_from_valid_to_idx" ON "coupons"("valid_from", "valid_to");

-- CreateIndex
CREATE INDEX "coupon_usages_coupon_id_idx" ON "coupon_usages"("coupon_id");

-- CreateIndex
CREATE INDEX "coupon_usages_customer_id_idx" ON "coupon_usages"("customer_id");

-- CreateIndex
CREATE INDEX "coupon_usages_used_at_idx" ON "coupon_usages"("used_at");

-- CreateIndex
CREATE INDEX "loyalty_rewards_is_active_idx" ON "loyalty_rewards"("is_active");

-- CreateIndex
CREATE INDEX "loyalty_transactions_customer_id_idx" ON "loyalty_transactions"("customer_id");

-- CreateIndex
CREATE INDEX "loyalty_transactions_created_at_idx" ON "loyalty_transactions"("created_at");

-- CreateIndex
CREATE INDEX "loyalty_transactions_expires_at_idx" ON "loyalty_transactions"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "financial_categories_name_key" ON "financial_categories"("name");

-- CreateIndex
CREATE INDEX "financial_categories_category_type_idx" ON "financial_categories"("category_type");

-- CreateIndex
CREATE UNIQUE INDEX "financial_transactions_sale_id_key" ON "financial_transactions"("sale_id");

-- CreateIndex
CREATE INDEX "financial_transactions_transaction_date_idx" ON "financial_transactions"("transaction_date");

-- CreateIndex
CREATE INDEX "financial_transactions_category_id_idx" ON "financial_transactions"("category_id");

-- CreateIndex
CREATE INDEX "financial_transactions_transaction_type_idx" ON "financial_transactions"("transaction_type");

-- CreateIndex
CREATE INDEX "financial_transactions_status_idx" ON "financial_transactions"("status");

-- CreateIndex
CREATE INDEX "accounts_payable_due_date_idx" ON "accounts_payable"("due_date");

-- CreateIndex
CREATE INDEX "accounts_payable_status_idx" ON "accounts_payable"("status");

-- CreateIndex
CREATE UNIQUE INDEX "accounts_receivable_sale_id_key" ON "accounts_receivable"("sale_id");

-- CreateIndex
CREATE INDEX "accounts_receivable_due_date_idx" ON "accounts_receivable"("due_date");

-- CreateIndex
CREATE INDEX "accounts_receivable_customer_id_idx" ON "accounts_receivable"("customer_id");

-- CreateIndex
CREATE INDEX "accounts_receivable_status_idx" ON "accounts_receivable"("status");

-- CreateIndex
CREATE INDEX "audit_logs_user_id_idx" ON "audit_logs"("user_id");

-- CreateIndex
CREATE INDEX "audit_logs_entity_type_entity_id_idx" ON "audit_logs"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_addresses" ADD CONSTRAINT "customer_addresses_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_costs" ADD CONSTRAINT "product_costs_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_costs" ADD CONSTRAINT "product_costs_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_sessions" ADD CONSTRAINT "cash_sessions_cashier_closed_by_fkey" FOREIGN KEY ("cashier_closed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_sessions" ADD CONSTRAINT "cash_sessions_manager_closed_by_fkey" FOREIGN KEY ("manager_closed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_sessions" ADD CONSTRAINT "cash_sessions_opened_by_fkey" FOREIGN KEY ("opened_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_session_payments" ADD CONSTRAINT "cash_session_payments_cash_session_id_fkey" FOREIGN KEY ("cash_session_id") REFERENCES "cash_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales" ADD CONSTRAINT "sales_cash_session_id_fkey" FOREIGN KEY ("cash_session_id") REFERENCES "cash_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales" ADD CONSTRAINT "sales_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales" ADD CONSTRAINT "sales_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_items" ADD CONSTRAINT "sale_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_items" ADD CONSTRAINT "sale_items_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "sales"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "sales"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_adjustments" ADD CONSTRAINT "sale_adjustments_adjusted_by_fkey" FOREIGN KEY ("adjusted_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_adjustments" ADD CONSTRAINT "sale_adjustments_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "sales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comandas" ADD CONSTRAINT "comandas_cash_session_id_fkey" FOREIGN KEY ("cash_session_id") REFERENCES "cash_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comandas" ADD CONSTRAINT "comandas_closed_by_fkey" FOREIGN KEY ("closed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comandas" ADD CONSTRAINT "comandas_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comandas" ADD CONSTRAINT "comandas_opened_by_fkey" FOREIGN KEY ("opened_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comanda_items" ADD CONSTRAINT "comanda_items_added_by_fkey" FOREIGN KEY ("added_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comanda_items" ADD CONSTRAINT "comanda_items_comanda_id_fkey" FOREIGN KEY ("comanda_id") REFERENCES "comandas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comanda_items" ADD CONSTRAINT "comanda_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comanda_payments" ADD CONSTRAINT "comanda_payments_comanda_id_fkey" FOREIGN KEY ("comanda_id") REFERENCES "comandas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_orders" ADD CONSTRAINT "delivery_orders_cash_session_id_fkey" FOREIGN KEY ("cash_session_id") REFERENCES "cash_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_orders" ADD CONSTRAINT "delivery_orders_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_orders" ADD CONSTRAINT "delivery_orders_customer_address_id_fkey" FOREIGN KEY ("customer_address_id") REFERENCES "customer_addresses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_orders" ADD CONSTRAINT "delivery_orders_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cashback_transactions" ADD CONSTRAINT "cashback_transactions_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cashback_transactions" ADD CONSTRAINT "cashback_transactions_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coupons" ADD CONSTRAINT "coupons_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coupon_usages" ADD CONSTRAINT "coupon_usages_coupon_id_fkey" FOREIGN KEY ("coupon_id") REFERENCES "coupons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coupon_usages" ADD CONSTRAINT "coupon_usages_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loyalty_rewards" ADD CONSTRAINT "loyalty_rewards_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loyalty_transactions" ADD CONSTRAINT "loyalty_transactions_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loyalty_transactions" ADD CONSTRAINT "loyalty_transactions_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loyalty_transactions" ADD CONSTRAINT "loyalty_transactions_reward_id_fkey" FOREIGN KEY ("reward_id") REFERENCES "loyalty_rewards"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_categories" ADD CONSTRAINT "financial_categories_parent_category_id_fkey" FOREIGN KEY ("parent_category_id") REFERENCES "financial_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_transactions" ADD CONSTRAINT "financial_transactions_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "financial_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_transactions" ADD CONSTRAINT "financial_transactions_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_transactions" ADD CONSTRAINT "financial_transactions_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "sales"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounts_payable" ADD CONSTRAINT "accounts_payable_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounts_payable" ADD CONSTRAINT "accounts_payable_financial_category_id_fkey" FOREIGN KEY ("financial_category_id") REFERENCES "financial_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounts_receivable" ADD CONSTRAINT "accounts_receivable_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounts_receivable" ADD CONSTRAINT "accounts_receivable_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounts_receivable" ADD CONSTRAINT "accounts_receivable_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "sales"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
