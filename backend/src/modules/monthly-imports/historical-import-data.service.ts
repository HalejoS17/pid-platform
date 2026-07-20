import { Injectable } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../../database/prisma/prisma.service';
import {
  QueryHistoricalInventoryDto,
  QueryHistoricalKardexDto,
} from './dto/historical-import-data.dto';

interface HistoricalInventoryQueryRow {
  itemName: string;
  itemNormalized: string;
  warehouseCode: string;
  balanceQuantity: Prisma.Decimal;
  averageCost: Prisma.Decimal;
  inventoryValue: Prisma.Decimal;
  rotation90DaysPercent: Prisma.Decimal | null;
  lastMovementAt: Date;
  totalCount: bigint;
  totalInventoryValue: Prisma.Decimal;
  withStockCount: bigint;
}

interface HistoricalKardexQueryRow {
  id: string;
  sourceRow: number;
  itemName: string;
  warehouseCode: string;
  movementDate: Date;
  transactionType: string;
  documentNumber: string | null;
  direction: 'IN' | 'OUT';
  unitCode: string;
  quantity: Prisma.Decimal;
  unitCost: Prisma.Decimal;
  totalCost: Prisma.Decimal;
  balanceQuantity: Prisma.Decimal;
  averageCost: Prisma.Decimal;
  supplierName: string | null;
  totalCount: bigint;
  totalEntryValue: Prisma.Decimal;
  totalOutputValue: Prisma.Decimal;
}

@Injectable()
export class HistoricalImportDataService {
  constructor(private readonly prismaService: PrismaService) {}

  async getInventory(
    organizationId: string,
    query: QueryHistoricalInventoryDto,
  ) {
    const skip = (query.page - 1) * query.limit;

    const periodEndExclusive = new Date(Date.UTC(query.year, query.month, 1));

    const ninetyDaysStart = new Date(
      periodEndExclusive.getTime() - 90 * 86_400_000,
    );

    const search = query.search?.trim() ?? '';

    const searchPattern = `%${search}%`;

    const searchCondition =
      search.length > 0
        ? Prisma.sql`
            (
              item_name ILIKE ${searchPattern}
              OR warehouse_code ILIKE ${searchPattern}
            )
          `
        : Prisma.sql`TRUE`;

    return this.prismaService.withTenant(
      organizationId,
      async (transaction) => {
        const rows = await transaction.$queryRaw<HistoricalInventoryQueryRow[]>`
            WITH eligible_batches AS (
              SELECT
                id,
                period_year,
                period_month
              FROM imports.monthly_import_batches
              WHERE
                organization_id = CAST(${organizationId} AS uuid)
                AND is_current = true
                AND status::text IN (
                  'COMPLETED',
                  'COMPLETED_WITH_ERRORS'
                )
                AND (
                  period_year < ${query.year}
                  OR (
                    period_year = ${query.year}
                    AND period_month <= ${query.month}
                  )
                )
            ),
            latest_overall AS (
              SELECT
                k.item_name,
                k.item_normalized,
                k.warehouse_code,
                k.balance_quantity,
                k.average_cost,
                k.movement_date,
                ROW_NUMBER() OVER (
                  PARTITION BY
                    k.item_normalized,
                    k.warehouse_code
                  ORDER BY
                    k.movement_date DESC,
                    k.source_row DESC
                ) AS row_number
              FROM analytics.historical_kardex_entries k
              INNER JOIN eligible_batches b
                ON b.id = k.batch_id
              WHERE
                k.organization_id = CAST(${organizationId} AS uuid)
                AND k.movement_date < ${periodEndExclusive}
            ),
            current_snapshot AS (
              SELECT
                item_name,
                item_normalized,
                warehouse_code,
                balance_quantity,
                average_cost,
                movement_date,
                GREATEST(balance_quantity, 0)
                  * GREATEST(average_cost, 0) AS inventory_value
              FROM latest_overall
              WHERE
                row_number = 1
                AND ${searchCondition}
            ),
            recent_periods AS (
              SELECT
                period_year,
                period_month
              FROM eligible_batches
              GROUP BY
                period_year,
                period_month
              ORDER BY
                period_year DESC,
                period_month DESC
              LIMIT 3
            ),
            period_ranked AS (
              SELECT
                b.period_year,
                b.period_month,
                k.item_normalized,
                k.warehouse_code,
                k.balance_quantity,
                k.average_cost,
                ROW_NUMBER() OVER (
                  PARTITION BY
                    b.id,
                    k.item_normalized,
                    k.warehouse_code
                  ORDER BY
                    k.movement_date DESC,
                    k.source_row DESC
                ) AS row_number
              FROM analytics.historical_kardex_entries k
              INNER JOIN eligible_batches b
                ON b.id = k.batch_id
              INNER JOIN recent_periods rp
                ON rp.period_year = b.period_year
                AND rp.period_month = b.period_month
              WHERE
                k.organization_id = CAST(${organizationId} AS uuid)
                AND k.movement_date < ${periodEndExclusive}
            ),
            period_values AS (
              SELECT
                period_year,
                period_month,
                item_normalized,
                warehouse_code,
                GREATEST(balance_quantity, 0)
                  * GREATEST(average_cost, 0) AS inventory_value
              FROM period_ranked
              WHERE row_number = 1
            ),
            average_values AS (
              SELECT
                item_normalized,
                warehouse_code,
                AVG(inventory_value) AS average_inventory_value
              FROM period_values
              GROUP BY
                item_normalized,
                warehouse_code
            ),
            output_values AS (
              SELECT
                k.item_normalized,
                k.warehouse_code,
                COALESCE(
                  SUM(
                    GREATEST(
                      k.total_out,
                      0
                    )
                  ),
                  0
                ) AS output_cost_90_days
              FROM analytics.historical_kardex_entries k
              INNER JOIN eligible_batches b
                ON b.id = k.batch_id
              WHERE
                k.organization_id = CAST(${organizationId} AS uuid)
                AND k.movement_date >= ${ninetyDaysStart}
                AND k.movement_date < ${periodEndExclusive}
                AND k.quantity_out > 0
              GROUP BY
                k.item_normalized,
                k.warehouse_code
            ),
            enriched AS (
              SELECT
                c.item_name,
                c.item_normalized,
                c.warehouse_code,
                c.balance_quantity,
                c.average_cost,
                c.inventory_value,
                c.movement_date,
                CASE
                  WHEN COALESCE(
                    a.average_inventory_value,
                    c.inventory_value
                  ) > 0
                  THEN (
                    COALESCE(
                      o.output_cost_90_days,
                      0
                    )
                    /
                    COALESCE(
                      a.average_inventory_value,
                      c.inventory_value
                    )
                  ) * 100
                  ELSE NULL
                END AS rotation_90_days_percent
              FROM current_snapshot c
              LEFT JOIN average_values a
                ON a.item_normalized = c.item_normalized
                AND a.warehouse_code = c.warehouse_code
              LEFT JOIN output_values o
                ON o.item_normalized = c.item_normalized
                AND o.warehouse_code = c.warehouse_code
            )
            SELECT
              item_name AS "itemName",
              item_normalized AS "itemNormalized",
              warehouse_code AS "warehouseCode",
              balance_quantity AS "balanceQuantity",
              average_cost AS "averageCost",
              inventory_value AS "inventoryValue",
              rotation_90_days_percent AS "rotation90DaysPercent",
              movement_date AS "lastMovementAt",
              COUNT(*) OVER() AS "totalCount",
              COALESCE(
                SUM(inventory_value) OVER(),
                0
              ) AS "totalInventoryValue",
              COUNT(*) FILTER (
                WHERE balance_quantity > 0
              ) OVER() AS "withStockCount"
            FROM enriched
            ORDER BY
              item_name ASC,
              warehouse_code ASC
            OFFSET ${skip}
            LIMIT ${query.limit}
          `;

        const first = rows[0];

        const total = first ? Number(first.totalCount) : 0;

        return {
          data: rows.map((row) => ({
            itemName: row.itemName,

            itemNormalized: row.itemNormalized,

            warehouseCode: row.warehouseCode,

            quantityOnHand: this.decimal(row.balanceQuantity),

            quantityReserved: 0,

            quantityAvailable: this.decimal(row.balanceQuantity),

            averageUnitCost: this.decimal(row.averageCost),

            inventoryValue: this.decimal(row.inventoryValue),

            rotation90DaysPercent:
              row.rotation90DaysPercent === null
                ? null
                : this.decimal(row.rotation90DaysPercent),

            lastMovementAt: row.lastMovementAt,
          })),

          summary: {
            totalInventoryValue: first
              ? this.decimal(first.totalInventoryValue)
              : 0,

            withStock: first ? Number(first.withStockCount) : 0,
          },

          meta: {
            page: query.page,

            limit: query.limit,

            total,

            totalPages: total === 0 ? 0 : Math.ceil(total / query.limit),
          },
        };
      },
    );
  }

  async getKardex(organizationId: string, query: QueryHistoricalKardexDto) {
    const skip = (query.page - 1) * query.limit;

    const search = query.search?.trim() ?? '';

    const searchPattern = `%${search}%`;

    const searchCondition =
      search.length > 0
        ? Prisma.sql`
            (
              k.item_name ILIKE ${searchPattern}
              OR k.warehouse_code ILIKE ${searchPattern}
              OR COALESCE(k.document_number, '') ILIKE ${searchPattern}
              OR k.transaction_type ILIKE ${searchPattern}
              OR COALESCE(k.supplier_name, '') ILIKE ${searchPattern}
            )
          `
        : Prisma.sql`TRUE`;

    const directionCondition =
      query.direction === 'IN'
        ? Prisma.sql`k.quantity_in > 0`
        : query.direction === 'OUT'
          ? Prisma.sql`k.quantity_out > 0`
          : Prisma.sql`TRUE`;

    return this.prismaService.withTenant(
      organizationId,
      async (transaction) => {
        const rows = await transaction.$queryRaw<HistoricalKardexQueryRow[]>`
            WITH selected_batch AS (
              SELECT id
              FROM imports.monthly_import_batches
              WHERE
                organization_id = CAST(${organizationId} AS uuid)
                AND period_year = ${query.year}
                AND period_month = ${query.month}
                AND is_current = true
                AND status::text IN (
                  'COMPLETED',
                  'COMPLETED_WITH_ERRORS'
                )
              LIMIT 1
            ),
            filtered AS (
              SELECT
                k.id,
                k.source_row,
                k.item_name,
                k.warehouse_code,
                k.movement_date,
                k.transaction_type,
                k.document_number,
                CASE
                  WHEN k.quantity_out > 0
                    AND k.quantity_in = 0
                    THEN 'OUT'
                  ELSE 'IN'
                END AS direction,
                k.unit_code,
                CASE
                  WHEN k.quantity_out > 0
                    AND k.quantity_in = 0
                    THEN k.quantity_out
                  ELSE k.quantity_in
                END AS quantity,
                CASE
                  WHEN k.quantity_out > 0
                    AND k.quantity_in = 0
                    THEN k.unit_cost_out
                  ELSE k.unit_cost_in
                END AS unit_cost,
                CASE
                  WHEN k.quantity_out > 0
                    AND k.quantity_in = 0
                    THEN k.total_out
                  ELSE k.total_in
                END AS total_cost,
                k.balance_quantity,
                k.average_cost,
                k.supplier_name
              FROM analytics.historical_kardex_entries k
              INNER JOIN selected_batch b
                ON b.id = k.batch_id
              WHERE
                k.organization_id = CAST(${organizationId} AS uuid)
                AND ${searchCondition}
                AND ${directionCondition}
            )
            SELECT
              id,
              source_row AS "sourceRow",
              item_name AS "itemName",
              warehouse_code AS "warehouseCode",
              movement_date AS "movementDate",
              transaction_type AS "transactionType",
              document_number AS "documentNumber",
              direction,
              unit_code AS "unitCode",
              quantity,
              unit_cost AS "unitCost",
              total_cost AS "totalCost",
              balance_quantity AS "balanceQuantity",
              average_cost AS "averageCost",
              supplier_name AS "supplierName",
              COUNT(*) OVER() AS "totalCount",
              COALESCE(
                SUM(
                  CASE
                    WHEN direction = 'IN'
                      THEN total_cost
                    ELSE 0
                  END
                ) OVER(),
                0
              ) AS "totalEntryValue",
              COALESCE(
                SUM(
                  CASE
                    WHEN direction = 'OUT'
                      THEN total_cost
                    ELSE 0
                  END
                ) OVER(),
                0
              ) AS "totalOutputValue"
            FROM filtered
            ORDER BY
              movement_date DESC,
              source_row DESC
            OFFSET ${skip}
            LIMIT ${query.limit}
          `;

        const first = rows[0];

        const total = first ? Number(first.totalCount) : 0;

        return {
          data: rows.map((row) => ({
            id: row.id,

            sourceRow: row.sourceRow,

            itemName: row.itemName,

            warehouseCode: row.warehouseCode,

            movementDate: row.movementDate,

            transactionType: row.transactionType,

            documentNumber: row.documentNumber,

            direction: row.direction,

            unitCode: row.unitCode,

            quantity: this.decimal(row.quantity),

            unitCost: this.decimal(row.unitCost),

            totalCost: this.decimal(row.totalCost),

            balanceQuantity: this.decimal(row.balanceQuantity),

            averageCost: this.decimal(row.averageCost),

            supplierName: row.supplierName,
          })),

          summary: {
            entryValue: first ? this.decimal(first.totalEntryValue) : 0,

            outputValue: first ? this.decimal(first.totalOutputValue) : 0,
          },

          meta: {
            page: query.page,

            limit: query.limit,

            total,

            totalPages: total === 0 ? 0 : Math.ceil(total / query.limit),
          },
        };
      },
    );
  }

  private decimal(
    value: Prisma.Decimal | number | string | null | undefined,
  ): number {
    const result = Number(value ?? 0);

    return Number.isFinite(result) ? result : 0;
  }
}
