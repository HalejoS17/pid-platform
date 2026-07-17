import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsISO8601,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { PurchaseOrderItemInputDto } from './purchase-order-item-input.dto';

export class CreatePurchaseOrderDto {
  @IsUUID('4')
  supplierId!: string;

  @IsUUID('4')
  warehouseId!: string;

  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  @IsString()
  @Matches(/^[A-Z0-9_-]+$/, {
    message:
      'number may contain only letters, numbers, hyphens and underscores.',
  })
  @MaxLength(40)
  number!: string;

  @IsOptional()
  @IsISO8601({
    strict: true,
  })
  orderDate?: string;

  @IsOptional()
  @IsISO8601({
    strict: true,
  })
  expectedDate?: string;

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

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @ValidateNested({
    each: true,
  })
  @Type(() => PurchaseOrderItemInputDto)
  items!: PurchaseOrderItemInputDto[];
}
