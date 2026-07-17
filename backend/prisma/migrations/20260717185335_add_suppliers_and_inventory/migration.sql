/*
  Warnings:

  - A unique constraint covering the columns `[organization_id,id]` on the table `warehouses` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "inventory";

-- CreateEnum
CREATE TYPE "inventory"."InventoryMovementType" AS ENUM ('OPENING_BALANCE', 'PURCHASE_RECEIPT', 'PURCHASE_RETURN', 'TRANSFER', 'ADJUSTMENT', 'PRODUCTION_CONSUMPTION', 'PRODUCTION_OUTPUT', 'SALE_CONSUMPTION', 'WASTE', 'INVENTORY_COUNT');

-- CreateEnum
CREATE TYPE "inventory"."InventoryMovementDirection" AS ENUM ('IN', 'OUT');

-- CreateEnum
CREATE TYPE "inventory"."InventoryMovementStatus" AS ENUM ('DRAFT', 'POSTED', 'VOIDED');

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
CREATE INDEX "suppliers_org_status_idx" ON "core"."suppliers"("organization_id", "status");

-- CreateIndex
CREATE INDEX "suppliers_org_legal_name_idx" ON "core"."suppliers"("organization_id", "legal_name");

-- CreateIndex
CREATE UNIQUE INDEX "suppliers_org_id_id_key" ON "core"."suppliers"("organization_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "suppliers_org_code_key" ON "core"."suppliers"("organization_id", "code");

-- CreateIndex
CREATE UNIQUE INDEX "suppliers_org_tax_id_key" ON "core"."suppliers"("organization_id", "tax_id");

-- CreateIndex
CREATE INDEX "supplier_products_org_supplier_status_idx" ON "core"."supplier_products"("organization_id", "supplier_id", "status");

-- CreateIndex
CREATE INDEX "supplier_products_org_product_status_idx" ON "core"."supplier_products"("organization_id", "product_id", "status");

-- CreateIndex
CREATE INDEX "supplier_products_org_purchase_unit_idx" ON "core"."supplier_products"("organization_id", "purchase_unit_id");

-- CreateIndex
CREATE INDEX "supplier_products_org_supplier_sku_idx" ON "core"."supplier_products"("organization_id", "supplier_id", "supplier_sku");

-- CreateIndex
CREATE UNIQUE INDEX "supplier_products_org_id_id_key" ON "core"."supplier_products"("organization_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "supplier_products_org_supplier_product_unit_key" ON "core"."supplier_products"("organization_id", "supplier_id", "product_id", "purchase_unit_id");

-- CreateIndex
CREATE INDEX "supplier_product_costs_org_product_status_date_idx" ON "core"."supplier_product_costs"("organization_id", "supplier_product_id", "status", "effective_from");

-- CreateIndex
CREATE INDEX "supplier_product_costs_org_effective_from_idx" ON "core"."supplier_product_costs"("organization_id", "effective_from");

-- CreateIndex
CREATE UNIQUE INDEX "supplier_product_costs_org_id_id_key" ON "core"."supplier_product_costs"("organization_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "supplier_product_costs_org_product_effective_key" ON "core"."supplier_product_costs"("organization_id", "supplier_product_id", "effective_from");

-- CreateIndex
CREATE INDEX "inventory_balances_org_warehouse_idx" ON "inventory"."inventory_balances"("organization_id", "warehouse_id");

-- CreateIndex
CREATE INDEX "inventory_balances_org_product_idx" ON "inventory"."inventory_balances"("organization_id", "product_id");

-- CreateIndex
CREATE UNIQUE INDEX "inventory_balances_org_id_id_key" ON "inventory"."inventory_balances"("organization_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "inventory_balances_org_warehouse_product_key" ON "inventory"."inventory_balances"("organization_id", "warehouse_id", "product_id");

-- CreateIndex
CREATE INDEX "inventory_movements_kardex_idx" ON "inventory"."inventory_movements"("organization_id", "warehouse_id", "product_id", "occurred_at", "id");

-- CreateIndex
CREATE INDEX "inventory_movements_org_product_date_idx" ON "inventory"."inventory_movements"("organization_id", "product_id", "occurred_at");

-- CreateIndex
CREATE INDEX "inventory_movements_reference_idx" ON "inventory"."inventory_movements"("organization_id", "reference_type", "reference_id");

-- CreateIndex
CREATE INDEX "inventory_movements_transfer_group_idx" ON "inventory"."inventory_movements"("organization_id", "transfer_group_id");

-- CreateIndex
CREATE INDEX "inventory_movements_status_date_idx" ON "inventory"."inventory_movements"("organization_id", "status", "occurred_at");

-- CreateIndex
CREATE UNIQUE INDEX "inventory_movements_org_id_id_key" ON "inventory"."inventory_movements"("organization_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "warehouses_organization_id_id_key" ON "app"."warehouses"("organization_id", "id");

-- AddForeignKey
ALTER TABLE "core"."suppliers" ADD CONSTRAINT "suppliers_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "app"."organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "core"."supplier_products" ADD CONSTRAINT "supplier_products_organization_id_supplier_id_fkey" FOREIGN KEY ("organization_id", "supplier_id") REFERENCES "core"."suppliers"("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "core"."supplier_products" ADD CONSTRAINT "supplier_products_organization_id_product_id_fkey" FOREIGN KEY ("organization_id", "product_id") REFERENCES "core"."products"("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "core"."supplier_products" ADD CONSTRAINT "supplier_products_organization_id_purchase_unit_id_fkey" FOREIGN KEY ("organization_id", "purchase_unit_id") REFERENCES "core"."units_of_measure"("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "core"."supplier_product_costs" ADD CONSTRAINT "supplier_product_costs_organization_id_supplier_product_id_fkey" FOREIGN KEY ("organization_id", "supplier_product_id") REFERENCES "core"."supplier_products"("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory"."inventory_balances" ADD CONSTRAINT "inventory_balances_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "app"."organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory"."inventory_balances" ADD CONSTRAINT "inventory_balances_organization_id_warehouse_id_fkey" FOREIGN KEY ("organization_id", "warehouse_id") REFERENCES "app"."warehouses"("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory"."inventory_balances" ADD CONSTRAINT "inventory_balances_organization_id_product_id_fkey" FOREIGN KEY ("organization_id", "product_id") REFERENCES "core"."products"("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory"."inventory_movements" ADD CONSTRAINT "inventory_movements_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "app"."organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory"."inventory_movements" ADD CONSTRAINT "inventory_movements_organization_id_warehouse_id_fkey" FOREIGN KEY ("organization_id", "warehouse_id") REFERENCES "app"."warehouses"("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory"."inventory_movements" ADD CONSTRAINT "inventory_movements_organization_id_product_id_fkey" FOREIGN KEY ("organization_id", "product_id") REFERENCES "core"."products"("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory"."inventory_movements" ADD CONSTRAINT "inventory_movements_organization_id_unit_id_fkey" FOREIGN KEY ("organization_id", "unit_id") REFERENCES "core"."units_of_measure"("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- =========================================================
-- CORE PURCHASING
-- =========================================================

REVOKE ALL
ON SCHEMA core
FROM PUBLIC;

GRANT USAGE
ON SCHEMA core
TO pid_app, pid_worker;

REVOKE ALL
ON TABLE
  core.suppliers,
  core.supplier_products,
  core.supplier_product_costs
FROM PUBLIC;

GRANT SELECT, INSERT, UPDATE
ON TABLE
  core.suppliers,
  core.supplier_products,
  core.supplier_product_costs
TO pid_app;

GRANT SELECT
ON TABLE
  core.suppliers,
  core.supplier_products,
  core.supplier_product_costs
TO pid_worker;

REVOKE DELETE
ON TABLE
  core.suppliers,
  core.supplier_products,
  core.supplier_product_costs
FROM pid_app, pid_worker;

ALTER TABLE core.suppliers
ADD CONSTRAINT suppliers_payment_terms_days_check
CHECK (
  payment_terms_days BETWEEN 0 AND 3650
);

ALTER TABLE core.supplier_products
ADD CONSTRAINT supplier_products_minimum_quantity_check
CHECK (
  minimum_order_quantity > 0
);

ALTER TABLE core.supplier_products
ADD CONSTRAINT supplier_products_lead_time_days_check
CHECK (
  lead_time_days BETWEEN 0 AND 3650
);

ALTER TABLE core.supplier_product_costs
ADD CONSTRAINT supplier_product_costs_unit_cost_positive_check
CHECK (
  unit_cost > 0
);

ALTER TABLE core.supplier_product_costs
ADD CONSTRAINT supplier_product_costs_currency_code_check
CHECK (
  currency_code ~ '^[A-Z]{3}$'
);

ALTER TABLE core.supplier_product_costs
ADD CONSTRAINT supplier_product_costs_date_range_check
CHECK (
  effective_to IS NULL
  OR effective_to > effective_from
);

CREATE UNIQUE INDEX
supplier_products_one_preferred_per_product_idx
ON core.supplier_products (
  organization_id,
  product_id
)
WHERE
  is_preferred = true
  AND status = 'ACTIVE'
  AND deleted_at IS NULL;

CREATE UNIQUE INDEX
supplier_product_costs_one_open_active_idx
ON core.supplier_product_costs (
  organization_id,
  supplier_product_id
)
WHERE
  effective_to IS NULL
  AND status = 'ACTIVE'
  AND deleted_at IS NULL;

ALTER TABLE core.suppliers
ENABLE ROW LEVEL SECURITY;

ALTER TABLE core.suppliers
FORCE ROW LEVEL SECURITY;

CREATE POLICY suppliers_tenant_policy
ON core.suppliers
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

ALTER TABLE core.supplier_products
ENABLE ROW LEVEL SECURITY;

ALTER TABLE core.supplier_products
FORCE ROW LEVEL SECURITY;

CREATE POLICY supplier_products_tenant_policy
ON core.supplier_products
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

ALTER TABLE core.supplier_product_costs
ENABLE ROW LEVEL SECURITY;

ALTER TABLE core.supplier_product_costs
FORCE ROW LEVEL SECURITY;

CREATE POLICY supplier_product_costs_tenant_policy
ON core.supplier_product_costs
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

-- =========================================================
-- INVENTORY
-- =========================================================

REVOKE ALL
ON SCHEMA inventory
FROM PUBLIC;

GRANT USAGE
ON SCHEMA inventory
TO pid_app, pid_worker;

REVOKE ALL
ON TABLE
  inventory.inventory_balances,
  inventory.inventory_movements
FROM PUBLIC;

GRANT SELECT, INSERT, UPDATE
ON TABLE
  inventory.inventory_balances,
  inventory.inventory_movements
TO pid_app;

GRANT SELECT
ON TABLE
  inventory.inventory_balances,
  inventory.inventory_movements
TO pid_worker;

REVOKE DELETE
ON TABLE
  inventory.inventory_balances,
  inventory.inventory_movements
FROM pid_app, pid_worker;

ALTER TABLE inventory.inventory_balances
ADD CONSTRAINT inventory_balances_reserved_nonnegative_check
CHECK (
  quantity_reserved >= 0
);

ALTER TABLE inventory.inventory_balances
ADD CONSTRAINT inventory_balances_average_cost_nonnegative_check
CHECK (
  average_unit_cost >= 0
);

ALTER TABLE inventory.inventory_balances
ADD CONSTRAINT inventory_balances_version_nonnegative_check
CHECK (
  version >= 0
);

ALTER TABLE inventory.inventory_movements
ADD CONSTRAINT inventory_movements_quantity_positive_check
CHECK (
  quantity > 0
);

ALTER TABLE inventory.inventory_movements
ADD CONSTRAINT inventory_movements_factor_positive_check
CHECK (
  factor_to_base > 0
);

ALTER TABLE inventory.inventory_movements
ADD CONSTRAINT inventory_movements_base_quantity_positive_check
CHECK (
  base_quantity > 0
);

ALTER TABLE inventory.inventory_movements
ADD CONSTRAINT inventory_movements_unit_cost_nonnegative_check
CHECK (
  unit_cost >= 0
);

ALTER TABLE inventory.inventory_movements
ADD CONSTRAINT inventory_movements_total_cost_nonnegative_check
CHECK (
  total_cost >= 0
);

ALTER TABLE inventory.inventory_movements
ADD CONSTRAINT inventory_movements_average_cost_after_check
CHECK (
  average_unit_cost_after IS NULL
  OR average_unit_cost_after >= 0
);

ALTER TABLE inventory.inventory_movements
ADD CONSTRAINT inventory_movements_posted_at_check
CHECK (
  status <> 'POSTED'
  OR posted_at IS NOT NULL
);

CREATE UNIQUE INDEX
inventory_movements_org_idempotency_key_idx
ON inventory.inventory_movements (
  organization_id,
  idempotency_key
)
WHERE
  idempotency_key IS NOT NULL;

ALTER TABLE inventory.inventory_balances
ENABLE ROW LEVEL SECURITY;

ALTER TABLE inventory.inventory_balances
FORCE ROW LEVEL SECURITY;

CREATE POLICY inventory_balances_tenant_policy
ON inventory.inventory_balances
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

ALTER TABLE inventory.inventory_movements
ENABLE ROW LEVEL SECURITY;

ALTER TABLE inventory.inventory_movements
FORCE ROW LEVEL SECURITY;

CREATE POLICY inventory_movements_tenant_policy
ON inventory.inventory_movements
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
