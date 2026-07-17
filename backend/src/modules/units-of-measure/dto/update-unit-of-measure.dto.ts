import { Transform, Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { UnitDimension } from '../../../generated/prisma/client';

export class UpdateUnitOfMeasureDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
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
  @MaxLength(100)
  name?: string;

  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  symbol?: string;

  @IsOptional()
  @IsEnum(UnitDimension)
  dimension?: UnitDimension;

  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(6)
  decimalPlaces?: number;
}
