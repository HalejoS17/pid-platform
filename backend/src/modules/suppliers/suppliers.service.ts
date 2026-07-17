import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EntityStatus, Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../../database/prisma/prisma.service';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { QuerySuppliersDto } from './dto/query-suppliers.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { SupplierResponse, SuppliersPageResponse } from './suppliers.types';

const supplierSelect = {
  id: true,
  code: true,
  legalName: true,
  tradeName: true,
  taxId: true,
  email: true,
  phone: true,
  city: true,
  address: true,
  paymentTermsDays: true,
  status: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.SupplierSelect;

@Injectable()
export class SuppliersService {
  constructor(private readonly prismaService: PrismaService) {}

  async create(
    organizationId: string,
    dto: CreateSupplierDto,
  ): Promise<SupplierResponse> {
    try {
      return await this.prismaService.withTenant(
        organizationId,
        (transaction) =>
          transaction.supplier.create({
            data: {
              organizationId,
              code: dto.code,
              legalName: dto.legalName,
              tradeName: dto.tradeName ?? null,
              taxId: dto.taxId ?? null,
              email: dto.email ?? null,
              phone: dto.phone ?? null,
              city: dto.city ?? null,
              address: dto.address ?? null,
              paymentTermsDays: dto.paymentTermsDays ?? 0,
            },
            select: supplierSelect,
          }),
      );
    } catch (error: unknown) {
      this.handleWriteError(error);
    }
  }

  async findAll(
    organizationId: string,
    query: QuerySuppliersDto,
  ): Promise<SuppliersPageResponse> {
    const page = query.page;
    const limit = query.limit;
    const skip = (page - 1) * limit;

    return this.prismaService.withTenant(
      organizationId,
      async (transaction) => {
        const where: Prisma.SupplierWhereInput = {
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
                    legalName: {
                      contains: query.search,
                      mode: 'insensitive',
                    },
                  },
                  {
                    tradeName: {
                      contains: query.search,
                      mode: 'insensitive',
                    },
                  },
                  {
                    taxId: {
                      contains: query.search,
                      mode: 'insensitive',
                    },
                  },
                  {
                    email: {
                      contains: query.search,
                      mode: 'insensitive',
                    },
                  },
                ],
              }
            : {}),
        };

        const total = await transaction.supplier.count({
          where,
        });

        const data = await transaction.supplier.findMany({
          where,
          select: supplierSelect,
          orderBy: [
            {
              legalName: 'asc',
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

  async findOne(organizationId: string, id: string): Promise<SupplierResponse> {
    return this.prismaService.withTenant(
      organizationId,
      async (transaction) => {
        const supplier = await transaction.supplier.findFirst({
          where: {
            id,
            organizationId,
            deletedAt: null,
          },
          select: supplierSelect,
        });

        if (!supplier) {
          throw new NotFoundException('Supplier not found.');
        }

        return supplier;
      },
    );
  }

  async update(
    organizationId: string,
    id: string,
    dto: UpdateSupplierDto,
  ): Promise<SupplierResponse> {
    const hasChanges = Object.values(dto).some((value) => value !== undefined);

    if (!hasChanges) {
      throw new BadRequestException('At least one field must be provided.');
    }

    try {
      return await this.prismaService.withTenant(
        organizationId,
        async (transaction) => {
          const result = await transaction.supplier.updateMany({
            where: {
              id,
              organizationId,
              deletedAt: null,
            },
            data: {
              ...(dto.code !== undefined ? { code: dto.code } : {}),

              ...(dto.legalName !== undefined
                ? {
                    legalName: dto.legalName,
                  }
                : {}),

              ...(dto.tradeName !== undefined
                ? {
                    tradeName: dto.tradeName,
                  }
                : {}),

              ...(dto.taxId !== undefined
                ? {
                    taxId: dto.taxId,
                  }
                : {}),

              ...(dto.email !== undefined
                ? {
                    email: dto.email,
                  }
                : {}),

              ...(dto.phone !== undefined
                ? {
                    phone: dto.phone,
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

              ...(dto.paymentTermsDays !== undefined
                ? {
                    paymentTermsDays: dto.paymentTermsDays,
                  }
                : {}),
            },
          });

          if (result.count === 0) {
            throw new NotFoundException('Supplier not found.');
          }

          const supplier = await transaction.supplier.findFirst({
            where: {
              id,
              organizationId,
              deletedAt: null,
            },
            select: supplierSelect,
          });

          if (!supplier) {
            throw new NotFoundException('Supplier not found.');
          }

          return supplier;
        },
      );
    } catch (error: unknown) {
      this.handleWriteError(error);
    }
  }

  async deactivate(
    organizationId: string,
    id: string,
  ): Promise<SupplierResponse> {
    return this.prismaService.withTenant(
      organizationId,
      async (transaction) => {
        const supplier = await transaction.supplier.findFirst({
          where: {
            id,
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

        const supplierProducts = await transaction.supplierProduct.findMany({
          where: {
            organizationId,
            supplierId: id,
            deletedAt: null,
          },
          select: {
            id: true,
          },
        });

        const supplierProductIds = supplierProducts.map((item) => item.id);

        if (supplierProductIds.length > 0) {
          await transaction.supplierProductCost.updateMany({
            where: {
              organizationId,
              supplierProductId: {
                in: supplierProductIds,
              },
              deletedAt: null,
            },
            data: {
              status: EntityStatus.INACTIVE,
            },
          });
        }

        await transaction.supplierProduct.updateMany({
          where: {
            organizationId,
            supplierId: id,
            deletedAt: null,
          },
          data: {
            status: EntityStatus.INACTIVE,
          },
        });

        await transaction.supplier.updateMany({
          where: {
            id,
            organizationId,
            deletedAt: null,
          },
          data: {
            status: EntityStatus.INACTIVE,
          },
        });

        const updatedSupplier = await transaction.supplier.findFirst({
          where: {
            id,
            organizationId,
            deletedAt: null,
          },
          select: supplierSelect,
        });

        if (!updatedSupplier) {
          throw new NotFoundException('Supplier not found.');
        }

        return updatedSupplier;
      },
    );
  }

  private handleWriteError(error: unknown): never {
    if (this.hasPrismaCode(error, 'P2002')) {
      throw new ConflictException(
        'A supplier with the same code or tax ID already exists.',
      );
    }

    if (this.hasPrismaCode(error, 'P2003')) {
      throw new BadRequestException('The supplier relationship is invalid.');
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
