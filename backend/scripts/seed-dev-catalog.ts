import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import {
  PrismaClient,
  UnitDimension,
} from '../src/generated/prisma/client';

const DEVELOPMENT_ORGANIZATION_ID =
  '11111111-1111-4111-8111-111111111111';

const units = [
  {
    code: 'UNIT',
    name: 'Unidad',
    symbol: 'un',
    dimension: UnitDimension.COUNT,
    decimalPlaces: 0,
  },
  {
    code: 'KG',
    name: 'Kilogramo',
    symbol: 'kg',
    dimension: UnitDimension.MASS,
    decimalPlaces: 3,
  },
  {
    code: 'G',
    name: 'Gramo',
    symbol: 'g',
    dimension: UnitDimension.MASS,
    decimalPlaces: 3,
  },
  {
    code: 'L',
    name: 'Litro',
    symbol: 'L',
    dimension: UnitDimension.VOLUME,
    decimalPlaces: 3,
  },
  {
    code: 'ML',
    name: 'Mililitro',
    symbol: 'ml',
    dimension: UnitDimension.VOLUME,
    decimalPlaces: 3,
  },
];

const categories = [
  {
    code: 'INGREDIENTS',
    name: 'Ingredientes',
  },
  {
    code: 'BEVERAGES',
    name: 'Bebidas',
  },
  {
    code: 'PACKAGING',
    name: 'Empaques',
  },
  {
    code: 'SUPPLIES',
    name: 'Suministros',
  },
];

async function main(): Promise<void> {
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'The development seed cannot run in production.',
    );
  }

  const connectionString =
    process.env.MIGRATION_DATABASE_URL;

  if (!connectionString) {
    throw new Error(
      'MIGRATION_DATABASE_URL is required.',
    );
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
    await prisma.$transaction(
      async (transaction) => {
        await transaction.$queryRaw`
          SELECT set_config(
            'app.current_organization_id',
            ${DEVELOPMENT_ORGANIZATION_ID},
            true
          )
        `;

        for (const unit of units) {
          await transaction.unitOfMeasure.upsert({
            where: {
              organizationId_code: {
                organizationId:
                  DEVELOPMENT_ORGANIZATION_ID,
                code: unit.code,
              },
            },
            update: {
              name: unit.name,
              symbol: unit.symbol,
              dimension: unit.dimension,
              decimalPlaces:
                unit.decimalPlaces,
              status: 'ACTIVE',
              deletedAt: null,
            },
            create: {
              organizationId:
                DEVELOPMENT_ORGANIZATION_ID,
              ...unit,
            },
          });
        }

        for (const category of categories) {
          await transaction.productCategory.upsert({
            where: {
              organizationId_code: {
                organizationId:
                  DEVELOPMENT_ORGANIZATION_ID,
                code: category.code,
              },
            },
            update: {
              name: category.name,
              status: 'ACTIVE',
              deletedAt: null,
            },
            create: {
              organizationId:
                DEVELOPMENT_ORGANIZATION_ID,
              ...category,
            },
          });
        }
      },
      {
        maxWait: 5_000,
        timeout: 15_000,
      },
    );

    console.log('');
    console.log('Development catalog ready.');
    console.log(`Units: ${units.length}`);
    console.log(
      `Categories: ${categories.length}`,
    );
    console.log('');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error('');
  console.error(
    'Development catalog seed failed.',
  );
  console.error(error);
  process.exitCode = 1;
});