import { Module } from '@nestjs/common';
import { OrganizationContextGuard } from '../../common/guards/organization-context.guard';
import { UnitsOfMeasureController } from './units-of-measure.controller';
import { UnitsOfMeasureService } from './units-of-measure.service';

@Module({
  controllers: [UnitsOfMeasureController],
  providers: [UnitsOfMeasureService, OrganizationContextGuard],
})
export class UnitsOfMeasureModule {}
