import { BadRequestException, Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { PassThrough } from 'node:stream';
import ExcelJS from 'exceljs';
import type { Express } from 'express';
import type {
  ImportFileDiagnostic,
  ImportFileType,
  ImportRowIssue,
  MonthlyImportFiles,
  MonthlyImportValidationErrorBody,
  ParsedFile,
  ParsedKardexRow,
  ParsedMonthlyImport,
  ParsedRecipeRow,
  ParsedSalesRow,
  ParsedWaiterSalesRow,
} from './monthly-imports.types';

const DAY_MILLISECONDS = 86_400_000;
const MAX_HEADER_ROWS_TO_SCAN = 25;
const MAX_DIAGNOSTIC_DETAILS = 50;

interface ColumnDefinition {
  label: string;
  aliases: string[];
  required?: boolean;
  afterKey?: string;
  beforeKey?: string;
  occurrence?: number;
}

type ColumnSchema = Record<string, ColumnDefinition>;
type ColumnMap = Record<string, number>;

interface HeaderCandidate {
  worksheet: ExcelJS.Worksheet;
  headerRow: number;
  columns: ColumnMap;
  foundHeaders: string[];
  missingHeaders: string[];
  score: number;
}

interface LocatedWorksheet extends HeaderCandidate {
  missingHeaders: [];
}

type ParseOutcome<T> =
  | {
      value: T;
    }
  | {
      diagnostic: ImportFileDiagnostic;
    };

class WorkbookStructureError extends Error {
  constructor(readonly diagnostic: ImportFileDiagnostic) {
    super(diagnostic.message);
    this.name = 'WorkbookStructureError';
  }
}

const KARDEX_COLUMNS: ColumnSchema = {
  itemName: {
    label: 'INSUMO',
    aliases: ['INSUMO', 'ITEM', 'ARTICULO', 'ARTÍCULO'],
    required: true,
  },
  movementDate: {
    label: 'FECHA',
    aliases: ['FECHA', 'FECHA MOVIMIENTO'],
    required: true,
  },
  warehouseCode: {
    label: 'BODEGA',
    aliases: ['BODEGA', 'COD BODEGA', 'CODIGO BODEGA', 'CÓDIGO BODEGA'],
    required: true,
  },
  transactionType: {
    label: 'TRANS',
    aliases: ['TRANS', 'TRANSACCION', 'TRANSACCIÓN', 'TIPO TRANSACCION'],
    required: true,
  },
  documentNumber: {
    label: 'DOC NO',
    aliases: [
      'DOC NO',
      'DOC NUM',
      'NUM DOC',
      'NRO DOC',
      'NUMERO DOCUMENTO',
      'NÚMERO DOCUMENTO',
      'DOCUMENTO',
    ],
    required: true,
  },
  sourceBranch: {
    label: 'SUCURSAL ORIGEN',
    aliases: ['SUCURSAL ORIGEN', 'SUC ORIGEN', 'SUC ORG', 'ORIGEN'],
  },
  destinationBranch: {
    label: 'SUCURSAL DESTINO',
    aliases: ['SUCURSAL DESTINO', 'SUC DESTINO', 'SUC DES', 'DESTINO'],
  },
  unitOriginal: {
    label: 'UNIDAD',
    aliases: ['UNIDAD', 'UNID', 'UND', 'U M', 'UNIDAD MEDIDA'],
    required: true,
  },
  quantityIn: {
    label: 'CANTIDAD INGRESO',
    aliases: [
      'INGRESO',
      'CANTIDAD INGRESO',
      'CANT INGRESO',
      'INGRESO CANTIDAD',
      'INGRESO CANT',
      'CANTIDAD ENTRADA',
      'ENTRADA CANTIDAD',
    ],
    required: true,
  },
  unitCostIn: {
    label: 'COSTO UNITARIO INGRESO',
    aliases: [
      'COSTO',
      'COSTO UNITARIO INGRESO',
      'COSTO UNIT INGRESO',
      'INGRESO COSTO UNITARIO',
      'INGRESO COSTO UNIT',
      'COSTO UNITARIO ENTRADA',
    ],
    required: true,
    afterKey: 'quantityIn',
    beforeKey: 'totalIn',
  },
  totalIn: {
    label: 'TOTAL INGRESO',
    aliases: ['TOTAL ING', 'TOTAL INGRESO', 'INGRESO TOTAL', 'TOTAL ENTRADA'],
    required: true,
  },
  quantityOut: {
    label: 'CANTIDAD EGRESO',
    aliases: [
      'EGRESO',
      'CANTIDAD EGRESO',
      'CANT EGRESO',
      'EGRESO CANTIDAD',
      'EGRESO CANT',
      'CANTIDAD SALIDA',
      'SALIDA CANTIDAD',
      'SALIDA CANT',
    ],
    required: true,
  },
  unitCostOut: {
    label: 'COSTO UNITARIO EGRESO',
    aliases: [
      'COSTO',
      'COSTO UNITARIO EGRESO',
      'COSTO UNIT EGRESO',
      'EGRESO COSTO UNITARIO',
      'EGRESO COSTO UNIT',
      'COSTO UNITARIO SALIDA',
      'SALIDA COSTO UNITARIO',
    ],
    required: true,
    afterKey: 'quantityOut',
    beforeKey: 'totalOut',
  },
  totalOut: {
    label: 'TOTAL EGRESO',
    aliases: [
      'TOTAL EGR',
      'TOTAL EGRESO',
      'EGRESO TOTAL',
      'TOTAL SALIDA',
      'SALIDA TOTAL',
    ],
    required: true,
  },
  balanceQuantity: {
    label: 'CANTIDAD SALDO',
    aliases: [
      'SALDO',
      'CANTIDAD SALDO',
      'CANT SALDO',
      'SALDO CANTIDAD',
      'SALDO CANT',
    ],
    required: true,
  },
  balanceTotalCost: {
    label: 'COSTO TOTAL SALDO',
    aliases: [
      'C TOTAL',
      'COSTO TOTAL SALDO',
      'SALDO COSTO TOTAL',
      'TOTAL COSTO SALDO',
    ],
    required: true,
  },
  averageCost: {
    label: 'COSTO PROMEDIO',
    aliases: ['COSTO PROM', 'COSTO PROMEDIO', 'COST PROM', 'PROMEDIO COSTO'],
    required: true,
  },
  supplierName: {
    label: 'PROVEEDOR',
    aliases: ['PROVEEDOR', 'NOMBRE PROVEEDOR'],
  },
};

const RECIPE_COLUMNS: ColumnSchema = {
  articleName: {
    label: 'ARTICULO',
    aliases: ['ARTICULO', 'ARTÍCULO', 'ITEM', 'PLATO'],
    required: true,
  },
  groupName: {
    label: 'GRUPO 1',
    aliases: ['GRUPO 1', 'GRUPO', 'GRUPO UNO'],
  },
  ingredientName: {
    label: 'INSUMO',
    aliases: ['INSUMO', 'INGREDIENTE'],
    required: true,
  },
  unitOriginal: {
    label: 'UNIDAD',
    aliases: ['UNIDAD', 'UNID', 'UND', 'U M', 'UNIDAD MEDIDA'],
    required: true,
  },
  quantity: {
    label: 'CANT',
    aliases: ['CANT', 'CANTIDAD', 'CANT NETA', 'CANTIDAD NETA'],
    required: true,
  },
  unitCost: {
    label: 'COSTO UNITARIO',
    aliases: [
      'COSTO U',
      'COSTO UNITARIO',
      'COSTO UNIT',
      'COST UNIT',
      'VALOR UNITARIO',
    ],
    required: true,
  },
  totalCost: {
    label: 'COSTO TOTAL',
    aliases: ['COSTO T', 'COSTO TOTAL', 'TOTAL COSTO', 'COST TOTAL'],
    required: true,
  },
  wasteFactor: {
    label: 'DESPERDICIO',
    aliases: [
      'FAC DESE',
      'DESPERDICIO',
      'PORCENTAJE DESPERDICIO',
      'PCT DESPERDICIO',
      'FACTOR DESPERDICIO',
    ],
    required: true,
  },
  grossQuantity: {
    label: 'CANTIDAD BRUTA',
    aliases: [
      'CAN BRUTA',
      'CANTIDAD BRUTA',
      'CANT BRUTA',
      'CANTIDAD CON DESPERDICIO',
    ],
    required: true,
  },
  costWithWaste: {
    label: 'COSTO CON DESPERDICIO',
    aliases: [
      'COSTO MAS DES',
      'COSTO DES',
      'COSTO CON DESPERDICIO',
      'COSTO DESPERDICIO',
      'COSTO MAS DESPERDICIO',
      'COSTO MÁS DESPERDICIO',
    ],
    required: true,
  },
  recoveryFactor: {
    label: 'RECUPERACION',
    aliases: [
      'FAC REC',
      'RECUPERACION',
      'RECUPERACIÓN',
      'PORCENTAJE RECUPERACION',
      'FACTOR RECUPERACION',
      'PCT RECUPERACION',
    ],
    required: true,
  },
  finalCost: {
    label: 'COSTO FINAL',
    aliases: ['COSTO D MAS F', 'COSTO D F', 'COSTO FINAL', 'FINAL COSTO'],
    required: true,
  },
};

const SALES_COLUMNS: ColumnSchema = {
  groupName: {
    label: 'GRUPO 1',
    aliases: ['GRUPO 1', 'GRUPO', 'GRUPO UNO'],
    required: true,
  },
  subgroupName: {
    label: 'GRUPO 2',
    aliases: ['GRUPO 2', 'SUB GRUPO', 'SUBGRUPO', 'GRUPO DOS'],
    required: true,
  },
  saleDate: {
    label: 'FECHA',
    aliases: ['FECHA', 'FECHA VENTA'],
    required: true,
  },
  documentNumber: {
    label: 'NUM DOC',
    aliases: [
      'NUM DOC',
      'NRO DOC',
      'DOC NO',
      'NUMERO DOCUMENTO',
      'NÚMERO DOCUMENTO',
      'DOCUMENTO',
    ],
    required: true,
  },
  articleName: {
    label: 'ARTICULO',
    aliases: ['ARTICULO', 'ARTÍCULO', 'ITEM', 'PLATO'],
    required: true,
  },
  quantity: {
    label: 'CANT',
    aliases: ['CANT', 'CANTIDAD'],
    required: true,
  },
  unitPrice: {
    label: 'PRECIO UNITARIO',
    aliases: ['PRECIO', 'PRECIO UNITARIO', 'PVP', 'VALOR UNITARIO'],
    required: true,
  },
  discountPercent: {
    label: 'DESCUENTO PORCENTAJE',
    aliases: [
      'DESC',
      'DESCUENTO PORCENTAJE',
      'PORCENTAJE DESCUENTO',
      'PCT DESCUENTO',
      'DESC PORCENTAJE',
      'DESC PCT',
    ],
    required: true,
  },
  taxRate: {
    label: 'IVA PORCENTAJE',
    aliases: ['IVA', 'IVA PORCENTAJE', 'PORCENTAJE IVA', 'PCT IVA', 'TASA IVA'],
    required: true,
    beforeKey: 'subtotal',
  },
  subtotal: {
    label: 'SUBTOTAL',
    aliases: ['SUBTOTAL', 'SUB TOTAL'],
    required: true,
  },
  subtotalZeroDiscount: {
    label: 'SUBTOTAL CERO SIN DESCUENTO',
    aliases: [
      'SUBTOTAL 0 DESC',
      'SUBTOTAL CERO SIN DESCUENTO',
      'SUBTOTAL 0 SIN DESCUENTO',
      'SUBTOTAL SIN DESCUENTO 0',
      'SUBTOTAL SIN DESC 0',
    ],
    required: true,
  },
  subtotalZero: {
    label: 'SUBTOTAL CERO',
    aliases: ['SUBTOTAL 0', 'SUBTOTAL CERO'],
    required: true,
  },
  subtotalTaxed: {
    label: 'SUBTOTAL GRAVADO',
    aliases: [
      'SUBTOTAL NO CERO',
      'SUBTOTAL GRAVADO',
      'SUBTOTAL IVA',
      'SUBTOTAL 12',
      'SUBTOTAL 15',
    ],
    required: true,
  },
  footerDiscount: {
    label: 'DESCUENTO PIE',
    aliases: ['DESCUENTO PIE', 'DESC PIE', 'DESCUENTO FOOTER'],
    required: true,
  },
  taxableSubtotalAfterDiscount: {
    label: 'SUBTOTAL GRAVADO CON DESCUENTO',
    aliases: [
      'SUBTOTAL NO CERO DESC',
      'SUBTOTAL GRAVADO CON DESCUENTO',
      'SUBTOTAL IVA CON DESCUENTO',
      'SUBTOTAL 12 CON DESCUENTO',
      'SUBTOTAL 15 CON DESCUENTO',
      'SUBTOTAL GRAVADO C D',
    ],
    required: true,
  },
  taxAmount: {
    label: 'VALOR IVA',
    aliases: ['IVA', 'VALOR IVA', 'IVA VALOR', 'MONTO IVA', 'IMPUESTO'],
    required: true,
    afterKey: 'taxableSubtotalAfterDiscount',
    beforeKey: 'serviceAmount',
  },
  serviceAmount: {
    label: 'SERVICIO',
    aliases: ['SERVICIO', 'VALOR SERVICIO', 'MONTO SERVICIO'],
    required: true,
  },
  totalAmount: {
    label: 'TOTAL',
    aliases: ['TOTAL', 'TOTAL VENTA', 'VALOR TOTAL'],
    required: true,
  },
};

const WAITER_SALES_COLUMNS: ColumnSchema = {
  waiterName: {
    label: 'MESERO',
    aliases: ['MESERO', 'NOMBRE MESERO', 'VENDEDOR'],
    required: true,
  },
  groupName: {
    label: 'GRUPO',
    aliases: ['GRUPO', 'GRUPO 1'],
    required: true,
  },
  subgroupName: {
    label: 'SUB GRUPO',
    aliases: ['SUB GRUPO', 'SUBGRUPO', 'GRUPO 2'],
    required: true,
  },
  articleName: {
    label: 'ITEM',
    aliases: ['ITEM', 'ARTICULO', 'ARTÍCULO', 'PLATO'],
    required: true,
  },
  quantity: {
    label: 'CANT',
    aliases: ['CANT', 'CANTIDAD'],
    required: true,
  },
  unitValue: {
    label: 'VALOR UNITARIO',
    aliases: [
      'VALOR',
      'VALOR UNITARIO',
      'PRECIO UNITARIO',
      'PVP',
      'VALOR UNIT',
    ],
    required: true,
  },
  subtotal: {
    label: 'SUBTOTAL',
    aliases: ['SBTOTAL', 'SUBTOTAL', 'SUB TOTAL'],
    required: true,
  },
  discount: {
    label: 'DESCUENTO',
    aliases: ['DESC', 'DESCUENTO', 'VALOR DESCUENTO'],
    required: true,
  },
  totalAmount: {
    label: 'TOTAL',
    aliases: ['TOTAL', 'TOTAL VENTA', 'VALOR TOTAL'],
    required: true,
  },
};

@Injectable()
export class MonthlyImportsParser {
  async parseAll(
    files: MonthlyImportFiles,
    year: number,
    month: number,
  ): Promise<ParsedMonthlyImport> {
    const [kardex, recipes, sales, waiterSales] = await Promise.all([
      this.captureFile('KARDEX', 'kardex', files.kardex?.[0], (file) =>
        this.parseKardex(file, year, month),
      ),
      this.captureFile('RECIPES', 'recipes', files.recipes?.[0], (file) =>
        this.parseRecipes(file),
      ),
      this.captureFile('SALES', 'sales', files.sales?.[0], (file) =>
        this.parseSales(file, year, month),
      ),
      this.captureFile(
        'WAITER_SALES',
        'waiterSales',
        files.waiterSales?.[0],
        (file) => this.parseWaiterSales(file),
      ),
    ]);

    const diagnostics = [kardex, recipes, sales, waiterSales]
      .filter(
        (outcome): outcome is { diagnostic: ImportFileDiagnostic } =>
          'diagnostic' in outcome,
      )
      .map((outcome) => outcome.diagnostic);

    if (diagnostics.length > 0) {
      this.throwValidationError(diagnostics, year, month);
    }

    const parsed: ParsedMonthlyImport = {
      kardex: this.outcomeValue(kardex),
      recipes: this.outcomeValue(recipes),
      sales: this.outcomeValue(sales),
      waiterSales: this.outcomeValue(waiterSales),
    };

    const emptyFileDiagnostics = [
      parsed.kardex,
      parsed.recipes,
      parsed.sales,
      parsed.waiterSales,
    ]
      .filter((file) => file.validRows === 0)
      .map<ImportFileDiagnostic>((file) => ({
        fileType: file.type,
        originalName: file.originalName,
        problemCode: 'NO_VALID_ROWS',
        message: `El archivo ${file.originalName} no contiene filas válidas para importar.`,
        inspectedSheets: [file.sheetName],
        expectedHeaders: [],
        missingHeaders: [],
        bestCandidateSheet: file.sheetName,
        bestCandidateHeaderRow: null,
        foundHeaders: [],
        details: file.errors
          .slice(0, MAX_DIAGNOSTIC_DETAILS)
          .map((issue) => `Fila ${issue.sourceRow}: ${issue.message}`),
      }));

    if (emptyFileDiagnostics.length > 0) {
      this.throwValidationError(emptyFileDiagnostics, year, month);
    }

    return parsed;
  }

  private async captureFile<T>(
    fileType: ImportFileType,
    fieldName: string,
    file: Express.Multer.File | undefined,
    parser: (file: Express.Multer.File) => Promise<T>,
  ): Promise<ParseOutcome<T>> {
    if (!file) {
      return {
        diagnostic: {
          fileType,
          originalName: '(archivo no adjuntado)',
          problemCode: 'MISSING_FILE',
          message: `Falta el archivo requerido en el campo ${fieldName}.`,
          inspectedSheets: [],
          expectedHeaders: [],
          missingHeaders: [],
          bestCandidateSheet: null,
          bestCandidateHeaderRow: null,
          foundHeaders: [],
        },
      };
    }

    if (!file.originalname.toLowerCase().endsWith('.xlsx')) {
      return {
        diagnostic: {
          fileType,
          originalName: file.originalname,
          problemCode: 'INVALID_EXTENSION',
          message: `El archivo ${file.originalname} debe tener extensión .xlsx.`,
          inspectedSheets: [],
          expectedHeaders: [],
          missingHeaders: [],
          bestCandidateSheet: null,
          bestCandidateHeaderRow: null,
          foundHeaders: [],
        },
      };
    }

    try {
      return {
        value: await parser(file),
      };
    } catch (error: unknown) {
      if (error instanceof WorkbookStructureError) {
        return {
          diagnostic: error.diagnostic,
        };
      }

      return {
        diagnostic: {
          fileType,
          originalName: file.originalname,
          problemCode: 'INVALID_WORKBOOK',
          message:
            error instanceof Error
              ? `No se pudo leer el archivo ${file.originalname}: ${error.message}`
              : `No se pudo leer el archivo ${file.originalname}.`,
          inspectedSheets: [],
          expectedHeaders: [],
          missingHeaders: [],
          bestCandidateSheet: null,
          bestCandidateHeaderRow: null,
          foundHeaders: [],
        },
      };
    }
  }

  private outcomeValue<T>(outcome: ParseOutcome<T>): T {
    if ('value' in outcome) {
      return outcome.value;
    }

    throw new Error(
      'No se pudo obtener el resultado validado de la importación.',
    );
  }

  private async parseKardex(
    file: Express.Multer.File,
    year: number,
    month: number,
  ): Promise<ParsedFile<ParsedKardexRow>> {
    const workbook = await this.loadWorkbook(file);
    const located = this.findWorksheet(
      'KARDEX',
      file,
      workbook,
      KARDEX_COLUMNS,
    );
    const { worksheet, headerRow, columns } = located;

    const rows: ParsedKardexRow[] = [];
    const errors: ImportRowIssue[] = [];
    const ignoredIssues: ImportRowIssue[] = [];
    let ignoredRows = 0;

    const totals = {
      quantityIn: 0,
      totalIn: 0,
      quantityOut: 0,
      totalOut: 0,
    };

    for (
      let rowNumber = headerRow + 1;
      rowNumber <= worksheet.rowCount;
      rowNumber += 1
    ) {
      const row = worksheet.getRow(rowNumber);
      const itemName = this.text(this.cell(row, columns, 'itemName'));
      const rawDate = this.cell(row, columns, 'movementDate');

      if (!itemName || this.isEmpty(rawDate)) {
        ignoredRows += 1;

        if (this.rowHasAnyData(row, columns)) {
          ignoredIssues.push(
            this.ignoredRow(
              'KARDEX',
              rowNumber,
              'Fila ignorada porque falta INSUMO o FECHA.',
              this.rowPreview(row, KARDEX_COLUMNS, columns),
            ),
          );
        }

        continue;
      }

      try {
        const movementDate = this.date(rawDate);

        if (
          movementDate.getUTCFullYear() !== year ||
          movementDate.getUTCMonth() + 1 !== month
        ) {
          throw new Error(
            `La fecha ${movementDate.toISOString()} no pertenece al periodo ${year}-${String(
              month,
            ).padStart(2, '0')}.`,
          );
        }

        const quantityIn = this.number(this.cell(row, columns, 'quantityIn'));
        const unitCostIn = this.number(this.cell(row, columns, 'unitCostIn'));
        const totalIn = this.number(this.cell(row, columns, 'totalIn'));
        const quantityOut = this.number(this.cell(row, columns, 'quantityOut'));
        const unitCostOut = this.number(this.cell(row, columns, 'unitCostOut'));
        const totalOut = this.number(this.cell(row, columns, 'totalOut'));

        totals.quantityIn += quantityIn;
        totals.totalIn += totalIn;
        totals.quantityOut += quantityOut;
        totals.totalOut += totalOut;

        const unitOriginal = this.nullableText(
          this.cell(row, columns, 'unitOriginal'),
        );

        rows.push({
          sourceRow: rowNumber,
          itemName,
          itemNormalized: this.normalize(itemName),
          movementDate,
          warehouseCode:
            this.text(this.cell(row, columns, 'warehouseCode')) || 'SIN_BODEGA',
          transactionType:
            this.text(this.cell(row, columns, 'transactionType')) ||
            'SIN_TRANSACCION',
          documentNumber: this.nullableText(
            this.cell(row, columns, 'documentNumber'),
          ),
          sourceBranch: this.nullableText(
            this.cell(row, columns, 'sourceBranch'),
          ),
          destinationBranch: this.nullableText(
            this.cell(row, columns, 'destinationBranch'),
          ),
          unitOriginal,
          unitCode: this.normalizeUnit(unitOriginal),
          quantityIn,
          unitCostIn,
          totalIn,
          quantityOut,
          unitCostOut,
          totalOut,
          balanceQuantity: this.number(
            this.cell(row, columns, 'balanceQuantity'),
          ),
          balanceTotalCost: this.number(
            this.cell(row, columns, 'balanceTotalCost'),
          ),
          averageCost: this.number(this.cell(row, columns, 'averageCost')),
          supplierName: this.cleanSupplier(
            this.cell(row, columns, 'supplierName'),
          ),
        });
      } catch (error: unknown) {
        errors.push(
          this.rowError(
            'KARDEX',
            rowNumber,
            error,
            this.rowPreview(row, KARDEX_COLUMNS, columns),
          ),
        );
      }
    }

    return this.fileResult(
      'KARDEX',
      file,
      worksheet.name,
      Math.max(0, worksheet.rowCount - headerRow),
      ignoredRows,
      rows,
      errors,
      ignoredIssues,
      {
        ...this.roundControlTotals(totals),
        headerRow,
        detectedColumns: columns,
        detectedStartDate:
          rows.length > 0
            ? new Date(
                Math.min(...rows.map((item) => item.movementDate.getTime())),
              ).toISOString()
            : null,
        detectedEndDate:
          rows.length > 0
            ? new Date(
                Math.max(...rows.map((item) => item.movementDate.getTime())),
              ).toISOString()
            : null,
        uniqueItems: new Set(rows.map((item) => item.itemNormalized)).size,
        warehouses: [...new Set(rows.map((item) => item.warehouseCode))],
      },
    );
  }

  private async parseRecipes(
    file: Express.Multer.File,
  ): Promise<ParsedFile<ParsedRecipeRow>> {
    const workbook = await this.loadWorkbook(file);
    const located = this.findWorksheet(
      'RECIPES',
      file,
      workbook,
      RECIPE_COLUMNS,
    );
    const { worksheet, headerRow, columns } = located;

    const rows: ParsedRecipeRow[] = [];
    const errors: ImportRowIssue[] = [];
    const ignoredIssues: ImportRowIssue[] = [];
    let ignoredRows = 0;
    let totalRecipeCost = 0;

    for (
      let rowNumber = headerRow + 1;
      rowNumber <= worksheet.rowCount;
      rowNumber += 1
    ) {
      const row = worksheet.getRow(rowNumber);
      const articleName = this.text(this.cell(row, columns, 'articleName'));
      const ingredientName = this.text(
        this.cell(row, columns, 'ingredientName'),
      );

      if (
        !articleName ||
        !ingredientName ||
        this.normalize(ingredientName) === 'NINGUNO'
      ) {
        ignoredRows += 1;

        if (this.rowHasAnyData(row, columns)) {
          ignoredIssues.push(
            this.ignoredRow(
              'RECIPES',
              rowNumber,
              'Fila ignorada porque falta ARTICULO o INSUMO, o el insumo es NINGUNO.',
              this.rowPreview(row, RECIPE_COLUMNS, columns),
            ),
          );
        }

        continue;
      }

      try {
        const totalCost = this.number(this.cell(row, columns, 'totalCost'));
        const costWithWaste = this.number(
          this.cell(row, columns, 'costWithWaste'),
        );
        const finalCost = this.number(this.cell(row, columns, 'finalCost'));
        const componentCost =
          finalCost > 0
            ? finalCost
            : costWithWaste > 0
              ? costWithWaste
              : totalCost;

        totalRecipeCost += componentCost;
        const unitOriginal = this.nullableText(
          this.cell(row, columns, 'unitOriginal'),
        );

        rows.push({
          sourceRow: rowNumber,
          articleName,
          articleNormalized: this.normalize(articleName),
          groupName: this.nullableText(this.cell(row, columns, 'groupName')),
          ingredientName,
          ingredientNormalized: this.normalize(ingredientName),
          unitOriginal,
          unitCode: this.normalizeUnit(unitOriginal),
          quantity: this.number(this.cell(row, columns, 'quantity')),
          unitCost: this.number(this.cell(row, columns, 'unitCost')),
          totalCost,
          wasteFactor: this.number(this.cell(row, columns, 'wasteFactor')),
          grossQuantity: this.number(this.cell(row, columns, 'grossQuantity')),
          costWithWaste,
          recoveryFactor: this.number(
            this.cell(row, columns, 'recoveryFactor'),
          ),
          finalCost,
        });
      } catch (error: unknown) {
        errors.push(
          this.rowError(
            'RECIPES',
            rowNumber,
            error,
            this.rowPreview(row, RECIPE_COLUMNS, columns),
          ),
        );
      }
    }

    return this.fileResult(
      'RECIPES',
      file,
      worksheet.name,
      Math.max(0, worksheet.rowCount - headerRow),
      ignoredRows,
      rows,
      errors,
      ignoredIssues,
      {
        totalRecipeComponentCost: this.round(totalRecipeCost),
        headerRow,
        detectedColumns: columns,
        uniqueArticles: new Set(rows.map((item) => item.articleNormalized))
          .size,
        uniqueIngredients: new Set(
          rows.map((item) => item.ingredientNormalized),
        ).size,
        duplicateSheetsIgnored: Math.max(0, workbook.worksheets.length - 1),
      },
    );
  }

  private async parseSales(
    file: Express.Multer.File,
    year: number,
    month: number,
  ): Promise<ParsedFile<ParsedSalesRow>> {
    const workbook = await this.loadWorkbook(file);
    const located = this.findWorksheet('SALES', file, workbook, SALES_COLUMNS);
    const { worksheet, headerRow, columns } = located;

    const rows: ParsedSalesRow[] = [];
    const errors: ImportRowIssue[] = [];
    const ignoredIssues: ImportRowIssue[] = [];
    let ignoredRows = 0;

    const totals = {
      quantity: 0,
      subtotal: 0,
      taxAmount: 0,
      serviceAmount: 0,
      totalAmount: 0,
    };

    for (
      let rowNumber = headerRow + 1;
      rowNumber <= worksheet.rowCount;
      rowNumber += 1
    ) {
      const row = worksheet.getRow(rowNumber);
      const rawDate = this.cell(row, columns, 'saleDate');
      const documentNumber = this.text(
        this.cell(row, columns, 'documentNumber'),
      );
      const articleName = this.text(this.cell(row, columns, 'articleName'));

      if (this.isEmpty(rawDate) || !documentNumber || !articleName) {
        ignoredRows += 1;

        if (this.rowHasAnyData(row, columns)) {
          ignoredIssues.push(
            this.ignoredRow(
              'SALES',
              rowNumber,
              'Fila ignorada porque falta FECHA, NUM DOC o ARTICULO.',
              this.rowPreview(row, SALES_COLUMNS, columns),
            ),
          );
        }

        continue;
      }

      try {
        const saleDate = this.date(rawDate);

        if (
          saleDate.getUTCFullYear() !== year ||
          saleDate.getUTCMonth() + 1 !== month
        ) {
          throw new Error(
            `La fecha ${saleDate.toISOString()} no pertenece al periodo seleccionado.`,
          );
        }

        const quantity = this.number(this.cell(row, columns, 'quantity'));
        const subtotal = this.number(this.cell(row, columns, 'subtotal'));
        const taxAmount = this.number(this.cell(row, columns, 'taxAmount'));
        const serviceAmount = this.number(
          this.cell(row, columns, 'serviceAmount'),
        );
        const totalAmount = this.number(this.cell(row, columns, 'totalAmount'));

        totals.quantity += quantity;
        totals.subtotal += subtotal;
        totals.taxAmount += taxAmount;
        totals.serviceAmount += serviceAmount;
        totals.totalAmount += totalAmount;

        rows.push({
          sourceRow: rowNumber,
          groupName: this.nullableText(this.cell(row, columns, 'groupName')),
          subgroupName: this.nullableText(
            this.cell(row, columns, 'subgroupName'),
          ),
          saleDate,
          documentNumber,
          articleName,
          articleNormalized: this.normalize(articleName),
          quantity,
          unitPrice: this.number(this.cell(row, columns, 'unitPrice')),
          discountPercent: this.number(
            this.cell(row, columns, 'discountPercent'),
          ),
          taxRate: this.number(this.cell(row, columns, 'taxRate')),
          subtotal,
          subtotalZeroDiscount: this.number(
            this.cell(row, columns, 'subtotalZeroDiscount'),
          ),
          subtotalZero: this.number(this.cell(row, columns, 'subtotalZero')),
          subtotalTaxed: this.number(this.cell(row, columns, 'subtotalTaxed')),
          footerDiscount: this.number(
            this.cell(row, columns, 'footerDiscount'),
          ),
          taxableSubtotalAfterDiscount: this.number(
            this.cell(row, columns, 'taxableSubtotalAfterDiscount'),
          ),
          taxAmount,
          serviceAmount,
          totalAmount,
        });
      } catch (error: unknown) {
        errors.push(
          this.rowError(
            'SALES',
            rowNumber,
            error,
            this.rowPreview(row, SALES_COLUMNS, columns),
          ),
        );
      }
    }

    return this.fileResult(
      'SALES',
      file,
      worksheet.name,
      Math.max(0, worksheet.rowCount - headerRow),
      ignoredRows,
      rows,
      errors,
      ignoredIssues,
      {
        ...this.roundControlTotals(totals),
        headerRow,
        detectedColumns: columns,
        uniqueDocuments: new Set(rows.map((item) => item.documentNumber)).size,
        uniqueArticles: new Set(rows.map((item) => item.articleNormalized))
          .size,
        duplicateSheetsIgnored: Math.max(0, workbook.worksheets.length - 1),
      },
    );
  }

  private async parseWaiterSales(
    file: Express.Multer.File,
  ): Promise<ParsedFile<ParsedWaiterSalesRow>> {
    const workbook = await this.loadWorkbook(file);
    const located = this.findWorksheet(
      'WAITER_SALES',
      file,
      workbook,
      WAITER_SALES_COLUMNS,
    );
    const { worksheet, headerRow, columns } = located;

    const rows: ParsedWaiterSalesRow[] = [];
    const errors: ImportRowIssue[] = [];
    const ignoredIssues: ImportRowIssue[] = [];
    let ignoredRows = 0;

    const totals = {
      quantity: 0,
      subtotal: 0,
      discount: 0,
      totalAmount: 0,
    };

    for (
      let rowNumber = headerRow + 1;
      rowNumber <= worksheet.rowCount;
      rowNumber += 1
    ) {
      const row = worksheet.getRow(rowNumber);
      const waiterName = this.text(this.cell(row, columns, 'waiterName'));
      const articleName = this.text(this.cell(row, columns, 'articleName'));

      if (!waiterName || !articleName) {
        ignoredRows += 1;

        if (this.rowHasAnyData(row, columns)) {
          ignoredIssues.push(
            this.ignoredRow(
              'WAITER_SALES',
              rowNumber,
              'Fila ignorada porque falta MESERO o ITEM.',
              this.rowPreview(row, WAITER_SALES_COLUMNS, columns),
            ),
          );
        }

        continue;
      }

      try {
        const quantity = this.number(this.cell(row, columns, 'quantity'));
        const subtotal = this.number(this.cell(row, columns, 'subtotal'));
        const discount = this.number(this.cell(row, columns, 'discount'));
        const totalAmount = this.number(this.cell(row, columns, 'totalAmount'));

        totals.quantity += quantity;
        totals.subtotal += subtotal;
        totals.discount += discount;
        totals.totalAmount += totalAmount;

        rows.push({
          sourceRow: rowNumber,
          waiterName,
          waiterNormalized: this.normalize(waiterName),
          groupName: this.nullableText(this.cell(row, columns, 'groupName')),
          subgroupName: this.nullableText(
            this.cell(row, columns, 'subgroupName'),
          ),
          articleName,
          articleNormalized: this.normalize(articleName),
          quantity,
          unitValue: this.number(this.cell(row, columns, 'unitValue')),
          subtotal,
          discount,
          totalAmount,
        });
      } catch (error: unknown) {
        errors.push(
          this.rowError(
            'WAITER_SALES',
            rowNumber,
            error,
            this.rowPreview(row, WAITER_SALES_COLUMNS, columns),
          ),
        );
      }
    }

    return this.fileResult(
      'WAITER_SALES',
      file,
      worksheet.name,
      Math.max(0, worksheet.rowCount - headerRow),
      ignoredRows,
      rows,
      errors,
      ignoredIssues,
      {
        ...this.roundControlTotals(totals),
        headerRow,
        detectedColumns: columns,
        uniqueWaiters: new Set(rows.map((item) => item.waiterNormalized)).size,
        uniqueArticles: new Set(rows.map((item) => item.articleNormalized))
          .size,
      },
    );
  }

  private async loadWorkbook(
    file: Express.Multer.File,
  ): Promise<ExcelJS.Workbook> {
    const workbook = new ExcelJS.Workbook();
    const inputStream = new PassThrough();
    inputStream.end(file.buffer);
    await workbook.xlsx.read(inputStream);
    return workbook;
  }

  private findWorksheet(
    fileType: ImportFileType,
    file: Express.Multer.File,
    workbook: ExcelJS.Workbook,
    schema: ColumnSchema,
  ): LocatedWorksheet {
    let bestCandidate: HeaderCandidate | null = null;

    for (const worksheet of workbook.worksheets) {
      const rowsToScan = Math.min(
        Math.max(worksheet.rowCount, 1),
        MAX_HEADER_ROWS_TO_SCAN,
      );

      for (let rowNumber = 1; rowNumber <= rowsToScan; rowNumber += 1) {
        const candidate = this.inspectHeaderRow(worksheet, rowNumber, schema);

        if (!bestCandidate || candidate.score > bestCandidate.score) {
          bestCandidate = candidate;
        }

        if (candidate.missingHeaders.length === 0) {
          return {
            ...candidate,
            missingHeaders: [],
          };
        }
      }
    }

    const expectedHeaders = this.requiredDefinitions(schema).map(
      ([, definition]) => definition.label,
    );

    const missingHeaders =
      bestCandidate?.missingHeaders.length === 0
        ? expectedHeaders
        : (bestCandidate?.missingHeaders ?? expectedHeaders);

    throw new WorkbookStructureError({
      fileType,
      originalName: file.originalname,
      problemCode: 'MISSING_HEADERS',
      message: `Después de revisar todas las hojas, las primeras ${MAX_HEADER_ROWS_TO_SCAN} filas y todas las columnas, no se encontraron todos los encabezados requeridos en ${file.originalname}.`,
      inspectedSheets: workbook.worksheets.map((worksheet) => worksheet.name),
      expectedHeaders,
      missingHeaders,
      bestCandidateSheet: bestCandidate?.worksheet.name ?? null,
      bestCandidateHeaderRow: bestCandidate?.headerRow ?? null,
      foundHeaders: bestCandidate?.foundHeaders ?? [],
    });
  }

  private inspectHeaderRow(
    worksheet: ExcelJS.Worksheet,
    rowNumber: number,
    schema: ColumnSchema,
  ): HeaderCandidate {
    const row = worksheet.getRow(rowNumber);
    const maximumColumn = Math.max(worksheet.columnCount, row.cellCount);
    const entries: Array<{
      column: number;
      raw: string;
      normalized: string;
    }> = [];

    for (let column = 1; column <= maximumColumn; column += 1) {
      const raw = this.text(row.getCell(column).value);
      const normalized = this.normalizeHeader(raw);

      if (normalized) {
        entries.push({
          column,
          raw,
          normalized,
        });
      }
    }

    const columns: ColumnMap = {};
    const usedColumns = new Set<number>();
    const unresolved = new Set(Object.keys(schema));

    let progress = true;

    while (progress && unresolved.size > 0) {
      progress = false;

      for (const key of [...unresolved]) {
        const definition = schema[key];
        const afterColumn =
          definition.afterKey === undefined
            ? undefined
            : columns[definition.afterKey];
        const beforeColumn =
          definition.beforeKey === undefined
            ? undefined
            : columns[definition.beforeKey];

        if (
          (definition.afterKey !== undefined && afterColumn === undefined) ||
          (definition.beforeKey !== undefined && beforeColumn === undefined)
        ) {
          continue;
        }

        const aliases = definition.aliases.map((alias) =>
          this.normalizeHeader(alias),
        );
        const matches = entries.filter(
          (entry) =>
            !usedColumns.has(entry.column) &&
            aliases.includes(entry.normalized) &&
            (afterColumn === undefined || entry.column > afterColumn) &&
            (beforeColumn === undefined || entry.column < beforeColumn),
        );
        const match = matches[definition.occurrence ?? 0];

        if (match) {
          columns[key] = match.column;
          usedColumns.add(match.column);
          unresolved.delete(key);
          progress = true;
        }
      }
    }

    const missingHeaders = this.requiredDefinitions(schema)
      .filter(([key]) => columns[key] === undefined)
      .map(([, definition]) => definition.label);

    return {
      worksheet,
      headerRow: rowNumber,
      columns,
      foundHeaders: entries.map(
        (entry) =>
          `${this.columnLetter(entry.column)} (${entry.column}): ${entry.raw}`,
      ),
      missingHeaders,
      score: this.requiredDefinitions(schema).length - missingHeaders.length,
    };
  }

  private columnLetter(column: number): string {
    let current = column;
    let result = '';

    while (current > 0) {
      const remainder = (current - 1) % 26;
      result = String.fromCharCode(65 + remainder) + result;
      current = Math.floor((current - 1) / 26);
    }

    return result;
  }

  private requiredDefinitions(
    schema: ColumnSchema,
  ): Array<[string, ColumnDefinition]> {
    return Object.entries(schema).filter(
      ([, definition]) => definition.required,
    );
  }

  private cell(row: ExcelJS.Row, columns: ColumnMap, key: string): unknown {
    const column = columns[key];
    return column === undefined ? null : row.getCell(column).value;
  }

  private rowHasAnyData(row: ExcelJS.Row, columns: ColumnMap): boolean {
    return Object.values(columns).some(
      (column) => !this.isEmpty(row.getCell(column).value),
    );
  }

  private throwValidationError(
    diagnostics: ImportFileDiagnostic[],
    year: number,
    month: number,
  ): never {
    const reportFileName = `reporte-carga-error-${year}-${String(
      month,
    ).padStart(2, '0')}.txt`;
    const reportText = this.buildValidationReport(diagnostics, year, month);

    const response: MonthlyImportValidationErrorBody = {
      statusCode: 400,
      code: 'MONTHLY_IMPORT_VALIDATION_FAILED',
      error: 'Validación de carga mensual',
      message:
        'No se pudo procesar la carga mensual. Se generó un reporte TXT con el detalle de cada archivo y encabezado faltante.',
      reportFileName,
      reportText,
      issues: diagnostics,
    };

    throw new BadRequestException(response);
  }

  private buildValidationReport(
    diagnostics: ImportFileDiagnostic[],
    year: number,
    month: number,
  ): string {
    const lines: string[] = [
      'PID - REPORTE DE VALIDACIÓN DE CARGA MENSUAL',
      '============================================================',
      `Periodo solicitado: ${year}-${String(month).padStart(2, '0')}`,
      `Fecha del reporte: ${new Date().toISOString()}`,
      'Resultado: CARGA RECHAZADA',
      '',
      'El sistema revisó cada archivo disponible, todas sus hojas, las primeras',
      `${MAX_HEADER_ROWS_TO_SCAN} filas de cada hoja y todas las columnas antes de informar`,
      'que faltaba un encabezado requerido.',
      '',
    ];

    diagnostics.forEach((diagnostic, index) => {
      lines.push(
        `[${index + 1}] ${this.fileTypeLabel(diagnostic.fileType)}`,
        '------------------------------------------------------------',
        `Archivo: ${diagnostic.originalName}`,
        `Código del problema: ${diagnostic.problemCode}`,
        `Problema: ${diagnostic.message}`,
        `Hojas revisadas: ${
          diagnostic.inspectedSheets.length > 0
            ? diagnostic.inspectedSheets.join(', ')
            : 'No aplica'
        }`,
        `Mejor hoja candidata: ${diagnostic.bestCandidateSheet ?? 'No encontrada'}`,
        `Fila candidata de encabezados: ${
          diagnostic.bestCandidateHeaderRow ?? 'No encontrada'
        }`,
      );

      if (diagnostic.expectedHeaders.length > 0) {
        lines.push(
          `Encabezados requeridos: ${diagnostic.expectedHeaders.join(' | ')}`,
        );
      }

      if (diagnostic.foundHeaders.length > 0) {
        lines.push(
          `Encabezados encontrados: ${diagnostic.foundHeaders.join(' | ')}`,
        );
      }

      if (diagnostic.missingHeaders.length > 0) {
        lines.push(
          `Encabezados faltantes: ${diagnostic.missingHeaders.join(' | ')}`,
        );
      }

      if (diagnostic.details && diagnostic.details.length > 0) {
        lines.push('Detalle de filas:');
        diagnostic.details.forEach((detail) => lines.push(`- ${detail}`));
      }

      lines.push('');
    });

    lines.push(
      'ACCIÓN RECOMENDADA',
      '============================================================',
      'Corrige únicamente los encabezados indicados como faltantes. El orden de',
      'las columnas puede cambiar; el sistema identifica cada columna por su nombre.',
      '',
    );

    return lines.join('\r\n');
  }

  private fileTypeLabel(fileType: ImportFileType): string {
    const labels: Record<ImportFileType, string> = {
      KARDEX: 'Kardex',
      RECIPES: 'Recetas',
      SALES: 'Ventas',
      WAITER_SALES: 'Ventas por mesero',
    };

    return labels[fileType];
  }

  private fileResult<T>(
    type: ParsedFile<T>['type'],
    file: Express.Multer.File,
    sheetName: string,
    totalRows: number,
    ignoredRows: number,
    rows: T[],
    errors: ImportRowIssue[],
    ignoredIssues: ImportRowIssue[],
    controlTotals: Record<string, unknown>,
  ): ParsedFile<T> {
    return {
      type,
      originalName: file.originalname,
      sha256: createHash('sha256').update(file.buffer).digest('hex'),
      sheetName,
      totalRows,
      validRows: rows.length,
      ignoredRows,
      errorRows: errors.length,
      controlTotals,
      rows,
      errors,
      ignoredIssues,
    };
  }

  private unwrap(value: unknown): unknown {
    if (value && typeof value === 'object' && !(value instanceof Date)) {
      if ('result' in value) {
        return (value as { result?: unknown }).result;
      }

      if ('richText' in value) {
        return (value as { richText?: Array<{ text?: string }> }).richText
          ?.map((part) => part.text ?? '')
          .join('');
      }

      if ('text' in value) {
        return (value as { text?: unknown }).text;
      }
    }

    return value;
  }

  private text(value: unknown): string {
    const unwrapped = this.unwrap(value);

    if (unwrapped === null || unwrapped === undefined) {
      return '';
    }

    if (typeof unwrapped === 'string') {
      return unwrapped.replace(/\s+/g, ' ').trim();
    }

    if (
      typeof unwrapped === 'number' ||
      typeof unwrapped === 'boolean' ||
      typeof unwrapped === 'bigint'
    ) {
      return `${unwrapped}`.replace(/\s+/g, ' ').trim();
    }

    if (unwrapped instanceof Date) {
      return unwrapped.toISOString();
    }

    return '';
  }

  private nullableText(value: unknown): string | null {
    const result = this.text(value);
    return result === '' ? null : result;
  }

  private cleanSupplier(value: unknown): string | null {
    const result = this.text(value);

    if (
      result === '' ||
      result === '.' ||
      result === '. .' ||
      result === '..'
    ) {
      return null;
    }

    return result;
  }

  private normalize(value: unknown): string {
    return this.text(value)
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private normalizeHeader(value: unknown): string {
    return this.text(value)
      .replace(/<>\s*0/g, ' NO CERO ')
      .replace(/<>/g, ' NO CERO ')
      .replace(/\+/g, ' MAS ')
      .replace(/%/g, ' PORCENTAJE ')
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private normalizeUnit(value: string | null): string {
    const normalized = this.normalize(value ?? '');

    const aliases: Record<string, string> = {
      KG: 'KG',
      KILO: 'KG',
      KILOS: 'KG',
      KL: 'KG',
      UNIDAD: 'UNIT',
      UNID: 'UNIT',
      UND: 'UNIT',
      ML: 'ML',
      MILILITRO: 'ML',
      MILILITROS: 'ML',
      L: 'L',
      LITRO: 'L',
      LITROS: 'L',
      ATADO: 'BUNDLE',
      NINGUNO: 'NONE',
    };

    return aliases[normalized] ?? (normalized || 'OTHER');
  }

  private number(value: unknown): number {
    const unwrapped = this.unwrap(value);

    if (unwrapped === null || unwrapped === undefined || unwrapped === '') {
      return 0;
    }

    if (typeof unwrapped === 'number') {
      return Number.isFinite(unwrapped) ? unwrapped : 0;
    }

    if (typeof unwrapped === 'bigint') {
      const result = Number(unwrapped);

      if (!Number.isFinite(result)) {
        throw new Error('El número excede el rango admitido.');
      }

      return result;
    }

    if (typeof unwrapped === 'boolean') {
      return unwrapped ? 1 : 0;
    }

    if (typeof unwrapped !== 'string') {
      throw new Error('La celda no contiene un número válido.');
    }

    const text = unwrapped.trim();

    if (text === '') {
      return 0;
    }

    const normalized =
      text.includes(',') && !text.includes('.')
        ? text.replace(',', '.')
        : text.replace(/,/g, '');

    const result = Number(normalized);

    if (!Number.isFinite(result)) {
      throw new Error(`No se pudo convertir "${text}" a número.`);
    }

    return result;
  }

  private date(value: unknown): Date {
    const unwrapped = this.unwrap(value);

    if (unwrapped instanceof Date) {
      return new Date(unwrapped.getTime());
    }

    if (typeof unwrapped === 'number') {
      return new Date(Date.UTC(1899, 11, 30) + unwrapped * DAY_MILLISECONDS);
    }

    const text = this.text(unwrapped);

    if (/^\d+(?:\.\d+)?$/.test(text)) {
      return new Date(Date.UTC(1899, 11, 30) + Number(text) * DAY_MILLISECONDS);
    }

    const dmy = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);

    if (dmy) {
      return new Date(
        Date.UTC(Number(dmy[3]), Number(dmy[2]) - 1, Number(dmy[1])),
      );
    }

    const parsed = new Date(text);

    if (Number.isNaN(parsed.getTime())) {
      throw new Error(`No se pudo convertir "${text}" a fecha.`);
    }

    return parsed;
  }

  private isEmpty(value: unknown): boolean {
    return this.text(value) === '';
  }

  private rowPreview(
    row: ExcelJS.Row,
    schema: ColumnSchema,
    columns: ColumnMap,
  ): Record<string, unknown> {
    const preview: Record<string, unknown> = {};

    for (const [key, definition] of Object.entries(schema)) {
      const column = columns[key];

      if (column !== undefined) {
        preview[definition.label] = this.text(row.getCell(column).value);
      }
    }

    return preview;
  }

  private rowError(
    fileType: ImportRowIssue['fileType'],
    sourceRow: number,
    error: unknown,
    rawData: Record<string, unknown>,
  ): ImportRowIssue {
    let message = 'Error de lectura no identificado.';

    if (error instanceof Error) {
      message = error.message;
    } else if (typeof error === 'string') {
      message = error;
    } else if (
      error !== null &&
      typeof error === 'object' &&
      'message' in error &&
      typeof error.message === 'string'
    ) {
      message = error.message;
    }

    return {
      kind: 'ERROR',
      fileType,
      sourceRow,
      message,
      rawData,
    };
  }

  private ignoredRow(
    fileType: ImportRowIssue['fileType'],
    sourceRow: number,
    message: string,
    rawData: Record<string, unknown>,
  ): ImportRowIssue {
    return {
      kind: 'IGNORED',
      fileType,
      sourceRow,
      message,
      rawData,
    };
  }

  private round(value: number): number {
    return Number(value.toFixed(6));
  }

  private roundControlTotals(
    totals: Record<string, number>,
  ): Record<string, number> {
    return Object.fromEntries(
      Object.entries(totals).map(([key, value]) => [key, this.round(value)]),
    );
  }
}
