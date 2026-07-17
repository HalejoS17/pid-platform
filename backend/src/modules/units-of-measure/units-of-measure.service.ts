import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EntityStatus, Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../../database/prisma/prisma.service';
import { CreateUnitOfMeasureDto } from './dto/create-unit-of-measure.dto';
import { QueryUnitsOfMeasureDto } from './dto/query-units-of-measure.dto';
import { UpdateUnitOfMeasureDto } from './dto/update-unit-of-measure.dto';
import {
  UnitOfMeasureResponse,
  UnitsOfMeasurePageResponse,
} from './units-of-measure.types';

const unitOfMeasureSelect = {
  id: true,
  code: true,
  name: true,
  symbol: true,
  dimension: true,
  decimalPlaces: true,
  status: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UnitOfMeasureSelect;

@Injectable()
export class UnitsOfMeasureService {
  constructor(private readonly prismaService: PrismaService) {}

  async create(
    organizationId: string,
    dto: CreateUnitOfMeasureDto,
  ): Promise<UnitOfMeasureResponse> {
    try {
      return await this.prismaService.withTenant(
        organizationId,
        (transaction) =>
          transaction.unitOfMeasure.create({
            data: {
              organizationId,
              code: dto.code,
              name: dto.name,
              symbol: dto.symbol,
              dimension: dto.dimension,
              decimalPlaces: dto.decimalPlaces,
            },
            select: unitOfMeasureSelect,
          }),
      );
    } catch (error: unknown) {
      this.handleWriteError(error);
    }
  }

  async findAll(
    organizationId: string,
    query: QueryUnitsOfMeasureDto,
  ): Promise<UnitsOfMeasurePageResponse> {
    const page = query.page;
    const limit = query.limit;
    const skip = (page - 1) * limit;

    return this.prismaService.withTenant(
      organizationId,
      async (transaction) => {
        const where: Prisma.UnitOfMeasureWhereInput = {
          organizationId,
          deletedAt: null,

          ...(query.dimension
            ? {
                dimension: query.dimension,
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
                    symbol: {
                      contains: query.search,
                      mode: 'insensitive',
                    },
                  },
                ],
              }
            : {}),
        };

        const total = await transaction.unitOfMeasure.count({
          where,
        });

        const data = await transaction.unitOfMeasure.findMany({
          where,
          select: unitOfMeasureSelect,
          orderBy: [
            {
              dimension: 'asc',
            },
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
  ): Promise<UnitOfMeasureResponse> {
    return this.prismaService.withTenant(
      organizationId,
      async (transaction) => {
        const unit = await transaction.unitOfMeasure.findFirst({
          where: {
            id,
            organizationId,
            deletedAt: null,
          },
          select: unitOfMeasureSelect,
        });

        if (!unit) {
          throw new NotFoundException('Unit of measure not found.');
        }

        return unit;
      },
    );
  }

  async update(
    organizationId: string,
    id: string,
    dto: UpdateUnitOfMeasureDto,
  ): Promise<UnitOfMeasureResponse> {
    const hasChanges = Object.values(dto).some((value) => value !== undefined);

    if (!hasChanges) {
      throw new BadRequestException('At least one field must be provided.');
    }

    try {
      return await this.prismaService.withTenant(
        organizationId,
        async (transaction) => {
          const result = await transaction.unitOfMeasure.updateMany({
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

              ...(dto.symbol !== undefined
                ? {
                    symbol: dto.symbol,
                  }
                : {}),

              ...(dto.dimension !== undefined
                ? {
                    dimension: dto.dimension,
                  }
                : {}),

              ...(dto.decimalPlaces !== undefined
                ? {
                    decimalPlaces: dto.decimalPlaces,
                  }
                : {}),
            },
          });

          if (result.count === 0) {
            throw new NotFoundException('Unit of measure not found.');
          }

          const unit = await transaction.unitOfMeasure.findFirst({
            where: {
              id,
              organizationId,
              deletedAt: null,
            },
            select: unitOfMeasureSelect,
          });

          if (!unit) {
            throw new NotFoundException('Unit of measure not found.');
          }

          return unit;
        },
      );
    } catch (error: unknown) {
      this.handleWriteError(error);
    }
  }

  async deactivate(
    organizationId: string,
    id: string,
  ): Promise<UnitOfMeasureResponse> {
    return this.prismaService.withTenant(
      organizationId,
      async (transaction) => {
        const result = await transaction.unitOfMeasure.updateMany({
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
          throw new NotFoundException('Unit of measure not found.');
        }

        const unit = await transaction.unitOfMeasure.findFirst({
          where: {
            id,
            organizationId,
            deletedAt: null,
          },
          select: unitOfMeasureSelect,
        });

        if (!unit) {
          throw new NotFoundException('Unit of measure not found.');
        }

        return unit;
      },
    );
  }

  private handleWriteError(error: unknown): never {
    if (this.hasPrismaCode(error, 'P2002')) {
      throw new ConflictException(
        'A unit of measure with the same code already exists.',
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
