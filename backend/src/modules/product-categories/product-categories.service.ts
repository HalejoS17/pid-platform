import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EntityStatus, Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../../database/prisma/prisma.service';
import { CreateProductCategoryDto } from './dto/create-product-category.dto';
import { QueryProductCategoriesDto } from './dto/query-product-categories.dto';
import { UpdateProductCategoryDto } from './dto/update-product-category.dto';
import {
  ProductCategoriesPageResponse,
  ProductCategoryResponse,
} from './product-categories.types';

const productCategorySelect = {
  id: true,
  code: true,
  name: true,
  description: true,
  status: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.ProductCategorySelect;

@Injectable()
export class ProductCategoriesService {
  constructor(private readonly prismaService: PrismaService) {}

  async create(
    organizationId: string,
    dto: CreateProductCategoryDto,
  ): Promise<ProductCategoryResponse> {
    try {
      return await this.prismaService.withTenant(
        organizationId,
        (transaction) =>
          transaction.productCategory.create({
            data: {
              organizationId,
              code: dto.code,
              name: dto.name,
              description: dto.description,
            },
            select: productCategorySelect,
          }),
      );
    } catch (error: unknown) {
      this.handleWriteError(error);
    }
  }

  async findAll(
    organizationId: string,
    query: QueryProductCategoriesDto,
  ): Promise<ProductCategoriesPageResponse> {
    const page = query.page;
    const limit = query.limit;
    const skip = (page - 1) * limit;

    return this.prismaService.withTenant(
      organizationId,
      async (transaction) => {
        const where: Prisma.ProductCategoryWhereInput = {
          organizationId,
          deletedAt: null,

          ...(query.status
            ? {
                status: query.status,
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
                ],
              }
            : {}),
        };

        const total = await transaction.productCategory.count({
          where,
        });

        const data = await transaction.productCategory.findMany({
          where,
          select: productCategorySelect,
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

  async findOne(
    organizationId: string,
    id: string,
  ): Promise<ProductCategoryResponse> {
    return this.prismaService.withTenant(
      organizationId,
      async (transaction) => {
        const category = await transaction.productCategory.findFirst({
          where: {
            id,
            organizationId,
            deletedAt: null,
          },
          select: productCategorySelect,
        });

        if (!category) {
          throw new NotFoundException('Product category not found.');
        }

        return category;
      },
    );
  }

  async update(
    organizationId: string,
    id: string,
    dto: UpdateProductCategoryDto,
  ): Promise<ProductCategoryResponse> {
    const hasChanges = Object.values(dto).some((value) => value !== undefined);

    if (!hasChanges) {
      throw new BadRequestException('At least one field must be provided.');
    }

    try {
      return await this.prismaService.withTenant(
        organizationId,
        async (transaction) => {
          const result = await transaction.productCategory.updateMany({
            where: {
              id,
              organizationId,
              deletedAt: null,
            },
            data: {
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
            },
          });

          if (result.count === 0) {
            throw new NotFoundException('Product category not found.');
          }

          const category = await transaction.productCategory.findFirst({
            where: {
              id,
              organizationId,
              deletedAt: null,
            },
            select: productCategorySelect,
          });

          if (!category) {
            throw new NotFoundException('Product category not found.');
          }

          return category;
        },
      );
    } catch (error: unknown) {
      this.handleWriteError(error);
    }
  }

  async deactivate(
    organizationId: string,
    id: string,
  ): Promise<ProductCategoryResponse> {
    return this.prismaService.withTenant(
      organizationId,
      async (transaction) => {
        const result = await transaction.productCategory.updateMany({
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
          throw new NotFoundException('Product category not found.');
        }

        const category = await transaction.productCategory.findFirst({
          where: {
            id,
            organizationId,
            deletedAt: null,
          },
          select: productCategorySelect,
        });

        if (!category) {
          throw new NotFoundException('Product category not found.');
        }

        return category;
      },
    );
  }

  private handleWriteError(error: unknown): never {
    if (this.hasPrismaCode(error, 'P2002')) {
      throw new ConflictException(
        'A product category with the same code already exists.',
      );
    }

    if (this.hasPrismaCode(error, 'P2003')) {
      throw new BadRequestException(
        'The organization relationship is invalid.',
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
