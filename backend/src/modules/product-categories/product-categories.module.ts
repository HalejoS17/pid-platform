import { Module } from '@nestjs/common';
import { OrganizationContextGuard } from '../../common/guards/organization-context.guard';
import { ProductCategoriesController } from './product-categories.controller';
import { ProductCategoriesService } from './product-categories.service';

@Module({
  controllers: [ProductCategoriesController],
  providers: [ProductCategoriesService, OrganizationContextGuard],
})
export class ProductCategoriesModule {}
