import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentOrganizationId } from '../../common/decorators/current-organization-id.decorator';
import { OrganizationContextGuard } from '../../common/guards/organization-context.guard';
import { CreateSupplierProductCostDto } from './dto/create-supplier-product-cost.dto';
import { QuerySupplierProductCostsDto } from './dto/query-supplier-product-costs.dto';
import { SupplierProductCostsService } from './supplier-product-costs.service';
import type {
  SupplierProductCostResponse,
  SupplierProductCostsPageResponse,
} from './suppliers.types';

@UseGuards(OrganizationContextGuard)
@Controller('supplier-products/:supplierProductId/costs')
export class SupplierProductCostsController {
  constructor(
    private readonly supplierProductCostsService: SupplierProductCostsService,
  ) {}

  @Post()
  create(
    @CurrentOrganizationId()
    organizationId: string,
    @Param(
      'supplierProductId',
      new ParseUUIDPipe({
        version: '4',
      }),
    )
    supplierProductId: string,
    @Body()
    dto: CreateSupplierProductCostDto,
  ): Promise<SupplierProductCostResponse> {
    return this.supplierProductCostsService.create(
      organizationId,
      supplierProductId,
      dto,
    );
  }

  @Get()
  findAll(
    @CurrentOrganizationId()
    organizationId: string,
    @Param(
      'supplierProductId',
      new ParseUUIDPipe({
        version: '4',
      }),
    )
    supplierProductId: string,
    @Query()
    query: QuerySupplierProductCostsDto,
  ): Promise<SupplierProductCostsPageResponse> {
    return this.supplierProductCostsService.findAll(
      organizationId,
      supplierProductId,
      query,
    );
  }

  @Get('current')
  findCurrent(
    @CurrentOrganizationId()
    organizationId: string,
    @Param(
      'supplierProductId',
      new ParseUUIDPipe({
        version: '4',
      }),
    )
    supplierProductId: string,
  ): Promise<SupplierProductCostResponse> {
    return this.supplierProductCostsService.findCurrent(
      organizationId,
      supplierProductId,
    );
  }
}
