import { Module } from '@nestjs/common';
import { OrganizationContextGuard } from '../../common/guards/organization-context.guard';
import { GoodsReceiptsController } from './goods-receipts.controller';
import { GoodsReceiptsService } from './goods-receipts.service';

@Module({
  controllers: [GoodsReceiptsController],
  providers: [GoodsReceiptsService, OrganizationContextGuard],
})
export class GoodsReceiptsModule {}
