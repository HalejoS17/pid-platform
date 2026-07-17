import { Module } from '@nestjs/common';
import { OrganizationContextGuard } from '../../common/guards/organization-context.guard';
import { SupplierProductCostsController } from './supplier-product-costs.controller';
import { SupplierProductCostsService } from './supplier-product-costs.service';
import { SupplierProductsController } from './supplier-products.controller';
import { SupplierProductsService } from './supplier-products.service';
import { SuppliersController } from './suppliers.controller';
import { SuppliersService } from './suppliers.service';

@Module({
  controllers: [
    SuppliersController,
    SupplierProductsController,
    SupplierProductCostsController,
  ],
  providers: [
    SuppliersService,
    SupplierProductsService,
    SupplierProductCostsService,
    OrganizationContextGuard,
  ],
})
export class SuppliersModule {}
