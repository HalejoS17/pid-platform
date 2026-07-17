import { Module } from '@nestjs/common';
import { OrganizationContextGuard } from '../../common/guards/organization-context.guard';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';

@Module({
  controllers: [InventoryController],
  providers: [InventoryService, OrganizationContextGuard],
})
export class InventoryModule {}
