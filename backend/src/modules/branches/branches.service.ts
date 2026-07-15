import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EntityStatus, Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../../database/prisma/prisma.service';
import { CreateBranchDto } from './dto/create-branch.dto';
import { QueryBranchesDto } from './dto/query-branches.dto';
import { UpdateBranchDto } from './dto/update-branch.dto';
import { BranchesPageResponse, BranchResponse } from './branches.types';

const branchSelect = {
  id: true,
  restaurantId: true,
  code: true,
  name: true,
  city: true,
  address: true,
  timezone: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  restaurant: {
    select: {
      id: true,
      code: true,
      name: true,
    },
  },
} satisfies Prisma.BranchSelect;

@Injectable()
export class BranchesService {
  constructor(private readonly prismaService: PrismaService) {}

  async create(
    organizationId: string,
    dto: CreateBranchDto,
  ): Promise<BranchResponse> {
    try {
      return await this.prismaService.withTenant(
        organizationId,
        async (transaction) => {
          await this.assertActiveRestaurant(
            transaction,
            organizationId,
            dto.restaurantId,
          );

          return transaction.branch.create({
            data: {
              organizationId,
              restaurantId: dto.restaurantId,
              code: dto.code,
              name: dto.name,
              city: dto.city,
              address: dto.address,
              timezone: dto.timezone ?? 'America/Guayaquil',
            },
            select: branchSelect,
          });
        },
      );
    } catch (error: unknown) {
      this.handleWriteError(error);
    }
  }

  async findAll(
    organizationId: string,
    query: QueryBranchesDto,
  ): Promise<BranchesPageResponse> {
    const page = query.page;
    const limit = query.limit;
    const skip = (page - 1) * limit;

    return this.prismaService.withTenant(
      organizationId,
      async (transaction) => {
        const where: Prisma.BranchWhereInput = {
          organizationId,
          deletedAt: null,

          ...(query.restaurantId
            ? {
                restaurantId: query.restaurantId,
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
                    city: {
                      contains: query.search,
                      mode: 'insensitive',
                    },
                  },
                ],
              }
            : {}),
        };

        const total = await transaction.branch.count({
          where,
        });

        const data = await transaction.branch.findMany({
          where,
          select: branchSelect,
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

  async findOne(organizationId: string, id: string): Promise<BranchResponse> {
    return this.prismaService.withTenant(
      organizationId,
      async (transaction) => {
        const branch = await transaction.branch.findFirst({
          where: {
            id,
            organizationId,
            deletedAt: null,
          },
          select: branchSelect,
        });

        if (!branch) {
          throw new NotFoundException('Branch not found.');
        }

        return branch;
      },
    );
  }

  async update(
    organizationId: string,
    id: string,
    dto: UpdateBranchDto,
  ): Promise<BranchResponse> {
    const hasChanges = Object.values(dto).some((value) => value !== undefined);

    if (!hasChanges) {
      throw new BadRequestException('At least one field must be provided.');
    }

    try {
      return await this.prismaService.withTenant(
        organizationId,
        async (transaction) => {
          const existingBranch = await transaction.branch.findFirst({
            where: {
              id,
              organizationId,
              deletedAt: null,
            },
            select: {
              id: true,
              restaurantId: true,
            },
          });

          if (!existingBranch) {
            throw new NotFoundException('Branch not found.');
          }

          if (
            dto.restaurantId !== undefined &&
            dto.restaurantId !== existingBranch.restaurantId
          ) {
            await this.assertActiveRestaurant(
              transaction,
              organizationId,
              dto.restaurantId,
            );
          }

          const result = await transaction.branch.updateMany({
            where: {
              id,
              organizationId,
              deletedAt: null,
            },
            data: {
              ...(dto.restaurantId !== undefined
                ? {
                    restaurantId: dto.restaurantId,
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

              ...(dto.city !== undefined
                ? {
                    city: dto.city,
                  }
                : {}),

              ...(dto.address !== undefined
                ? {
                    address: dto.address,
                  }
                : {}),

              ...(dto.timezone !== undefined
                ? {
                    timezone: dto.timezone,
                  }
                : {}),
            },
          });

          if (result.count === 0) {
            throw new NotFoundException('Branch not found.');
          }

          const branch = await transaction.branch.findFirst({
            where: {
              id,
              organizationId,
              deletedAt: null,
            },
            select: branchSelect,
          });

          if (!branch) {
            throw new NotFoundException('Branch not found.');
          }

          return branch;
        },
      );
    } catch (error: unknown) {
      this.handleWriteError(error);
    }
  }

  async deactivate(
    organizationId: string,
    id: string,
  ): Promise<BranchResponse> {
    return this.prismaService.withTenant(
      organizationId,
      async (transaction) => {
        const result = await transaction.branch.updateMany({
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
          throw new NotFoundException('Branch not found.');
        }

        const branch = await transaction.branch.findFirst({
          where: {
            id,
            organizationId,
            deletedAt: null,
          },
          select: branchSelect,
        });

        if (!branch) {
          throw new NotFoundException('Branch not found.');
        }

        return branch;
      },
    );
  }

  private async assertActiveRestaurant(
    transaction: Prisma.TransactionClient,
    organizationId: string,
    restaurantId: string,
  ): Promise<void> {
    const restaurant = await transaction.restaurant.findFirst({
      where: {
        id: restaurantId,
        organizationId,
        status: EntityStatus.ACTIVE,
        deletedAt: null,
      },
      select: {
        id: true,
      },
    });

    if (!restaurant) {
      throw new NotFoundException('Active restaurant not found.');
    }
  }

  private handleWriteError(error: unknown): never {
    if (this.hasPrismaCode(error, 'P2002')) {
      throw new ConflictException(
        'A branch with the same code already exists for this restaurant.',
      );
    }

    if (this.hasPrismaCode(error, 'P2003')) {
      throw new BadRequestException('The restaurant relationship is invalid.');
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
