import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentOrganizationId } from '../../common/decorators/current-organization-id.decorator';
import { OrganizationContextGuard } from '../../common/guards/organization-context.guard';
import { CreateProductUnitConversionDto } from './dto/create-product-unit-conversion.dto';
import { QueryProductUnitConversionsDto } from './dto/query-product-unit-conversions.dto';
import { UpdateProductUnitConversionDto } from './dto/update-product-unit-conversion.dto';
import type { ProductUnitConversionResponse } from './products.types';
import { ProductUnitConversionsService } from './product-unit-conversions.service';

@UseGuards(OrganizationContextGuard)
@Controller('products/:productId/unit-conversions')
export class ProductUnitConversionsController {
  constructor(
    private readonly conversionsService: ProductUnitConversionsService,
  ) {}

  @Post()
  create(
    @CurrentOrganizationId()
    organizationId: string,
    @Param(
      'productId',
      new ParseUUIDPipe({
        version: '4',
      }),
    )
    productId: string,
    @Body()
    dto: CreateProductUnitConversionDto,
  ): Promise<ProductUnitConversionResponse> {
    return this.conversionsService.create(organizationId, productId, dto);
  }

  @Get()
  findAll(
    @CurrentOrganizationId()
    organizationId: string,
    @Param(
      'productId',
      new ParseUUIDPipe({
        version: '4',
      }),
    )
    productId: string,
    @Query()
    query: QueryProductUnitConversionsDto,
  ): Promise<ProductUnitConversionResponse[]> {
    return this.conversionsService.findAll(organizationId, productId, query);
  }

  @Patch(':conversionId')
  update(
    @CurrentOrganizationId()
    organizationId: string,
    @Param(
      'productId',
      new ParseUUIDPipe({
        version: '4',
      }),
    )
    productId: string,
    @Param(
      'conversionId',
      new ParseUUIDPipe({
        version: '4',
      }),
    )
    conversionId: string,
    @Body()
    dto: UpdateProductUnitConversionDto,
  ): Promise<ProductUnitConversionResponse> {
    return this.conversionsService.update(
      organizationId,
      productId,
      conversionId,
      dto,
    );
  }

  @Patch(':conversionId/deactivate')
  deactivate(
    @CurrentOrganizationId()
    organizationId: string,
    @Param(
      'productId',
      new ParseUUIDPipe({
        version: '4',
      }),
    )
    productId: string,
    @Param(
      'conversionId',
      new ParseUUIDPipe({
        version: '4',
      }),
    )
    conversionId: string,
  ): Promise<ProductUnitConversionResponse> {
    return this.conversionsService.deactivate(
      organizationId,
      productId,
      conversionId,
    );
  }
}
