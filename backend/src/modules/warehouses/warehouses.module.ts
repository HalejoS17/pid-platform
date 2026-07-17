import { Module } from '@nestjs/common';
import { OrganizationContextGuard } from '../../common/guards/organization-context.guard';
import { WarehousesController } from './warehouses.controller';
import { WarehousesService } from './warehouses.service';

@Module({
  controllers: [WarehousesController],
  providers: [WarehousesService, OrganizationContextGuard],
})
export class WarehousesModule {}
