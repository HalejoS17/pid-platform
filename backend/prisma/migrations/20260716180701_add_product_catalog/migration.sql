-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "core";

-- CreateEnum
CREATE TYPE "core"."UnitDimension" AS ENUM ('COUNT', 'MASS', 'VOLUME', 'LENGTH', 'OTHER');

-- CreateEnum
CREATE TYPE "core"."ProductType" AS ENUM ('INGREDIENT', 'PREPARED_ITEM', 'MENU_ITEM', 'BEVERAGE', 'PACKAGING', 'SUPPLY', 'OTHER');

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

-- CreateIndex
CREATE INDEX "product_categories_org_status_idx" ON "core"."product_categories"("organization_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "product_categories_org_id_id_key" ON "core"."product_categories"("organization_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "product_categories_org_code_key" ON "core"."product_categories"("organization_id", "code");

-- CreateIndex
CREATE INDEX "units_org_dimension_status_idx" ON "core"."units_of_measure"("organization_id", "dimension", "status");

-- CreateIndex
CREATE UNIQUE INDEX "units_org_id_id_key" ON "core"."units_of_measure"("organization_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "units_org_code_key" ON "core"."units_of_measure"("organization_id", "code");

-- CreateIndex
CREATE INDEX "products_org_category_status_idx" ON "core"."products"("organization_id", "category_id", "status");

-- CreateIndex
CREATE INDEX "products_org_base_unit_idx" ON "core"."products"("organization_id", "base_unit_id");

-- CreateIndex
CREATE INDEX "products_org_sku_idx" ON "core"."products"("organization_id", "sku");

-- CreateIndex
CREATE INDEX "products_org_barcode_idx" ON "core"."products"("organization_id", "barcode");

-- CreateIndex
CREATE UNIQUE INDEX "products_org_id_id_key" ON "core"."products"("organization_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "products_org_code_key" ON "core"."products"("organization_id", "code");

-- CreateIndex
CREATE INDEX "product_units_org_product_status_idx" ON "core"."product_unit_conversions"("organization_id", "product_id", "status");

-- CreateIndex
CREATE INDEX "product_units_org_unit_idx" ON "core"."product_unit_conversions"("organization_id", "unit_id");

-- CreateIndex
CREATE UNIQUE INDEX "product_units_org_product_unit_key" ON "core"."product_unit_conversions"("organization_id", "product_id", "unit_id");

-- AddForeignKey
ALTER TABLE "core"."product_categories" ADD CONSTRAINT "product_categories_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "app"."organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "core"."units_of_measure" ADD CONSTRAINT "units_of_measure_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "app"."organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "core"."products" ADD CONSTRAINT "products_organization_id_category_id_fkey" FOREIGN KEY ("organization_id", "category_id") REFERENCES "core"."product_categories"("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "core"."products" ADD CONSTRAINT "products_organization_id_base_unit_id_fkey" FOREIGN KEY ("organization_id", "base_unit_id") REFERENCES "core"."units_of_measure"("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "core"."product_unit_conversions" ADD CONSTRAINT "product_unit_conversions_organization_id_product_id_fkey" FOREIGN KEY ("organization_id", "product_id") REFERENCES "core"."products"("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "core"."product_unit_conversions" ADD CONSTRAINT "product_unit_conversions_organization_id_unit_id_fkey" FOREIGN KEY ("organization_id", "unit_id") REFERENCES "core"."units_of_measure"("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- =========================================================
-- PID: CORE CATALOG SECURITY
-- =========================================================

REVOKE ALL
ON TABLE
  core.product_categories,
  core.units_of_measure,
  core.products,
  core.product_unit_conversions
FROM PUBLIC;

GRANT SELECT, INSERT, UPDATE
ON TABLE
  core.product_categories,
  core.units_of_measure,
  core.products,
  core.product_unit_conversions
TO pid_app;

GRANT SELECT
ON TABLE
  core.product_categories,
  core.units_of_measure,
  core.products,
  core.product_unit_conversions
TO pid_worker;

REVOKE DELETE
ON TABLE
  core.product_categories,
  core.units_of_measure,
  core.products,
  core.product_unit_conversions
FROM pid_app, pid_worker;

-- ---------------------------------------------------------
-- Validation constraints
-- ---------------------------------------------------------

ALTER TABLE core.units_of_measure
ADD CONSTRAINT units_decimal_places_check
CHECK (
  decimal_places BETWEEN 0 AND 6
);

ALTER TABLE core.product_unit_conversions
ADD CONSTRAINT product_units_factor_positive_check
CHECK (
  factor_to_base > 0
);

-- ---------------------------------------------------------
-- Product categories RLS
-- ---------------------------------------------------------

ALTER TABLE core.product_categories
ENABLE ROW LEVEL SECURITY;

ALTER TABLE core.product_categories
FORCE ROW LEVEL SECURITY;

CREATE POLICY product_categories_tenant_policy
ON core.product_categories
FOR ALL
TO pid_migrator, pid_app, pid_worker
USING (
  organization_id =
    app.current_organization_id()
)
WITH CHECK (
  organization_id =
    app.current_organization_id()
);

-- ---------------------------------------------------------
-- Units of measure RLS
-- ---------------------------------------------------------

ALTER TABLE core.units_of_measure
ENABLE ROW LEVEL SECURITY;

ALTER TABLE core.units_of_measure
FORCE ROW LEVEL SECURITY;

CREATE POLICY units_of_measure_tenant_policy
ON core.units_of_measure
FOR ALL
TO pid_migrator, pid_app, pid_worker
USING (
  organization_id =
    app.current_organization_id()
)
WITH CHECK (
  organization_id =
    app.current_organization_id()
);

-- ---------------------------------------------------------
-- Products RLS
-- ---------------------------------------------------------

ALTER TABLE core.products
ENABLE ROW LEVEL SECURITY;

ALTER TABLE core.products
FORCE ROW LEVEL SECURITY;

CREATE POLICY products_tenant_policy
ON core.products
FOR ALL
TO pid_migrator, pid_app, pid_worker
USING (
  organization_id =
    app.current_organization_id()
)
WITH CHECK (
  organization_id =
    app.current_organization_id()
);

-- ---------------------------------------------------------
-- Product unit conversions RLS
-- ---------------------------------------------------------

ALTER TABLE core.product_unit_conversions
ENABLE ROW LEVEL SECURITY;

ALTER TABLE core.product_unit_conversions
FORCE ROW LEVEL SECURITY;

CREATE POLICY product_unit_conversions_tenant_policy
ON core.product_unit_conversions
FOR ALL
TO pid_migrator, pid_app, pid_worker
USING (
  organization_id =
    app.current_organization_id()
)
WITH CHECK (
  organization_id =
    app.current_organization_id()
);
