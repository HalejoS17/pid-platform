import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  EntityStatus,
  Prisma,
  ProductType,
} from '../../generated/prisma/client';
import { PrismaService } from '../../database/prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { QueryProductsDto } from './dto/query-products.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductResponse, ProductsPageResponse } from './products.types';

const productSelect = {
  id: true,
  categoryId: true,
  baseUnitId: true,
  code: true,
  name: true,
  description: true,
  sku: true,
  barcode: true,
  type: true,
  trackInventory: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  category: {
    select: {
      id: true,
      code: true,
      name: true,
    },
  },
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
} satisfies Prisma.ProductSelect;

@Injectable()
export class ProductsService {
  constructor(private readonly prismaService: PrismaService) {}

  async create(
    organizationId: string,
    dto: CreateProductDto,
  ): Promise<ProductResponse> {
    try {
      return await this.prismaService.withTenant(
        organizationId,
        async (transaction) => {
          await this.assertActiveCategory(
            transaction,
            organizationId,
            dto.categoryId,
          );

          await this.assertActiveUnit(
            transaction,
            organizationId,
            dto.baseUnitId,
          );

          return transaction.product.create({
            data: {
              organizationId,
              categoryId: dto.categoryId,
              baseUnitId: dto.baseUnitId,
              code: dto.code,
              name: dto.name,
              description: dto.description ?? null,
              sku: dto.sku ?? null,
              barcode: dto.barcode ?? null,
              type: dto.type ?? ProductType.INGREDIENT,
              trackInventory: dto.trackInventory ?? true,
            },
            select: productSelect,
          });
        },
      );
    } catch (error: unknown) {
      this.handleWriteError(error);
    }
  }

  async findAll(
    organizationId: string,
    query: QueryProductsDto,
  ): Promise<ProductsPageResponse> {
    const page = query.page;
    const limit = query.limit;
    const skip = (page - 1) * limit;

    return this.prismaService.withTenant(
      organizationId,
      async (transaction) => {
        const where: Prisma.ProductWhereInput = {
          organizationId,
          deletedAt: null,

          ...(query.categoryId
            ? {
                categoryId: query.categoryId,
              }
            : {}),

          ...(query.baseUnitId
            ? {
                baseUnitId: query.baseUnitId,
              }
            : {}),

          ...(query.type
            ? {
                type: query.type,
              }
            : {}),

          ...(query.status
            ? {
                status: query.status,
              }
            : {}),

          ...(query.trackInventory !== undefined
            ? {
                trackInventory: query.trackInventory,
              }
            : {}),

          ...(query.search
            ? {
                OR: [
                  {
                    code: {
                      contains: query.search,
                      mode: 'insensitive',
                    },
                  },
                  {
                    name: {
                      contains: query.search,
                      mode: 'insensitive',
                    },
                  },
                  {
                    description: {
                      contains: query.search,
                      mode: 'insensitive',
                    },
                  },
                  {
                    sku: {
                      contains: query.search,
                      mode: 'insensitive',
                    },
                  },
                  {
                    barcode: {
                      contains: query.search,
                      mode: 'insensitive',
                    },
                  },
                  {
                    category: {
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

        const total = await transaction.product.count({
          where,
        });

        const data = await transaction.product.findMany({
          where,
          select: productSelect,
          orderBy: [
            {
              name: 'asc',
            },
            {
              id: 'asc',
            },
          ],
          skip,
          take: limit,
        });

        return {
          data,
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

  async findOne(organizationId: string, id: string): Promise<ProductResponse> {
    return this.prismaService.withTenant(
      organizationId,
      async (transaction) => {
        const product = await transaction.product.findFirst({
          where: {
            id,
            organizationId,
            deletedAt: null,
          },
          select: productSelect,
        });

        if (!product) {
          throw new NotFoundException('Product not found.');
        }

        return product;
      },
    );
  }

  async update(
    organizationId: string,
    id: string,
    dto: UpdateProductDto,
  ): Promise<ProductResponse> {
    const hasChanges = Object.values(dto).some((value) => value !== undefined);

    if (!hasChanges) {
      throw new BadRequestException('At least one field must be provided.');
    }

    try {
      return await this.prismaService.withTenant(
        organizationId,
        async (transaction) => {
          const existingProduct = await transaction.product.findFirst({
            where: {
              id,
              organizationId,
              deletedAt: null,
            },
            select: {
              id: true,
              categoryId: true,
              baseUnitId: true,
            },
          });

          if (!existingProduct) {
            throw new NotFoundException('Product not found.');
          }

          if (
            dto.categoryId !== undefined &&
            dto.categoryId !== existingProduct.categoryId
          ) {
            await this.assertActiveCategory(
              transaction,
              organizationId,
              dto.categoryId,
            );
          }

          if (
            dto.baseUnitId !== undefined &&
            dto.baseUnitId !== existingProduct.baseUnitId
          ) {
            await this.assertActiveUnit(
              transaction,
              organizationId,
              dto.baseUnitId,
            );

            const activeConversions =
              await transaction.productUnitConversion.count({
                where: {
                  organizationId,
                  productId: id,
                  status: EntityStatus.ACTIVE,
                  deletedAt: null,
                },
              });

            if (activeConversions > 0) {
              throw new ConflictException(
                'Deactivate the active unit conversions before changing the base unit.',
              );
            }
          }

          const result = await transaction.product.updateMany({
            where: {
              id,
              organizationId,
              deletedAt: null,
            },
            data: {
              ...(dto.categoryId !== undefined
                ? {
                    categoryId: dto.categoryId,
                  }
                : {}),

              ...(dto.baseUnitId !== undefined
                ? {
                    baseUnitId: dto.baseUnitId,
                  }
                : {}),

              ...(dto.code !== undefined
                ? {
                    code: dto.code,
                  }
                : {}),

              ...(dto.name !== undefined
                ? {
                    name: dto.name,
                  }
                : {}),

              ...(dto.description !== undefined
                ? {
                    description: dto.description,
                  }
                : {}),

              ...(dto.sku !== undefined
                ? {
                    sku: dto.sku,
                  }
                : {}),

              ...(dto.barcode !== undefined
                ? {
                    barcode: dto.barcode,
                  }
                : {}),

              ...(dto.type !== undefined
                ? {
                    type: dto.type,
                  }
                : {}),

              ...(dto.trackInventory !== undefined
                ? {
                    trackInventory: dto.trackInventory,
                  }
                : {}),
            },
          });

          if (result.count === 0) {
            throw new NotFoundException('Product not found.');
          }

          const product = await transaction.product.findFirst({
            where: {
              id,
              organizationId,
              deletedAt: null,
            },
            select: productSelect,
          });

          if (!product) {
            throw new NotFoundException('Product not found.');
          }

          return product;
        },
      );
    } catch (error: unknown) {
      this.handleWriteError(error);
    }
  }

  async deactivate(
    organizationId: string,
    id: string,
  ): Promise<ProductResponse> {
    return this.prismaService.withTenant(
      organizationId,
      async (transaction) => {
        const result = await transaction.product.updateMany({
          where: {
            id,
            organizationId,
            deletedAt: null,
          },
          data: {
            status: EntityStatus.INACTIVE,
          },
        });

        if (result.count === 0) {
          throw new NotFoundException('Product not found.');
        }

        await transaction.productUnitConversion.updateMany({
          where: {
            organizationId,
            productId: id,
            deletedAt: null,
          },
          data: {
            status: EntityStatus.INACTIVE,
          },
        });

        const product = await transaction.product.findFirst({
          where: {
            id,
            organizationId,
            deletedAt: null,
          },
          select: productSelect,
        });

        if (!product) {
          throw new NotFoundException('Product not found.');
        }

        return product;
      },
    );
  }

  private async assertActiveCategory(
    transaction: Prisma.TransactionClient,
    organizationId: string,
    categoryId: string,
  ): Promise<void> {
    const category = await transaction.productCategory.findFirst({
      where: {
        id: categoryId,
        organizationId,
        status: EntityStatus.ACTIVE,
        deletedAt: null,
      },
      select: {
        id: true,
      },
    });

    if (!category) {
      throw new NotFoundException('Active product category not found.');
    }
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

  private handleWriteError(error: unknown): never {
    if (this.hasPrismaCode(error, 'P2002')) {
      throw new ConflictException(
        'A product with the same code already exists.',
      );
    }

    if (this.hasPrismaCode(error, 'P2003')) {
      throw new BadRequestException('The product relationships are invalid.');
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
