import { Module } from '@nestjs/common';
import { OrganizationContextGuard } from '../../common/guards/organization-context.guard';
import { BranchesController } from './branches.controller';
import { BranchesService } from './branches.service';

@Module({
  controllers: [BranchesController],
  providers: [BranchesService, OrganizationContextGuard],
})
export class BranchesModule {}
