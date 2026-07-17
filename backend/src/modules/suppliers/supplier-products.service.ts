import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EntityStatus, Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../../database/prisma/prisma.service';
import { CreateSupplierProductDto } from './dto/create-supplier-product.dto';
import { QuerySupplierProductsDto } from './dto/query-supplier-products.dto';
import { UpdateSupplierProductDto } from './dto/update-supplier-product.dto';
import {
  SupplierProductResponse,
  SupplierProductsPageResponse,
} from './suppliers.types';

const supplierProductSelect = {
  id: true,
  supplierId: true,
  productId: true,
  purchaseUnitId: true,
  supplierSku: true,
  minimumOrderQuantity: true,
  leadTimeDays: true,
  isPreferred: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  product: {
    select: {
      id: true,
      code: true,
      name: true,
      type: true,
      baseUnitId: true,
      baseUnit: {
        select: {
          id: true,
          code: true,
          name: true,
          symbol: true,
          dimension: true,
          decimalPlaces: true,
        },
      },
    },
  },
  purchaseUnit: {
    select: {
      id: true,
      code: true,
      name: true,
      symbol: true,
      dimension: true,
      decimalPlaces: true,
    },
  },
  _count: {
    select: {
      costs: true,
    },
  },
} satisfies Prisma.SupplierProductSelect;

type SupplierProductRecord = Prisma.SupplierProductGetPayload<{
  select: typeof supplierProductSelect;
}>;

@Injectable()
export class SupplierProductsService {
  constructor(private readonly prismaService: PrismaService) {}

  async create(
    organizationId: string,
    supplierId: string,
    dto: CreateSupplierProductDto,
  ): Promise<SupplierProductResponse> {
    try {
      return await this.prismaService.withTenant(
        organizationId,
        async (transaction) => {
          await this.assertActiveSupplier(
            transaction,
            organizationId,
            supplierId,
          );

          const product = await this.getActiveProduct(
            transaction,
            organizationId,
            dto.productId,
          );

          await this.assertActiveUnit(
            transaction,
            organizationId,
            dto.purchaseUnitId,
          );

          await this.assertPurchaseUnitAllowed(
            transaction,
            organizationId,
            dto.productId,
            product.baseUnitId,
            dto.purchaseUnitId,
          );

          if (dto.isPreferred === true) {
            await this.assertPreferredAvailable(
              transaction,
              organizationId,
              dto.productId,
            );
          }

          const minimumOrderQuantity = this.parsePositiveDecimal(
            dto.minimumOrderQuantity ?? '1',
            'minimumOrderQuantity',
          );

          const record = await transaction.supplierProduct.create({
            data: {
              organizationId,
              supplierId,
              productId: dto.productId,
              purchaseUnitId: dto.purchaseUnitId,
              supplierSku: dto.supplierSku ?? null,
              minimumOrderQuantity,
              leadTimeDays: dto.leadTimeDays ?? 0,
              isPreferred: dto.isPreferred ?? false,
            },
            select: supplierProductSelect,
          });

          return this.toResponse(record);
        },
      );
    } catch (error: unknown) {
      this.handleWriteError(error);
    }
  }

  async findAll(
    organizationId: string,
    supplierId: string,
    query: QuerySupplierProductsDto,
  ): Promise<SupplierProductsPageResponse> {
    const page = query.page;
    const limit = query.limit;
    const skip = (page - 1) * limit;

    return this.prismaService.withTenant(
      organizationId,
      async (transaction) => {
        await this.assertSupplierExists(
          transaction,
          organizationId,
          supplierId,
        );

        const where: Prisma.SupplierProductWhereInput = {
          organizationId,
          supplierId,
          deletedAt: null,

          ...(query.productId
            ? {
                productId: query.productId,
              }
            : {}),

          ...(query.isPreferred !== undefined
            ? {
                isPreferred: query.isPreferred,
              }
            : {}),

          ...(query.status
            ? {
                status: query.status,
              }
            : {}),

          ...(query.search
            ? {
                OR: [
                  {
                    supplierSku: {
                      contains: query.search,
                      mode: 'insensitive',
                    },
                  },
                  {
                    product: {
                      is: {
                        code: {
                          contains: query.search,
                          mode: 'insensitive',
                        },
                      },
                    },
                  },
                  {
                    product: {
                      is: {
                        name: {
                          contains: query.search,
                          mode: 'insensitive',
                        },
                      },
                    },
                  },
                ],
              }
            : {}),
        };

        const total = await transaction.supplierProduct.count({
          where,
        });

        const records = await transaction.supplierProduct.findMany({
          where,
          select: supplierProductSelect,
          orderBy: [
            {
              isPreferred: 'desc',
            },
            {
              product: {
                name: 'asc',
              },
            },
            {
              id: 'asc',
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

  async findOne(
    organizationId: string,
    supplierId: string,
    supplierProductId: string,
  ): Promise<SupplierProductResponse> {
    return this.prismaService.withTenant(
      organizationId,
      async (transaction) => {
        const record = await transaction.supplierProduct.findFirst({
          where: {
            id: supplierProductId,
            supplierId,
            organizationId,
            deletedAt: null,
          },
          select: supplierProductSelect,
        });

        if (!record) {
          throw new NotFoundException('Supplier product not found.');
        }

        return this.toResponse(record);
      },
    );
  }

  async update(
    organizationId: string,
    supplierId: string,
    supplierProductId: string,
    dto: UpdateSupplierProductDto,
  ): Promise<SupplierProductResponse> {
    const hasChanges = Object.values(dto).some((value) => value !== undefined);

    if (!hasChanges) {
      throw new BadRequestException('At least one field must be provided.');
    }

    try {
      return await this.prismaService.withTenant(
        organizationId,
        async (transaction) => {
          await this.assertActiveSupplier(
            transaction,
            organizationId,
            supplierId,
          );

          const existing = await transaction.supplierProduct.findFirst({
            where: {
              id: supplierProductId,
              supplierId,
              organizationId,
              deletedAt: null,
            },
            select: {
              id: true,
              productId: true,
              purchaseUnitId: true,
              isPreferred: true,
            },
          });

          if (!existing) {
            throw new NotFoundException('Supplier product not found.');
          }

          const nextProductId = dto.productId ?? existing.productId;

          const nextPurchaseUnitId =
            dto.purchaseUnitId ?? existing.purchaseUnitId;

          const relationshipChanged =
            nextProductId !== existing.productId ||
            nextPurchaseUnitId !== existing.purchaseUnitId;

          if (relationshipChanged) {
            const costCount = await transaction.supplierProductCost.count({
              where: {
                organizationId,
                supplierProductId,
                deletedAt: null,
              },
            });

            if (costCount > 0) {
              throw new ConflictException(
                'The product or purchase unit cannot be changed after costs have been registered.',
              );
            }
          }

          const product = await this.getActiveProduct(
            transaction,
            organizationId,
            nextProductId,
          );

          await this.assertActiveUnit(
            transaction,
            organizationId,
            nextPurchaseUnitId,
          );

          await this.assertPurchaseUnitAllowed(
            transaction,
            organizationId,
            nextProductId,
            product.baseUnitId,
            nextPurchaseUnitId,
          );

          const nextIsPreferred = dto.isPreferred ?? existing.isPreferred;

          if (nextIsPreferred) {
            await this.assertPreferredAvailable(
              transaction,
              organizationId,
              nextProductId,
              supplierProductId,
            );
          }

          const minimumOrderQuantity =
            dto.minimumOrderQuantity !== undefined
              ? this.parsePositiveDecimal(
                  dto.minimumOrderQuantity,
                  'minimumOrderQuantity',
                )
              : undefined;

          const result = await transaction.supplierProduct.updateMany({
            where: {
              id: supplierProductId,
              supplierId,
              organizationId,
              deletedAt: null,
            },
            data: {
              ...(dto.productId !== undefined
                ? {
                    productId: dto.productId,
                  }
                : {}),

              ...(dto.purchaseUnitId !== undefined
                ? {
                    purchaseUnitId: dto.purchaseUnitId,
                  }
                : {}),

              ...(dto.supplierSku !== undefined
                ? {
                    supplierSku: dto.supplierSku,
                  }
                : {}),

              ...(minimumOrderQuantity !== undefined
                ? {
                    minimumOrderQuantity,
                  }
                : {}),

              ...(dto.leadTimeDays !== undefined
                ? {
                    leadTimeDays: dto.leadTimeDays,
                  }
                : {}),

              ...(dto.isPreferred !== undefined
                ? {
                    isPreferred: dto.isPreferred,
                  }
                : {}),
            },
          });

          if (result.count === 0) {
            throw new NotFoundException('Supplier product not found.');
          }

          const record = await transaction.supplierProduct.findFirst({
            where: {
              id: supplierProductId,
              supplierId,
              organizationId,
              deletedAt: null,
            },
            select: supplierProductSelect,
          });

          if (!record) {
            throw new NotFoundException('Supplier product not found.');
          }

          return this.toResponse(record);
        },
      );
    } catch (error: unknown) {
      this.handleWriteError(error);
    }
  }

  async deactivate(
    organizationId: string,
    supplierId: string,
    supplierProductId: string,
  ): Promise<SupplierProductResponse> {
    return this.prismaService.withTenant(
      organizationId,
      async (transaction) => {
        const existing = await transaction.supplierProduct.findFirst({
          where: {
            id: supplierProductId,
            supplierId,
            organizationId,
            deletedAt: null,
          },
          select: {
            id: true,
          },
        });

        if (!existing) {
          throw new NotFoundException('Supplier product not found.');
        }

        await transaction.supplierProductCost.updateMany({
          where: {
            organizationId,
            supplierProductId,
            deletedAt: null,
          },
          data: {
            status: EntityStatus.INACTIVE,
          },
        });

        await transaction.supplierProduct.updateMany({
          where: {
            id: supplierProductId,
            supplierId,
            organizationId,
            deletedAt: null,
          },
          data: {
            status: EntityStatus.INACTIVE,
          },
        });

        const record = await transaction.supplierProduct.findFirst({
          where: {
            id: supplierProductId,
            supplierId,
            organizationId,
            deletedAt: null,
          },
          select: supplierProductSelect,
        });

        if (!record) {
          throw new NotFoundException('Supplier product not found.');
        }

        return this.toResponse(record);
      },
    );
  }

  private async assertActiveSupplier(
    transaction: Prisma.TransactionClient,
    organizationId: string,
    supplierId: string,
  ): Promise<void> {
    const supplier = await transaction.supplier.findFirst({
      where: {
        id: supplierId,
        organizationId,
        status: EntityStatus.ACTIVE,
        deletedAt: null,
      },
      select: {
        id: true,
      },
    });

    if (!supplier) {
      throw new NotFoundException('Active supplier not found.');
    }
  }

  private async assertSupplierExists(
    transaction: Prisma.TransactionClient,
    organizationId: string,
    supplierId: string,
  ): Promise<void> {
    const supplier = await transaction.supplier.findFirst({
      where: {
        id: supplierId,
        organizationId,
        deletedAt: null,
      },
      select: {
        id: true,
      },
    });

    if (!supplier) {
      throw new NotFoundException('Supplier not found.');
    }
  }

  private async getActiveProduct(
    transaction: Prisma.TransactionClient,
    organizationId: string,
    productId: string,
  ): Promise<{
    id: string;
    baseUnitId: string;
  }> {
    const product = await transaction.product.findFirst({
      where: {
        id: productId,
        organizationId,
        status: EntityStatus.ACTIVE,
        deletedAt: null,
      },
      select: {
        id: true,
        baseUnitId: true,
      },
    });

    if (!product) {
      throw new NotFoundException('Active product not found.');
    }

    return product;
  }

  private async assertActiveUnit(
    transaction: Prisma.TransactionClient,
    organizationId: string,
    unitId: string,
  ): Promise<void> {
    const unit = await transaction.unitOfMeasure.findFirst({
      where: {
        id: unitId,
        organizationId,
        status: EntityStatus.ACTIVE,
        deletedAt: null,
      },
      select: {
        id: true,
      },
    });

    if (!unit) {
      throw new NotFoundException('Active unit of measure not found.');
    }
  }

  private async assertPurchaseUnitAllowed(
    transaction: Prisma.TransactionClient,
    organizationId: string,
    productId: string,
    baseUnitId: string,
    purchaseUnitId: string,
  ): Promise<void> {
    if (baseUnitId === purchaseUnitId) {
      return;
    }

    const conversion = await transaction.productUnitConversion.findFirst({
      where: {
        organizationId,
        productId,
        unitId: purchaseUnitId,
        status: EntityStatus.ACTIVE,
        deletedAt: null,
      },
      select: {
        id: true,
      },
    });

    if (!conversion) {
      throw new BadRequestException(
        'The purchase unit must be the base unit or an active conversion for the product.',
      );
    }
  }

  private async assertPreferredAvailable(
    transaction: Prisma.TransactionClient,
    organizationId: string,
    productId: string,
    excludedId?: string,
  ): Promise<void> {
    const preferred = await transaction.supplierProduct.findFirst({
      where: {
        organizationId,
        productId,
        isPreferred: true,
        status: EntityStatus.ACTIVE,
        deletedAt: null,

        ...(excludedId
          ? {
              id: {
                not: excludedId,
              },
            }
          : {}),
      },
      select: {
        id: true,
      },
    });

    if (preferred) {
      throw new ConflictException(
        'The product already has an active preferred supplier.',
      );
    }
  }

  private parsePositiveDecimal(
    value: string,
    fieldName: string,
  ): Prisma.Decimal {
    const decimal = new Prisma.Decimal(value);

    if (decimal.lte(0)) {
      throw new BadRequestException(`${fieldName} must be greater than zero.`);
    }

    return decimal;
  }

  private toResponse(record: SupplierProductRecord): SupplierProductResponse {
    return {
      id: record.id,
      supplierId: record.supplierId,
      productId: record.productId,
      purchaseUnitId: record.purchaseUnitId,
      supplierSku: record.supplierSku,
      minimumOrderQuantity: record.minimumOrderQuantity.toString(),
      leadTimeDays: record.leadTimeDays,
      isPreferred: record.isPreferred,
      status: record.status,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      product: record.product,
      purchaseUnit: record.purchaseUnit,
      costCount: record._count.costs,
    };
  }

  private handleWriteError(error: unknown): never {
    if (this.hasPrismaCode(error, 'P2002')) {
      throw new ConflictException(
        'The supplier product already exists or the product already has a preferred supplier.',
      );
    }

    if (this.hasPrismaCode(error, 'P2003')) {
      throw new BadRequestException(
        'The supplier product relationships are invalid.',
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
