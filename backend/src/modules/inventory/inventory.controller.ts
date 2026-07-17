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
import { CreateInventoryAdjustmentDto } from './dto/create-inventory-adjustment.dto';
import { CreateInventoryTransferDto } from './dto/create-inventory-transfer.dto';
import { QueryInventoryBalancesDto } from './dto/query-inventory-balances.dto';
import { QueryInventoryMovementsDto } from './dto/query-inventory-movements.dto';
import type {
  InventoryBalanceResponse,
  InventoryBalancesPageResponse,
  InventoryMovementResponse,
  InventoryMovementsPageResponse,
  InventoryTransferResponse,
} from './inventory.types';
import { InventoryService } from './inventory.service';

@UseGuards(OrganizationContextGuard)
@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get('balances')
  findBalances(
    @CurrentOrganizationId()
    organizationId: string,
    @Query()
    query: QueryInventoryBalancesDto,
  ): Promise<InventoryBalancesPageResponse> {
    return this.inventoryService.findBalances(organizationId, query);
  }

  @Get('balances/:warehouseId/:productId')
  findBalance(
    @CurrentOrganizationId()
    organizationId: string,
    @Param(
      'warehouseId',
      new ParseUUIDPipe({
        version: '4',
      }),
    )
    warehouseId: string,
    @Param(
      'productId',
      new ParseUUIDPipe({
        version: '4',
      }),
    )
    productId: string,
  ): Promise<InventoryBalanceResponse> {
    return this.inventoryService.findBalance(
      organizationId,
      warehouseId,
      productId,
    );
  }

  @Get('movements')
  findMovements(
    @CurrentOrganizationId()
    organizationId: string,
    @Query()
    query: QueryInventoryMovementsDto,
  ): Promise<InventoryMovementsPageResponse> {
    return this.inventoryService.findMovements(organizationId, query);
  }

  @Get('movements/:id')
  findMovement(
    @CurrentOrganizationId()
    organizationId: string,
    @Param(
      'id',
      new ParseUUIDPipe({
        version: '4',
      }),
    )
    id: string,
  ): Promise<InventoryMovementResponse> {
    return this.inventoryService.findMovement(organizationId, id);
  }

  @Post('adjustments')
  createAdjustment(
    @CurrentOrganizationId()
    organizationId: string,
    @Body()
    dto: CreateInventoryAdjustmentDto,
  ): Promise<InventoryMovementResponse> {
    return this.inventoryService.createAdjustment(organizationId, dto);
  }

  @Post('transfers')
  createTransfer(
    @CurrentOrganizationId()
    organizationId: string,
    @Body()
    dto: CreateInventoryTransferDto,
  ): Promise<InventoryTransferResponse> {
    return this.inventoryService.createTransfer(organizationId, dto);
  }
}
