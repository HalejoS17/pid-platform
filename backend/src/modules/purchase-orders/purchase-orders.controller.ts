import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentOrganizationId } from '../../common/decorators/current-organization-id.decorator';
import { OrganizationContextGuard } from '../../common/guards/organization-context.guard';
import { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto';
import { QueryPurchaseOrdersDto } from './dto/query-purchase-orders.dto';
import { ReplacePurchaseOrderItemsDto } from './dto/replace-purchase-order-items.dto';
import { UpdatePurchaseOrderDto } from './dto/update-purchase-order.dto';
import type {
  PurchaseOrderResponse,
  PurchaseOrdersPageResponse,
} from './purchase-orders.types';
import { PurchaseOrdersService } from './purchase-orders.service';

@UseGuards(OrganizationContextGuard)
@Controller('purchase-orders')
export class PurchaseOrdersController {
  constructor(private readonly purchaseOrdersService: PurchaseOrdersService) {}

  @Post()
  create(
    @CurrentOrganizationId()
    organizationId: string,
    @Body()
    dto: CreatePurchaseOrderDto,
  ): Promise<PurchaseOrderResponse> {
    return this.purchaseOrdersService.create(organizationId, dto);
  }

  @Get()
  findAll(
    @CurrentOrganizationId()
    organizationId: string,
    @Query()
    query: QueryPurchaseOrdersDto,
  ): Promise<PurchaseOrdersPageResponse> {
    return this.purchaseOrdersService.findAll(organizationId, query);
  }

  @Get(':id')
  findOne(
    @CurrentOrganizationId()
    organizationId: string,
    @Param(
      'id',
      new ParseUUIDPipe({
        version: '4',
      }),
    )
    id: string,
  ): Promise<PurchaseOrderResponse> {
    return this.purchaseOrdersService.findOne(organizationId, id);
  }

  @Patch(':id')
  update(
    @CurrentOrganizationId()
    organizationId: string,
    @Param(
      'id',
      new ParseUUIDPipe({
        version: '4',
      }),
    )
    id: string,
    @Body()
    dto: UpdatePurchaseOrderDto,
  ): Promise<PurchaseOrderResponse> {
    return this.purchaseOrdersService.update(organizationId, id, dto);
  }

  @Put(':id/items')
  replaceItems(
    @CurrentOrganizationId()
    organizationId: string,
    @Param(
      'id',
      new ParseUUIDPipe({
        version: '4',
      }),
    )
    id: string,
    @Body()
    dto: ReplacePurchaseOrderItemsDto,
  ): Promise<PurchaseOrderResponse> {
    return this.purchaseOrdersService.replaceItems(organizationId, id, dto);
  }

  @Patch(':id/approve')
  approve(
    @CurrentOrganizationId()
    organizationId: string,
    @Param(
      'id',
      new ParseUUIDPipe({
        version: '4',
      }),
    )
    id: string,
  ): Promise<PurchaseOrderResponse> {
    return this.purchaseOrdersService.approve(organizationId, id);
  }

  @Patch(':id/cancel')
  cancel(
    @CurrentOrganizationId()
    organizationId: string,
    @Param(
      'id',
      new ParseUUIDPipe({
        version: '4',
      }),
    )
    id: string,
  ): Promise<PurchaseOrderResponse> {
    return this.purchaseOrdersService.cancel(organizationId, id);
  }
}
