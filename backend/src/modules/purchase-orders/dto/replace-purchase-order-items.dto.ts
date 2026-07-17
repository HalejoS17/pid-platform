import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { ReplacePurchaseOrderItemDto } from './purchase-order-item-input.dto';

export class ReplacePurchaseOrderItemsDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @ValidateNested({
    each: true,
  })
  @Type(() => ReplacePurchaseOrderItemDto)
  items!: ReplacePurchaseOrderItemDto[];
}
