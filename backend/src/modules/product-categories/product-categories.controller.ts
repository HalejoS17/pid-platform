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
import { CreateProductCategoryDto } from './dto/create-product-category.dto';
import { QueryProductCategoriesDto } from './dto/query-product-categories.dto';
import { UpdateProductCategoryDto } from './dto/update-product-category.dto';
import {
  ProductCategoriesPageResponse,
  ProductCategoryResponse,
} from './product-categories.types';
import { ProductCategoriesService } from './product-categories.service';

@UseGuards(OrganizationContextGuard)
@Controller('product-categories')
export class ProductCategoriesController {
  constructor(
    private readonly productCategoriesService: ProductCategoriesService,
  ) {}

  @Post()
  create(
    @CurrentOrganizationId()
    organizationId: string,
    @Body()
    dto: CreateProductCategoryDto,
  ): Promise<ProductCategoryResponse> {
    return this.productCategoriesService.create(organizationId, dto);
  }

  @Get()
  findAll(
    @CurrentOrganizationId()
    organizationId: string,
    @Query()
    query: QueryProductCategoriesDto,
  ): Promise<ProductCategoriesPageResponse> {
    return this.productCategoriesService.findAll(organizationId, query);
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
  ): Promise<ProductCategoryResponse> {
    return this.productCategoriesService.findOne(organizationId, id);
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
    dto: UpdateProductCategoryDto,
  ): Promise<ProductCategoryResponse> {
    return this.productCategoriesService.update(organizationId, id, dto);
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
  ): Promise<ProductCategoryResponse> {
    return this.productCategoriesService.deactivate(organizationId, id);
  }
}
