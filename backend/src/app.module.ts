import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { envValidationSchema } from './config/env.validation';
import { PrismaModule } from './database/prisma/prisma.module';
import { BranchesModule } from './modules/branches/branches.module';
import { HealthModule } from './modules/health/health.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { PurchaseOrdersModule } from './modules/purchase-orders/purchase-orders.module';
import { GoodsReceiptsModule } from './modules/goods-receipts/goods-receipts.module';
import { ProductCategoriesModule } from './modules/product-categories/product-categories.module';
import { UnitsOfMeasureModule } from './modules/units-of-measure/units-of-measure.module';
import { ProductsModule } from './modules/products/products.module';
import { SuppliersModule } from './modules/suppliers/suppliers.module';
import { RestaurantsModule } from './modules/restaurants/restaurants.module';
import { WarehousesModule } from './modules/warehouses/warehouses.module';
import { MonthlyImportsModule } from './modules/monthly-imports/monthly-imports.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      validationSchema: envValidationSchema,
      validationOptions: {
        allowUnknown: true,
        abortEarly: false,
      },
    }),

    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        throttlers: [
          {
            ttl: configService.getOrThrow<number>('THROTTLE_TTL'),
            limit: configService.getOrThrow<number>('THROTTLE_LIMIT'),
          },
        ],
      }),
    }),

    PrismaModule,
    HealthModule,
    RestaurantsModule,
    BranchesModule,
    WarehousesModule,
    ProductCategoriesModule,
    UnitsOfMeasureModule,
    ProductsModule,
    SuppliersModule,
    InventoryModule,
    PurchaseOrdersModule,
    GoodsReceiptsModule,
    MonthlyImportsModule,
  ],

  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
