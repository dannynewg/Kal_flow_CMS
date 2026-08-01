import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '../authorization/require-permissions.decorator';
import { AuditService } from './audit.service';

@ApiTags('audit')
@ApiBearerAuth('keycloak')
@Controller({ path: 'organizations/:organizationId/audit-events', version: '1' })
export class AuditController {
  constructor(private readonly audit: AuditService) {}

  @Get()
  @RequirePermissions('audit.read')
  list(
    @Param('organizationId') organizationId: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    return this.audit.list(organizationId, cursor, limit ? Number(limit) : 50);
  }
}
