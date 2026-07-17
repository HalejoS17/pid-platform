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
import { CreateSupplierProductDto } from './dto/create-supplier-product.dto';
import { QuerySupplierProductsDto } from './dto/query-supplier-products.dto';
import { UpdateSupplierProductDto } from './dto/update-supplier-product.dto';
import { SupplierProductsService } from './supplier-products.service';
import type {
  SupplierProductResponse,
  SupplierProductsPageResponse,
} from './suppliers.types';

@UseGuards(OrganizationContextGuard)
@Controller('suppliers/:supplierId/products')
export class SupplierProductsController {
  constructor(
    private readonly supplierProductsService: SupplierProductsService,
  ) {}

  @Post()
  create(
    @CurrentOrganizationId()
    organizationId: string,
    @Param(
      'supplierId',
      new ParseUUIDPipe({
        version: '4',
      }),
    )
    supplierId: string,
    @Body()
    dto: CreateSupplierProductDto,
  ): Promise<SupplierProductResponse> {
    return this.supplierProductsService.create(organizationId, supplierId, dto);
  }

  @Get()
  findAll(
    @CurrentOrganizationId()
    organizationId: string,
    @Param(
      'supplierId',
      new ParseUUIDPipe({
        version: '4',
      }),
    )
    supplierId: string,
    @Query()
    query: QuerySupplierProductsDto,
  ): Promise<SupplierProductsPageResponse> {
    return this.supplierProductsService.findAll(
      organizationId,
      supplierId,
      query,
    );
  }

  @Get(':supplierProductId')
  findOne(
    @CurrentOrganizationId()
    organizationId: string,
    @Param(
      'supplierId',
      new ParseUUIDPipe({
        version: '4',
      }),
    )
    supplierId: string,
    @Param(
      'supplierProductId',
      new ParseUUIDPipe({
        version: '4',
      }),
    )
    supplierProductId: string,
  ): Promise<SupplierProductResponse> {
    return this.supplierProductsService.findOne(
      organizationId,
      supplierId,
      supplierProductId,
    );
  }

  @Patch(':supplierProductId')
  update(
    @CurrentOrganizationId()
    organizationId: string,
    @Param(
      'supplierId',
      new ParseUUIDPipe({
        version: '4',
      }),
    )
    supplierId: string,
    @Param(
      'supplierProductId',
      new ParseUUIDPipe({
        version: '4',
      }),
    )
    supplierProductId: string,
    @Body()
    dto: UpdateSupplierProductDto,
  ): Promise<SupplierProductResponse> {
    return this.supplierProductsService.update(
      organizationId,
      supplierId,
      supplierProductId,
      dto,
    );
  }

  @Patch(':supplierProductId/deactivate')
  deactivate(
    @CurrentOrganizationId()
    organizationId: string,
    @Param(
      'supplierId',
      new ParseUUIDPipe({
        version: '4',
      }),
    )
    supplierId: string,
    @Param(
      'supplierProductId',
      new ParseUUIDPipe({
        version: '4',
      }),
    )
    supplierProductId: string,
  ): Promise<SupplierProductResponse> {
    return this.supplierProductsService.deactivate(
      organizationId,
      supplierId,
      supplierProductId,
    );
  }
}
