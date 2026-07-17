import { Transform } from 'class-transformer';
import {
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
} from 'class-validator';

export class PurchaseOrderItemInputDto {
  @IsUUID('4')
  supplierProductId!: string;

  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'number'
      ? value.toString()
      : typeof value === 'string'
        ? value.trim()
        : value,
  )
  @IsString()
  @Matches(/^(?:0|[1-9]\d{0,11})(?:\.\d{1,6})?$/, {
    message:
      'quantity must contain up to 12 integer digits and 6 decimal places.',
  })
  quantity!: string;

  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'number'
      ? value.toString()
      : typeof value === 'string'
        ? value.trim()
        : value,
  )
  @IsString()
  @Matches(/^(?:0|[1-9]\d{0,11})(?:\.\d{1,6})?$/, {
    message:
      'unitCost must contain up to 12 integer digits and 6 decimal places.',
  })
  unitCost!: string;

  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'number'
      ? value.toString()
      : typeof value === 'string'
        ? value.trim()
        : value,
  )
  @IsOptional()
  @IsString()
  @Matches(/^\d{1,3}(?:\.\d{1,4})?$/, {
    message:
      'taxRate must contain up to 3 integer digits and 4 decimal places.',
  })
  taxRate?: string;

  @Transform(({ value }: { value: unknown }) => {
    if (typeof value !== 'string') {
      return value;
    }

    const result = value.trim();

    return result === '' ? null : result;
  })
  @IsOptional()
  @IsString()
  @MaxLength(250)
  notes?: string | null;
}

export class ReplacePurchaseOrderItemDto extends PurchaseOrderItemInputDto {
  @IsOptional()
  @IsUUID('4')
  id?: string;
}
