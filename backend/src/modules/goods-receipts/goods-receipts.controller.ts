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
import { CreateGoodsReceiptDto } from './dto/create-goods-receipt.dto';
import { QueryGoodsReceiptsDto } from './dto/query-goods-receipts.dto';
import type {
  GoodsReceiptResponse,
  GoodsReceiptsPageResponse,
} from './goods-receipts.types';
import { GoodsReceiptsService } from './goods-receipts.service';

@UseGuards(OrganizationContextGuard)
@Controller('goods-receipts')
export class GoodsReceiptsController {
  constructor(private readonly goodsReceiptsService: GoodsReceiptsService) {}

  @Post()
  create(
    @CurrentOrganizationId()
    organizationId: string,
    @Body()
    dto: CreateGoodsReceiptDto,
  ): Promise<GoodsReceiptResponse> {
    return this.goodsReceiptsService.create(organizationId, dto);
  }

  @Get()
  findAll(
    @CurrentOrganizationId()
    organizationId: string,
    @Query()
    query: QueryGoodsReceiptsDto,
  ): Promise<GoodsReceiptsPageResponse> {
    return this.goodsReceiptsService.findAll(organizationId, query);
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
  ): Promise<GoodsReceiptResponse> {
    return this.goodsReceiptsService.findOne(organizationId, id);
  }

  @Patch(':id/post')
  post(
    @CurrentOrganizationId()
    organizationId: string,
    @Param(
      'id',
      new ParseUUIDPipe({
        version: '4',
      }),
    )
    id: string,
  ): Promise<GoodsReceiptResponse> {
    return this.goodsReceiptsService.post(organizationId, id);
  }

  @Patch(':id/void')
  void(
    @CurrentOrganizationId()
    organizationId: string,
    @Param(
      'id',
      new ParseUUIDPipe({
        version: '4',
      }),
    )
    id: string,
  ): Promise<GoodsReceiptResponse> {
    return this.goodsReceiptsService.void(organizationId, id);
  }
}
