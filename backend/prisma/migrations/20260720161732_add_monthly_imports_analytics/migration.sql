-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "analytics";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "imports";

-- CreateEnum
CREATE TYPE "imports"."MonthlyImportStatus" AS ENUM ('PROCESSING', 'COMPLETED', 'COMPLETED_WITH_ERRORS', 'FAILED', 'REPLACED');

-- CreateEnum
CREATE TYPE "imports"."MonthlyImportFileType" AS ENUM ('KARDEX', 'RECIPES', 'SALES', 'WAITER_SALES');

-- CreateTable
CREATE TABLE "imports"."monthly_import_batches" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID NOT NULL,
    "period_year" SMALLINT NOT NULL,
    "period_month" SMALLINT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "is_current" BOOLEAN NOT NULL DEFAULT false,
    "status" "imports"."MonthlyImportStatus" NOT NULL DEFAULT 'PROCESSING',
    "source_system" VARCHAR(50) NOT NULL DEFAULT 'LEGACY_EXCEL',
    "total_rows" INTEGER NOT NULL DEFAULT 0,
    "valid_rows" INTEGER NOT NULL DEFAULT 0,
    "ignored_rows" INTEGER NOT NULL DEFAULT 0,
    "error_rows" INTEGER NOT NULL DEFAULT 0,
    "summary" JSONB,
    "failure_message" VARCHAR(1000),
    "started_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "monthly_import_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "imports"."monthly_import_files" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID NOT NULL,
    "batch_id" UUID NOT NULL,
    "type" "imports"."MonthlyImportFileType" NOT NULL,
    "original_name" VARCHAR(255) NOT NULL,
    "sha256" CHAR(64) NOT NULL,
    "sheet_name" VARCHAR(120) NOT NULL,
    "total_rows" INTEGER NOT NULL DEFAULT 0,
    "valid_rows" INTEGER NOT NULL DEFAULT 0,
    "ignored_rows" INTEGER NOT NULL DEFAULT 0,
    "error_rows" INTEGER NOT NULL DEFAULT 0,
    "control_totals" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "monthly_import_files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "imports"."monthly_import_errors" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID NOT NULL,
    "batch_id" UUID NOT NULL,
    "file_type" "imports"."MonthlyImportFileType" NOT NULL,
    "source_row" INTEGER NOT NULL,
    "message" VARCHAR(500) NOT NULL,
    "raw_data" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "monthly_import_errors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analytics"."historical_kardex_entries" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID NOT NULL,
    "batch_id" UUID NOT NULL,
    "source_row" INTEGER NOT NULL,
    "item_name" VARCHAR(250) NOT NULL,
    "item_normalized" VARCHAR(250) NOT NULL,
    "movement_date" TIMESTAMPTZ(6) NOT NULL,
    "warehouse_code" VARCHAR(50) NOT NULL,
    "transaction_type" VARCHAR(120) NOT NULL,
    "document_number" VARCHAR(100),
    "source_branch" VARCHAR(80),
    "destination_branch" VARCHAR(80),
    "unit_original" VARCHAR(40),
    "unit_code" VARCHAR(30) NOT NULL,
    "quantity_in" DECIMAL(20,6) NOT NULL DEFAULT 0,
    "unit_cost_in" DECIMAL(20,6) NOT NULL DEFAULT 0,
    "total_in" DECIMAL(20,6) NOT NULL DEFAULT 0,
    "quantity_out" DECIMAL(20,6) NOT NULL DEFAULT 0,
    "unit_cost_out" DECIMAL(20,6) NOT NULL DEFAULT 0,
    "total_out" DECIMAL(20,6) NOT NULL DEFAULT 0,
    "balance_quantity" DECIMAL(20,6) NOT NULL DEFAULT 0,
    "balance_total_cost" DECIMAL(20,6) NOT NULL DEFAULT 0,
    "average_cost" DECIMAL(20,6) NOT NULL DEFAULT 0,
    "supplier_name" VARCHAR(250),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "historical_kardex_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analytics"."recipe_component_snapshots" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID NOT NULL,
    "batch_id" UUID NOT NULL,
    "source_row" INTEGER NOT NULL,
    "article_name" VARCHAR(250) NOT NULL,
    "article_normalized" VARCHAR(250) NOT NULL,
    "group_name" VARCHAR(150),
    "ingredient_name" VARCHAR(250) NOT NULL,
    "ingredient_normalized" VARCHAR(250) NOT NULL,
    "unit_original" VARCHAR(40),
    "unit_code" VARCHAR(30) NOT NULL,
    "quantity" DECIMAL(20,6) NOT NULL DEFAULT 0,
    "unit_cost" DECIMAL(20,6) NOT NULL DEFAULT 0,
    "total_cost" DECIMAL(20,6) NOT NULL DEFAULT 0,
    "waste_factor" DECIMAL(20,6) NOT NULL DEFAULT 0,
    "gross_quantity" DECIMAL(20,6) NOT NULL DEFAULT 0,
    "cost_with_waste" DECIMAL(20,6) NOT NULL DEFAULT 0,
    "recovery_factor" DECIMAL(20,6) NOT NULL DEFAULT 0,
    "final_cost" DECIMAL(20,6) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recipe_component_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analytics"."sales_lines" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID NOT NULL,
    "batch_id" UUID NOT NULL,
    "source_row" INTEGER NOT NULL,
    "group_name" VARCHAR(150),
    "subgroup_name" VARCHAR(150),
    "sale_date" TIMESTAMPTZ(6) NOT NULL,
    "document_number" VARCHAR(120) NOT NULL,
    "article_name" VARCHAR(250) NOT NULL,
    "article_normalized" VARCHAR(250) NOT NULL,
    "quantity" DECIMAL(20,6) NOT NULL DEFAULT 0,
    "unit_price" DECIMAL(20,6) NOT NULL DEFAULT 0,
    "discount_percent" DECIMAL(12,6) NOT NULL DEFAULT 0,
    "tax_rate" DECIMAL(12,6) NOT NULL DEFAULT 0,
    "subtotal" DECIMAL(20,6) NOT NULL DEFAULT 0,
    "subtotal_zero_discount" DECIMAL(20,6) NOT NULL DEFAULT 0,
    "subtotal_zero" DECIMAL(20,6) NOT NULL DEFAULT 0,
    "subtotal_taxed" DECIMAL(20,6) NOT NULL DEFAULT 0,
    "footer_discount" DECIMAL(20,6) NOT NULL DEFAULT 0,
    "taxable_subtotal_after_discount" DECIMAL(20,6) NOT NULL DEFAULT 0,
    "tax_amount" DECIMAL(20,6) NOT NULL DEFAULT 0,
    "service_amount" DECIMAL(20,6) NOT NULL DEFAULT 0,
    "total_amount" DECIMAL(20,6) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sales_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analytics"."waiter_sales_lines" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID NOT NULL,
    "batch_id" UUID NOT NULL,
    "source_row" INTEGER NOT NULL,
    "waiter_name" VARCHAR(180) NOT NULL,
    "waiter_normalized" VARCHAR(180) NOT NULL,
    "group_name" VARCHAR(150),
    "subgroup_name" VARCHAR(150),
    "article_name" VARCHAR(250) NOT NULL,
    "article_normalized" VARCHAR(250) NOT NULL,
    "quantity" DECIMAL(20,6) NOT NULL DEFAULT 0,
    "unit_value" DECIMAL(20,6) NOT NULL DEFAULT 0,
    "subtotal" DECIMAL(20,6) NOT NULL DEFAULT 0,
    "discount" DECIMAL(20,6) NOT NULL DEFAULT 0,
    "total_amount" DECIMAL(20,6) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "waiter_sales_lines_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "monthly_import_batches_org_period_status_idx" ON "imports"."monthly_import_batches"("organization_id", "period_year", "period_month", "status");

-- CreateIndex
CREATE INDEX "monthly_import_batches_org_current_status_idx" ON "imports"."monthly_import_batches"("organization_id", "is_current", "status");

-- CreateIndex
CREATE UNIQUE INDEX "monthly_import_batches_org_id_id_key" ON "imports"."monthly_import_batches"("organization_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "monthly_import_batches_org_period_version_key" ON "imports"."monthly_import_batches"("organization_id", "period_year", "period_month", "version");

-- CreateIndex
CREATE INDEX "monthly_import_files_org_type_hash_idx" ON "imports"."monthly_import_files"("organization_id", "type", "sha256");

-- CreateIndex
CREATE UNIQUE INDEX "monthly_import_files_org_batch_type_key" ON "imports"."monthly_import_files"("organization_id", "batch_id", "type");

-- CreateIndex
CREATE INDEX "monthly_import_errors_org_batch_type_idx" ON "imports"."monthly_import_errors"("organization_id", "batch_id", "file_type");

-- CreateIndex
CREATE INDEX "historical_kardex_org_item_warehouse_date_idx" ON "analytics"."historical_kardex_entries"("organization_id", "item_normalized", "warehouse_code", "movement_date");

-- CreateIndex
CREATE INDEX "historical_kardex_org_date_idx" ON "analytics"."historical_kardex_entries"("organization_id", "movement_date");

-- CreateIndex
CREATE INDEX "historical_kardex_org_transaction_date_idx" ON "analytics"."historical_kardex_entries"("organization_id", "transaction_type", "movement_date");

-- CreateIndex
CREATE UNIQUE INDEX "historical_kardex_org_batch_row_key" ON "analytics"."historical_kardex_entries"("organization_id", "batch_id", "source_row");

-- CreateIndex
CREATE INDEX "recipe_snapshots_org_batch_article_idx" ON "analytics"."recipe_component_snapshots"("organization_id", "batch_id", "article_normalized");

-- CreateIndex
CREATE INDEX "recipe_snapshots_org_ingredient_idx" ON "analytics"."recipe_component_snapshots"("organization_id", "ingredient_normalized");

-- CreateIndex
CREATE UNIQUE INDEX "recipe_snapshots_org_batch_row_key" ON "analytics"."recipe_component_snapshots"("organization_id", "batch_id", "source_row");

-- CreateIndex
CREATE INDEX "sales_lines_org_batch_date_idx" ON "analytics"."sales_lines"("organization_id", "batch_id", "sale_date");

-- CreateIndex
CREATE INDEX "sales_lines_org_article_idx" ON "analytics"."sales_lines"("organization_id", "article_normalized");

-- CreateIndex
CREATE INDEX "sales_lines_org_group_date_idx" ON "analytics"."sales_lines"("organization_id", "group_name", "sale_date");

-- CreateIndex
CREATE UNIQUE INDEX "sales_lines_org_batch_row_key" ON "analytics"."sales_lines"("organization_id", "batch_id", "source_row");

-- CreateIndex
CREATE INDEX "waiter_sales_org_batch_waiter_idx" ON "analytics"."waiter_sales_lines"("organization_id", "batch_id", "waiter_normalized");

-- CreateIndex
CREATE INDEX "waiter_sales_org_group_idx" ON "analytics"."waiter_sales_lines"("organization_id", "group_name");

-- CreateIndex
CREATE UNIQUE INDEX "waiter_sales_org_batch_row_key" ON "analytics"."waiter_sales_lines"("organization_id", "batch_id", "source_row");

-- AddForeignKey
ALTER TABLE "imports"."monthly_import_files" ADD CONSTRAINT "monthly_import_files_organization_id_batch_id_fkey" FOREIGN KEY ("organization_id", "batch_id") REFERENCES "imports"."monthly_import_batches"("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "imports"."monthly_import_errors" ADD CONSTRAINT "monthly_import_errors_organization_id_batch_id_fkey" FOREIGN KEY ("organization_id", "batch_id") REFERENCES "imports"."monthly_import_batches"("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analytics"."historical_kardex_entries" ADD CONSTRAINT "historical_kardex_entries_organization_id_batch_id_fkey" FOREIGN KEY ("organization_id", "batch_id") REFERENCES "imports"."monthly_import_batches"("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analytics"."recipe_component_snapshots" ADD CONSTRAINT "recipe_component_snapshots_organization_id_batch_id_fkey" FOREIGN KEY ("organization_id", "batch_id") REFERENCES "imports"."monthly_import_batches"("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analytics"."sales_lines" ADD CONSTRAINT "sales_lines_organization_id_batch_id_fkey" FOREIGN KEY ("organization_id", "batch_id") REFERENCES "imports"."monthly_import_batches"("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analytics"."waiter_sales_lines" ADD CONSTRAINT "waiter_sales_lines_organization_id_batch_id_fkey" FOREIGN KEY ("organization_id", "batch_id") REFERENCES "imports"."monthly_import_batches"("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- =========================================================
-- PID MONTHLY IMPORT SECURITY
-- =========================================================

REVOKE ALL ON SCHEMA imports, analytics FROM PUBLIC;
GRANT USAGE ON SCHEMA imports, analytics TO pid_app, pid_worker;

REVOKE ALL ON TABLE
  imports.monthly_import_batches,
  imports.monthly_import_files,
  imports.monthly_import_errors,
  analytics.historical_kardex_entries,
  analytics.recipe_component_snapshots,
  analytics.sales_lines,
  analytics.waiter_sales_lines
FROM PUBLIC;

GRANT SELECT, INSERT, UPDATE ON TABLE
  imports.monthly_import_batches,
  imports.monthly_import_files,
  imports.monthly_import_errors,
  analytics.historical_kardex_entries,
  analytics.recipe_component_snapshots,
  analytics.sales_lines,
  analytics.waiter_sales_lines
TO pid_app;

GRANT SELECT ON TABLE
  imports.monthly_import_batches,
  imports.monthly_import_files,
  imports.monthly_import_errors,
  analytics.historical_kardex_entries,
  analytics.recipe_component_snapshots,
  analytics.sales_lines,
  analytics.waiter_sales_lines
TO pid_worker;

REVOKE DELETE ON TABLE
  imports.monthly_import_batches,
  imports.monthly_import_files,
  imports.monthly_import_errors,
  analytics.historical_kardex_entries,
  analytics.recipe_component_snapshots,
  analytics.sales_lines,
  analytics.waiter_sales_lines
FROM pid_app, pid_worker;

ALTER TABLE imports.monthly_import_batches
ADD CONSTRAINT monthly_import_batches_period_check
CHECK (
  period_year BETWEEN 2000 AND 2200
  AND period_month BETWEEN 1 AND 12
);

ALTER TABLE imports.monthly_import_batches
ADD CONSTRAINT monthly_import_batches_counts_check
CHECK (
  version > 0
  AND total_rows >= 0
  AND valid_rows >= 0
  AND ignored_rows >= 0
  AND error_rows >= 0
);

CREATE UNIQUE INDEX monthly_import_batches_one_current_period_idx
ON imports.monthly_import_batches (
  organization_id,
  period_year,
  period_month
)
WHERE
  is_current = true
  AND status IN ('COMPLETED', 'COMPLETED_WITH_ERRORS');

ALTER TABLE imports.monthly_import_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE imports.monthly_import_batches FORCE ROW LEVEL SECURITY;
CREATE POLICY monthly_import_batches_tenant_policy
ON imports.monthly_import_batches
FOR ALL TO pid_migrator, pid_app, pid_worker
USING (organization_id = app.current_organization_id())
WITH CHECK (organization_id = app.current_organization_id());

ALTER TABLE imports.monthly_import_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE imports.monthly_import_files FORCE ROW LEVEL SECURITY;
CREATE POLICY monthly_import_files_tenant_policy
ON imports.monthly_import_files
FOR ALL TO pid_migrator, pid_app, pid_worker
USING (organization_id = app.current_organization_id())
WITH CHECK (organization_id = app.current_organization_id());

ALTER TABLE imports.monthly_import_errors ENABLE ROW LEVEL SECURITY;
ALTER TABLE imports.monthly_import_errors FORCE ROW LEVEL SECURITY;
CREATE POLICY monthly_import_errors_tenant_policy
ON imports.monthly_import_errors
FOR ALL TO pid_migrator, pid_app, pid_worker
USING (organization_id = app.current_organization_id())
WITH CHECK (organization_id = app.current_organization_id());

ALTER TABLE analytics.historical_kardex_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics.historical_kardex_entries FORCE ROW LEVEL SECURITY;
CREATE POLICY historical_kardex_entries_tenant_policy
ON analytics.historical_kardex_entries
FOR ALL TO pid_migrator, pid_app, pid_worker
USING (organization_id = app.current_organization_id())
WITH CHECK (organization_id = app.current_organization_id());

ALTER TABLE analytics.recipe_component_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics.recipe_component_snapshots FORCE ROW LEVEL SECURITY;
CREATE POLICY recipe_component_snapshots_tenant_policy
ON analytics.recipe_component_snapshots
FOR ALL TO pid_migrator, pid_app, pid_worker
USING (organization_id = app.current_organization_id())
WITH CHECK (organization_id = app.current_organization_id());

ALTER TABLE analytics.sales_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics.sales_lines FORCE ROW LEVEL SECURITY;
CREATE POLICY sales_lines_tenant_policy
ON analytics.sales_lines
FOR ALL TO pid_migrator, pid_app, pid_worker
USING (organization_id = app.current_organization_id())
WITH CHECK (organization_id = app.current_organization_id());

ALTER TABLE analytics.waiter_sales_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics.waiter_sales_lines FORCE ROW LEVEL SECURITY;
CREATE POLICY waiter_sales_lines_tenant_policy
ON analytics.waiter_sales_lines
FOR ALL TO pid_migrator, pid_app, pid_worker
USING (organization_id = app.current_organization_id())
WITH CHECK (organization_id = app.current_organization_id());
