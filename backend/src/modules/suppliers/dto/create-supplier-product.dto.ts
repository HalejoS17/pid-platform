import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateSupplierProductDto {
  @IsUUID('4')
  productId!: string;

  @IsUUID('4')
  purchaseUnitId!: string;

  @Transform(({ value }: { value: unknown }) => {
    if (typeof value !== 'string') {
      return value;
    }

    const result = value.trim().toUpperCase();

    return result === '' ? null : result;
  })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  supplierSku?: string | null;

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
      'minimumOrderQuantity must contain up to 12 integer digits and 6 decimal places.',
  })
  minimumOrderQuantity?: string;

  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(3650)
  leadTimeDays?: number;

  @IsOptional()
  @IsBoolean()
  isPreferred?: boolean;
}
