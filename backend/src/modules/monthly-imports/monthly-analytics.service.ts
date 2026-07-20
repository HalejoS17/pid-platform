import { Injectable, NotFoundException } from '@nestjs/common';
import { MonthlyImportStatus, Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../../database/prisma/prisma.service';
import { QueryMonthlyAnalyticsDto } from './dto/monthly-import.dto';

interface InventorySnapshotRow {
  itemName: string;
  itemNormalized: string;
  warehouseCode: string;
  balanceQuantity: Prisma.Decimal;
  averageCost: Prisma.Decimal;
  inventoryValue: Prisma.Decimal;
  lastOutputAt: Date | null;
}

interface MonthlyInventoryItemValueRow {
  periodYear: number;
  periodMonth: number;
  itemNormalized: string;
  inventoryValue: Prisma.Decimal;
}

interface OutputCostByItemRow {
  itemNormalized: string;
  value: Prisma.Decimal;
}

type BreakdownDimension = 'GROUP_1' | 'GROUP_2' | 'ARTICLE';

@Injectable()
export class MonthlyAnalyticsService {
  constructor(private readonly prismaService: PrismaService) {}

  async getDashboard(organizationId: string, query: QueryMonthlyAnalyticsDto) {
    const { year, month } = query;

    const periodEndExclusive = new Date(Date.UTC(year, month, 1));

    const ninetyDaysStart = new Date(
      periodEndExclusive.getTime() - 90 * 86_400_000,
    );

    return this.prismaService.withTenant(
      organizationId,
      async (transaction) => {
        const batch = await transaction.monthlyImportBatch.findFirst({
          where: {
            organizationId,
            periodYear: year,
            periodMonth: month,
            isCurrent: true,
            status: {
              in: [
                MonthlyImportStatus.COMPLETED,
                MonthlyImportStatus.COMPLETED_WITH_ERRORS,
              ],
            },
          },
          select: {
            id: true,
            version: true,
            status: true,
            completedAt: true,
            summary: true,
          },
        });

        if (!batch) {
          throw new NotFoundException(
            `No existe una carga mensual completada para ${year}-${String(
              month,
            ).padStart(2, '0')}.`,
          );
        }

        const [
          allSales,
          allRecipes,
          allWaiterSales,
          inventoryRows,
          monthlyInventoryRows,
          outputCostRows,
        ] = await Promise.all([
          transaction.salesLine.findMany({
            where: {
              organizationId,
              batchId: batch.id,
            },
            select: {
              groupName: true,
              subgroupName: true,
              saleDate: true,
              articleName: true,
              articleNormalized: true,
              quantity: true,
              subtotal: true,
              taxAmount: true,
              serviceAmount: true,
              totalAmount: true,
            },
          }),

          transaction.recipeComponentSnapshot.findMany({
            where: {
              organizationId,
              batchId: batch.id,
            },
            select: {
              articleName: true,
              articleNormalized: true,
              ingredientName: true,
              ingredientNormalized: true,
              totalCost: true,
              costWithWaste: true,
              finalCost: true,
            },
          }),

          transaction.waiterSalesLine.findMany({
            where: {
              organizationId,
              batchId: batch.id,
            },
            select: {
              waiterName: true,
              waiterNormalized: true,
              groupName: true,
              subgroupName: true,
              articleName: true,
              articleNormalized: true,
              quantity: true,
              totalAmount: true,
            },
          }),

          transaction.$queryRaw<InventorySnapshotRow[]>`
            WITH eligible_batches AS (
              SELECT id
              FROM imports.monthly_import_batches
              WHERE
                organization_id = CAST(${organizationId} AS uuid)
                AND is_current = true
                AND status::text IN (
                  'COMPLETED',
                  'COMPLETED_WITH_ERRORS'
                )
                AND (
                  period_year < ${year}
                  OR (
                    period_year = ${year}
                    AND period_month <= ${month}
                  )
                )
            ),
            ranked AS (
              SELECT
                k.item_name,
                k.item_normalized,
                k.warehouse_code,
                k.balance_quantity,
                k.average_cost,
                MAX(
                  CASE
                    WHEN k.quantity_out > 0
                      THEN k.movement_date
                    ELSE NULL
                  END
                ) OVER (
                  PARTITION BY
                    k.item_normalized,
                    k.warehouse_code
                ) AS last_output_at,
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
            )
            SELECT
              item_name AS "itemName",
              item_normalized AS "itemNormalized",
              warehouse_code AS "warehouseCode",
              balance_quantity AS "balanceQuantity",
              average_cost AS "averageCost",
              GREATEST(balance_quantity, 0)
                * GREATEST(average_cost, 0) AS "inventoryValue",
              last_output_at AS "lastOutputAt"
            FROM ranked
            WHERE row_number = 1
          `,

          transaction.$queryRaw<MonthlyInventoryItemValueRow[]>`
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
                  period_year < ${year}
                  OR (
                    period_year = ${year}
                    AND period_month <= ${month}
                  )
                )
            ),
            ranked AS (
              SELECT
                b.period_year,
                b.period_month,
                k.item_normalized,
                k.warehouse_code,
                k.balance_quantity,
                k.average_cost,
                ROW_NUMBER() OVER (
                  PARTITION BY
                    k.batch_id,
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
            )
            SELECT
              period_year AS "periodYear",
              period_month AS "periodMonth",
              item_normalized AS "itemNormalized",
              GREATEST(balance_quantity, 0)
                * GREATEST(average_cost, 0) AS "inventoryValue"
            FROM ranked
            WHERE row_number = 1
          `,

          transaction.$queryRaw<OutputCostByItemRow[]>`
            SELECT
              k.item_normalized AS "itemNormalized",
              COALESCE(
                SUM(GREATEST(k.total_out, 0)),
                0
              ) AS value
            FROM analytics.historical_kardex_entries k
            INNER JOIN imports.monthly_import_batches b
              ON b.id = k.batch_id
            WHERE
              k.organization_id = CAST(${organizationId} AS uuid)
              AND b.organization_id = CAST(${organizationId} AS uuid)
              AND b.is_current = true
              AND b.status::text IN (
                'COMPLETED',
                'COMPLETED_WITH_ERRORS'
              )
              AND k.movement_date >= ${ninetyDaysStart}
              AND k.movement_date < ${periodEndExclusive}
              AND k.quantity_out > 0
            GROUP BY k.item_normalized
          `,
        ]);

        const selectedGroup1 = this.normalizeKey(query.group1);

        const selectedGroup2 = this.normalizeKey(query.group2);

        const selectedArticle = this.normalizeKey(query.article);

        const selectedIngredient = this.normalizeKey(query.ingredient);

        const ingredientArticleSet =
          selectedIngredient.length > 0
            ? new Set(
                allRecipes
                  .filter(
                    (recipe) =>
                      recipe.ingredientNormalized === selectedIngredient,
                  )
                  .map((recipe) => recipe.articleNormalized),
              )
            : null;

        const filteredSales = allSales.filter(
          (line) =>
            this.matches(line.groupName, selectedGroup1) &&
            this.matches(line.subgroupName, selectedGroup2) &&
            (selectedArticle.length === 0 ||
              line.articleNormalized === selectedArticle) &&
            (ingredientArticleSet === null ||
              ingredientArticleSet.has(line.articleNormalized)),
        );

        const filteredArticleSet = new Set(
          filteredSales.map((line) => line.articleNormalized),
        );

        const recipeCostMap = new Map<string, number>();

        for (const component of allRecipes) {
          if (!filteredArticleSet.has(component.articleNormalized)) {
            continue;
          }

          const finalCost = this.decimal(component.finalCost);

          const costWithWaste = this.decimal(component.costWithWaste);

          const totalCost = this.decimal(component.totalCost);

          const selectedCost =
            finalCost > 0
              ? finalCost
              : costWithWaste > 0
                ? costWithWaste
                : totalCost;

          recipeCostMap.set(
            component.articleNormalized,
            (recipeCostMap.get(component.articleNormalized) ?? 0) +
              selectedCost,
          );
        }

        const hasDishFilter =
          selectedGroup1.length > 0 ||
          selectedGroup2.length > 0 ||
          selectedArticle.length > 0;

        let inventoryIngredientSet: Set<string> | null = null;

        if (selectedIngredient.length > 0) {
          inventoryIngredientSet = new Set([selectedIngredient]);
        } else if (hasDishFilter) {
          inventoryIngredientSet = new Set(
            allRecipes
              .filter((recipe) =>
                filteredArticleSet.has(recipe.articleNormalized),
              )
              .map((recipe) => recipe.ingredientNormalized),
          );
        }

        const filteredInventoryRows = inventoryRows.filter(
          (row) =>
            inventoryIngredientSet === null ||
            inventoryIngredientSet.has(row.itemNormalized),
        );

        const filteredMonthlyInventoryRows = monthlyInventoryRows.filter(
          (row) =>
            inventoryIngredientSet === null ||
            inventoryIngredientSet.has(row.itemNormalized),
        );

        const filteredOutputCostRows = outputCostRows.filter(
          (row) =>
            inventoryIngredientSet === null ||
            inventoryIngredientSet.has(row.itemNormalized),
        );

        const filteredWaiterSales = allWaiterSales.filter(
          (line) =>
            this.matches(line.groupName, selectedGroup1) &&
            this.matches(line.subgroupName, selectedGroup2) &&
            (selectedArticle.length === 0 ||
              line.articleNormalized === selectedArticle) &&
            (ingredientArticleSet === null ||
              ingredientArticleSet.has(line.articleNormalized)),
        );

        const breakdownDimension = this.resolveBreakdownDimension(
          selectedGroup1,
          selectedGroup2,
        );

        let netSales = 0;
        let grossBilled = 0;
        let taxAmount = 0;
        let serviceAmount = 0;
        let matchedRevenue = 0;
        let estimatedCostOfSales = 0;

        const breakdownMap = new Map<
          string,
          {
            sales: number;
            cost: number;
          }
        >();

        const dailyMap = new Map<string, number>();

        const articleMap = new Map<string, number>();

        for (const line of filteredSales) {
          const subtotal = this.decimal(line.subtotal);

          const quantity = this.decimal(line.quantity);

          const recipeCost = recipeCostMap.get(line.articleNormalized);

          netSales += subtotal;

          grossBilled += this.decimal(line.totalAmount);

          taxAmount += this.decimal(line.taxAmount);

          serviceAmount += this.decimal(line.serviceAmount);

          const breakdownName = this.breakdownName(line, breakdownDimension);

          const currentBreakdown = breakdownMap.get(breakdownName) ?? {
            sales: 0,
            cost: 0,
          };

          currentBreakdown.sales += subtotal;

          if (recipeCost !== undefined) {
            const lineCost = quantity * recipeCost;

            estimatedCostOfSales += lineCost;

            matchedRevenue += subtotal;

            currentBreakdown.cost += lineCost;
          }

          breakdownMap.set(breakdownName, currentBreakdown);

          const day = line.saleDate.toISOString().slice(0, 10);

          dailyMap.set(day, (dailyMap.get(day) ?? 0) + subtotal);

          articleMap.set(
            line.articleName,
            (articleMap.get(line.articleName) ?? 0) + subtotal,
          );
        }
        const articleProfitabilityMap = new Map<
          string,
          {
            name: string;
            sales: number;
            cost: number;
          }
        >();

        for (const line of filteredSales) {
          const recipeCost = recipeCostMap.get(line.articleNormalized);

          if (recipeCost === undefined) {
            continue;
          }

          const current = articleProfitabilityMap.get(
            line.articleNormalized,
          ) ?? {
            name: line.articleName,
            sales: 0,
            cost: 0,
          };

          current.sales += this.decimal(line.subtotal);

          current.cost += this.decimal(line.quantity) * recipeCost;

          articleProfitabilityMap.set(line.articleNormalized, current);
        }

        const profitabilityArticles = [...articleProfitabilityMap.values()]
          .filter((item) => item.sales > 0)
          .map((item) => {
            const margin = item.sales - item.cost;

            return {
              name: item.name,

              sales: this.round(item.sales),

              cost: this.round(item.cost),

              margin: this.round(margin),

              marginPercent: this.round(margin / item.sales),
            };
          });

        const mostProfitableArticles = [...profitabilityArticles]
          .sort(
            (left, right) =>
              right.marginPercent - left.marginPercent ||
              right.margin - left.margin,
          )
          .slice(0, 10);

        const leastProfitableArticles = [...profitabilityArticles]
          .sort(
            (left, right) =>
              left.marginPercent - right.marginPercent ||
              left.margin - right.margin,
          )
          .slice(0, 10);

        const estimatedGrossMargin = matchedRevenue - estimatedCostOfSales;

        const estimatedGrossMarginPercent =
          matchedRevenue > 0 ? estimatedGrossMargin / matchedRevenue : 0;

        const recipeCoveragePercent =
          netSales > 0 ? matchedRevenue / netSales : 0;

        const inventoryValue = filteredInventoryRows.reduce(
          (total, item) => total + this.decimal(item.inventoryValue),
          0,
        );

        const endDate = new Date(periodEndExclusive.getTime() - 1);

        let immobilizedCapital = 0;
        let slowRotationProducts = 0;
        let noOutputProducts = 0;

        const warehouseMap = new Map<string, number>();

        const agingMap = new Map<string, number>([
          ['0–30 días', 0],
          ['31–60 días', 0],
          ['61–90 días', 0],
          ['Más de 90 / sin salidas', 0],
        ]);

        const inventoryDetails = filteredInventoryRows.map((item) => {
          const value = this.decimal(item.inventoryValue);

          const quantity = this.decimal(item.balanceQuantity);

          const averageCost = this.decimal(item.averageCost);

          const daysWithoutOutput = item.lastOutputAt
            ? Math.max(
                0,
                Math.floor(
                  (endDate.getTime() - item.lastOutputAt.getTime()) /
                    86_400_000,
                ),
              )
            : null;

          let bucket = 'Más de 90 / sin salidas';

          if (daysWithoutOutput !== null) {
            if (daysWithoutOutput <= 30) {
              bucket = '0–30 días';
            } else if (daysWithoutOutput <= 60) {
              bucket = '31–60 días';
            } else if (daysWithoutOutput <= 90) {
              bucket = '61–90 días';
            }
          }

          agingMap.set(bucket, (agingMap.get(bucket) ?? 0) + value);

          warehouseMap.set(
            item.warehouseCode,
            (warehouseMap.get(item.warehouseCode) ?? 0) + value,
          );

          const hasNoOutput = item.lastOutputAt === null;

          const isSlow = daysWithoutOutput !== null && daysWithoutOutput >= 60;

          const isImmobilized = hasNoOutput || (daysWithoutOutput ?? 0) >= 60;

          if (hasNoOutput && value > 0) {
            noOutputProducts += 1;
          }

          if (isSlow && value > 0) {
            slowRotationProducts += 1;
          }

          if (isImmobilized) {
            immobilizedCapital += value;
          }

          return {
            itemName: item.itemName,
            warehouseCode: item.warehouseCode,
            quantity,
            averageCost,
            value,
            lastOutputAt: item.lastOutputAt,
            daysWithoutOutput,
            isImmobilized,
          };
        });

        const monthlyValueMap = new Map<
          string,
          {
            year: number;
            month: number;
            value: number;
          }
        >();

        for (const row of filteredMonthlyInventoryRows) {
          const key = `${row.periodYear}-${row.periodMonth}`;

          const current = monthlyValueMap.get(key) ?? {
            year: row.periodYear,
            month: row.periodMonth,
            value: 0,
          };

          current.value += this.decimal(row.inventoryValue);

          monthlyValueMap.set(key, current);
        }

        const monthlyValues = [...monthlyValueMap.values()]
          .sort(
            (left, right) => right.year - left.year || right.month - left.month,
          )
          .slice(0, 3);

        const averageInventory =
          monthlyValues.length > 0
            ? monthlyValues.reduce((total, item) => total + item.value, 0) /
              monthlyValues.length
            : inventoryValue;

        const outputCost90Days = filteredOutputCostRows.reduce(
          (total, row) => total + this.decimal(row.value),
          0,
        );

        const rotation90Days =
          averageInventory > 0 ? outputCost90Days / averageInventory : 0;

        const inventoryDays = rotation90Days > 0 ? 90 / rotation90Days : null;

        const waiterMap = new Map<
          string,
          {
            name: string;
            sales: number;
          }
        >();

        for (const row of filteredWaiterSales) {
          const current = waiterMap.get(row.waiterNormalized) ?? {
            name: row.waiterName,
            sales: 0,
          };

          current.sales += this.decimal(row.totalAmount);

          waiterMap.set(row.waiterNormalized, current);
        }

        const totalWaiterSales = [...waiterMap.values()].reduce(
          (total, item) => total + item.sales,
          0,
        );

        const waiterPerformanceMap = new Map<
          string,
          {
            name: string;
            sales: number;
            quantity: number;
            articles: Map<
              string,
              {
                name: string;
                sales: number;
                quantity: number;
              }
            >;
          }
        >();

        for (const row of filteredWaiterSales) {
          const current = waiterPerformanceMap.get(row.waiterNormalized) ?? {
            name: row.waiterName,
            sales: 0,
            quantity: 0,
            articles: new Map<
              string,
              {
                name: string;
                sales: number;
                quantity: number;
              }
            >(),
          };

          const rowSales = this.decimal(row.totalAmount);

          const rowQuantity = this.decimal(row.quantity);

          current.sales += rowSales;
          current.quantity += rowQuantity;

          const article = current.articles.get(row.articleNormalized) ?? {
            name: row.articleName,
            sales: 0,
            quantity: 0,
          };

          article.sales += rowSales;
          article.quantity += rowQuantity;

          current.articles.set(row.articleNormalized, article);

          waiterPerformanceMap.set(row.waiterNormalized, current);
        }

        const waiterPerformance = [...waiterPerformanceMap.values()]
          .sort((left, right) => right.sales - left.sales)
          .map((waiter, index) => ({
            rank: index + 1,
            name: waiter.name,
            sales: this.round(waiter.sales),
            share:
              totalWaiterSales > 0
                ? this.round(waiter.sales / totalWaiterSales)
                : 0,
            quantity: this.round(waiter.quantity),
            differentArticles: waiter.articles.size,
            topArticles: [...waiter.articles.values()]
              .sort((left, right) => right.sales - left.sales)
              .slice(0, 15)
              .map((article) => ({
                name: article.name,
                sales: this.round(article.sales),
                quantity: this.round(article.quantity),
                share:
                  waiter.sales > 0
                    ? this.round(article.sales / waiter.sales)
                    : 0,
              })),
          }));

        const group1OptionSales = allSales;

        const group2OptionSales = allSales.filter((line) =>
          this.matches(line.groupName, selectedGroup1),
        );

        const articleOptionSales = group2OptionSales.filter((line) =>
          this.matches(line.subgroupName, selectedGroup2),
        );

        const articleOptionSet = new Set(
          articleOptionSales.map((line) => line.articleNormalized),
        );

        const ingredientOptions = allRecipes
          .filter((recipe) => articleOptionSet.has(recipe.articleNormalized))
          .map((recipe) => recipe.ingredientName);

        return {
          period: {
            year,
            month,
          },

          importBatch: {
            id: batch.id,
            version: batch.version,
            status: batch.status,
            completedAt: batch.completedAt,
          },

          appliedFilters: {
            group1: query.group1 ?? null,
            group2: query.group2 ?? null,
            article: query.article ?? null,
            ingredient: query.ingredient ?? null,
          },

          filterOptions: {
            groups1: this.uniqueSorted(
              group1OptionSales.map((line) => line.groupName),
            ),

            groups2: this.uniqueSorted(
              group2OptionSales.map((line) => line.subgroupName),
            ),

            articles: this.uniqueSorted(
              articleOptionSales.map((line) => line.articleName),
            ),

            ingredients: this.uniqueSorted(ingredientOptions),
          },

          filterSummary: {
            salesLines: filteredSales.length,
            waiterLines: filteredWaiterSales.length,
            inventoryItems: filteredInventoryRows.length,
            inventoryScope:
              selectedIngredient.length > 0
                ? 'SELECTED_INGREDIENT'
                : hasDishFilter
                  ? 'INGREDIENTS_FROM_SELECTED_DISHES'
                  : 'ALL_INVENTORY',
          },

          breakdown: {
            dimension: breakdownDimension,

            label:
              breakdownDimension === 'GROUP_1'
                ? 'Grupo 1'
                : breakdownDimension === 'GROUP_2'
                  ? 'Grupo 2'
                  : 'Plato',
          },

          kpis: {
            netSales: this.round(netSales),

            grossBilled: this.round(grossBilled),

            taxAmount: this.round(taxAmount),

            serviceAmount: this.round(serviceAmount),

            estimatedCostOfSales: this.round(estimatedCostOfSales),

            estimatedGrossMargin: this.round(estimatedGrossMargin),

            estimatedGrossMarginPercent: this.round(
              estimatedGrossMarginPercent,
            ),

            recipeCoveragePercent: this.round(recipeCoveragePercent),

            inventoryValue: this.round(inventoryValue),

            immobilizedCapital: this.round(immobilizedCapital),

            rotation90Days: this.round(rotation90Days),

            inventoryDays:
              inventoryDays === null ? null : this.round(inventoryDays),

            slowRotationProducts,
            noOutputProducts,
          },

          salesByGroup: [...breakdownMap.entries()]
            .map(([name, value]) => {
              const margin = value.sales - value.cost;

              return {
                name,
                sales: this.round(value.sales),
                cost: this.round(value.cost),
                margin: this.round(margin),
                marginPercent:
                  value.sales > 0 ? this.round(margin / value.sales) : 0,
              };
            })
            .sort((left, right) => right.sales - left.sales),

          salesByDay: [...dailyMap.entries()]
            .map(([date, salesValue]) => ({
              date,
              sales: this.round(salesValue),
            }))
            .sort((left, right) => left.date.localeCompare(right.date)),

          topArticles: [...articleMap.entries()]
            .map(([name, salesValue]) => ({
              name,
              sales: this.round(salesValue),
            }))
            .sort((left, right) => right.sales - left.sales)
            .slice(0, 12),
          mostProfitableArticles,

          leastProfitableArticles,

          waiterPerformance,

          waiterRanking: [...waiterMap.values()]
            .sort((left, right) => right.sales - left.sales)
            .map((item, index) => ({
              rank: index + 1,
              name: item.name,
              sales: this.round(item.sales),
              share:
                totalWaiterSales > 0
                  ? this.round(item.sales / totalWaiterSales)
                  : 0,
            })),

          inventoryByWarehouse: [...warehouseMap.entries()]
            .map(([name, value]) => ({
              name,
              value: this.round(value),
            }))
            .sort((left, right) => right.value - left.value),

          inventoryAging: [...agingMap.entries()].map(([name, value]) => ({
            name,
            value: this.round(value),
          })),

          topInventory: inventoryDetails
            .sort((left, right) => right.value - left.value)
            .slice(0, 15),

          topImmobilized: inventoryDetails
            .filter((item) => item.isImmobilized && item.value > 0)
            .sort((left, right) => right.value - left.value)
            .slice(0, 15),

          monthlyInventoryValues: monthlyValues
            .map((item) => ({
              year: item.year,
              month: item.month,
              value: this.round(item.value),
            }))
            .sort(
              (left, right) =>
                left.year - right.year || left.month - right.month,
            ),

          controls: batch.summary,
        };
      },
    );
  }

  private resolveBreakdownDimension(
    selectedGroup1: string,
    selectedGroup2: string,
  ): BreakdownDimension {
    if (selectedGroup1.length === 0) {
      return 'GROUP_1';
    }

    if (selectedGroup2.length === 0) {
      return 'GROUP_2';
    }

    return 'ARTICLE';
  }

  private breakdownName(
    line: {
      groupName: string | null;
      subgroupName: string | null;
      articleName: string;
    },
    dimension: BreakdownDimension,
  ): string {
    if (dimension === 'GROUP_1') {
      return line.groupName?.trim() || 'SIN GRUPO 1';
    }

    if (dimension === 'GROUP_2') {
      return line.subgroupName?.trim() || 'SIN GRUPO 2';
    }

    return line.articleName;
  }

  private matches(value: string | null, selectedNormalized: string): boolean {
    return (
      selectedNormalized.length === 0 ||
      this.normalizeKey(value) === selectedNormalized
    );
  }

  private normalizeKey(value: string | null | undefined): string {
    return (value ?? '')
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private uniqueSorted(values: Array<string | null | undefined>): string[] {
    return [
      ...new Set(
        values
          .map((value) => value?.trim())
          .filter((value): value is string => Boolean(value)),
      ),
    ].sort((left, right) =>
      left.localeCompare(right, 'es', {
        sensitivity: 'base',
      }),
    );
  }

  private decimal(
    value: Prisma.Decimal | number | string | null | undefined,
  ): number {
    const result = Number(value ?? 0);

    return Number.isFinite(result) ? result : 0;
  }

  private round(value: number): number {
    return Number(value.toFixed(6));
  }
}
