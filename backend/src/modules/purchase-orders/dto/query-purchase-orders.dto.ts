import { Transform, Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { PurchaseOrderStatus } from '../../../generated/prisma/client';

export class QueryPurchaseOrdersDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20;

  @IsOptional()
  @IsUUID('4')
  supplierId?: string;

  @IsOptional()
  @IsUUID('4')
  warehouseId?: string;

  @IsOptional()
  @IsEnum(PurchaseOrderStatus)
  status?: PurchaseOrderStatus;

  @IsOptional()
  @IsISO8601({
    strict: true,
  })
  dateFrom?: string;

  @IsOptional()
  @IsISO8601({
    strict: true,
  })
  dateTo?: string;

  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;
}
