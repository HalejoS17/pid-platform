import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EntityStatus, Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../../database/prisma/prisma.service';
import { CreateSupplierProductCostDto } from './dto/create-supplier-product-cost.dto';
import { QuerySupplierProductCostsDto } from './dto/query-supplier-product-costs.dto';
import type {
  SupplierProductCostResponse,
  SupplierProductCostsPageResponse,
} from './suppliers.types';

const costSelect = {
  id: true,
  supplierProductId: true,
  unitCost: true,
  currencyCode: true,
  taxIncluded: true,
  effectiveFrom: true,
  effectiveTo: true,
  notes: true,
  status: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.SupplierProductCostSelect;

type CostRecord = Prisma.SupplierProductCostGetPayload<{
  select: typeof costSelect;
}>;

@Injectable()
export class SupplierProductCostsService {
  constructor(private readonly prismaService: PrismaService) {}

  async create(
    organizationId: string,
    supplierProductId: string,
    dto: CreateSupplierProductCostDto,
  ): Promise<SupplierProductCostResponse> {
    try {
      return await this.prismaService.withTenant(
        organizationId,
        async (transaction) => {
          await this.assertActiveSupplierProduct(
            transaction,
            organizationId,
            supplierProductId,
          );

          const unitCost = new Prisma.Decimal(dto.unitCost);

          if (unitCost.lte(0)) {
            throw new BadRequestException(
              'unitCost must be greater than zero.',
            );
          }

          const effectiveFrom =
            dto.effectiveFrom !== undefined
              ? new Date(dto.effectiveFrom)
              : new Date();

          const current = await transaction.supplierProductCost.findFirst({
            where: {
              organizationId,
              supplierProductId,
              status: EntityStatus.ACTIVE,
              effectiveTo: null,
              deletedAt: null,
            },
            select: {
              id: true,
              effectiveFrom: true,
            },
            orderBy: {
              effectiveFrom: 'desc',
            },
          });

          if (
            current &&
            effectiveFrom.getTime() <= current.effectiveFrom.getTime()
          ) {
            throw new ConflictException(
              'The new cost effective date must be later than the current cost effective date.',
            );
          }

          if (current) {
            await transaction.supplierProductCost.updateMany({
              where: {
                id: current.id,
                organizationId,
                supplierProductId,
                effectiveTo: null,
                deletedAt: null,
              },
              data: {
                effectiveTo: effectiveFrom,
              },
            });
          }

          const cost = await transaction.supplierProductCost.create({
            data: {
              organizationId,
              supplierProductId,
              unitCost,
              currencyCode: dto.currencyCode ?? 'USD',
              taxIncluded: dto.taxIncluded ?? false,
              effectiveFrom,
              notes: dto.notes ?? null,
            },
            select: costSelect,
          });

          return this.toResponse(cost);
        },
      );
    } catch (error: unknown) {
      this.handleWriteError(error);
    }
  }

  async findAll(
    organizationId: string,
    supplierProductId: string,
    query: QuerySupplierProductCostsDto,
  ): Promise<SupplierProductCostsPageResponse> {
    const page = query.page;
    const limit = query.limit;
    const skip = (page - 1) * limit;

    return this.prismaService.withTenant(
      organizationId,
      async (transaction) => {
        await this.assertSupplierProductExists(
          transaction,
          organizationId,
          supplierProductId,
        );

        const where: Prisma.SupplierProductCostWhereInput = {
          organizationId,
          supplierProductId,
          deletedAt: null,

          ...(query.status
            ? {
                status: query.status,
              }
            : {}),
        };

        const total = await transaction.supplierProductCost.count({
          where,
        });

        const records = await transaction.supplierProductCost.findMany({
          where,
          select: costSelect,
          orderBy: [
            {
              effectiveFrom: 'desc',
            },
            {
              id: 'desc',
            },
          ],
          skip,
          take: limit,
        });

        return {
          data: records.map((record) => this.toResponse(record)),
          meta: {
            page,
            limit,
            total,
            totalPages: total === 0 ? 0 : Math.ceil(total / limit),
          },
        };
      },
    );
  }

  async findCurrent(
    organizationId: string,
    supplierProductId: string,
  ): Promise<SupplierProductCostResponse> {
    return this.prismaService.withTenant(
      organizationId,
      async (transaction) => {
        await this.assertSupplierProductExists(
          transaction,
          organizationId,
          supplierProductId,
        );

        const now = new Date();

        const cost = await transaction.supplierProductCost.findFirst({
          where: {
            organizationId,
            supplierProductId,
            status: EntityStatus.ACTIVE,
            deletedAt: null,
            effectiveFrom: {
              lte: now,
            },
            OR: [
              {
                effectiveTo: null,
              },
              {
                effectiveTo: {
                  gt: now,
                },
              },
            ],
          },
          select: costSelect,
          orderBy: {
            effectiveFrom: 'desc',
          },
        });

        if (!cost) {
          throw new NotFoundException(
            'Current supplier product cost not found.',
          );
        }

        return this.toResponse(cost);
      },
    );
  }

  private async assertActiveSupplierProduct(
    transaction: Prisma.TransactionClient,
    organizationId: string,
    supplierProductId: string,
  ): Promise<void> {
    const supplierProduct = await transaction.supplierProduct.findFirst({
      where: {
        id: supplierProductId,
        organizationId,
        status: EntityStatus.ACTIVE,
        deletedAt: null,
        supplier: {
          is: {
            status: EntityStatus.ACTIVE,
            deletedAt: null,
          },
        },
        product: {
          is: {
            status: EntityStatus.ACTIVE,
            deletedAt: null,
          },
        },
        purchaseUnit: {
          is: {
            status: EntityStatus.ACTIVE,
            deletedAt: null,
          },
        },
      },
      select: {
        id: true,
      },
    });

    if (!supplierProduct) {
      throw new NotFoundException('Active supplier product not found.');
    }
  }

  private async assertSupplierProductExists(
    transaction: Prisma.TransactionClient,
    organizationId: string,
    supplierProductId: string,
  ): Promise<void> {
    const supplierProduct = await transaction.supplierProduct.findFirst({
      where: {
        id: supplierProductId,
        organizationId,
        deletedAt: null,
      },
      select: {
        id: true,
      },
    });

    if (!supplierProduct) {
      throw new NotFoundException('Supplier product not found.');
    }
  }

  private toResponse(cost: CostRecord): SupplierProductCostResponse {
    return {
      ...cost,
      unitCost: cost.unitCost.toString(),
    };
  }

  private handleWriteError(error: unknown): never {
    if (this.hasPrismaCode(error, 'P2002')) {
      throw new ConflictException(
        'Another open active cost already exists for this supplier product.',
      );
    }

    if (this.hasPrismaCode(error, 'P2003')) {
      throw new BadRequestException(
        'The supplier product cost relationship is invalid.',
      );
    }

    throw error;
  }

  private hasPrismaCode(error: unknown, code: string): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code?: unknown }).code === code
    );
  }
}
