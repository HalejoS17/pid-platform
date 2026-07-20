import { Transform, Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

function trimOptional(value: unknown): unknown {
  if (typeof value !== 'string') {
    return value;
  }

  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
}

export class ProcessMonthlyImportDto {
  @Type(() => Number)
  @IsInt()
  @Min(2000)
  @Max(2200)
  year!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  month!: number;

  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  @IsOptional()
  @IsString()
  @MaxLength(50)
  sourceSystem?: string;
}

export class QueryMonthlyImportsDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20;

  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(2000)
  @Max(2200)
  year?: number;

  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(12)
  month?: number;
}

export class QueryMonthlyAnalyticsDto {
  @Type(() => Number)
  @IsInt()
  @Min(2000)
  @Max(2200)
  year!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  month!: number;

  @Transform(({ value }: { value: unknown }) => trimOptional(value))
  @IsOptional()
  @IsString()
  @MaxLength(150)
  group1?: string;

  @Transform(({ value }: { value: unknown }) => trimOptional(value))
  @IsOptional()
  @IsString()
  @MaxLength(150)
  group2?: string;

  @Transform(({ value }: { value: unknown }) => trimOptional(value))
  @IsOptional()
  @IsString()
  @MaxLength(250)
  article?: string;

  @Transform(({ value }: { value: unknown }) => trimOptional(value))
  @IsOptional()
  @IsString()
  @MaxLength(250)
  ingredient?: string;
}
