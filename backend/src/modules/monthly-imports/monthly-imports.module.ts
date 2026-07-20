import { Module } from '@nestjs/common';
import { OrganizationContextGuard } from '../../common/guards/organization-context.guard';
import { HistoricalImportDataService } from './historical-import-data.service';
import { MonthlyAnalyticsService } from './monthly-analytics.service';
import { MonthlyImportsController } from './monthly-imports.controller';
import { MonthlyImportsParser } from './monthly-imports.parser';
import { MonthlyImportsService } from './monthly-imports.service';

@Module({
  controllers: [MonthlyImportsController],
  providers: [
    MonthlyImportsService,
    MonthlyImportsParser,
    MonthlyAnalyticsService,
    HistoricalImportDataService,
    OrganizationContextGuard,
  ],
})
export class MonthlyImportsModule {}
