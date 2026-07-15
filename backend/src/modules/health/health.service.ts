import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma/prisma.service';

export interface HealthResponse {
  status: 'ok';
  service: string;
  database: {
    status: 'up';
    latencyMs: number;
  };
  timestamp: string;
}

@Injectable()
export class HealthService {
  constructor(private readonly prismaService: PrismaService) {}

  async check(): Promise<HealthResponse> {
    const startedAt = Date.now();

    try {
      await this.prismaService.$queryRaw`
        SELECT 1 AS result
      `;

      return {
        status: 'ok',
        service: 'pid-core-api',
        database: {
          status: 'up',
          latencyMs: Date.now() - startedAt,
        },
        timestamp: new Date().toISOString(),
      };
    } catch {
      throw new ServiceUnavailableException({
        status: 'error',
        service: 'pid-core-api',
        database: {
          status: 'down',
        },
        timestamp: new Date().toISOString(),
      });
    }
  }
}
