import {
  BadRequestException,
  createParamDecorator,
  ExecutionContext,
} from '@nestjs/common';
import type { RequestWithOrganization } from '../interfaces/request-with-organization.interface';

export const CurrentOrganizationId = createParamDecorator(
  (_data: unknown, context: ExecutionContext): string => {
    const request = context
      .switchToHttp()
      .getRequest<RequestWithOrganization>();

    if (!request.organizationId) {
      throw new BadRequestException('Organization context is not available.');
    }

    return request.organizationId;
  },
);
