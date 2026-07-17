import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsISO8601,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  ValidateNested,
} from 'class-validator';

export class CreateGoodsReceiptItemDto {
  @IsUUID('4')
  purchaseOrderItemId!: string;

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

export class CreateGoodsReceiptDto {
  @IsUUID('4')
  purchaseOrderId!: string;

  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  @IsString()
  @Matches(/^[A-Z0-9_-]+$/, {
    message:
      'number may contain only letters, numbers, hyphens and underscores.',
  })
  @MaxLength(40)
  number!: string;

  @Transform(({ value }: { value: unknown }) => {
    if (typeof value !== 'string') {
      return value;
    }

    const result = value.trim();

    return result === '' ? null : result;
  })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  supplierDocumentNumber?: string | null;

  @IsOptional()
  @IsISO8601({
    strict: true,
  })
  receiptDate?: string;

  @Transform(({ value }: { value: unknown }) => {
    if (typeof value !== 'string') {
      return value;
    }

    const result = value.trim();

    return result === '' ? null : result;
  })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  idempotencyKey?: string | null;

  @Transform(({ value }: { value: unknown }) => {
    if (typeof value !== 'string') {
      return value;
    }

    const result = value.trim();

    return result === '' ? null : result;
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string | null;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @ValidateNested({
    each: true,
  })
  @Type(() => CreateGoodsReceiptItemDto)
  items!: CreateGoodsReceiptItemDto[];
}
