-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "purchasing";

-- CreateEnum
CREATE TYPE "purchasing"."PurchaseOrderStatus" AS ENUM ('DRAFT', 'APPROVED', 'PARTIALLY_RECEIVED', 'RECEIVED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "purchasing"."GoodsReceiptStatus" AS ENUM ('DRAFT', 'POSTED', 'VOIDED');

-- DropIndex
DROP INDEX "core"."supplier_product_costs_one_open_active_idx";

-- DropIndex
DROP INDEX "core"."supplier_products_one_preferred_per_product_idx";

-- DropIndex
DROP INDEX "inventory"."inventory_movements_org_idempotency_key_idx";

-- CreateTable
CREATE TABLE "purchasing"."purchase_orders" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID NOT NULL,
    "supplier_id" UUID NOT NULL,
    "warehouse_id" UUID NOT NULL,
    "number" VARCHAR(40) NOT NULL,
    "order_date" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expected_date" TIMESTAMPTZ(6),
    "currency_code" CHAR(3) NOT NULL DEFAULT 'USD',
    "status" "purchasing"."PurchaseOrderStatus" NOT NULL DEFAULT 'DRAFT',
    "subtotal" DECIMAL(18,6) NOT NULL DEFAULT 0,
    "tax_amount" DECIMAL(18,6) NOT NULL DEFAULT 0,
    "total_amount" DECIMAL(18,6) NOT NULL DEFAULT 0,
    "notes" VARCHAR(500),
    "approved_at" TIMESTAMPTZ(6),
    "cancelled_at" TIMESTAMPTZ(6),
    "closed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "purchase_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchasing"."purchase_order_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID NOT NULL,
    "purchase_order_id" UUID NOT NULL,
    "supplier_product_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "unit_id" UUID NOT NULL,
    "line_number" SMALLINT NOT NULL,
    "quantity" DECIMAL(18,6) NOT NULL,
    "received_quantity" DECIMAL(18,6) NOT NULL DEFAULT 0,
    "unit_cost" DECIMAL(18,6) NOT NULL,
    "tax_rate" DECIMAL(7,4) NOT NULL DEFAULT 0,
    "line_subtotal" DECIMAL(18,6) NOT NULL,
    "line_tax" DECIMAL(18,6) NOT NULL DEFAULT 0,
    "line_total" DECIMAL(18,6) NOT NULL,
    "notes" VARCHAR(250),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "purchase_order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchasing"."goods_receipts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID NOT NULL,
    "purchase_order_id" UUID NOT NULL,
    "warehouse_id" UUID NOT NULL,
    "number" VARCHAR(40) NOT NULL,
    "supplier_document_number" VARCHAR(80),
    "receipt_date" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "purchasing"."GoodsReceiptStatus" NOT NULL DEFAULT 'DRAFT',
    "idempotency_key" VARCHAR(120),
    "notes" VARCHAR(500),
    "posted_at" TIMESTAMPTZ(6),
    "voided_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "goods_receipts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchasing"."goods_receipt_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID NOT NULL,
    "goods_receipt_id" UUID NOT NULL,
    "purchase_order_item_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "unit_id" UUID NOT NULL,
    "line_number" SMALLINT NOT NULL,
    "quantity" DECIMAL(18,6) NOT NULL,
    "factor_to_base" DECIMAL(18,6) NOT NULL,
    "base_quantity" DECIMAL(18,6) NOT NULL,
    "unit_cost" DECIMAL(18,6) NOT NULL,
    "base_unit_cost" DECIMAL(18,6) NOT NULL,
    "total_cost" DECIMAL(18,6) NOT NULL,
    "notes" VARCHAR(250),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "goods_receipt_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "purchase_orders_org_supplier_status_idx" ON "purchasing"."purchase_orders"("organization_id", "supplier_id", "status");

-- CreateIndex
CREATE INDEX "purchase_orders_org_warehouse_status_idx" ON "purchasing"."purchase_orders"("organization_id", "warehouse_id", "status");

-- CreateIndex
CREATE INDEX "purchase_orders_org_order_date_idx" ON "purchasing"."purchase_orders"("organization_id", "order_date");

-- CreateIndex
CREATE INDEX "purchase_orders_org_expected_date_idx" ON "purchasing"."purchase_orders"("organization_id", "expected_date");

-- CreateIndex
CREATE UNIQUE INDEX "purchase_orders_org_id_id_key" ON "purchasing"."purchase_orders"("organization_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "purchase_orders_org_number_key" ON "purchasing"."purchase_orders"("organization_id", "number");

-- CreateIndex
CREATE INDEX "purchase_order_items_org_order_idx" ON "purchasing"."purchase_order_items"("organization_id", "purchase_order_id");

-- CreateIndex
CREATE INDEX "purchase_order_items_org_supplier_product_idx" ON "purchasing"."purchase_order_items"("organization_id", "supplier_product_id");

-- CreateIndex
CREATE INDEX "purchase_order_items_org_product_idx" ON "purchasing"."purchase_order_items"("organization_id", "product_id");

-- CreateIndex
CREATE INDEX "purchase_order_items_org_order_deleted_idx" ON "purchasing"."purchase_order_items"("organization_id", "purchase_order_id", "deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "purchase_order_items_org_id_id_key" ON "purchasing"."purchase_order_items"("organization_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "purchase_order_items_org_order_line_key" ON "purchasing"."purchase_order_items"("organization_id", "purchase_order_id", "line_number");

-- CreateIndex
CREATE INDEX "goods_receipts_org_order_status_idx" ON "purchasing"."goods_receipts"("organization_id", "purchase_order_id", "status");

-- CreateIndex
CREATE INDEX "goods_receipts_org_warehouse_date_idx" ON "purchasing"."goods_receipts"("organization_id", "warehouse_id", "receipt_date");

-- CreateIndex
CREATE INDEX "goods_receipts_org_supplier_document_idx" ON "purchasing"."goods_receipts"("organization_id", "supplier_document_number");

-- CreateIndex
CREATE UNIQUE INDEX "goods_receipts_org_id_id_key" ON "purchasing"."goods_receipts"("organization_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "goods_receipts_org_number_key" ON "purchasing"."goods_receipts"("organization_id", "number");

-- CreateIndex
CREATE INDEX "goods_receipt_items_org_order_item_idx" ON "purchasing"."goods_receipt_items"("organization_id", "purchase_order_item_id");

-- CreateIndex
CREATE INDEX "goods_receipt_items_org_product_idx" ON "purchasing"."goods_receipt_items"("organization_id", "product_id");

-- CreateIndex
CREATE UNIQUE INDEX "goods_receipt_items_org_id_id_key" ON "purchasing"."goods_receipt_items"("organization_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "goods_receipt_items_org_receipt_line_key" ON "purchasing"."goods_receipt_items"("organization_id", "goods_receipt_id", "line_number");

-- CreateIndex
CREATE UNIQUE INDEX "goods_receipt_items_org_receipt_order_item_key" ON "purchasing"."goods_receipt_items"("organization_id", "goods_receipt_id", "purchase_order_item_id");

-- AddForeignKey
ALTER TABLE "purchasing"."purchase_orders" ADD CONSTRAINT "purchase_orders_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "app"."organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchasing"."purchase_orders" ADD CONSTRAINT "purchase_orders_organization_id_supplier_id_fkey" FOREIGN KEY ("organization_id", "supplier_id") REFERENCES "core"."suppliers"("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchasing"."purchase_orders" ADD CONSTRAINT "purchase_orders_organization_id_warehouse_id_fkey" FOREIGN KEY ("organization_id", "warehouse_id") REFERENCES "app"."warehouses"("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchasing"."purchase_order_items" ADD CONSTRAINT "purchase_order_items_organization_id_purchase_order_id_fkey" FOREIGN KEY ("organization_id", "purchase_order_id") REFERENCES "purchasing"."purchase_orders"("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchasing"."purchase_order_items" ADD CONSTRAINT "purchase_order_items_organization_id_supplier_product_id_fkey" FOREIGN KEY ("organization_id", "supplier_product_id") REFERENCES "core"."supplier_products"("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchasing"."purchase_order_items" ADD CONSTRAINT "purchase_order_items_organization_id_product_id_fkey" FOREIGN KEY ("organization_id", "product_id") REFERENCES "core"."products"("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchasing"."purchase_order_items" ADD CONSTRAINT "purchase_order_items_organization_id_unit_id_fkey" FOREIGN KEY ("organization_id", "unit_id") REFERENCES "core"."units_of_measure"("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchasing"."goods_receipts" ADD CONSTRAINT "goods_receipts_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "app"."organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchasing"."goods_receipts" ADD CONSTRAINT "goods_receipts_organization_id_purchase_order_id_fkey" FOREIGN KEY ("organization_id", "purchase_order_id") REFERENCES "purchasing"."purchase_orders"("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchasing"."goods_receipts" ADD CONSTRAINT "goods_receipts_organization_id_warehouse_id_fkey" FOREIGN KEY ("organization_id", "warehouse_id") REFERENCES "app"."warehouses"("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchasing"."goods_receipt_items" ADD CONSTRAINT "goods_receipt_items_organization_id_goods_receipt_id_fkey" FOREIGN KEY ("organization_id", "goods_receipt_id") REFERENCES "purchasing"."goods_receipts"("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchasing"."goods_receipt_items" ADD CONSTRAINT "goods_receipt_items_organization_id_purchase_order_item_id_fkey" FOREIGN KEY ("organization_id", "purchase_order_item_id") REFERENCES "purchasing"."purchase_order_items"("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchasing"."goods_receipt_items" ADD CONSTRAINT "goods_receipt_items_organization_id_product_id_fkey" FOREIGN KEY ("organization_id", "product_id") REFERENCES "core"."products"("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchasing"."goods_receipt_items" ADD CONSTRAINT "goods_receipt_items_organization_id_unit_id_fkey" FOREIGN KEY ("organization_id", "unit_id") REFERENCES "core"."units_of_measure"("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- =========================================================
-- PURCHASING PERMISSIONS
-- =========================================================

REVOKE ALL
ON SCHEMA purchasing
FROM PUBLIC;

GRANT USAGE
ON SCHEMA purchasing
TO pid_app, pid_worker;

REVOKE ALL
ON TABLE
  purchasing.purchase_orders,
  purchasing.purchase_order_items,
  purchasing.goods_receipts,
  purchasing.goods_receipt_items
FROM PUBLIC;

GRANT SELECT, INSERT, UPDATE
ON TABLE
  purchasing.purchase_orders,
  purchasing.purchase_order_items,
  purchasing.goods_receipts,
  purchasing.goods_receipt_items
TO pid_app;

GRANT SELECT
ON TABLE
  purchasing.purchase_orders,
  purchasing.purchase_order_items,
  purchasing.goods_receipts,
  purchasing.goods_receipt_items
TO pid_worker;

REVOKE DELETE
ON TABLE
  purchasing.purchase_orders,
  purchasing.purchase_order_items,
  purchasing.goods_receipts,
  purchasing.goods_receipt_items
FROM pid_app, pid_worker;

-- =========================================================
-- PURCHASE ORDER CHECKS
-- =========================================================

ALTER TABLE purchasing.purchase_orders
ADD CONSTRAINT purchase_orders_currency_code_check
CHECK (
  currency_code ~ '^[A-Z]{3}$'
);

ALTER TABLE purchasing.purchase_orders
ADD CONSTRAINT purchase_orders_expected_date_check
CHECK (
  expected_date IS NULL
  OR expected_date >= order_date
);

ALTER TABLE purchasing.purchase_orders
ADD CONSTRAINT purchase_orders_amounts_nonnegative_check
CHECK (
  subtotal >= 0
  AND tax_amount >= 0
  AND total_amount >= 0
);

ALTER TABLE purchasing.purchase_order_items
ADD CONSTRAINT purchase_order_items_line_number_check
CHECK (
  line_number > 0
);

ALTER TABLE purchasing.purchase_order_items
ADD CONSTRAINT purchase_order_items_quantity_positive_check
CHECK (
  quantity > 0
);

ALTER TABLE purchasing.purchase_order_items
ADD CONSTRAINT purchase_order_items_received_quantity_check
CHECK (
  received_quantity >= 0
  AND received_quantity <= quantity
);

ALTER TABLE purchasing.purchase_order_items
ADD CONSTRAINT purchase_order_items_unit_cost_check
CHECK (
  unit_cost >= 0
);

ALTER TABLE purchasing.purchase_order_items
ADD CONSTRAINT purchase_order_items_tax_rate_check
CHECK (
  tax_rate >= 0
  AND tax_rate <= 100
);

ALTER TABLE purchasing.purchase_order_items
ADD CONSTRAINT purchase_order_items_amounts_check
CHECK (
  line_subtotal >= 0
  AND line_tax >= 0
  AND line_total >= 0
);

-- =========================================================
-- GOODS RECEIPT CHECKS
-- =========================================================

ALTER TABLE purchasing.goods_receipts
ADD CONSTRAINT goods_receipts_posted_at_check
CHECK (
  status <> 'POSTED'
  OR posted_at IS NOT NULL
);

CREATE UNIQUE INDEX
goods_receipts_org_idempotency_key_idx
ON purchasing.goods_receipts (
  organization_id,
  idempotency_key
)
WHERE idempotency_key IS NOT NULL;

ALTER TABLE purchasing.goods_receipt_items
ADD CONSTRAINT goods_receipt_items_line_number_check
CHECK (
  line_number > 0
);

ALTER TABLE purchasing.goods_receipt_items
ADD CONSTRAINT goods_receipt_items_quantity_positive_check
CHECK (
  quantity > 0
);

ALTER TABLE purchasing.goods_receipt_items
ADD CONSTRAINT goods_receipt_items_factor_positive_check
CHECK (
  factor_to_base > 0
);

ALTER TABLE purchasing.goods_receipt_items
ADD CONSTRAINT goods_receipt_items_base_quantity_positive_check
CHECK (
  base_quantity > 0
);

ALTER TABLE purchasing.goods_receipt_items
ADD CONSTRAINT goods_receipt_items_costs_nonnegative_check
CHECK (
  unit_cost >= 0
  AND base_unit_cost >= 0
  AND total_cost >= 0
);

-- =========================================================
-- INVENTORY BALANCE GUARDS
-- These replace the defective pending migration.
-- =========================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname =
      'inventory_balances_quantity_nonnegative_check'
  ) THEN
    ALTER TABLE inventory.inventory_balances
    ADD CONSTRAINT
      inventory_balances_quantity_nonnegative_check
    CHECK (
      quantity_on_hand >= 0
    );
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname =
      'inventory_balances_reserved_not_greater_check'
  ) THEN
    ALTER TABLE inventory.inventory_balances
    ADD CONSTRAINT
      inventory_balances_reserved_not_greater_check
    CHECK (
      quantity_reserved <= quantity_on_hand
    );
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname =
      'inventory_movements_posted_balance_check'
  ) THEN
    ALTER TABLE inventory.inventory_movements
    ADD CONSTRAINT
      inventory_movements_posted_balance_check
    CHECK (
      status <> 'POSTED'
      OR balance_quantity_after IS NOT NULL
    );
  END IF;
END
$$;

-- =========================================================
-- ROW LEVEL SECURITY
-- =========================================================

ALTER TABLE purchasing.purchase_orders
ENABLE ROW LEVEL SECURITY;

ALTER TABLE purchasing.purchase_orders
FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS
purchase_orders_tenant_policy
ON purchasing.purchase_orders;

CREATE POLICY purchase_orders_tenant_policy
ON purchasing.purchase_orders
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

ALTER TABLE purchasing.purchase_order_items
ENABLE ROW LEVEL SECURITY;

ALTER TABLE purchasing.purchase_order_items
FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS
purchase_order_items_tenant_policy
ON purchasing.purchase_order_items;

CREATE POLICY purchase_order_items_tenant_policy
ON purchasing.purchase_order_items
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

ALTER TABLE purchasing.goods_receipts
ENABLE ROW LEVEL SECURITY;

ALTER TABLE purchasing.goods_receipts
FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS
goods_receipts_tenant_policy
ON purchasing.goods_receipts;

CREATE POLICY goods_receipts_tenant_policy
ON purchasing.goods_receipts
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

ALTER TABLE purchasing.goods_receipt_items
ENABLE ROW LEVEL SECURITY;

ALTER TABLE purchasing.goods_receipt_items
FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS
goods_receipt_items_tenant_policy
ON purchasing.goods_receipt_items;

CREATE POLICY goods_receipt_items_tenant_policy
ON purchasing.goods_receipt_items
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
