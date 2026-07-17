import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
} from 'class-validator';
import { ProductType } from '../../../generated/prisma/client';

export class UpdateProductDto {
  @IsOptional()
  @IsUUID('4')
  categoryId?: string;

  @IsOptional()
  @IsUUID('4')
  baseUnitId?: string;

  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  @Matches(/^[A-Z0-9_-]+$/, {
    message: 'code may contain only letters, numbers, hyphens and underscores.',
  })
  code?: string;

  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  name?: string;

  @Transform(({ value }: { value: unknown }) => {
    if (typeof value !== 'string') {
      return value;
    }

    const trimmedValue = value.trim();

    return trimmedValue === '' ? null : trimmedValue;
  })
  @IsOptional()
  @IsString()
  @MaxLength(250)
  description?: string | null;

  @Transform(({ value }: { value: unknown }) => {
    if (typeof value !== 'string') {
      return value;
    }

    const trimmedValue = value.trim().toUpperCase();

    return trimmedValue === '' ? null : trimmedValue;
  })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  sku?: string | null;

  @Transform(({ value }: { value: unknown }) => {
    if (typeof value !== 'string') {
      return value;
    }

    const trimmedValue = value.trim();

    return trimmedValue === '' ? null : trimmedValue;
  })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  barcode?: string | null;

  @IsOptional()
  @IsEnum(ProductType)
  type?: ProductType;

  @IsOptional()
  @IsBoolean()
  trackInventory?: boolean;
}
