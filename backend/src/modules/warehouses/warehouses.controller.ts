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
import { CreateWarehouseDto } from './dto/create-warehouse.dto';
import { QueryWarehousesDto } from './dto/query-warehouses.dto';
import { UpdateWarehouseDto } from './dto/update-warehouse.dto';
import { WarehouseResponse, WarehousesPageResponse } from './warehouses.types';
import { WarehousesService } from './warehouses.service';

@UseGuards(OrganizationContextGuard)
@Controller('warehouses')
export class WarehousesController {
  constructor(private readonly warehousesService: WarehousesService) {}

  @Post()
  create(
    @CurrentOrganizationId()
    organizationId: string,
    @Body()
    dto: CreateWarehouseDto,
  ): Promise<WarehouseResponse> {
    return this.warehousesService.create(organizationId, dto);
  }

  @Get()
  findAll(
    @CurrentOrganizationId()
    organizationId: string,
    @Query()
    query: QueryWarehousesDto,
  ): Promise<WarehousesPageResponse> {
    return this.warehousesService.findAll(organizationId, query);
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
  ): Promise<WarehouseResponse> {
    return this.warehousesService.findOne(organizationId, id);
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
    dto: UpdateWarehouseDto,
  ): Promise<WarehouseResponse> {
    return this.warehousesService.update(organizationId, id, dto);
  }

  @Patch(':id/deactivate')
  deactivate(
    @CurrentOrganizationId()
    organizationId: string,
    @Param(
      'id',
      new ParseUUIDPipe({
        version: '4',
      }),
    )
    id: string,
  ): Promise<WarehouseResponse> {
    return this.warehousesService.deactivate(organizationId, id);
  }
}
