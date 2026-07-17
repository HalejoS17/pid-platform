import { Transform } from 'class-transformer';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
} from 'class-validator';

export class UpdateWarehouseDto {
  @IsOptional()
  @IsUUID('4')
  branchId?: string;

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
  @MaxLength(150)
  name?: string;
}
