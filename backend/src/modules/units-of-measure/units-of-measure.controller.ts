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
import { CreateUnitOfMeasureDto } from './dto/create-unit-of-measure.dto';
import { QueryUnitsOfMeasureDto } from './dto/query-units-of-measure.dto';
import { UpdateUnitOfMeasureDto } from './dto/update-unit-of-measure.dto';
import {
  UnitOfMeasureResponse,
  UnitsOfMeasurePageResponse,
} from './units-of-measure.types';
import { UnitsOfMeasureService } from './units-of-measure.service';

@UseGuards(OrganizationContextGuard)
@Controller('units-of-measure')
export class UnitsOfMeasureController {
  constructor(private readonly unitsOfMeasureService: UnitsOfMeasureService) {}

  @Post()
  create(
    @CurrentOrganizationId()
    organizationId: string,
    @Body()
    dto: CreateUnitOfMeasureDto,
  ): Promise<UnitOfMeasureResponse> {
    return this.unitsOfMeasureService.create(organizationId, dto);
  }

  @Get()
  findAll(
    @CurrentOrganizationId()
    organizationId: string,
    @Query()
    query: QueryUnitsOfMeasureDto,
  ): Promise<UnitsOfMeasurePageResponse> {
    return this.unitsOfMeasureService.findAll(organizationId, query);
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
  ): Promise<UnitOfMeasureResponse> {
    return this.unitsOfMeasureService.findOne(organizationId, id);
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
    dto: UpdateUnitOfMeasureDto,
  ): Promise<UnitOfMeasureResponse> {
    return this.unitsOfMeasureService.update(organizationId, id, dto);
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
  ): Promise<UnitOfMeasureResponse> {
    return this.unitsOfMeasureService.deactivate(organizationId, id);
  }
}
