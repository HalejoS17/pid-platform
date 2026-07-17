import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EntityStatus, Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../../database/prisma/prisma.service';
import { CreateWarehouseDto } from './dto/create-warehouse.dto';
import { QueryWarehousesDto } from './dto/query-warehouses.dto';
import { UpdateWarehouseDto } from './dto/update-warehouse.dto';
import { WarehouseResponse, WarehousesPageResponse } from './warehouses.types';

const warehouseSelect = {
  id: true,
  branchId: true,
  code: true,
  name: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  branch: {
    select: {
      id: true,
      restaurantId: true,
      code: true,
      name: true,
      restaurant: {
        select: {
          id: true,
          code: true,
          name: true,
        },
      },
    },
  },
} satisfies Prisma.WarehouseSelect;

@Injectable()
export class WarehousesService {
  constructor(private readonly prismaService: PrismaService) {}

  async create(
    organizationId: string,
    dto: CreateWarehouseDto,
  ): Promise<WarehouseResponse> {
    try {
      return await this.prismaService.withTenant(
        organizationId,
        async (transaction) => {
          await this.assertActiveBranch(
            transaction,
            organizationId,
            dto.branchId,
          );

          return transaction.warehouse.create({
            data: {
              organizationId,
              branchId: dto.branchId,
              code: dto.code,
              name: dto.name,
            },
            select: warehouseSelect,
          });
        },
      );
    } catch (error: unknown) {
      this.handleWriteError(error);
    }
  }

  async findAll(
    organizationId: string,
    query: QueryWarehousesDto,
  ): Promise<WarehousesPageResponse> {
    const page = query.page;
    const limit = query.limit;
    const skip = (page - 1) * limit;

    return this.prismaService.withTenant(
      organizationId,
      async (transaction) => {
        const where: Prisma.WarehouseWhereInput = {
          organizationId,
          deletedAt: null,

          ...(query.branchId
            ? {
                branchId: query.branchId,
              }
            : {}),

          ...(query.restaurantId
            ? {
                branch: {
                  restaurantId: query.restaurantId,
                },
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
                    branch: {
                      name: {
                        contains: query.search,
                        mode: 'insensitive',
                      },
                    },
                  },
                ],
              }
            : {}),
        };

        const total = await transaction.warehouse.count({
          where,
        });

        const data = await transaction.warehouse.findMany({
          where,
          select: warehouseSelect,
          orderBy: [
            {
              createdAt: 'desc',
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
  ): Promise<WarehouseResponse> {
    return this.prismaService.withTenant(
      organizationId,
      async (transaction) => {
        const warehouse = await transaction.warehouse.findFirst({
          where: {
            id,
            organizationId,
            deletedAt: null,
          },
          select: warehouseSelect,
        });

        if (!warehouse) {
          throw new NotFoundException('Warehouse not found.');
        }

        return warehouse;
      },
    );
  }

  async update(
    organizationId: string,
    id: string,
    dto: UpdateWarehouseDto,
  ): Promise<WarehouseResponse> {
    const hasChanges = Object.values(dto).some((value) => value !== undefined);

    if (!hasChanges) {
      throw new BadRequestException('At least one field must be provided.');
    }

    try {
      return await this.prismaService.withTenant(
        organizationId,
        async (transaction) => {
          const existingWarehouse = await transaction.warehouse.findFirst({
            where: {
              id,
              organizationId,
              deletedAt: null,
            },
            select: {
              id: true,
              branchId: true,
            },
          });

          if (!existingWarehouse) {
            throw new NotFoundException('Warehouse not found.');
          }

          if (
            dto.branchId !== undefined &&
            dto.branchId !== existingWarehouse.branchId
          ) {
            await this.assertActiveBranch(
              transaction,
              organizationId,
              dto.branchId,
            );
          }

          const result = await transaction.warehouse.updateMany({
            where: {
              id,
              organizationId,
              deletedAt: null,
            },
            data: {
              ...(dto.branchId !== undefined
                ? {
                    branchId: dto.branchId,
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
            },
          });

          if (result.count === 0) {
            throw new NotFoundException('Warehouse not found.');
          }

          const warehouse = await transaction.warehouse.findFirst({
            where: {
              id,
              organizationId,
              deletedAt: null,
            },
            select: warehouseSelect,
          });

          if (!warehouse) {
            throw new NotFoundException('Warehouse not found.');
          }

          return warehouse;
        },
      );
    } catch (error: unknown) {
      this.handleWriteError(error);
    }
  }

  async deactivate(
    organizationId: string,
    id: string,
  ): Promise<WarehouseResponse> {
    return this.prismaService.withTenant(
      organizationId,
      async (transaction) => {
        const result = await transaction.warehouse.updateMany({
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
          throw new NotFoundException('Warehouse not found.');
        }

        const warehouse = await transaction.warehouse.findFirst({
          where: {
            id,
            organizationId,
            deletedAt: null,
          },
          select: warehouseSelect,
        });

        if (!warehouse) {
          throw new NotFoundException('Warehouse not found.');
        }

        return warehouse;
      },
    );
  }

  private async assertActiveBranch(
    transaction: Prisma.TransactionClient,
    organizationId: string,
    branchId: string,
  ): Promise<void> {
    const branch = await transaction.branch.findFirst({
      where: {
        id: branchId,
        organizationId,
        status: EntityStatus.ACTIVE,
        deletedAt: null,
      },
      select: {
        id: true,
        restaurantId: true,
      },
    });

    if (!branch) {
      throw new NotFoundException('Active branch not found.');
    }

    const restaurant = await transaction.restaurant.findFirst({
      where: {
        id: branch.restaurantId,
        organizationId,
        status: EntityStatus.ACTIVE,
        deletedAt: null,
      },
      select: {
        id: true,
      },
    });

    if (!restaurant) {
      throw new NotFoundException('The branch restaurant is not active.');
    }
  }

  private handleWriteError(error: unknown): never {
    if (this.hasPrismaCode(error, 'P2002')) {
      throw new ConflictException(
        'A warehouse with the same code already exists for this branch.',
      );
    }

    if (this.hasPrismaCode(error, 'P2003')) {
      throw new BadRequestException('The branch relationship is invalid.');
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
