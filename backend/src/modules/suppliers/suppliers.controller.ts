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
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { QuerySuppliersDto } from './dto/query-suppliers.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import type {
  SupplierResponse,
  SuppliersPageResponse,
} from './suppliers.types';
import { SuppliersService } from './suppliers.service';

@UseGuards(OrganizationContextGuard)
@Controller('suppliers')
export class SuppliersController {
  constructor(private readonly suppliersService: SuppliersService) {}

  @Post()
  create(
    @CurrentOrganizationId()
    organizationId: string,
    @Body()
    dto: CreateSupplierDto,
  ): Promise<SupplierResponse> {
    return this.suppliersService.create(organizationId, dto);
  }

  @Get()
  findAll(
    @CurrentOrganizationId()
    organizationId: string,
    @Query()
    query: QuerySuppliersDto,
  ): Promise<SuppliersPageResponse> {
    return this.suppliersService.findAll(organizationId, query);
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
  ): Promise<SupplierResponse> {
    return this.suppliersService.findOne(organizationId, id);
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
    dto: UpdateSupplierDto,
  ): Promise<SupplierResponse> {
    return this.suppliersService.update(organizationId, id, dto);
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
  ): Promise<SupplierResponse> {
    return this.suppliersService.deactivate(organizationId, id);
  }
}
