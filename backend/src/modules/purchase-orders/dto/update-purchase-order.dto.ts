import { Transform } from 'class-transformer';
import {
  IsISO8601,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
} from 'class-validator';

export class UpdatePurchaseOrderDto {
  @IsOptional()
  @IsUUID('4')
  warehouseId?: string;

  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  @IsOptional()
  @IsString()
  @Matches(/^[A-Z0-9_-]+$/, {
    message:
      'number may contain only letters, numbers, hyphens and underscores.',
  })
  @MaxLength(40)
  number?: string;

  @IsOptional()
  @IsISO8601({
    strict: true,
  })
  orderDate?: string;

  @Transform(({ value }: { value: unknown }) => {
    if (value === null || value === '') {
      return null;
    }

    return value;
  })
  @IsOptional()
  @IsISO8601({
    strict: true,
  })
  expectedDate?: string | null;

  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  @IsOptional()
  @IsString()
  @Matches(/^[A-Z]{3}$/, {
    message: 'currencyCode must contain exactly 3 uppercase letters.',
  })
  currencyCode?: string;

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
