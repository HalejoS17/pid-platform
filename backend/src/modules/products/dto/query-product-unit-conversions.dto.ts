import { IsEnum, IsOptional } from 'class-validator';
import { EntityStatus } from '../../../generated/prisma/client';

export class QueryProductUnitConversionsDto {
  @IsOptional()
  @IsEnum(EntityStatus)
  status?: EntityStatus;
}
