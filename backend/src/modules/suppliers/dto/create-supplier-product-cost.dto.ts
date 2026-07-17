import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsISO8601,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

export class CreateSupplierProductCostDto {
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
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  @IsOptional()
  @IsString()
  @Matches(/^[A-Z]{3}$/, {
    message: 'currencyCode must contain exactly 3 uppercase letters.',
  })
  currencyCode?: string;

  @IsOptional()
  @IsBoolean()
  taxIncluded?: boolean;

  @IsOptional()
  @IsISO8601({
    strict: true,
  })
  effectiveFrom?: string;

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
