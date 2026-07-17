import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  EntityStatus,
  GoodsReceiptStatus,
  InventoryMovementDirection,
  InventoryMovementStatus,
  InventoryMovementType,
  Prisma,
  PurchaseOrderStatus,
} from '../../generated/prisma/client';
import { PrismaService } from '../../database/prisma/prisma.service';
import {
  CreateGoodsReceiptDto,
  CreateGoodsReceiptItemDto,
} from './dto/create-goods-receipt.dto';
import { QueryGoodsReceiptsDto } from './dto/query-goods-receipts.dto';
import type {
  GoodsReceiptResponse,
  GoodsReceiptsPageResponse,
} from './goods-receipts.types';

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

const receiptItemSelect = {
  id: true,
  goodsReceiptId: true,
  purchaseOrderItemId: true,
  productId: true,
  unitId: true,
  lineNumber: true,
  quantity: true,
  factorToBase: true,
  baseQuantity: true,
  unitCost: true,
  baseUnitCost: true,
  totalCost: true,
  notes: true,
  createdAt: true,
  updatedAt: true,
  purchaseOrderItem: {
    select: {
      id: true,
      lineNumber: true,
      quantity: true,
      receivedQuantity: true,
    },
  },
  product: {
    select: productSelect,
  },
  unit: {
    select: unitSelect,
  },
} satisfies Prisma.GoodsReceiptItemSelect;

const receiptSelect = {
  id: true,
  purchaseOrderId: true,
  warehouseId: true,
  number: true,
  supplierDocumentNumber: true,
  receiptDate: true,
  status: true,
  idempotencyKey: true,
  notes: true,
  postedAt: true,
  voidedAt: true,
  createdAt: true,
  updatedAt: true,
  purchaseOrder: {
    select: {
      id: true,
      number: true,
      status: true,
      supplier: {
        select: {
          id: true,
          code: true,
          legalName: true,
          tradeName: true,
        },
      },
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
    select: receiptItemSelect,
    orderBy: [
      {
        lineNumber: 'asc',
      },
      {
        id: 'asc',
      },
    ],
  },
} satisfies Prisma.GoodsReceiptSelect;

type ReceiptRecord = Prisma.GoodsReceiptGetPayload<{
  select: typeof receiptSelect;
}>;

interface PurchaseOrderItemContext {
  id: string;
  productId: string;
  unitId: string;
  quantity: Prisma.Decimal;
  receivedQuantity: Prisma.Decimal;
  unitCost: Prisma.Decimal;
  product: {
    baseUnitId: string;
  };
}

interface PreparedReceiptItem {
  purchaseOrderItemId: string;
  productId: string;
  unitId: string;
  lineNumber: number;
  quantity: Prisma.Decimal;
  factorToBase: Prisma.Decimal;
  baseQuantity: Prisma.Decimal;
  unitCost: Prisma.Decimal;
  baseUnitCost: Prisma.Decimal;
  totalCost: Prisma.Decimal;
  notes: string | null;
}

interface LockedReceiptRow {
  id: string;
  purchaseOrderId: string;
  warehouseId: string;
  number: string;
  status: GoodsReceiptStatus;
  receiptDate: Date;
}

interface LockedPurchaseOrderRow {
  id: string;
  status: PurchaseOrderStatus;
}

interface LockedPurchaseOrderItemRow {
  id: string;
  productId: string;
  unitId: string;
  quantity: string;
  receivedQuantity: string;
}

interface LockedBalanceRow {
  id: string;
  quantityOnHand: string;
  quantityReserved: string;
  averageUnitCost: string;
  version: number;
  lastMovementAt: Date | null;
}

@Injectable()
export class GoodsReceiptsService {
  private readonly decimalLimit = new Prisma.Decimal('1000000000000');

  constructor(private readonly prismaService: PrismaService) {}

  async create(
    organizationId: string,
    dto: CreateGoodsReceiptDto,
  ): Promise<GoodsReceiptResponse> {
    this.assertUniqueOrderItems(dto.items);

    const receiptDate =
      dto.receiptDate !== undefined ? new Date(dto.receiptDate) : new Date();

    try {
      return await this.prismaService.withTenant(
        organizationId,
        async (transaction) => {
          if (dto.idempotencyKey) {
            const existing = await transaction.goodsReceipt.findFirst({
              where: {
                organizationId,
                idempotencyKey: dto.idempotencyKey,
              },
              select: receiptSelect,
            });

            if (existing) {
              return this.toResponse(existing);
            }
          }

          const order = await transaction.purchaseOrder.findFirst({
            where: {
              id: dto.purchaseOrderId,
              organizationId,
              status: {
                in: [
                  PurchaseOrderStatus.APPROVED,
                  PurchaseOrderStatus.PARTIALLY_RECEIVED,
                ],
              },
            },
            select: {
              id: true,
              warehouseId: true,
              orderDate: true,
            },
          });

          if (!order) {
            throw new NotFoundException('Approved purchase order not found.');
          }

          if (receiptDate.getTime() < order.orderDate.getTime()) {
            throw new BadRequestException(
              'receiptDate cannot be earlier than the purchase order date.',
            );
          }

          await this.assertActiveWarehouse(
            transaction,
            organizationId,
            order.warehouseId,
          );

          const contexts = await this.loadPurchaseOrderItems(
            transaction,
            organizationId,
            dto.purchaseOrderId,
            dto.items.map((item) => item.purchaseOrderItemId),
          );

          const preparedItems: PreparedReceiptItem[] = [];

          for (let index = 0; index < dto.items.length; index += 1) {
            const input = dto.items[index];

            const context = contexts.get(input.purchaseOrderItemId);

            if (!context) {
              throw new BadRequestException('Invalid purchase order item.');
            }

            const quantity = this.parsePositiveDecimal(
              input.quantity,
              'quantity',
            );

            const remaining = context.quantity.sub(context.receivedQuantity);

            if (quantity.gt(remaining)) {
              throw new ConflictException(
                'The received quantity exceeds the pending purchase order quantity.',
              );
            }

            const factorToBase = await this.resolveFactorToBase(
              transaction,
              organizationId,
              context.productId,
              context.product.baseUnitId,
              context.unitId,
            );

            const baseQuantity = this.roundDecimal(quantity.mul(factorToBase));

            const baseUnitCost = this.roundDecimal(
              context.unitCost.div(factorToBase),
            );

            const totalCost = this.roundDecimal(quantity.mul(context.unitCost));

            this.assertDecimalFits(baseQuantity, 'baseQuantity');

            this.assertDecimalFits(baseUnitCost, 'baseUnitCost');

            this.assertDecimalFits(totalCost, 'totalCost');

            preparedItems.push({
              purchaseOrderItemId: context.id,
              productId: context.productId,
              unitId: context.unitId,
              lineNumber: index + 1,
              quantity,
              factorToBase,
              baseQuantity,
              unitCost: context.unitCost,
              baseUnitCost,
              totalCost,
              notes: input.notes ?? null,
            });
          }

          const receipt = await transaction.goodsReceipt.create({
            data: {
              organizationId,
              purchaseOrderId: dto.purchaseOrderId,
              warehouseId: order.warehouseId,
              number: dto.number,
              supplierDocumentNumber: dto.supplierDocumentNumber ?? null,
              receiptDate,
              idempotencyKey: dto.idempotencyKey ?? null,
              notes: dto.notes ?? null,
            },
            select: {
              id: true,
            },
          });

          await transaction.goodsReceiptItem.createMany({
            data: preparedItems.map((item) => ({
              organizationId,
              goodsReceiptId: receipt.id,
              purchaseOrderItemId: item.purchaseOrderItemId,
              productId: item.productId,
              unitId: item.unitId,
              lineNumber: item.lineNumber,
              quantity: item.quantity,
              factorToBase: item.factorToBase,
              baseQuantity: item.baseQuantity,
              unitCost: item.unitCost,
              baseUnitCost: item.baseUnitCost,
              totalCost: item.totalCost,
              notes: item.notes,
            })),
          });

          return this.getReceiptResponse(
            transaction,
            organizationId,
            receipt.id,
          );
        },
      );
    } catch (error: unknown) {
      this.handleWriteError(error);
    }
  }

  async findAll(
    organizationId: string,
    query: QueryGoodsReceiptsDto,
  ): Promise<GoodsReceiptsPageResponse> {
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
        const where: Prisma.GoodsReceiptWhereInput = {
          organizationId,

          ...(query.purchaseOrderId
            ? {
                purchaseOrderId: query.purchaseOrderId,
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
                receiptDate: {
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
                    supplierDocumentNumber: {
                      contains: query.search,
                      mode: 'insensitive',
                    },
                  },
                  {
                    purchaseOrder: {
                      is: {
                        number: {
                          contains: query.search,
                          mode: 'insensitive',
                        },
                      },
                    },
                  },
                  {
                    purchaseOrder: {
                      is: {
                        supplier: {
                          is: {
                            legalName: {
                              contains: query.search,
                              mode: 'insensitive',
                            },
                          },
                        },
                      },
                    },
                  },
                ],
              }
            : {}),
        };

        const total = await transaction.goodsReceipt.count({
          where,
        });

        const records = await transaction.goodsReceipt.findMany({
          where,
          select: receiptSelect,
          orderBy: [
            {
              receiptDate: 'desc',
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
  ): Promise<GoodsReceiptResponse> {
    return this.prismaService.withTenant(organizationId, (transaction) =>
      this.getReceiptResponse(transaction, organizationId, id),
    );
  }

  async post(
    organizationId: string,
    id: string,
  ): Promise<GoodsReceiptResponse> {
    try {
      return await this.prismaService.withTenant(
        organizationId,
        async (transaction) => {
          const receipt = await this.lockReceipt(
            transaction,
            organizationId,
            id,
          );

          if (receipt.status === GoodsReceiptStatus.POSTED) {
            return this.getReceiptResponse(transaction, organizationId, id);
          }

          if (receipt.status !== GoodsReceiptStatus.DRAFT) {
            throw new ConflictException(
              'Only draft goods receipts can be posted.',
            );
          }

          const order = await this.lockPurchaseOrder(
            transaction,
            organizationId,
            receipt.purchaseOrderId,
          );

          if (
            order.status !== PurchaseOrderStatus.APPROVED &&
            order.status !== PurchaseOrderStatus.PARTIALLY_RECEIVED
          ) {
            throw new ConflictException(
              'The purchase order is not available for receipt.',
            );
          }

          await this.assertActiveWarehouse(
            transaction,
            organizationId,
            receipt.warehouseId,
          );

          const receiptItems = await transaction.goodsReceiptItem.findMany({
            where: {
              organizationId,
              goodsReceiptId: id,
            },
            select: {
              id: true,
              purchaseOrderItemId: true,
              productId: true,
              unitId: true,
              quantity: true,
              factorToBase: true,
              baseQuantity: true,
              baseUnitCost: true,
              totalCost: true,
            },
            orderBy: {
              lineNumber: 'asc',
            },
          });

          if (receiptItems.length === 0) {
            throw new ConflictException('The goods receipt has no items.');
          }

          const postedAt = new Date();

          for (const item of receiptItems) {
            const orderItem = await this.lockPurchaseOrderItem(
              transaction,
              organizationId,
              receipt.purchaseOrderId,
              item.purchaseOrderItemId,
            );

            if (
              orderItem.productId !== item.productId ||
              orderItem.unitId !== item.unitId
            ) {
              throw new ConflictException(
                'The receipt item no longer matches the purchase order item.',
              );
            }

            const orderedQuantity = new Prisma.Decimal(orderItem.quantity);

            const receivedQuantity = new Prisma.Decimal(
              orderItem.receivedQuantity,
            );

            const nextReceivedQuantity = this.roundDecimal(
              receivedQuantity.add(item.quantity),
            );

            if (nextReceivedQuantity.gt(orderedQuantity)) {
              throw new ConflictException(
                'The receipt exceeds the remaining purchase order quantity.',
              );
            }

            const balance = await this.lockBalance(
              transaction,
              organizationId,
              receipt.warehouseId,
              item.productId,
            );

            if (
              balance.lastMovementAt &&
              receipt.receiptDate.getTime() < balance.lastMovementAt.getTime()
            ) {
              throw new ConflictException(
                'The receipt date cannot be earlier than the last inventory movement.',
              );
            }

            const currentQuantity = new Prisma.Decimal(balance.quantityOnHand);

            const currentAverageCost = new Prisma.Decimal(
              balance.averageUnitCost,
            );

            const nextQuantity = this.roundDecimal(
              currentQuantity.add(item.baseQuantity),
            );

            const previousValue = currentQuantity.mul(currentAverageCost);

            const incomingValue = item.baseQuantity.mul(item.baseUnitCost);

            const nextAverageCost = nextQuantity.eq(0)
              ? new Prisma.Decimal(0)
              : this.roundDecimal(
                  previousValue.add(incomingValue).div(nextQuantity),
                );

            this.assertDecimalFits(nextQuantity, 'quantityOnHand');

            this.assertDecimalFits(nextAverageCost, 'averageUnitCost');

            await this.updateBalance(
              transaction,
              organizationId,
              balance,
              nextQuantity,
              nextAverageCost,
              receipt.receiptDate,
            );

            await transaction.inventoryMovement.create({
              data: {
                organizationId,
                warehouseId: receipt.warehouseId,
                productId: item.productId,
                unitId: item.unitId,
                type: InventoryMovementType.PURCHASE_RECEIPT,
                direction: InventoryMovementDirection.IN,
                status: InventoryMovementStatus.POSTED,
                quantity: item.quantity,
                factorToBase: item.factorToBase,
                baseQuantity: item.baseQuantity,
                unitCost: item.baseUnitCost,
                totalCost: item.totalCost,
                balanceQuantityAfter: nextQuantity,
                averageUnitCostAfter: nextAverageCost,
                occurredAt: receipt.receiptDate,
                postedAt,
                referenceType: 'GOODS_RECEIPT',
                referenceId: receipt.id,
                referenceNumber: receipt.number,
                idempotencyKey: `GR:${receipt.id}:${item.id}`,
              },
            });

            const orderItemUpdate =
              await transaction.purchaseOrderItem.updateMany({
                where: {
                  id: item.purchaseOrderItemId,
                  organizationId,
                  purchaseOrderId: receipt.purchaseOrderId,
                  deletedAt: null,
                },
                data: {
                  receivedQuantity: nextReceivedQuantity,
                },
              });

            if (orderItemUpdate.count !== 1) {
              throw new ConflictException(
                'The purchase order item could not be updated.',
              );
            }
          }

          const orderItems = await transaction.purchaseOrderItem.findMany({
            where: {
              organizationId,
              purchaseOrderId: receipt.purchaseOrderId,
              deletedAt: null,
            },
            select: {
              quantity: true,
              receivedQuantity: true,
            },
          });

          const fullyReceived =
            orderItems.length > 0 &&
            orderItems.every((item) =>
              item.receivedQuantity.gte(item.quantity),
            );

          const nextOrderStatus = fullyReceived
            ? PurchaseOrderStatus.RECEIVED
            : PurchaseOrderStatus.PARTIALLY_RECEIVED;

          await transaction.purchaseOrder.updateMany({
            where: {
              id: receipt.purchaseOrderId,
              organizationId,
              status: {
                in: [
                  PurchaseOrderStatus.APPROVED,
                  PurchaseOrderStatus.PARTIALLY_RECEIVED,
                ],
              },
            },
            data: {
              status: nextOrderStatus,
              closedAt: fullyReceived ? postedAt : null,
            },
          });

          const receiptUpdate = await transaction.goodsReceipt.updateMany({
            where: {
              id,
              organizationId,
              status: GoodsReceiptStatus.DRAFT,
            },
            data: {
              status: GoodsReceiptStatus.POSTED,
              postedAt,
            },
          });

          if (receiptUpdate.count !== 1) {
            throw new ConflictException(
              'The goods receipt was modified by another operation.',
            );
          }

          return this.getReceiptResponse(transaction, organizationId, id);
        },
      );
    } catch (error: unknown) {
      this.handleWriteError(error);
    }
  }

  async void(
    organizationId: string,
    id: string,
  ): Promise<GoodsReceiptResponse> {
    return this.prismaService.withTenant(
      organizationId,
      async (transaction) => {
        const receipt = await transaction.goodsReceipt.findFirst({
          where: {
            id,
            organizationId,
          },
          select: {
            id: true,
            status: true,
          },
        });

        if (!receipt) {
          throw new NotFoundException('Goods receipt not found.');
        }

        if (receipt.status === GoodsReceiptStatus.VOIDED) {
          return this.getReceiptResponse(transaction, organizationId, id);
        }

        if (receipt.status === GoodsReceiptStatus.POSTED) {
          throw new ConflictException(
            'A posted goods receipt cannot be voided directly. It requires an inventory reversal.',
          );
        }

        await transaction.goodsReceipt.updateMany({
          where: {
            id,
            organizationId,
            status: GoodsReceiptStatus.DRAFT,
          },
          data: {
            status: GoodsReceiptStatus.VOIDED,
            voidedAt: new Date(),
          },
        });

        return this.getReceiptResponse(transaction, organizationId, id);
      },
    );
  }

  private async loadPurchaseOrderItems(
    transaction: Prisma.TransactionClient,
    organizationId: string,
    purchaseOrderId: string,
    itemIds: string[],
  ): Promise<Map<string, PurchaseOrderItemContext>> {
    const uniqueIds = [...new Set(itemIds)];

    const records = await transaction.purchaseOrderItem.findMany({
      where: {
        organizationId,
        purchaseOrderId,
        id: {
          in: uniqueIds,
        },
        deletedAt: null,
        product: {
          is: {
            status: EntityStatus.ACTIVE,
            deletedAt: null,
            trackInventory: true,
          },
        },
        unit: {
          is: {
            status: EntityStatus.ACTIVE,
            deletedAt: null,
          },
        },
      },
      select: {
        id: true,
        productId: true,
        unitId: true,
        quantity: true,
        receivedQuantity: true,
        unitCost: true,
        product: {
          select: {
            baseUnitId: true,
          },
        },
      },
    });

    if (records.length !== uniqueIds.length) {
      throw new BadRequestException(
        'One or more purchase order items are invalid.',
      );
    }

    return new Map(records.map((record) => [record.id, record]));
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

  private async resolveFactorToBase(
    transaction: Prisma.TransactionClient,
    organizationId: string,
    productId: string,
    baseUnitId: string,
    unitId: string,
  ): Promise<Prisma.Decimal> {
    if (baseUnitId === unitId) {
      return new Prisma.Decimal(1);
    }

    const conversion = await transaction.productUnitConversion.findFirst({
      where: {
        organizationId,
        productId,
        unitId,
        status: EntityStatus.ACTIVE,
        deletedAt: null,
      },
      select: {
        factorToBase: true,
      },
    });

    if (!conversion) {
      throw new BadRequestException(
        'The purchase unit does not have an active conversion to the base unit.',
      );
    }

    return conversion.factorToBase;
  }

  private async lockReceipt(
    transaction: Prisma.TransactionClient,
    organizationId: string,
    id: string,
  ): Promise<LockedReceiptRow> {
    const rows = await transaction.$queryRaw<LockedReceiptRow[]>`
        SELECT
          id::text AS "id",
          purchase_order_id::text
            AS "purchaseOrderId",
          warehouse_id::text
            AS "warehouseId",
          number,
          status::text AS "status",
          receipt_date AS "receiptDate"
        FROM purchasing.goods_receipts
        WHERE
          organization_id =
            CAST(${organizationId} AS uuid)
          AND id =
            CAST(${id} AS uuid)
        FOR UPDATE
      `;

    const receipt = rows[0];

    if (!receipt) {
      throw new NotFoundException('Goods receipt not found.');
    }

    return receipt;
  }

  private async lockPurchaseOrder(
    transaction: Prisma.TransactionClient,
    organizationId: string,
    id: string,
  ): Promise<LockedPurchaseOrderRow> {
    const rows = await transaction.$queryRaw<LockedPurchaseOrderRow[]>`
        SELECT
          id::text AS "id",
          status::text AS "status"
        FROM purchasing.purchase_orders
        WHERE
          organization_id =
            CAST(${organizationId} AS uuid)
          AND id =
            CAST(${id} AS uuid)
        FOR UPDATE
      `;

    const order = rows[0];

    if (!order) {
      throw new NotFoundException('Purchase order not found.');
    }

    return order;
  }

  private async lockPurchaseOrderItem(
    transaction: Prisma.TransactionClient,
    organizationId: string,
    purchaseOrderId: string,
    id: string,
  ): Promise<LockedPurchaseOrderItemRow> {
    const rows = await transaction.$queryRaw<LockedPurchaseOrderItemRow[]>`
        SELECT
          id::text AS "id",
          product_id::text AS "productId",
          unit_id::text AS "unitId",
          quantity::text AS "quantity",
          received_quantity::text
            AS "receivedQuantity"
        FROM purchasing.purchase_order_items
        WHERE
          organization_id =
            CAST(${organizationId} AS uuid)
          AND purchase_order_id =
            CAST(${purchaseOrderId} AS uuid)
          AND id =
            CAST(${id} AS uuid)
          AND deleted_at IS NULL
        FOR UPDATE
      `;

    const item = rows[0];

    if (!item) {
      throw new NotFoundException('Purchase order item not found.');
    }

    return item;
  }

  private async lockBalance(
    transaction: Prisma.TransactionClient,
    organizationId: string,
    warehouseId: string,
    productId: string,
  ): Promise<LockedBalanceRow> {
    await transaction.inventoryBalance.upsert({
      where: {
        organizationId_warehouseId_productId: {
          organizationId,
          warehouseId,
          productId,
        },
      },
      update: {},
      create: {
        organizationId,
        warehouseId,
        productId,
      },
      select: {
        id: true,
      },
    });

    const rows = await transaction.$queryRaw<LockedBalanceRow[]>`
        SELECT
          id::text AS "id",
          quantity_on_hand::text
            AS "quantityOnHand",
          quantity_reserved::text
            AS "quantityReserved",
          average_unit_cost::text
            AS "averageUnitCost",
          version,
          last_movement_at
            AS "lastMovementAt"
        FROM inventory.inventory_balances
        WHERE
          organization_id =
            CAST(${organizationId} AS uuid)
          AND warehouse_id =
            CAST(${warehouseId} AS uuid)
          AND product_id =
            CAST(${productId} AS uuid)
        FOR UPDATE
      `;

    const balance = rows[0];

    if (!balance) {
      throw new ConflictException('Inventory balance could not be locked.');
    }

    return balance;
  }

  private async updateBalance(
    transaction: Prisma.TransactionClient,
    organizationId: string,
    balance: LockedBalanceRow,
    quantityOnHand: Prisma.Decimal,
    averageUnitCost: Prisma.Decimal,
    occurredAt: Date,
  ): Promise<void> {
    const result = await transaction.inventoryBalance.updateMany({
      where: {
        id: balance.id,
        organizationId,
        version: balance.version,
      },
      data: {
        quantityOnHand,
        averageUnitCost,
        lastMovementAt: occurredAt,
        version: {
          increment: 1,
        },
      },
    });

    if (result.count !== 1) {
      throw new ConflictException(
        'The inventory balance was modified by another operation.',
      );
    }
  }

  private async getReceiptResponse(
    transaction: Prisma.TransactionClient,
    organizationId: string,
    id: string,
  ): Promise<GoodsReceiptResponse> {
    const receipt = await transaction.goodsReceipt.findFirst({
      where: {
        id,
        organizationId,
      },
      select: receiptSelect,
    });

    if (!receipt) {
      throw new NotFoundException('Goods receipt not found.');
    }

    return this.toResponse(receipt);
  }

  private assertUniqueOrderItems(items: CreateGoodsReceiptItemDto[]): void {
    const ids = items.map((item) => item.purchaseOrderItemId);

    if (new Set(ids).size !== ids.length) {
      throw new BadRequestException(
        'A purchase order item cannot appear more than once in a goods receipt.',
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

  private toResponse(receipt: ReceiptRecord): GoodsReceiptResponse {
    return {
      id: receipt.id,
      purchaseOrderId: receipt.purchaseOrderId,
      warehouseId: receipt.warehouseId,
      number: receipt.number,
      supplierDocumentNumber: receipt.supplierDocumentNumber,
      receiptDate: receipt.receiptDate,
      status: receipt.status,
      idempotencyKey: receipt.idempotencyKey,
      notes: receipt.notes,
      postedAt: receipt.postedAt,
      voidedAt: receipt.voidedAt,
      createdAt: receipt.createdAt,
      updatedAt: receipt.updatedAt,
      purchaseOrder: receipt.purchaseOrder,
      warehouse: receipt.warehouse,
      items: receipt.items.map((item) => ({
        id: item.id,
        goodsReceiptId: item.goodsReceiptId,
        purchaseOrderItemId: item.purchaseOrderItemId,
        productId: item.productId,
        unitId: item.unitId,
        lineNumber: item.lineNumber,
        quantity: item.quantity.toString(),
        factorToBase: item.factorToBase.toString(),
        baseQuantity: item.baseQuantity.toString(),
        unitCost: item.unitCost.toString(),
        baseUnitCost: item.baseUnitCost.toString(),
        totalCost: item.totalCost.toString(),
        notes: item.notes,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
        purchaseOrderItem: {
          id: item.purchaseOrderItem.id,
          lineNumber: item.purchaseOrderItem.lineNumber,
          quantity: item.purchaseOrderItem.quantity.toString(),
          receivedQuantity: item.purchaseOrderItem.receivedQuantity.toString(),
        },
        product: item.product,
        unit: item.unit,
      })),
    };
  }

  private handleWriteError(error: unknown): never {
    if (this.hasPrismaCode(error, 'P2002')) {
      throw new ConflictException(
        'A goods receipt with the same number or idempotency key already exists.',
      );
    }

    if (this.hasPrismaCode(error, 'P2003')) {
      throw new BadRequestException(
        'The goods receipt relationships are invalid.',
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
