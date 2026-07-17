import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsISO8601,
  IsOptional,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import {
  InventoryMovementDirection,
  InventoryMovementStatus,
  InventoryMovementType,
} from '../../../generated/prisma/client';

export class QueryInventoryMovementsDto {
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
  warehouseId?: string;

  @IsOptional()
  @IsUUID('4')
  productId?: string;

  @IsOptional()
  @IsEnum(InventoryMovementType)
  type?: InventoryMovementType;

  @IsOptional()
  @IsEnum(InventoryMovementDirection)
  direction?: InventoryMovementDirection;

  @IsOptional()
  @IsEnum(InventoryMovementStatus)
  status?: InventoryMovementStatus;

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
}
