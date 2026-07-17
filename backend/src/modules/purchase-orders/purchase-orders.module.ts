import { Module } from '@nestjs/common';
import { OrganizationContextGuard } from '../../common/guards/organization-context.guard';
import { PurchaseOrdersController } from './purchase-orders.controller';
import { PurchaseOrdersService } from './purchase-orders.service';

@Module({
  controllers: [PurchaseOrdersController],
  providers: [PurchaseOrdersService, OrganizationContextGuard],
})
export class PurchaseOrdersModule {}
