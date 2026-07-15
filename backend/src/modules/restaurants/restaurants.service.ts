import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EntityStatus, Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../../database/prisma/prisma.service';
import { CreateRestaurantDto } from './dto/create-restaurant.dto';
import { QueryRestaurantsDto } from './dto/query-restaurants.dto';
import { UpdateRestaurantDto } from './dto/update-restaurant.dto';
import {
  RestaurantResponse,
  RestaurantsPageResponse,
} from './restaurants.types';

const restaurantSelect = {
  id: true,
  code: true,
  name: true,
  status: true,
  timezone: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.RestaurantSelect;

@Injectable()
export class RestaurantsService {
  constructor(private readonly prismaService: PrismaService) {}

  async create(
    organizationId: string,
    dto: CreateRestaurantDto,
  ): Promise<RestaurantResponse> {
    try {
      return await this.prismaService.withTenant(
        organizationId,
        (transaction) =>
          transaction.restaurant.create({
            data: {
              organizationId,
              code: dto.code,
              name: dto.name,
              timezone: dto.timezone ?? 'America/Guayaquil',
            },
            select: restaurantSelect,
          }),
      );
    } catch (error: unknown) {
      this.handleWriteError(error);
    }
  }

  async findAll(
    organizationId: string,
    query: QueryRestaurantsDto,
  ): Promise<RestaurantsPageResponse> {
    const page = query.page;
    const limit = query.limit;
    const skip = (page - 1) * limit;

    return this.prismaService.withTenant(
      organizationId,
      async (transaction) => {
        const where: Prisma.RestaurantWhereInput = {
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
                ],
              }
            : {}),
        };

        const total = await transaction.restaurant.count({
          where,
        });

        const data = await transaction.restaurant.findMany({
          where,
          select: restaurantSelect,
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
  ): Promise<RestaurantResponse> {
    return this.prismaService.withTenant(
      organizationId,
      async (transaction) => {
        const restaurant = await transaction.restaurant.findFirst({
          where: {
            id,
            organizationId,
            deletedAt: null,
          },
          select: restaurantSelect,
        });

        if (!restaurant) {
          throw new NotFoundException('Restaurant not found.');
        }

        return restaurant;
      },
    );
  }

  async update(
    organizationId: string,
    id: string,
    dto: UpdateRestaurantDto,
  ): Promise<RestaurantResponse> {
    const hasChanges = Object.values(dto).some((value) => value !== undefined);

    if (!hasChanges) {
      throw new BadRequestException('At least one field must be provided.');
    }

    try {
      return await this.prismaService.withTenant(
        organizationId,
        async (transaction) => {
          const result = await transaction.restaurant.updateMany({
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

              ...(dto.timezone !== undefined
                ? {
                    timezone: dto.timezone,
                  }
                : {}),
            },
          });

          if (result.count === 0) {
            throw new NotFoundException('Restaurant not found.');
          }

          const restaurant = await transaction.restaurant.findFirst({
            where: {
              id,
              organizationId,
              deletedAt: null,
            },
            select: restaurantSelect,
          });

          if (!restaurant) {
            throw new NotFoundException('Restaurant not found.');
          }

          return restaurant;
        },
      );
    } catch (error: unknown) {
      this.handleWriteError(error);
    }
  }

  async deactivate(
    organizationId: string,
    id: string,
  ): Promise<RestaurantResponse> {
    return this.prismaService.withTenant(
      organizationId,
      async (transaction) => {
        const result = await transaction.restaurant.updateMany({
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
          throw new NotFoundException('Restaurant not found.');
        }

        const restaurant = await transaction.restaurant.findFirst({
          where: {
            id,
            organizationId,
            deletedAt: null,
          },
          select: restaurantSelect,
        });

        if (!restaurant) {
          throw new NotFoundException('Restaurant not found.');
        }

        return restaurant;
      },
    );
  }

  private handleWriteError(error: unknown): never {
    if (this.hasPrismaCode(error, 'P2002')) {
      throw new ConflictException(
        'A restaurant with the same code already exists.',
      );
    }

    if (this.hasPrismaCode(error, 'P2003')) {
      throw new BadRequestException('The organization context is invalid.');
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
