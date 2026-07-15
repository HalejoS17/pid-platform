import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { isUUID } from 'class-validator';
import { ORGANIZATION_ID_HEADER } from '../constants/request-headers.constants';
import type { RequestWithOrganization } from '../interfaces/request-with-organization.interface';

@Injectable()
export class OrganizationContextGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const nodeEnvironment = this.configService.get<string>('NODE_ENV');

    if (nodeEnvironment === 'production') {
      throw new UnauthorizedException(
        'Tenant authentication is not configured.',
      );
    }

    const request = context
      .switchToHttp()
      .getRequest<RequestWithOrganization>();

    const headerValue = request.headers[ORGANIZATION_ID_HEADER];

    if (typeof headerValue !== 'string' || !isUUID(headerValue, '4')) {
      throw new BadRequestException(
        `The ${ORGANIZATION_ID_HEADER} header must contain a valid UUID v4.`,
      );
    }

    request.organizationId = headerValue;

    return true;
  }
}
