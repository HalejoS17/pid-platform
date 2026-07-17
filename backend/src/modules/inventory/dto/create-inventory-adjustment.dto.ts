import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsISO8601,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
} from 'class-validator';
import { InventoryMovementDirection } from '../../../generated/prisma/client';

export class CreateInventoryAdjustmentDto {
  @IsUUID('4')
  warehouseId!: string;

  @IsUUID('4')
  productId!: string;

  @IsUUID('4')
  unitId!: string;

  @IsEnum(InventoryMovementDirection)
  direction!: InventoryMovementDirection;

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
  @IsOptional()
  @IsString()
  @Matches(/^(?:0|[1-9]\d{0,11})(?:\.\d{1,6})?$/, {
    message:
      'unitCost must contain up to 12 integer digits and 6 decimal places.',
  })
  unitCost?: string;

  @IsOptional()
  @IsISO8601({
    strict: true,
  })
  occurredAt?: string;

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
  referenceNumber?: string | null;

  @Transform(({ value }: { value: unknown }) => {
    if (typeof value !== 'string') {
      return value;
    }

    const result = value.trim();

    return result === '' ? null : result;
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
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
}
