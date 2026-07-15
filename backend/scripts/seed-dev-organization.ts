import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';

const DEVELOPMENT_ORGANIZATION_ID = '11111111-1111-4111-8111-111111111111';

async function main(): Promise<void> {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('The development seed cannot run in production.');
  }

  const connectionString = process.env.MIGRATION_DATABASE_URL;

  if (!connectionString) {
    throw new Error('MIGRATION_DATABASE_URL is required.');
  }

  const adapter = new PrismaPg({
    connectionString,
    max: 1,
    connectionTimeoutMillis: 5_000,
    idleTimeoutMillis: 30_000,
  });

  const prisma = new PrismaClient({
    adapter,
    errorFormat: 'minimal',
  });

  try {
    const organization = await prisma.$transaction(
      async (transaction) => {
        await transaction.$queryRaw`
            SELECT set_config(
              'app.current_organization_id',
              ${DEVELOPMENT_ORGANIZATION_ID},
              true
            )
          `;

        return transaction.organization.upsert({
          where: {
            id: DEVELOPMENT_ORGANIZATION_ID,
          },
          update: {
            name: 'PID Restaurante Demo',
            slug: 'pid-restaurante-demo',
            timezone: 'America/Guayaquil',
            currencyCode: 'USD',
            status: 'ACTIVE',
            deletedAt: null,
          },
          create: {
            id: DEVELOPMENT_ORGANIZATION_ID,
            name: 'PID Restaurante Demo',
            slug: 'pid-restaurante-demo',
            timezone: 'America/Guayaquil',
            currencyCode: 'USD',
            status: 'ACTIVE',
          },
        });
      },
      {
        maxWait: 5_000,
        timeout: 15_000,
      },
    );

    console.log('');
    console.log('Development organization ready.');
    console.log(`ID: ${organization.id}`);
    console.log(`Name: ${organization.name}`);
    console.log(`Slug: ${organization.slug}`);
    console.log('');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error('');
  console.error('Development organization seed failed.');
  console.error(error);
  process.exitCode = 1;
});
