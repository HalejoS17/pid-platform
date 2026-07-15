import 'dotenv/config';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { PrismaPg } from '@prisma/adapter-pg';
import { Prisma, PrismaClient } from '../src/generated/prisma/client';

function createClient(connectionString: string): PrismaClient {
  const adapter = new PrismaPg({
    connectionString,
    max: 2,
    connectionTimeoutMillis: 5_000,
    idleTimeoutMillis: 30_000,
  });

  return new PrismaClient({
    adapter,
    errorFormat: 'minimal',
  });
}

async function withTenant<T>(
  client: PrismaClient,
  organizationId: string,
  operation: (transaction: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  return client.$transaction(
    async (transaction) => {
      await transaction.$queryRaw`
        SELECT set_config(
          'app.current_organization_id',
          ${organizationId},
          true
        )
      `;

      return operation(transaction);
    },
    {
      maxWait: 5_000,
      timeout: 15_000,
    },
  );
}

async function seedOrganization(
  client: PrismaClient,
  organizationId: string,
  suffix: string,
  letter: 'A' | 'B',
): Promise<void> {
  await withTenant(client, organizationId, async (transaction) => {
    await transaction.organization.create({
      data: {
        id: organizationId,
        name: `Organización RLS ${letter}`,
        slug: `rls-${letter.toLowerCase()}-${suffix}`,
      },
    });

    const restaurant = await transaction.restaurant.create({
      data: {
        organizationId,
        code: `REST-${letter}`,
        name: `Restaurante ${letter}`,
      },
    });

    const branch = await transaction.branch.create({
      data: {
        organizationId,
        restaurantId: restaurant.id,
        code: `SUC-${letter}`,
        name: `Sucursal ${letter}`,
        city: 'Quito',
      },
    });

    await transaction.warehouse.create({
      data: {
        organizationId,
        branchId: branch.id,
        code: `BOD-${letter}`,
        name: `Bodega ${letter}`,
      },
    });
  });
}

async function removeOrganization(
  client: PrismaClient,
  organizationId: string,
): Promise<void> {
  await withTenant(client, organizationId, async (transaction) => {
    await transaction.warehouse.deleteMany();
    await transaction.branch.deleteMany();
    await transaction.restaurant.deleteMany();

    await transaction.organization.deleteMany({
      where: {
        id: organizationId,
      },
    });
  });
}

async function main(): Promise<void> {
  const appDatabaseUrl = process.env.DATABASE_URL;
  const migrationDatabaseUrl = process.env.MIGRATION_DATABASE_URL;

  if (!appDatabaseUrl) {
    throw new Error('DATABASE_URL is required.');
  }

  if (!migrationDatabaseUrl) {
    throw new Error('MIGRATION_DATABASE_URL is required.');
  }

  const appClient = createClient(appDatabaseUrl);

  const migratorClient = createClient(migrationDatabaseUrl);

  const organizationAId = randomUUID();
  const organizationBId = randomUUID();
  const suffix = Date.now().toString();

  try {
    await seedOrganization(migratorClient, organizationAId, suffix, 'A');

    await seedOrganization(migratorClient, organizationBId, suffix, 'B');

    const withoutTenant = await appClient.restaurant.findMany();

    assert.equal(
      withoutTenant.length,
      0,
      'Without tenant context no rows should be visible.',
    );

    const organizationAResult = await withTenant(
      appClient,
      organizationAId,
      async (transaction) => ({
        organizations: await transaction.organization.findMany(),

        restaurants: await transaction.restaurant.findMany(),

        branches: await transaction.branch.findMany(),

        warehouses: await transaction.warehouse.findMany(),
      }),
    );

    assert.equal(organizationAResult.organizations.length, 1);

    assert.equal(organizationAResult.restaurants.length, 1);

    assert.equal(organizationAResult.branches.length, 1);

    assert.equal(organizationAResult.warehouses.length, 1);

    assert.equal(
      organizationAResult.restaurants[0].organizationId,
      organizationAId,
    );

    const organizationBResult = await withTenant(
      appClient,
      organizationBId,
      async (transaction) => ({
        organizations: await transaction.organization.findMany(),

        restaurants: await transaction.restaurant.findMany(),

        branches: await transaction.branch.findMany(),

        warehouses: await transaction.warehouse.findMany(),
      }),
    );

    assert.equal(organizationBResult.organizations.length, 1);

    assert.equal(organizationBResult.restaurants.length, 1);

    assert.equal(organizationBResult.branches.length, 1);

    assert.equal(organizationBResult.warehouses.length, 1);

    assert.equal(
      organizationBResult.restaurants[0].organizationId,
      organizationBId,
    );

    const crossTenantRows = await withTenant(
      appClient,
      organizationAId,
      (transaction) =>
        transaction.restaurant.findMany({
          where: {
            organizationId: organizationBId,
          },
        }),
    );

    assert.equal(
      crossTenantRows.length,
      0,
      'Organization A must not see organization B.',
    );

    let crossTenantInsertBlocked = false;

    try {
      await withTenant(appClient, organizationAId, (transaction) =>
        transaction.restaurant.create({
          data: {
            organizationId: organizationBId,

            code: 'INVALID',
            name: 'Cross-tenant restaurant',
          },
        }),
      );
    } catch {
      crossTenantInsertBlocked = true;
    }

    assert.equal(
      crossTenantInsertBlocked,
      true,
      'Cross-tenant insert must be rejected.',
    );

    console.log('');
    console.log('RLS TEST PASSED');
    console.log('✓ Sin organización no se visualizan filas.');
    console.log('✓ Organización A visualiza únicamente sus datos.');
    console.log('✓ Organización B visualiza únicamente sus datos.');
    console.log('✓ La consulta cruzada devolvió cero filas.');
    console.log('✓ La inserción cruzada fue rechazada.');
    console.log('');
  } finally {
    await removeOrganization(migratorClient, organizationAId).catch(
      () => undefined,
    );

    await removeOrganization(migratorClient, organizationBId).catch(
      () => undefined,
    );

    await appClient.$disconnect();
    await migratorClient.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error('');
  console.error('RLS TEST FAILED');
  console.error(error);
  process.exitCode = 1;
});
