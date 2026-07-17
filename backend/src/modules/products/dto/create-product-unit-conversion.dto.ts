import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
} from 'class-validator';

export class CreateProductUnitConversionDto {
  @IsUUID('4')
  unitId!: string;

  @Transform(({ value }: { value: unknown }) => {
    if (typeof value === 'number') {
      return value.toString();
    }

    return typeof value === 'string' ? value.trim() : value;
  })
  @IsString()
  @Matches(/^(?:0|[1-9]\d{0,11})(?:\.\d{1,6})?$/, {
    message:
      'factorToBase must be a positive decimal with up to 12 integer digits and 6 decimal places.',
  })
  factorToBase!: string;

  @IsOptional()
  @IsBoolean()
  isPurchaseUnit?: boolean;

  @IsOptional()
  @IsBoolean()
  isRecipeUnit?: boolean;
}
