-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "app";

-- CreateEnum
CREATE TYPE "app"."OrganizationStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "app"."EntityStatus" AS ENUM ('ACTIVE', 'INACTIVE');

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

-- CreateIndex
CREATE UNIQUE INDEX "organizations_slug_key" ON "app"."organizations"("slug");

-- CreateIndex
CREATE INDEX "organizations_status_idx" ON "app"."organizations"("status");

-- CreateIndex
CREATE INDEX "restaurants_organization_status_idx" ON "app"."restaurants"("organization_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "restaurants_organization_id_id_key" ON "app"."restaurants"("organization_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "restaurants_organization_code_key" ON "app"."restaurants"("organization_id", "code");

-- CreateIndex
CREATE INDEX "branches_organization_restaurant_status_idx" ON "app"."branches"("organization_id", "restaurant_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "branches_organization_id_id_key" ON "app"."branches"("organization_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "branches_restaurant_code_key" ON "app"."branches"("restaurant_id", "code");

-- CreateIndex
CREATE INDEX "warehouses_organization_branch_status_idx" ON "app"."warehouses"("organization_id", "branch_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "warehouses_branch_code_key" ON "app"."warehouses"("branch_id", "code");

-- AddForeignKey
ALTER TABLE "app"."restaurants" ADD CONSTRAINT "restaurants_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "app"."organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app"."branches" ADD CONSTRAINT "branches_organization_id_restaurant_id_fkey" FOREIGN KEY ("organization_id", "restaurant_id") REFERENCES "app"."restaurants"("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app"."warehouses" ADD CONSTRAINT "warehouses_organization_id_branch_id_fkey" FOREIGN KEY ("organization_id", "branch_id") REFERENCES "app"."branches"("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- =========================================================
-- PID: PRIVILEGIOS Y ROW-LEVEL SECURITY
-- =========================================================

REVOKE ALL
ON SCHEMA app
FROM PUBLIC;

GRANT USAGE
ON SCHEMA app
TO pid_app, pid_worker;

-- ---------------------------------------------------------
-- Contexto de organización
-- ---------------------------------------------------------

CREATE OR REPLACE FUNCTION app.current_organization_id()
RETURNS UUID
LANGUAGE SQL
STABLE
PARALLEL SAFE
AS $function$
  SELECT NULLIF(
    pg_catalog.current_setting(
      'app.current_organization_id',
      true
    ),
    ''
  )::UUID
$function$;

REVOKE ALL
ON FUNCTION app.current_organization_id()
FROM PUBLIC;

GRANT EXECUTE
ON FUNCTION app.current_organization_id()
TO pid_migrator, pid_app, pid_worker;

-- ---------------------------------------------------------
-- Permisos sobre tablas
-- ---------------------------------------------------------

REVOKE ALL
ON TABLE
  app.organizations,
  app.restaurants,
  app.branches,
  app.warehouses
FROM PUBLIC;

-- La API puede consultar y actualizar su organización,
-- pero no crear organizaciones arbitrariamente.
GRANT SELECT, UPDATE
ON TABLE app.organizations
TO pid_app;

-- La API administra las entidades de su organización.
GRANT SELECT, INSERT, UPDATE
ON TABLE
  app.restaurants,
  app.branches,
  app.warehouses
TO pid_app;

-- El worker solamente consulta estas tablas.
GRANT SELECT
ON TABLE
  app.organizations,
  app.restaurants,
  app.branches,
  app.warehouses
TO pid_worker;

REVOKE DELETE
ON TABLE
  app.organizations,
  app.restaurants,
  app.branches,
  app.warehouses
FROM pid_app, pid_worker;

-- ---------------------------------------------------------
-- RLS: organizations
-- ---------------------------------------------------------

ALTER TABLE app.organizations
ENABLE ROW LEVEL SECURITY;

ALTER TABLE app.organizations
FORCE ROW LEVEL SECURITY;

CREATE POLICY organizations_tenant_policy
ON app.organizations
FOR ALL
TO pid_migrator, pid_app, pid_worker
USING (
  id = app.current_organization_id()
)
WITH CHECK (
  id = app.current_organization_id()
);

-- ---------------------------------------------------------
-- RLS: restaurants
-- ---------------------------------------------------------

ALTER TABLE app.restaurants
ENABLE ROW LEVEL SECURITY;

ALTER TABLE app.restaurants
FORCE ROW LEVEL SECURITY;

CREATE POLICY restaurants_tenant_policy
ON app.restaurants
FOR ALL
TO pid_migrator, pid_app, pid_worker
USING (
  organization_id = app.current_organization_id()
)
WITH CHECK (
  organization_id = app.current_organization_id()
);

-- ---------------------------------------------------------
-- RLS: branches
-- ---------------------------------------------------------

ALTER TABLE app.branches
ENABLE ROW LEVEL SECURITY;

ALTER TABLE app.branches
FORCE ROW LEVEL SECURITY;

CREATE POLICY branches_tenant_policy
ON app.branches
FOR ALL
TO pid_migrator, pid_app, pid_worker
USING (
  organization_id = app.current_organization_id()
)
WITH CHECK (
  organization_id = app.current_organization_id()
);

-- ---------------------------------------------------------
-- RLS: warehouses
-- ---------------------------------------------------------

ALTER TABLE app.warehouses
ENABLE ROW LEVEL SECURITY;

ALTER TABLE app.warehouses
FORCE ROW LEVEL SECURITY;

CREATE POLICY warehouses_tenant_policy
ON app.warehouses
FOR ALL
TO pid_migrator, pid_app, pid_worker
USING (
  organization_id = app.current_organization_id()
)
WITH CHECK (
  organization_id = app.current_organization_id()
);
