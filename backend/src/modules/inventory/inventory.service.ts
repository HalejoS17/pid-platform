import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import {
  EntityStatus,
  InventoryMovementDirection,
  InventoryMovementStatus,
  InventoryMovementType,
  Prisma,
} from '../../generated/prisma/client';
import { PrismaService } from '../../database/prisma/prisma.service';
import { CreateInventoryAdjustmentDto } from './dto/create-inventory-adjustment.dto';
import { CreateInventoryTransferDto } from './dto/create-inventory-transfer.dto';
import { QueryInventoryBalancesDto } from './dto/query-inventory-balances.dto';
import { QueryInventoryMovementsDto } from './dto/query-inventory-movements.dto';
import type {
  InventoryBalanceResponse,
  InventoryBalancesPageResponse,
  InventoryMovementResponse,
  InventoryMovementsPageResponse,
  InventoryTransferResponse,
} from './inventory.types';

const balanceSelect = {
  id: true,
  warehouseId: true,
  productId: true,
  quantityOnHand: true,
  quantityReserved: true,
  averageUnitCost: true,
  version: true,
  lastMovementAt: true,
  createdAt: true,
  updatedAt: true,
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
  product: {
    select: {
      id: true,
      code: true,
      name: true,
      type: true,
      baseUnitId: true,
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
    },
  },
} satisfies Prisma.InventoryBalanceSelect;

const movementSelect = {
  id: true,
  warehouseId: true,
  productId: true,
  unitId: true,
  type: true,
  direction: true,
  status: true,
  quantity: true,
  factorToBase: true,
  baseQuantity: true,
  unitCost: true,
  totalCost: true,
  balanceQuantityAfter: true,
  averageUnitCostAfter: true,
  occurredAt: true,
  postedAt: true,
  referenceType: true,
  referenceId: true,
  referenceNumber: true,
  transferGroupId: true,
  idempotencyKey: true,
  notes: true,
  createdAt: true,
  updatedAt: true,
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
  product: {
    select: {
      id: true,
      code: true,
      name: true,
      type: true,
      baseUnitId: true,
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
    },
  },
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
} satisfies Prisma.InventoryMovementSelect;

type BalanceRecord = Prisma.InventoryBalanceGetPayload<{
  select: typeof balanceSelect;
}>;

type MovementRecord = Prisma.InventoryMovementGetPayload<{
  select: typeof movementSelect;
}>;

interface LockedBalanceRow {
  id: string;
  quantityOnHand: string;
  quantityReserved: string;
  averageUnitCost: string;
  version: number;
  lastMovementAt: Date | null;
}

interface ActiveProductContext {
  id: string;
  baseUnitId: string;
}

@Injectable()
export class InventoryService {
  private readonly decimalLimit = new Prisma.Decimal('1000000000000');

  constructor(private readonly prismaService: PrismaService) {}

  async findBalances(
    organizationId: string,
    query: QueryInventoryBalancesDto,
  ): Promise<InventoryBalancesPageResponse> {
    const page = query.page;
    const limit = query.limit;
    const skip = (page - 1) * limit;

    return this.prismaService.withTenant(
      organizationId,
      async (transaction) => {
        const where: Prisma.InventoryBalanceWhereInput = {
          organizationId,

          ...(query.warehouseId
            ? {
                warehouseId: query.warehouseId,
              }
            : {}),

          ...(query.productId
            ? {
                productId: query.productId,
              }
            : {}),

          ...(query.includeZero === false
            ? {
                quantityOnHand: {
                  gt: 0,
                },
              }
            : {}),

          ...(query.search
            ? {
                OR: [
                  {
                    warehouse: {
                      is: {
                        code: {
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
                  {
                    product: {
                      is: {
                        code: {
                          contains: query.search,
                          mode: 'insensitive',
                        },
                      },
                    },
                  },
                  {
                    product: {
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

        const total = await transaction.inventoryBalance.count({
          where,
        });

        const records = await transaction.inventoryBalance.findMany({
          where,
          select: balanceSelect,
          orderBy: [
            {
              warehouse: {
                name: 'asc',
              },
            },
            {
              product: {
                name: 'asc',
              },
            },
            {
              id: 'asc',
            },
          ],
          skip,
          take: limit,
        });

        return {
          data: records.map((record) => this.toBalanceResponse(record)),
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

  async findBalance(
    organizationId: string,
    warehouseId: string,
    productId: string,
  ): Promise<InventoryBalanceResponse> {
    return this.prismaService.withTenant(
      organizationId,
      async (transaction) => {
        const record = await transaction.inventoryBalance.findFirst({
          where: {
            organizationId,
            warehouseId,
            productId,
          },
          select: balanceSelect,
        });

        if (!record) {
          throw new NotFoundException('Inventory balance not found.');
        }

        return this.toBalanceResponse(record);
      },
    );
  }

  async findMovements(
    organizationId: string,
    query: QueryInventoryMovementsDto,
  ): Promise<InventoryMovementsPageResponse> {
    const page = query.page;
    const limit = query.limit;
    const skip = (page - 1) * limit;

    const dateFrom = query.dateFrom ? new Date(query.dateFrom) : undefined;

    const dateTo = query.dateTo ? new Date(query.dateTo) : undefined;

    if (dateFrom && dateTo && dateFrom.getTime() > dateTo.getTime()) {
      throw new BadRequestException(
        'dateFrom must be earlier than or equal to dateTo.',
      );
    }

    return this.prismaService.withTenant(
      organizationId,
      async (transaction) => {
        const where: Prisma.InventoryMovementWhereInput = {
          organizationId,

          ...(query.warehouseId
            ? {
                warehouseId: query.warehouseId,
              }
            : {}),

          ...(query.productId
            ? {
                productId: query.productId,
              }
            : {}),

          ...(query.type
            ? {
                type: query.type,
              }
            : {}),

          ...(query.direction
            ? {
                direction: query.direction,
              }
            : {}),

          ...(query.status
            ? {
                status: query.status,
              }
            : {}),

          ...(dateFrom || dateTo
            ? {
                occurredAt: {
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
        };

        const total = await transaction.inventoryMovement.count({
          where,
        });

        const records = await transaction.inventoryMovement.findMany({
          where,
          select: movementSelect,
          orderBy: [
            {
              occurredAt: 'desc',
            },
            {
              id: 'desc',
            },
          ],
          skip,
          take: limit,
        });

        return {
          data: records.map((record) => this.toMovementResponse(record)),
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

  async findMovement(
    organizationId: string,
    id: string,
  ): Promise<InventoryMovementResponse> {
    return this.prismaService.withTenant(
      organizationId,
      async (transaction) => {
        const movement = await transaction.inventoryMovement.findFirst({
          where: {
            id,
            organizationId,
          },
          select: movementSelect,
        });

        if (!movement) {
          throw new NotFoundException('Inventory movement not found.');
        }

        return this.toMovementResponse(movement);
      },
    );
  }

  async createAdjustment(
    organizationId: string,
    dto: CreateInventoryAdjustmentDto,
  ): Promise<InventoryMovementResponse> {
    try {
      return await this.prismaService.withTenant(
        organizationId,
        async (transaction) => {
          if (dto.idempotencyKey) {
            const existing = await transaction.inventoryMovement.findFirst({
              where: {
                organizationId,
                idempotencyKey: dto.idempotencyKey,
              },
              select: movementSelect,
            });

            if (existing) {
              return this.toMovementResponse(existing);
            }
          }

          if (
            dto.direction === InventoryMovementDirection.OUT &&
            dto.unitCost !== undefined
          ) {
            throw new BadRequestException(
              'unitCost must not be provided for inventory outputs.',
            );
          }

          await this.assertActiveWarehouse(
            transaction,
            organizationId,
            dto.warehouseId,
          );

          const product = await this.getActiveProduct(
            transaction,
            organizationId,
            dto.productId,
          );

          const factor = await this.resolveFactorToBase(
            transaction,
            organizationId,
            dto.productId,
            product.baseUnitId,
            dto.unitId,
          );

          const quantity = this.parsePositiveDecimal(dto.quantity, 'quantity');

          const baseQuantity = this.roundDecimal(quantity.mul(factor));

          this.assertDecimalFits(baseQuantity, 'baseQuantity');

          const occurredAt =
            dto.occurredAt !== undefined
              ? new Date(dto.occurredAt)
              : new Date();

          const balance = await this.lockBalance(
            transaction,
            organizationId,
            dto.warehouseId,
            dto.productId,
          );

          this.assertNotBackdated(balance.lastMovementAt, occurredAt);

          const quantityOnHand = new Prisma.Decimal(balance.quantityOnHand);

          const quantityReserved = new Prisma.Decimal(balance.quantityReserved);

          const currentAverageCost = new Prisma.Decimal(
            balance.averageUnitCost,
          );

          let newQuantity: Prisma.Decimal;
          let newAverageCost: Prisma.Decimal;
          let movementUnitCost: Prisma.Decimal;

          if (dto.direction === InventoryMovementDirection.IN) {
            movementUnitCost =
              dto.unitCost !== undefined
                ? this.parseNonNegativeDecimal(dto.unitCost, 'unitCost')
                : currentAverageCost;

            newQuantity = this.roundDecimal(quantityOnHand.add(baseQuantity));

            const previousValue = quantityOnHand.mul(currentAverageCost);

            const incomingValue = baseQuantity.mul(movementUnitCost);

            newAverageCost = newQuantity.eq(0)
              ? new Prisma.Decimal(0)
              : this.roundDecimal(
                  previousValue.add(incomingValue).div(newQuantity),
                );
          } else {
            const available = quantityOnHand.sub(quantityReserved);

            if (available.lt(baseQuantity)) {
              throw new ConflictException('Insufficient available inventory.');
            }

            movementUnitCost = currentAverageCost;

            newQuantity = this.roundDecimal(quantityOnHand.sub(baseQuantity));

            newAverageCost = newQuantity.eq(0)
              ? new Prisma.Decimal(0)
              : currentAverageCost;
          }

          const totalCost = this.roundDecimal(
            baseQuantity.mul(movementUnitCost),
          );

          this.assertDecimalFits(newQuantity, 'quantityOnHand');

          this.assertDecimalFits(newAverageCost, 'averageUnitCost');

          this.assertDecimalFits(totalCost, 'totalCost');

          await this.updateLockedBalance(
            transaction,
            organizationId,
            balance,
            newQuantity,
            newAverageCost,
            occurredAt,
          );

          const movement = await transaction.inventoryMovement.create({
            data: {
              organizationId,
              warehouseId: dto.warehouseId,
              productId: dto.productId,
              unitId: dto.unitId,
              type: InventoryMovementType.ADJUSTMENT,
              direction: dto.direction,
              status: InventoryMovementStatus.POSTED,
              quantity,
              factorToBase: factor,
              baseQuantity,
              unitCost: movementUnitCost,
              totalCost,
              balanceQuantityAfter: newQuantity,
              averageUnitCostAfter: newAverageCost,
              occurredAt,
              postedAt: new Date(),
              referenceType: 'INVENTORY_ADJUSTMENT',
              referenceNumber: dto.referenceNumber ?? null,
              idempotencyKey: dto.idempotencyKey ?? null,
              notes: dto.notes ?? null,
            },
            select: movementSelect,
          });

          return this.toMovementResponse(movement);
        },
      );
    } catch (error: unknown) {
      this.handleWriteError(error);
    }
  }

  async createTransfer(
    organizationId: string,
    dto: CreateInventoryTransferDto,
  ): Promise<InventoryTransferResponse> {
    if (dto.sourceWarehouseId === dto.destinationWarehouseId) {
      throw new BadRequestException(
        'Source and destination warehouses must be different.',
      );
    }

    try {
      return await this.prismaService.withTenant(
        organizationId,
        async (transaction) => {
          if (dto.idempotencyKey) {
            const existing = await this.findExistingTransfer(
              transaction,
              organizationId,
              dto.idempotencyKey,
            );

            if (existing) {
              return existing;
            }
          }

          await this.assertActiveWarehouse(
            transaction,
            organizationId,
            dto.sourceWarehouseId,
          );

          await this.assertActiveWarehouse(
            transaction,
            organizationId,
            dto.destinationWarehouseId,
          );

          const product = await this.getActiveProduct(
            transaction,
            organizationId,
            dto.productId,
          );

          const factor = await this.resolveFactorToBase(
            transaction,
            organizationId,
            dto.productId,
            product.baseUnitId,
            dto.unitId,
          );

          const quantity = this.parsePositiveDecimal(dto.quantity, 'quantity');

          const baseQuantity = this.roundDecimal(quantity.mul(factor));

          this.assertDecimalFits(baseQuantity, 'baseQuantity');

          const occurredAt =
            dto.occurredAt !== undefined
              ? new Date(dto.occurredAt)
              : new Date();

          const warehouseIds = [
            dto.sourceWarehouseId,
            dto.destinationWarehouseId,
          ].sort((left, right) => left.localeCompare(right));

          const lockedBalances = new Map<string, LockedBalanceRow>();

          for (const warehouseId of warehouseIds) {
            const locked = await this.lockBalance(
              transaction,
              organizationId,
              warehouseId,
              dto.productId,
            );

            lockedBalances.set(warehouseId, locked);
          }

          const sourceBalance = lockedBalances.get(dto.sourceWarehouseId);

          const destinationBalance = lockedBalances.get(
            dto.destinationWarehouseId,
          );

          if (!sourceBalance || !destinationBalance) {
            throw new ConflictException(
              'Inventory balances could not be locked.',
            );
          }

          this.assertNotBackdated(sourceBalance.lastMovementAt, occurredAt);

          this.assertNotBackdated(
            destinationBalance.lastMovementAt,
            occurredAt,
          );

          const sourceQuantity = new Prisma.Decimal(
            sourceBalance.quantityOnHand,
          );

          const sourceReserved = new Prisma.Decimal(
            sourceBalance.quantityReserved,
          );

          const sourceAverageCost = new Prisma.Decimal(
            sourceBalance.averageUnitCost,
          );

          const sourceAvailable = sourceQuantity.sub(sourceReserved);

          if (sourceAvailable.lt(baseQuantity)) {
            throw new ConflictException(
              'Insufficient inventory in the source warehouse.',
            );
          }

          const destinationQuantity = new Prisma.Decimal(
            destinationBalance.quantityOnHand,
          );

          const destinationAverageCost = new Prisma.Decimal(
            destinationBalance.averageUnitCost,
          );

          const sourceQuantityAfter = this.roundDecimal(
            sourceQuantity.sub(baseQuantity),
          );

          const sourceAverageAfter = sourceQuantityAfter.eq(0)
            ? new Prisma.Decimal(0)
            : sourceAverageCost;

          const destinationQuantityAfter = this.roundDecimal(
            destinationQuantity.add(baseQuantity),
          );

          const destinationValue = destinationQuantity.mul(
            destinationAverageCost,
          );

          const transferredValue = baseQuantity.mul(sourceAverageCost);

          const destinationAverageAfter = destinationQuantityAfter.eq(0)
            ? new Prisma.Decimal(0)
            : this.roundDecimal(
                destinationValue
                  .add(transferredValue)
                  .div(destinationQuantityAfter),
              );

          const totalCost = this.roundDecimal(
            baseQuantity.mul(sourceAverageCost),
          );

          this.assertDecimalFits(sourceQuantityAfter, 'sourceQuantityAfter');

          this.assertDecimalFits(
            destinationQuantityAfter,
            'destinationQuantityAfter',
          );

          this.assertDecimalFits(
            destinationAverageAfter,
            'destinationAverageAfter',
          );

          this.assertDecimalFits(totalCost, 'totalCost');

          await this.updateLockedBalance(
            transaction,
            organizationId,
            sourceBalance,
            sourceQuantityAfter,
            sourceAverageAfter,
            occurredAt,
          );

          await this.updateLockedBalance(
            transaction,
            organizationId,
            destinationBalance,
            destinationQuantityAfter,
            destinationAverageAfter,
            occurredAt,
          );

          const transferGroupId = randomUUID();

          const sourceIdempotencyKey = dto.idempotencyKey
            ? `${dto.idempotencyKey}:OUT`
            : null;

          const destinationIdempotencyKey = dto.idempotencyKey
            ? `${dto.idempotencyKey}:IN`
            : null;

          const sourceMovement = await transaction.inventoryMovement.create({
            data: {
              organizationId,
              warehouseId: dto.sourceWarehouseId,
              productId: dto.productId,
              unitId: dto.unitId,
              type: InventoryMovementType.TRANSFER,
              direction: InventoryMovementDirection.OUT,
              status: InventoryMovementStatus.POSTED,
              quantity,
              factorToBase: factor,
              baseQuantity,
              unitCost: sourceAverageCost,
              totalCost,
              balanceQuantityAfter: sourceQuantityAfter,
              averageUnitCostAfter: sourceAverageAfter,
              occurredAt,
              postedAt: new Date(),
              referenceType: 'INVENTORY_TRANSFER',
              referenceId: transferGroupId,
              referenceNumber: dto.referenceNumber ?? null,
              transferGroupId,
              idempotencyKey: sourceIdempotencyKey,
              notes: dto.notes ?? null,
            },
            select: movementSelect,
          });

          const destinationMovement =
            await transaction.inventoryMovement.create({
              data: {
                organizationId,
                warehouseId: dto.destinationWarehouseId,
                productId: dto.productId,
                unitId: dto.unitId,
                type: InventoryMovementType.TRANSFER,
                direction: InventoryMovementDirection.IN,
                status: InventoryMovementStatus.POSTED,
                quantity,
                factorToBase: factor,
                baseQuantity,
                unitCost: sourceAverageCost,
                totalCost,
                balanceQuantityAfter: destinationQuantityAfter,
                averageUnitCostAfter: destinationAverageAfter,
                occurredAt,
                postedAt: new Date(),
                referenceType: 'INVENTORY_TRANSFER',
                referenceId: transferGroupId,
                referenceNumber: dto.referenceNumber ?? null,
                transferGroupId,
                idempotencyKey: destinationIdempotencyKey,
                notes: dto.notes ?? null,
              },
              select: movementSelect,
            });

          return {
            transferGroupId,
            sourceMovement: this.toMovementResponse(sourceMovement),
            destinationMovement: this.toMovementResponse(destinationMovement),
          };
        },
      );
    } catch (error: unknown) {
      this.handleWriteError(error);
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

  private async getActiveProduct(
    transaction: Prisma.TransactionClient,
    organizationId: string,
    productId: string,
  ): Promise<ActiveProductContext> {
    const product = await transaction.product.findFirst({
      where: {
        id: productId,
        organizationId,
        status: EntityStatus.ACTIVE,
        deletedAt: null,
        trackInventory: true,
        baseUnit: {
          is: {
            status: EntityStatus.ACTIVE,
            deletedAt: null,
          },
        },
      },
      select: {
        id: true,
        baseUnitId: true,
      },
    });

    if (!product) {
      throw new NotFoundException('Active inventory product not found.');
    }

    return product;
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
        unit: {
          is: {
            status: EntityStatus.ACTIVE,
            deletedAt: null,
          },
        },
      },
      select: {
        factorToBase: true,
      },
    });

    if (!conversion) {
      throw new BadRequestException(
        'The selected unit is not an active conversion for the product.',
      );
    }

    return conversion.factorToBase;
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
          id,
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

  private async updateLockedBalance(
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

  private async findExistingTransfer(
    transaction: Prisma.TransactionClient,
    organizationId: string,
    idempotencyKey: string,
  ): Promise<InventoryTransferResponse | null> {
    const sourceKey = `${idempotencyKey}:OUT`;

    const source = await transaction.inventoryMovement.findFirst({
      where: {
        organizationId,
        idempotencyKey: sourceKey,
      },
      select: movementSelect,
    });

    if (!source) {
      return null;
    }

    if (!source.transferGroupId) {
      throw new ConflictException('The existing transfer is incomplete.');
    }

    const movements = await transaction.inventoryMovement.findMany({
      where: {
        organizationId,
        transferGroupId: source.transferGroupId,
      },
      select: movementSelect,
    });

    const sourceMovement = movements.find(
      (movement) => movement.direction === InventoryMovementDirection.OUT,
    );

    const destinationMovement = movements.find(
      (movement) => movement.direction === InventoryMovementDirection.IN,
    );

    if (!sourceMovement || !destinationMovement) {
      throw new ConflictException('The existing transfer is incomplete.');
    }

    return {
      transferGroupId: source.transferGroupId,
      sourceMovement: this.toMovementResponse(sourceMovement),
      destinationMovement: this.toMovementResponse(destinationMovement),
    };
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

  private assertNotBackdated(
    lastMovementAt: Date | null,
    occurredAt: Date,
  ): void {
    if (lastMovementAt && occurredAt.getTime() < lastMovementAt.getTime()) {
      throw new ConflictException(
        'The movement date cannot be earlier than the last posted inventory movement.',
      );
    }
  }

  private toBalanceResponse(record: BalanceRecord): InventoryBalanceResponse {
    const available = record.quantityOnHand.sub(record.quantityReserved);

    const inventoryValue = record.quantityOnHand.mul(record.averageUnitCost);

    return {
      id: record.id,
      warehouseId: record.warehouseId,
      productId: record.productId,
      quantityOnHand: record.quantityOnHand.toString(),
      quantityReserved: record.quantityReserved.toString(),
      quantityAvailable: available.toString(),
      averageUnitCost: record.averageUnitCost.toString(),
      inventoryValue: this.roundDecimal(inventoryValue).toString(),
      version: record.version,
      lastMovementAt: record.lastMovementAt,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      warehouse: record.warehouse,
      product: record.product,
    };
  }

  private toMovementResponse(
    record: MovementRecord,
  ): InventoryMovementResponse {
    return {
      id: record.id,
      warehouseId: record.warehouseId,
      productId: record.productId,
      unitId: record.unitId,
      type: record.type,
      direction: record.direction,
      status: record.status,
      quantity: record.quantity.toString(),
      factorToBase: record.factorToBase.toString(),
      baseQuantity: record.baseQuantity.toString(),
      unitCost: record.unitCost.toString(),
      totalCost: record.totalCost.toString(),
      balanceQuantityAfter: record.balanceQuantityAfter?.toString() ?? null,
      averageUnitCostAfter: record.averageUnitCostAfter?.toString() ?? null,
      occurredAt: record.occurredAt,
      postedAt: record.postedAt,
      referenceType: record.referenceType,
      referenceId: record.referenceId,
      referenceNumber: record.referenceNumber,
      transferGroupId: record.transferGroupId,
      idempotencyKey: record.idempotencyKey,
      notes: record.notes,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      warehouse: record.warehouse,
      product: record.product,
      unit: record.unit,
    };
  }

  private handleWriteError(error: unknown): never {
    if (this.hasPrismaCode(error, 'P2002')) {
      throw new ConflictException(
        'The inventory operation has already been registered.',
      );
    }

    if (this.hasPrismaCode(error, 'P2003')) {
      throw new BadRequestException('The inventory relationships are invalid.');
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
