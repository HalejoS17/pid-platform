import { Module } from '@nestjs/common';
import { OrganizationContextGuard } from '../../common/guards/organization-context.guard';
import { ProductUnitConversionsController } from './product-unit-conversions.controller';
import { ProductUnitConversionsService } from './product-unit-conversions.service';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';

@Module({
  controllers: [ProductsController, ProductUnitConversionsController],
  providers: [
    ProductsService,
    ProductUnitConversionsService,
    OrganizationContextGuard,
  ],
})
export class ProductsModule {}
