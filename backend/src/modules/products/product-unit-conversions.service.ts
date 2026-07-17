import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EntityStatus, Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../../database/prisma/prisma.service';
import { CreateProductUnitConversionDto } from './dto/create-product-unit-conversion.dto';
import { QueryProductUnitConversionsDto } from './dto/query-product-unit-conversions.dto';
import { UpdateProductUnitConversionDto } from './dto/update-product-unit-conversion.dto';
import { ProductUnitConversionResponse } from './products.types';

const conversionSelect = {
  id: true,
  productId: true,
  unitId: true,
  factorToBase: true,
  isPurchaseUnit: true,
  isRecipeUnit: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  unit: {
    select: {
      id: true,
      code: true,
      name: true,
      symbol: true,
      dimension: true,
      decimalPlaces: true,
    },
  },
} satisfies Prisma.ProductUnitConversionSelect;

type ConversionRecord = Prisma.ProductUnitConversionGetPayload<{
  select: typeof conversionSelect;
}>;

@Injectable()
export class ProductUnitConversionsService {
  constructor(private readonly prismaService: PrismaService) {}

  async create(
    organizationId: string,
    productId: string,
    dto: CreateProductUnitConversionDto,
  ): Promise<ProductUnitConversionResponse> {
    try {
      return await this.prismaService.withTenant(
        organizationId,
        async (transaction) => {
          const product = await this.getActiveProduct(
            transaction,
            organizationId,
            productId,
          );

          await this.assertActiveUnit(transaction, organizationId, dto.unitId);

          this.assertUnitIsNotBaseUnit(product.baseUnitId, dto.unitId);

          const factor = this.parsePositiveFactor(dto.factorToBase);

          const conversion = await transaction.productUnitConversion.create({
            data: {
              organizationId,
              productId,
              unitId: dto.unitId,
              factorToBase: factor,
              isPurchaseUnit: dto.isPurchaseUnit ?? false,
              isRecipeUnit: dto.isRecipeUnit ?? false,
            },
            select: conversionSelect,
          });

          return this.toResponse(conversion);
        },
      );
    } catch (error: unknown) {
      this.handleWriteError(error);
    }
  }

  async findAll(
    organizationId: string,
    productId: string,
    query: QueryProductUnitConversionsDto,
  ): Promise<ProductUnitConversionResponse[]> {
    return this.prismaService.withTenant(
      organizationId,
      async (transaction) => {
        await this.assertProductExists(transaction, organizationId, productId);

        const conversions = await transaction.productUnitConversion.findMany({
          where: {
            organizationId,
            productId,
            deletedAt: null,

            ...(query.status
              ? {
                  status: query.status,
                }
              : {}),
          },
          select: conversionSelect,
          orderBy: [
            {
              unit: {
                name: 'asc',
              },
            },
            {
              id: 'asc',
            },
          ],
        });

        return conversions.map((conversion) => this.toResponse(conversion));
      },
    );
  }

  async update(
    organizationId: string,
    productId: string,
    conversionId: string,
    dto: UpdateProductUnitConversionDto,
  ): Promise<ProductUnitConversionResponse> {
    const hasChanges = Object.values(dto).some((value) => value !== undefined);

    if (!hasChanges) {
      throw new BadRequestException('At least one field must be provided.');
    }

    try {
      return await this.prismaService.withTenant(
        organizationId,
        async (transaction) => {
          const product = await this.getActiveProduct(
            transaction,
            organizationId,
            productId,
          );

          const existingConversion =
            await transaction.productUnitConversion.findFirst({
              where: {
                id: conversionId,
                productId,
                organizationId,
                deletedAt: null,
              },
              select: {
                id: true,
                unitId: true,
              },
            });

          if (!existingConversion) {
            throw new NotFoundException('Product unit conversion not found.');
          }

          if (
            dto.unitId !== undefined &&
            dto.unitId !== existingConversion.unitId
          ) {
            await this.assertActiveUnit(
              transaction,
              organizationId,
              dto.unitId,
            );

            this.assertUnitIsNotBaseUnit(product.baseUnitId, dto.unitId);
          }

          const factor =
            dto.factorToBase !== undefined
              ? this.parsePositiveFactor(dto.factorToBase)
              : undefined;

          const result = await transaction.productUnitConversion.updateMany({
            where: {
              id: conversionId,
              productId,
              organizationId,
              deletedAt: null,
            },
            data: {
              ...(dto.unitId !== undefined
                ? {
                    unitId: dto.unitId,
                  }
                : {}),

              ...(factor !== undefined
                ? {
                    factorToBase: factor,
                  }
                : {}),

              ...(dto.isPurchaseUnit !== undefined
                ? {
                    isPurchaseUnit: dto.isPurchaseUnit,
                  }
                : {}),

              ...(dto.isRecipeUnit !== undefined
                ? {
                    isRecipeUnit: dto.isRecipeUnit,
                  }
                : {}),
            },
          });

          if (result.count === 0) {
            throw new NotFoundException('Product unit conversion not found.');
          }

          const conversion = await transaction.productUnitConversion.findFirst({
            where: {
              id: conversionId,
              productId,
              organizationId,
              deletedAt: null,
            },
            select: conversionSelect,
          });

          if (!conversion) {
            throw new NotFoundException('Product unit conversion not found.');
          }

          return this.toResponse(conversion);
        },
      );
    } catch (error: unknown) {
      this.handleWriteError(error);
    }
  }

  async deactivate(
    organizationId: string,
    productId: string,
    conversionId: string,
  ): Promise<ProductUnitConversionResponse> {
    return this.prismaService.withTenant(
      organizationId,
      async (transaction) => {
        const result = await transaction.productUnitConversion.updateMany({
          where: {
            id: conversionId,
            productId,
            organizationId,
            deletedAt: null,
          },
          data: {
            status: EntityStatus.INACTIVE,
          },
        });

        if (result.count === 0) {
          throw new NotFoundException('Product unit conversion not found.');
        }

        const conversion = await transaction.productUnitConversion.findFirst({
          where: {
            id: conversionId,
            productId,
            organizationId,
            deletedAt: null,
          },
          select: conversionSelect,
        });

        if (!conversion) {
          throw new NotFoundException('Product unit conversion not found.');
        }

        return this.toResponse(conversion);
      },
    );
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

  private async assertProductExists(
    transaction: Prisma.TransactionClient,
    organizationId: string,
    productId: string,
  ): Promise<void> {
    const product = await transaction.product.findFirst({
      where: {
        id: productId,
        organizationId,
        deletedAt: null,
      },
      select: {
        id: true,
      },
    });

    if (!product) {
      throw new NotFoundException('Product not found.');
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

  private assertUnitIsNotBaseUnit(baseUnitId: string, unitId: string): void {
    if (baseUnitId === unitId) {
      throw new BadRequestException(
        'The base unit must not be registered as an additional conversion.',
      );
    }
  }

  private parsePositiveFactor(value: string): Prisma.Decimal {
    const factor = new Prisma.Decimal(value);

    if (factor.lte(0)) {
      throw new BadRequestException('factorToBase must be greater than zero.');
    }

    return factor;
  }

  private toResponse(
    conversion: ConversionRecord,
  ): ProductUnitConversionResponse {
    return {
      ...conversion,
      factorToBase: conversion.factorToBase.toString(),
    };
  }

  private handleWriteError(error: unknown): never {
    if (this.hasPrismaCode(error, 'P2002')) {
      throw new ConflictException(
        'This unit conversion already exists for the product.',
      );
    }

    if (this.hasPrismaCode(error, 'P2003')) {
      throw new BadRequestException(
        'The product unit relationship is invalid.',
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
