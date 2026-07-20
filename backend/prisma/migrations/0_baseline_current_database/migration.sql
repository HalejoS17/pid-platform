-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "app";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "core";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "inventory";

-- CreateEnum
CREATE TYPE "app"."EntityStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "app"."OrganizationStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "core"."ProductType" AS ENUM ('INGREDIENT', 'PREPARED_ITEM', 'MENU_ITEM', 'BEVERAGE', 'PACKAGING', 'SUPPLY', 'OTHER');

-- CreateEnum
CREATE TYPE "core"."UnitDimension" AS ENUM ('COUNT', 'MASS', 'VOLUME', 'LENGTH', 'OTHER');

-- CreateEnum
CREATE TYPE "inventory"."InventoryMovementDirection" AS ENUM ('IN', 'OUT');

-- CreateEnum
CREATE TYPE "inventory"."InventoryMovementStatus" AS ENUM ('DRAFT', 'POSTED', 'VOIDED');

-- CreateEnum
CREATE TYPE "inventory"."InventoryMovementType" AS ENUM ('OPENING_BALANCE', 'PURCHASE_RECEIPT', 'PURCHASE_RETURN', 'TRANSFER', 'ADJUSTMENT', 'PRODUCTION_CONSUMPTION', 'PRODUCTION_OUTPUT', 'SALE_CONSUMPTION', 'WASTE', 'INVENTORY_COUNT');

-- CreateTable
CREATE TABLE "app"."branches" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID NOT NULL,
    "restaurant_id" UUID NOT NULL,
    "code" VARCHAR(30) NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "city" VARCHAR(100),
    "address" VARCHAR(250),
    "timezone" VARCHAR(60) NOT NULL DEFAULT 'America/Guayaquil',
    "status" "app"."EntityStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "branches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app"."organizations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(150) NOT NULL,
    "slug" VARCHAR(100) NOT NULL,
    "status" "app"."OrganizationStatus" NOT NULL DEFAULT 'ACTIVE',
    "timezone" VARCHAR(60) NOT NULL DEFAULT 'America/Guayaquil',
    "currency_code" CHAR(3) NOT NULL DEFAULT 'USD',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app"."restaurants" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID NOT NULL,
    "code" VARCHAR(30) NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "status" "app"."EntityStatus" NOT NULL DEFAULT 'ACTIVE',
    "timezone" VARCHAR(60) NOT NULL DEFAULT 'America/Guayaquil',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "restaurants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app"."warehouses" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID NOT NULL,
    "branch_id" UUID NOT NULL,
    "code" VARCHAR(30) NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "status" "app"."EntityStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "warehouses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "core"."product_categories" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID NOT NULL,
    "code" VARCHAR(30) NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "description" VARCHAR(250),
    "status" "app"."EntityStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "product_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "core"."product_unit_conversions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "unit_id" UUID NOT NULL,
    "factor_to_base" DECIMAL(18,6) NOT NULL,
    "is_purchase_unit" BOOLEAN NOT NULL DEFAULT false,
    "is_recipe_unit" BOOLEAN NOT NULL DEFAULT false,
    "status" "app"."EntityStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "product_unit_conversions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "core"."products" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID NOT NULL,
    "category_id" UUID NOT NULL,
    "base_unit_id" UUID NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "description" VARCHAR(250),
    "sku" VARCHAR(60),
    "barcode" VARCHAR(80),
    "type" "core"."ProductType" NOT NULL DEFAULT 'INGREDIENT',
    "track_inventory" BOOLEAN NOT NULL DEFAULT true,
    "status" "app"."EntityStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "core"."supplier_product_costs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID NOT NULL,
    "supplier_product_id" UUID NOT NULL,
    "unit_cost" DECIMAL(18,6) NOT NULL,
    "currency_code" CHAR(3) NOT NULL DEFAULT 'USD',
    "tax_included" BOOLEAN NOT NULL DEFAULT false,
    "effective_from" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effective_to" TIMESTAMPTZ(6),
    "notes" VARCHAR(250),
    "status" "app"."EntityStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "supplier_product_costs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "core"."supplier_products" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID NOT NULL,
    "supplier_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "purchase_unit_id" UUID NOT NULL,
    "supplier_sku" VARCHAR(80),
    "minimum_order_quantity" DECIMAL(18,6) NOT NULL DEFAULT 1,
    "lead_time_days" SMALLINT NOT NULL DEFAULT 0,
    "is_preferred" BOOLEAN NOT NULL DEFAULT false,
    "status" "app"."EntityStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "supplier_products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "core"."suppliers" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID NOT NULL,
    "code" VARCHAR(30) NOT NULL,
    "legal_name" VARCHAR(180) NOT NULL,
    "trade_name" VARCHAR(180),
    "tax_id" VARCHAR(30),
    "email" VARCHAR(150),
    "phone" VARCHAR(40),
    "city" VARCHAR(100),
    "address" VARCHAR(250),
    "payment_terms_days" SMALLINT NOT NULL DEFAULT 0,
    "status" "app"."EntityStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "core"."units_of_measure" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID NOT NULL,
    "code" VARCHAR(30) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "symbol" VARCHAR(20) NOT NULL,
    "dimension" "core"."UnitDimension" NOT NULL,
    "decimal_places" SMALLINT NOT NULL DEFAULT 3,
    "status" "app"."EntityStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "units_of_measure_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory"."inventory_balances" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID NOT NULL,
    "warehouse_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "quantity_on_hand" DECIMAL(18,6) NOT NULL DEFAULT 0,
    "quantity_reserved" DECIMAL(18,6) NOT NULL DEFAULT 0,
    "average_unit_cost" DECIMAL(18,6) NOT NULL DEFAULT 0,
    "version" INTEGER NOT NULL DEFAULT 0,
    "last_movement_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "inventory_balances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory"."inventory_movements" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID NOT NULL,
    "warehouse_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "unit_id" UUID NOT NULL,
    "type" "inventory"."InventoryMovementType" NOT NULL,
    "direction" "inventory"."InventoryMovementDirection" NOT NULL,
    "status" "inventory"."InventoryMovementStatus" NOT NULL DEFAULT 'DRAFT',
    "quantity" DECIMAL(18,6) NOT NULL,
    "factor_to_base" DECIMAL(18,6) NOT NULL,
    "base_quantity" DECIMAL(18,6) NOT NULL,
    "unit_cost" DECIMAL(18,6) NOT NULL DEFAULT 0,
    "total_cost" DECIMAL(18,6) NOT NULL DEFAULT 0,
    "balance_quantity_after" DECIMAL(18,6),
    "average_unit_cost_after" DECIMAL(18,6),
    "occurred_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "posted_at" TIMESTAMPTZ(6),
    "reference_type" VARCHAR(40),
    "reference_id" VARCHAR(80),
    "reference_number" VARCHAR(80),
    "transfer_group_id" UUID,
    "idempotency_key" VARCHAR(120),
    "notes" VARCHAR(500),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "inventory_movements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "branches_organization_id_id_key" ON "app"."branches"("organization_id" ASC, "id" ASC);

-- CreateIndex
CREATE INDEX "branches_organization_restaurant_status_idx" ON "app"."branches"("organization_id" ASC, "restaurant_id" ASC, "status" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "branches_restaurant_code_key" ON "app"."branches"("restaurant_id" ASC, "code" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "organizations_slug_key" ON "app"."organizations"("slug" ASC);

-- CreateIndex
CREATE INDEX "organizations_status_idx" ON "app"."organizations"("status" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "restaurants_organization_code_key" ON "app"."restaurants"("organization_id" ASC, "code" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "restaurants_organization_id_id_key" ON "app"."restaurants"("organization_id" ASC, "id" ASC);

-- CreateIndex
CREATE INDEX "restaurants_organization_status_idx" ON "app"."restaurants"("organization_id" ASC, "status" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "warehouses_branch_code_key" ON "app"."warehouses"("branch_id" ASC, "code" ASC);

-- CreateIndex
CREATE INDEX "warehouses_organization_branch_status_idx" ON "app"."warehouses"("organization_id" ASC, "branch_id" ASC, "status" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "warehouses_organization_id_id_key" ON "app"."warehouses"("organization_id" ASC, "id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "product_categories_org_code_key" ON "core"."product_categories"("organization_id" ASC, "code" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "product_categories_org_id_id_key" ON "core"."product_categories"("organization_id" ASC, "id" ASC);

-- CreateIndex
CREATE INDEX "product_categories_org_status_idx" ON "core"."product_categories"("organization_id" ASC, "status" ASC);

-- CreateIndex
CREATE INDEX "product_units_org_product_status_idx" ON "core"."product_unit_conversions"("organization_id" ASC, "product_id" ASC, "status" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "product_units_org_product_unit_key" ON "core"."product_unit_conversions"("organization_id" ASC, "product_id" ASC, "unit_id" ASC);

-- CreateIndex
CREATE INDEX "product_units_org_unit_idx" ON "core"."product_unit_conversions"("organization_id" ASC, "unit_id" ASC);

-- CreateIndex
CREATE INDEX "products_org_barcode_idx" ON "core"."products"("organization_id" ASC, "barcode" ASC);

-- CreateIndex
CREATE INDEX "products_org_base_unit_idx" ON "core"."products"("organization_id" ASC, "base_unit_id" ASC);

-- CreateIndex
CREATE INDEX "products_org_category_status_idx" ON "core"."products"("organization_id" ASC, "category_id" ASC, "status" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "products_org_code_key" ON "core"."products"("organization_id" ASC, "code" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "products_org_id_id_key" ON "core"."products"("organization_id" ASC, "id" ASC);

-- CreateIndex
CREATE INDEX "products_org_sku_idx" ON "core"."products"("organization_id" ASC, "sku" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "supplier_product_costs_one_open_active_idx" ON "core"."supplier_product_costs"("organization_id" ASC, "supplier_product_id" ASC);

-- CreateIndex
CREATE INDEX "supplier_product_costs_org_effective_from_idx" ON "core"."supplier_product_costs"("organization_id" ASC, "effective_from" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "supplier_product_costs_org_id_id_key" ON "core"."supplier_product_costs"("organization_id" ASC, "id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "supplier_product_costs_org_product_effective_key" ON "core"."supplier_product_costs"("organization_id" ASC, "supplier_product_id" ASC, "effective_from" ASC);

-- CreateIndex
CREATE INDEX "supplier_product_costs_org_product_status_date_idx" ON "core"."supplier_product_costs"("organization_id" ASC, "supplier_product_id" ASC, "status" ASC, "effective_from" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "supplier_products_one_preferred_per_product_idx" ON "core"."supplier_products"("organization_id" ASC, "product_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "supplier_products_org_id_id_key" ON "core"."supplier_products"("organization_id" ASC, "id" ASC);

-- CreateIndex
CREATE INDEX "supplier_products_org_product_status_idx" ON "core"."supplier_products"("organization_id" ASC, "product_id" ASC, "status" ASC);

-- CreateIndex
CREATE INDEX "supplier_products_org_purchase_unit_idx" ON "core"."supplier_products"("organization_id" ASC, "purchase_unit_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "supplier_products_org_supplier_product_unit_key" ON "core"."supplier_products"("organization_id" ASC, "supplier_id" ASC, "product_id" ASC, "purchase_unit_id" ASC);

-- CreateIndex
CREATE INDEX "supplier_products_org_supplier_sku_idx" ON "core"."supplier_products"("organization_id" ASC, "supplier_id" ASC, "supplier_sku" ASC);

-- CreateIndex
CREATE INDEX "supplier_products_org_supplier_status_idx" ON "core"."supplier_products"("organization_id" ASC, "supplier_id" ASC, "status" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "suppliers_org_code_key" ON "core"."suppliers"("organization_id" ASC, "code" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "suppliers_org_id_id_key" ON "core"."suppliers"("organization_id" ASC, "id" ASC);

-- CreateIndex
CREATE INDEX "suppliers_org_legal_name_idx" ON "core"."suppliers"("organization_id" ASC, "legal_name" ASC);

-- CreateIndex
CREATE INDEX "suppliers_org_status_idx" ON "core"."suppliers"("organization_id" ASC, "status" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "suppliers_org_tax_id_key" ON "core"."suppliers"("organization_id" ASC, "tax_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "units_org_code_key" ON "core"."units_of_measure"("organization_id" ASC, "code" ASC);

-- CreateIndex
CREATE INDEX "units_org_dimension_status_idx" ON "core"."units_of_measure"("organization_id" ASC, "dimension" ASC, "status" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "units_org_id_id_key" ON "core"."units_of_measure"("organization_id" ASC, "id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "inventory_balances_org_id_id_key" ON "inventory"."inventory_balances"("organization_id" ASC, "id" ASC);

-- CreateIndex
CREATE INDEX "inventory_balances_org_product_idx" ON "inventory"."inventory_balances"("organization_id" ASC, "product_id" ASC);

-- CreateIndex
CREATE INDEX "inventory_balances_org_warehouse_idx" ON "inventory"."inventory_balances"("organization_id" ASC, "warehouse_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "inventory_balances_org_warehouse_product_key" ON "inventory"."inventory_balances"("organization_id" ASC, "warehouse_id" ASC, "product_id" ASC);

-- CreateIndex
CREATE INDEX "inventory_movements_kardex_idx" ON "inventory"."inventory_movements"("organization_id" ASC, "warehouse_id" ASC, "product_id" ASC, "occurred_at" ASC, "id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "inventory_movements_org_id_id_key" ON "inventory"."inventory_movements"("organization_id" ASC, "id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "inventory_movements_org_idempotency_key_idx" ON "inventory"."inventory_movements"("organization_id" ASC, "idempotency_key" ASC);

-- CreateIndex
CREATE INDEX "inventory_movements_org_product_date_idx" ON "inventory"."inventory_movements"("organization_id" ASC, "product_id" ASC, "occurred_at" ASC);

-- CreateIndex
CREATE INDEX "inventory_movements_reference_idx" ON "inventory"."inventory_movements"("organization_id" ASC, "reference_type" ASC, "reference_id" ASC);

-- CreateIndex
CREATE INDEX "inventory_movements_status_date_idx" ON "inventory"."inventory_movements"("organization_id" ASC, "status" ASC, "occurred_at" ASC);

-- CreateIndex
CREATE INDEX "inventory_movements_transfer_group_idx" ON "inventory"."inventory_movements"("organization_id" ASC, "transfer_group_id" ASC);

-- AddForeignKey
ALTER TABLE "app"."branches" ADD CONSTRAINT "branches_organization_id_restaurant_id_fkey" FOREIGN KEY ("organization_id", "restaurant_id") REFERENCES "app"."restaurants"("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app"."restaurants" ADD CONSTRAINT "restaurants_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "app"."organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app"."warehouses" ADD CONSTRAINT "warehouses_organization_id_branch_id_fkey" FOREIGN KEY ("organization_id", "branch_id") REFERENCES "app"."branches"("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "core"."product_categories" ADD CONSTRAINT "product_categories_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "app"."organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "core"."product_unit_conversions" ADD CONSTRAINT "product_unit_conversions_organization_id_product_id_fkey" FOREIGN KEY ("organization_id", "product_id") REFERENCES "core"."products"("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "core"."product_unit_conversions" ADD CONSTRAINT "product_unit_conversions_organization_id_unit_id_fkey" FOREIGN KEY ("organization_id", "unit_id") REFERENCES "core"."units_of_measure"("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "core"."products" ADD CONSTRAINT "products_organization_id_base_unit_id_fkey" FOREIGN KEY ("organization_id", "base_unit_id") REFERENCES "core"."units_of_measure"("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "core"."products" ADD CONSTRAINT "products_organization_id_category_id_fkey" FOREIGN KEY ("organization_id", "category_id") REFERENCES "core"."product_categories"("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "core"."supplier_product_costs" ADD CONSTRAINT "supplier_product_costs_organization_id_supplier_product_id_fkey" FOREIGN KEY ("organization_id", "supplier_product_id") REFERENCES "core"."supplier_products"("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "core"."supplier_products" ADD CONSTRAINT "supplier_products_organization_id_product_id_fkey" FOREIGN KEY ("organization_id", "product_id") REFERENCES "core"."products"("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "core"."supplier_products" ADD CONSTRAINT "supplier_products_organization_id_purchase_unit_id_fkey" FOREIGN KEY ("organization_id", "purchase_unit_id") REFERENCES "core"."units_of_measure"("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "core"."supplier_products" ADD CONSTRAINT "supplier_products_organization_id_supplier_id_fkey" FOREIGN KEY ("organization_id", "supplier_id") REFERENCES "core"."suppliers"("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "core"."suppliers" ADD CONSTRAINT "suppliers_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "app"."organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "core"."units_of_measure" ADD CONSTRAINT "units_of_measure_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "app"."organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory"."inventory_balances" ADD CONSTRAINT "inventory_balances_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "app"."organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory"."inventory_balances" ADD CONSTRAINT "inventory_balances_organization_id_product_id_fkey" FOREIGN KEY ("organization_id", "product_id") REFERENCES "core"."products"("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory"."inventory_balances" ADD CONSTRAINT "inventory_balances_organization_id_warehouse_id_fkey" FOREIGN KEY ("organization_id", "warehouse_id") REFERENCES "app"."warehouses"("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory"."inventory_movements" ADD CONSTRAINT "inventory_movements_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "app"."organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory"."inventory_movements" ADD CONSTRAINT "inventory_movements_organization_id_product_id_fkey" FOREIGN KEY ("organization_id", "product_id") REFERENCES "core"."products"("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory"."inventory_movements" ADD CONSTRAINT "inventory_movements_organization_id_unit_id_fkey" FOREIGN KEY ("organization_id", "unit_id") REFERENCES "core"."units_of_measure"("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory"."inventory_movements" ADD CONSTRAINT "inventory_movements_organization_id_warehouse_id_fkey" FOREIGN KEY ("organization_id", "warehouse_id") REFERENCES "app"."warehouses"("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
