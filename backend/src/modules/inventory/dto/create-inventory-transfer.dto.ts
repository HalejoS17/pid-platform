import { Transform } from 'class-transformer';
import {
  IsISO8601,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
} from 'class-validator';

export class CreateInventoryTransferDto {
  @IsUUID('4')
  sourceWarehouseId!: string;

  @IsUUID('4')
  destinationWarehouseId!: string;

  @IsUUID('4')
  productId!: string;

  @IsUUID('4')
  unitId!: string;

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
