import type { Request } from 'express';

export interface RequestWithOrganization extends Request {
  organizationId?: string;
}
