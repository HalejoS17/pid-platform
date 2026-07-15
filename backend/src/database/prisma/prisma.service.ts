import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { Prisma, PrismaClient } from '../../generated/prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor(configService: ConfigService) {
    const adapter = new PrismaPg({
      connectionString: configService.getOrThrow<string>('DATABASE_URL'),

      max: configService.getOrThrow<number>('DATABASE_POOL_MAX'),

      connectionTimeoutMillis: configService.getOrThrow<number>(
        'DATABASE_CONNECTION_TIMEOUT_MS',
      ),

      idleTimeoutMillis: configService.getOrThrow<number>(
        'DATABASE_IDLE_TIMEOUT_MS',
      ),
    });

    super({
      adapter,
      errorFormat: 'minimal',
    });
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }

  async withTenant<T>(
    organizationId: string,
    operation: (transaction: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    if (!organizationId) {
      throw new Error('organizationId is required for tenant operations.');
    }

    return this.$transaction(
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
}
