import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  EntityStatus,
  Prisma,
  PurchaseOrderStatus,
} from '../../generated/prisma/client';
import { PrismaService } from '../../database/prisma/prisma.service';
import { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto';
import {
  PurchaseOrderItemInputDto,
  ReplacePurchaseOrderItemDto,
} from './dto/purchase-order-item-input.dto';
import { QueryPurchaseOrdersDto } from './dto/query-purchase-orders.dto';
import { ReplacePurchaseOrderItemsDto } from './dto/replace-purchase-order-items.dto';
import { UpdatePurchaseOrderDto } from './dto/update-purchase-order.dto';
import type {
  PurchaseOrderResponse,
  PurchaseOrdersPageResponse,
} from './purchase-orders.types';

const unitSelect = {
  id: true,
  code: true,
  name: true,
  symbol: true,
  dimension: true,
  decimalPlaces: true,
} satisfies Prisma.UnitOfMeasureSelect;

const productSelect = {
  id: true,
  code: true,
  name: true,
  type: true,
  baseUnitId: true,
  baseUnit: {
    select: unitSelect,
  },
} satisfies Prisma.ProductSelect;

const orderItemSelect = {
  id: true,
  supplierProductId: true,
  productId: true,
  unitId: true,
  lineNumber: true,
  quantity: true,
  receivedQuantity: true,
  unitCost: true,
  taxRate: true,
  lineSubtotal: true,
  lineTax: true,
  lineTotal: true,
  notes: true,
  createdAt: true,
  updatedAt: true,
  supplierProduct: {
    select: {
      id: true,
      supplierSku: true,
      isPreferred: true,
    },
  },
  product: {
    select: productSelect,
  },
  unit: {
    select: unitSelect,
  },
} satisfies Prisma.PurchaseOrderItemSelect;

const purchaseOrderSelect = {
  id: true,
  supplierId: true,
  warehouseId: true,
  number: true,
  orderDate: true,
  expectedDate: true,
  currencyCode: true,
  status: true,
  subtotal: true,
  taxAmount: true,
  totalAmount: true,
  notes: true,
  approvedAt: true,
  cancelledAt: true,
  closedAt: true,
  createdAt: true,
  updatedAt: true,
  supplier: {
    select: {
      id: true,
      code: true,
      legalName: true,
      tradeName: true,
    },
  },
  warehouse: {
    select: {
      id: true,
      code: true,
      name: true,
      branch: {
        select: {
          id: true,
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
    },
  },
  items: {
    where: {
      deletedAt: null,
    },
    select: orderItemSelect,
    orderBy: [
      {
        lineNumber: 'asc',
      },
      {
        id: 'asc',
      },
    ],
  },
} satisfies Prisma.PurchaseOrderSelect;

type PurchaseOrderRecord = Prisma.PurchaseOrderGetPayload<{
  select: typeof purchaseOrderSelect;
}>;

interface SupplierProductContext {
  id: string;
  productId: string;
  purchaseUnitId: string;
}

interface CalculatedLine {
  quantity: Prisma.Decimal;
  unitCost: Prisma.Decimal;
  taxRate: Prisma.Decimal;
  lineSubtotal: Prisma.Decimal;
  lineTax: Prisma.Decimal;
  lineTotal: Prisma.Decimal;
}

@Injectable()
export class PurchaseOrdersService {
  private readonly decimalLimit = new Prisma.Decimal('1000000000000');

  constructor(private readonly prismaService: PrismaService) {}

  async create(
    organizationId: string,
    dto: CreatePurchaseOrderDto,
  ): Promise<PurchaseOrderResponse> {
    this.assertUniqueSupplierProducts(dto.items);

    const orderDate =
      dto.orderDate !== undefined ? new Date(dto.orderDate) : new Date();

    const expectedDate =
      dto.expectedDate !== undefined ? new Date(dto.expectedDate) : null;

    this.assertValidDates(orderDate, expectedDate);

    try {
      return await this.prismaService.withTenant(
        organizationId,
        async (transaction) => {
          await this.assertActiveSupplier(
            transaction,
            organizationId,
            dto.supplierId,
          );

          await this.assertActiveWarehouse(
            transaction,
            organizationId,
            dto.warehouseId,
          );

          const supplierProducts = await this.loadSupplierProducts(
            transaction,
            organizationId,
            dto.supplierId,
            dto.items.map((item) => item.supplierProductId),
          );

          const order = await transaction.purchaseOrder.create({
            data: {
              organizationId,
              supplierId: dto.supplierId,
              warehouseId: dto.warehouseId,
              number: dto.number,
              orderDate,
              expectedDate,
              currencyCode: dto.currencyCode ?? 'USD',
              notes: dto.notes ?? null,
            },
            select: {
              id: true,
            },
          });

          for (let index = 0; index < dto.items.length; index += 1) {
            const item = dto.items[index];

            const context = supplierProducts.get(item.supplierProductId);

            if (!context) {
              throw new BadRequestException('Invalid supplier product.');
            }

            const calculated = this.calculateLine(item);

            await transaction.purchaseOrderItem.create({
              data: {
                organizationId,
                purchaseOrderId: order.id,
                supplierProductId: context.id,
                productId: context.productId,
                unitId: context.purchaseUnitId,
                lineNumber: index + 1,
                quantity: calculated.quantity,
                unitCost: calculated.unitCost,
                taxRate: calculated.taxRate,
                lineSubtotal: calculated.lineSubtotal,
                lineTax: calculated.lineTax,
                lineTotal: calculated.lineTotal,
                notes: item.notes ?? null,
              },
            });
          }

          await this.recalculateTotals(transaction, organizationId, order.id);

          return this.getOrderResponse(transaction, organizationId, order.id);
        },
      );
    } catch (error: unknown) {
      this.handleWriteError(error);
    }
  }

  async findAll(
    organizationId: string,
    query: QueryPurchaseOrdersDto,
  ): Promise<PurchaseOrdersPageResponse> {
    const page = query.page;
    const limit = query.limit;
    const skip = (page - 1) * limit;

    const dateFrom =
      query.dateFrom !== undefined ? new Date(query.dateFrom) : undefined;

    const dateTo =
      query.dateTo !== undefined ? new Date(query.dateTo) : undefined;

    if (dateFrom && dateTo && dateFrom.getTime() > dateTo.getTime()) {
      throw new BadRequestException(
        'dateFrom must be earlier than or equal to dateTo.',
      );
    }

    return this.prismaService.withTenant(
      organizationId,
      async (transaction) => {
        const where: Prisma.PurchaseOrderWhereInput = {
          organizationId,

          ...(query.supplierId
            ? {
                supplierId: query.supplierId,
              }
            : {}),

          ...(query.warehouseId
            ? {
                warehouseId: query.warehouseId,
              }
            : {}),

          ...(query.status
            ? {
                status: query.status,
              }
            : {}),

          ...(dateFrom || dateTo
            ? {
                orderDate: {
                  ...(dateFrom
                    ? {
                        gte: dateFrom,
                      }
                    : {}),
                  ...(dateTo
                    ? {
                        lte: dateTo,
                      }
                    : {}),
                },
              }
            : {}),

          ...(query.search
            ? {
                OR: [
                  {
                    number: {
                      contains: query.search,
                      mode: 'insensitive',
                    },
                  },
                  {
                    supplier: {
                      is: {
                        legalName: {
                          contains: query.search,
                          mode: 'insensitive',
                        },
                      },
                    },
                  },
                  {
                    supplier: {
                      is: {
                        tradeName: {
                          contains: query.search,
                          mode: 'insensitive',
                        },
                      },
                    },
                  },
                  {
                    warehouse: {
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

        const total = await transaction.purchaseOrder.count({
          where,
        });

        const records = await transaction.purchaseOrder.findMany({
          where,
          select: purchaseOrderSelect,
          orderBy: [
            {
              orderDate: 'desc',
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

  async findOne(
    organizationId: string,
    id: string,
  ): Promise<PurchaseOrderResponse> {
    return this.prismaService.withTenant(organizationId, (transaction) =>
      this.getOrderResponse(transaction, organizationId, id),
    );
  }

  async update(
    organizationId: string,
    id: string,
    dto: UpdatePurchaseOrderDto,
  ): Promise<PurchaseOrderResponse> {
    const hasChanges = Object.values(dto).some((value) => value !== undefined);

    if (!hasChanges) {
      throw new BadRequestException('At least one field must be provided.');
    }

    try {
      return await this.prismaService.withTenant(
        organizationId,
        async (transaction) => {
          const order = await transaction.purchaseOrder.findFirst({
            where: {
              id,
              organizationId,
            },
            select: {
              id: true,
              status: true,
              warehouseId: true,
              orderDate: true,
              expectedDate: true,
            },
          });

          if (!order) {
            throw new NotFoundException('Purchase order not found.');
          }

          if (order.status !== PurchaseOrderStatus.DRAFT) {
            throw new ConflictException(
              'Only draft purchase orders can be edited.',
            );
          }

          if (
            dto.warehouseId !== undefined &&
            dto.warehouseId !== order.warehouseId
          ) {
            await this.assertActiveWarehouse(
              transaction,
              organizationId,
              dto.warehouseId,
            );
          }

          const nextOrderDate =
            dto.orderDate !== undefined
              ? new Date(dto.orderDate)
              : order.orderDate;

          const nextExpectedDate =
            dto.expectedDate === null
              ? null
              : dto.expectedDate !== undefined
                ? new Date(dto.expectedDate)
                : order.expectedDate;

          this.assertValidDates(nextOrderDate, nextExpectedDate);

          const result = await transaction.purchaseOrder.updateMany({
            where: {
              id,
              organizationId,
              status: PurchaseOrderStatus.DRAFT,
            },
            data: {
              ...(dto.warehouseId !== undefined
                ? {
                    warehouseId: dto.warehouseId,
                  }
                : {}),

              ...(dto.number !== undefined
                ? {
                    number: dto.number,
                  }
                : {}),

              ...(dto.orderDate !== undefined
                ? {
                    orderDate: nextOrderDate,
                  }
                : {}),

              ...(dto.expectedDate !== undefined
                ? {
                    expectedDate: nextExpectedDate,
                  }
                : {}),

              ...(dto.currencyCode !== undefined
                ? {
                    currencyCode: dto.currencyCode,
                  }
                : {}),

              ...(dto.notes !== undefined
                ? {
                    notes: dto.notes,
                  }
                : {}),
            },
          });

          if (result.count !== 1) {
            throw new ConflictException(
              'The purchase order was modified by another operation.',
            );
          }

          return this.getOrderResponse(transaction, organizationId, id);
        },
      );
    } catch (error: unknown) {
      this.handleWriteError(error);
    }
  }

  async replaceItems(
    organizationId: string,
    id: string,
    dto: ReplacePurchaseOrderItemsDto,
  ): Promise<PurchaseOrderResponse> {
    this.assertUniqueSupplierProducts(dto.items);

    this.assertUniqueItemIds(dto.items);

    try {
      return await this.prismaService.withTenant(
        organizationId,
        async (transaction) => {
          const order = await transaction.purchaseOrder.findFirst({
            where: {
              id,
              organizationId,
            },
            select: {
              id: true,
              supplierId: true,
              status: true,
            },
          });

          if (!order) {
            throw new NotFoundException('Purchase order not found.');
          }

          if (order.status !== PurchaseOrderStatus.DRAFT) {
            throw new ConflictException(
              'Only draft purchase orders can have their items edited.',
            );
          }

          const contexts = await this.loadSupplierProducts(
            transaction,
            organizationId,
            order.supplierId,
            dto.items.map((item) => item.supplierProductId),
          );

          const existingItems = await transaction.purchaseOrderItem.findMany({
            where: {
              organizationId,
              purchaseOrderId: id,
              deletedAt: null,
            },
            select: {
              id: true,
              lineNumber: true,
              receivedQuantity: true,
            },
          });

          const existingMap = new Map(
            existingItems.map((item) => [item.id, item]),
          );

          const requestedIds = new Set(
            dto.items
              .map((item) => item.id)
              .filter((itemId): itemId is string => itemId !== undefined),
          );

          for (const requestedId of requestedIds) {
            if (!existingMap.has(requestedId)) {
              throw new NotFoundException(
                'A purchase order item does not belong to this order.',
              );
            }
          }

          const removedIds = existingItems
            .filter((item) => !requestedIds.has(item.id))
            .map((item) => item.id);

          if (removedIds.length > 0) {
            await transaction.purchaseOrderItem.updateMany({
              where: {
                organizationId,
                purchaseOrderId: id,
                id: {
                  in: removedIds,
                },
                deletedAt: null,
              },
              data: {
                deletedAt: new Date(),
              },
            });
          }

          const maximumLine = await transaction.purchaseOrderItem.aggregate({
            where: {
              organizationId,
              purchaseOrderId: id,
            },
            _max: {
              lineNumber: true,
            },
          });

          let nextLineNumber = maximumLine._max.lineNumber ?? 0;

          for (const item of dto.items) {
            const context = contexts.get(item.supplierProductId);

            if (!context) {
              throw new BadRequestException('Invalid supplier product.');
            }

            const calculated = this.calculateLine(item);

            if (item.id !== undefined) {
              const existing = existingMap.get(item.id);

              if (!existing) {
                throw new NotFoundException('Purchase order item not found.');
              }

              if (existing.receivedQuantity.gt(0)) {
                throw new ConflictException(
                  'A received purchase order item cannot be edited.',
                );
              }

              const result = await transaction.purchaseOrderItem.updateMany({
                where: {
                  id: item.id,
                  organizationId,
                  purchaseOrderId: id,
                  deletedAt: null,
                },
                data: {
                  supplierProductId: context.id,
                  productId: context.productId,
                  unitId: context.purchaseUnitId,
                  quantity: calculated.quantity,
                  unitCost: calculated.unitCost,
                  taxRate: calculated.taxRate,
                  lineSubtotal: calculated.lineSubtotal,
                  lineTax: calculated.lineTax,
                  lineTotal: calculated.lineTotal,
                  notes: item.notes ?? null,
                },
              });

              if (result.count !== 1) {
                throw new ConflictException(
                  'The purchase order item was modified by another operation.',
                );
              }
            } else {
              nextLineNumber += 1;

              if (nextLineNumber > 32767) {
                throw new ConflictException(
                  'The purchase order has exceeded the supported number of lines.',
                );
              }

              await transaction.purchaseOrderItem.create({
                data: {
                  organizationId,
                  purchaseOrderId: id,
                  supplierProductId: context.id,
                  productId: context.productId,
                  unitId: context.purchaseUnitId,
                  lineNumber: nextLineNumber,
                  quantity: calculated.quantity,
                  unitCost: calculated.unitCost,
                  taxRate: calculated.taxRate,
                  lineSubtotal: calculated.lineSubtotal,
                  lineTax: calculated.lineTax,
                  lineTotal: calculated.lineTotal,
                  notes: item.notes ?? null,
                },
              });
            }
          }

          await this.recalculateTotals(transaction, organizationId, id);

          return this.getOrderResponse(transaction, organizationId, id);
        },
      );
    } catch (error: unknown) {
      this.handleWriteError(error);
    }
  }

  async approve(
    organizationId: string,
    id: string,
  ): Promise<PurchaseOrderResponse> {
    try {
      return await this.prismaService.withTenant(
        organizationId,
        async (transaction) => {
          const order = await transaction.purchaseOrder.findFirst({
            where: {
              id,
              organizationId,
            },
            select: {
              id: true,
              supplierId: true,
              warehouseId: true,
              status: true,
            },
          });

          if (!order) {
            throw new NotFoundException('Purchase order not found.');
          }

          if (order.status === PurchaseOrderStatus.APPROVED) {
            return this.getOrderResponse(transaction, organizationId, id);
          }

          if (order.status !== PurchaseOrderStatus.DRAFT) {
            throw new ConflictException(
              'Only draft purchase orders can be approved.',
            );
          }

          await this.assertActiveSupplier(
            transaction,
            organizationId,
            order.supplierId,
          );

          await this.assertActiveWarehouse(
            transaction,
            organizationId,
            order.warehouseId,
          );

          const items = await transaction.purchaseOrderItem.findMany({
            where: {
              organizationId,
              purchaseOrderId: id,
              deletedAt: null,
            },
            select: {
              supplierProductId: true,
            },
          });

          if (items.length === 0) {
            throw new ConflictException(
              'The purchase order must contain at least one active item.',
            );
          }

          await this.loadSupplierProducts(
            transaction,
            organizationId,
            order.supplierId,
            items.map((item) => item.supplierProductId),
          );

          await this.recalculateTotals(transaction, organizationId, id);

          const result = await transaction.purchaseOrder.updateMany({
            where: {
              id,
              organizationId,
              status: PurchaseOrderStatus.DRAFT,
            },
            data: {
              status: PurchaseOrderStatus.APPROVED,
              approvedAt: new Date(),
            },
          });

          if (result.count !== 1) {
            throw new ConflictException(
              'The purchase order was modified by another operation.',
            );
          }

          return this.getOrderResponse(transaction, organizationId, id);
        },
      );
    } catch (error: unknown) {
      this.handleWriteError(error);
    }
  }

  async cancel(
    organizationId: string,
    id: string,
  ): Promise<PurchaseOrderResponse> {
    return this.prismaService.withTenant(
      organizationId,
      async (transaction) => {
        const order = await transaction.purchaseOrder.findFirst({
          where: {
            id,
            organizationId,
          },
          select: {
            id: true,
            status: true,
          },
        });

        if (!order) {
          throw new NotFoundException('Purchase order not found.');
        }

        if (order.status === PurchaseOrderStatus.CANCELLED) {
          return this.getOrderResponse(transaction, organizationId, id);
        }

        if (
          order.status === PurchaseOrderStatus.PARTIALLY_RECEIVED ||
          order.status === PurchaseOrderStatus.RECEIVED
        ) {
          throw new ConflictException(
            'A purchase order with received merchandise cannot be cancelled.',
          );
        }

        const now = new Date();

        const result = await transaction.purchaseOrder.updateMany({
          where: {
            id,
            organizationId,
            status: {
              in: [PurchaseOrderStatus.DRAFT, PurchaseOrderStatus.APPROVED],
            },
          },
          data: {
            status: PurchaseOrderStatus.CANCELLED,
            cancelledAt: now,
            closedAt: now,
          },
        });

        if (result.count !== 1) {
          throw new ConflictException(
            'The purchase order was modified by another operation.',
          );
        }

        return this.getOrderResponse(transaction, organizationId, id);
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

  private async assertActiveWarehouse(
    transaction: Prisma.TransactionClient,
    organizationId: string,
    warehouseId: string,
  ): Promise<void> {
    const warehouse = await transaction.warehouse.findFirst({
      where: {
        id: warehouseId,
        organizationId,
        status: EntityStatus.ACTIVE,
        deletedAt: null,
        branch: {
          is: {
            status: EntityStatus.ACTIVE,
            deletedAt: null,
            restaurant: {
              is: {
                status: EntityStatus.ACTIVE,
                deletedAt: null,
              },
            },
          },
        },
      },
      select: {
        id: true,
      },
    });

    if (!warehouse) {
      throw new NotFoundException('Active warehouse not found.');
    }
  }

  private async loadSupplierProducts(
    transaction: Prisma.TransactionClient,
    organizationId: string,
    supplierId: string,
    supplierProductIds: string[],
  ): Promise<Map<string, SupplierProductContext>> {
    const uniqueIds = [...new Set(supplierProductIds)];

    const records = await transaction.supplierProduct.findMany({
      where: {
        organizationId,
        supplierId,
        id: {
          in: uniqueIds,
        },
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
            trackInventory: true,
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
        productId: true,
        purchaseUnitId: true,
      },
    });

    if (records.length !== uniqueIds.length) {
      throw new BadRequestException(
        'One or more supplier products are invalid, inactive or do not belong to the selected supplier.',
      );
    }

    return new Map(records.map((record) => [record.id, record]));
  }

  private calculateLine(
    item: PurchaseOrderItemInputDto | ReplacePurchaseOrderItemDto,
  ): CalculatedLine {
    const quantity = this.parsePositiveDecimal(item.quantity, 'quantity');

    const unitCost = this.parseNonNegativeDecimal(item.unitCost, 'unitCost');

    const taxRate =
      item.taxRate !== undefined
        ? this.parseNonNegativeDecimal(item.taxRate, 'taxRate')
        : new Prisma.Decimal(0);

    if (taxRate.gt(100)) {
      throw new BadRequestException(
        'taxRate must be less than or equal to 100.',
      );
    }

    const lineSubtotal = this.roundDecimal(quantity.mul(unitCost));

    const lineTax = this.roundDecimal(lineSubtotal.mul(taxRate).div(100));

    const lineTotal = this.roundDecimal(lineSubtotal.add(lineTax));

    this.assertDecimalFits(lineSubtotal, 'lineSubtotal');

    this.assertDecimalFits(lineTax, 'lineTax');

    this.assertDecimalFits(lineTotal, 'lineTotal');

    return {
      quantity,
      unitCost,
      taxRate,
      lineSubtotal,
      lineTax,
      lineTotal,
    };
  }

  private async recalculateTotals(
    transaction: Prisma.TransactionClient,
    organizationId: string,
    purchaseOrderId: string,
  ): Promise<void> {
    const totals = await transaction.purchaseOrderItem.aggregate({
      where: {
        organizationId,
        purchaseOrderId,
        deletedAt: null,
      },
      _sum: {
        lineSubtotal: true,
        lineTax: true,
        lineTotal: true,
      },
    });

    const subtotal = totals._sum.lineSubtotal ?? new Prisma.Decimal(0);

    const taxAmount = totals._sum.lineTax ?? new Prisma.Decimal(0);

    const totalAmount = totals._sum.lineTotal ?? new Prisma.Decimal(0);

    await transaction.purchaseOrder.updateMany({
      where: {
        id: purchaseOrderId,
        organizationId,
      },
      data: {
        subtotal,
        taxAmount,
        totalAmount,
      },
    });
  }

  private async getOrderResponse(
    transaction: Prisma.TransactionClient,
    organizationId: string,
    id: string,
  ): Promise<PurchaseOrderResponse> {
    const order = await transaction.purchaseOrder.findFirst({
      where: {
        id,
        organizationId,
      },
      select: purchaseOrderSelect,
    });

    if (!order) {
      throw new NotFoundException('Purchase order not found.');
    }

    return this.toResponse(order);
  }

  private assertUniqueSupplierProducts(
    items: Array<{
      supplierProductId: string;
    }>,
  ): void {
    const ids = items.map((item) => item.supplierProductId);

    if (new Set(ids).size !== ids.length) {
      throw new BadRequestException(
        'A supplier product cannot appear more than once in the purchase order.',
      );
    }
  }

  private assertUniqueItemIds(items: ReplacePurchaseOrderItemDto[]): void {
    const ids = items
      .map((item) => item.id)
      .filter((itemId): itemId is string => itemId !== undefined);

    if (new Set(ids).size !== ids.length) {
      throw new BadRequestException(
        'A purchase order item ID cannot appear more than once.',
      );
    }
  }

  private assertValidDates(orderDate: Date, expectedDate: Date | null): void {
    if (expectedDate && expectedDate.getTime() < orderDate.getTime()) {
      throw new BadRequestException(
        'expectedDate must be later than or equal to orderDate.',
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

    this.assertDecimalFits(decimal, fieldName);

    return decimal;
  }

  private parseNonNegativeDecimal(
    value: string,
    fieldName: string,
  ): Prisma.Decimal {
    const decimal = new Prisma.Decimal(value);

    if (decimal.lt(0)) {
      throw new BadRequestException(
        `${fieldName} must be greater than or equal to zero.`,
      );
    }

    this.assertDecimalFits(decimal, fieldName);

    return decimal;
  }

  private roundDecimal(value: Prisma.Decimal): Prisma.Decimal {
    return value.toDecimalPlaces(6, Prisma.Decimal.ROUND_HALF_UP);
  }

  private assertDecimalFits(value: Prisma.Decimal, fieldName: string): void {
    if (value.abs().gte(this.decimalLimit)) {
      throw new BadRequestException(
        `${fieldName} exceeds the supported decimal range.`,
      );
    }
  }

  private toResponse(order: PurchaseOrderRecord): PurchaseOrderResponse {
    return {
      id: order.id,
      supplierId: order.supplierId,
      warehouseId: order.warehouseId,
      number: order.number,
      orderDate: order.orderDate,
      expectedDate: order.expectedDate,
      currencyCode: order.currencyCode,
      status: order.status,
      subtotal: order.subtotal.toString(),
      taxAmount: order.taxAmount.toString(),
      totalAmount: order.totalAmount.toString(),
      notes: order.notes,
      approvedAt: order.approvedAt,
      cancelledAt: order.cancelledAt,
      closedAt: order.closedAt,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      supplier: order.supplier,
      warehouse: order.warehouse,
      items: order.items.map((item) => ({
        id: item.id,
        supplierProductId: item.supplierProductId,
        productId: item.productId,
        unitId: item.unitId,
        lineNumber: item.lineNumber,
        quantity: item.quantity.toString(),
        receivedQuantity: item.receivedQuantity.toString(),
        remainingQuantity: item.quantity.sub(item.receivedQuantity).toString(),
        unitCost: item.unitCost.toString(),
        taxRate: item.taxRate.toString(),
        lineSubtotal: item.lineSubtotal.toString(),
        lineTax: item.lineTax.toString(),
        lineTotal: item.lineTotal.toString(),
        notes: item.notes,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
        supplierProduct: item.supplierProduct,
        product: item.product,
        unit: item.unit,
      })),
    };
  }

  private handleWriteError(error: unknown): never {
    if (this.hasPrismaCode(error, 'P2002')) {
      throw new ConflictException(
        'A purchase order with the same number already exists.',
      );
    }

    if (this.hasPrismaCode(error, 'P2003')) {
      throw new BadRequestException(
        'The purchase order relationships are invalid.',
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
