import { Body, Controller, Get, Param, Patch, Post, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentPrincipal } from '../auth/current-principal.decorator';
import type { AuthenticatedPrincipal } from '../auth/principal';
import { RequirePermissions } from '../authorization/require-permissions.decorator';
import { CompleteObligationDto, CreateObligationDto, DecideRenewalDto, UpdateObligationDto, UpsertRenewalDto } from './dto';
import { OperationsService } from './operations.service';

@ApiTags('contract operations')
@ApiBearerAuth('keycloak')
@Controller({ path: 'organizations/:organizationId', version: '1' })
export class OperationsController {
  constructor(private readonly operations: OperationsService) {}

  @Get('obligations') @RequirePermissions('operations.read')
  obligations(@Param('organizationId') organizationId: string) { return this.operations.listObligations(organizationId); }

  @Post('contracts/:contractId/obligations') @RequirePermissions('operations.manage')
  createObligation(@Param('organizationId') organizationId: string, @Param('contractId') contractId: string, @CurrentPrincipal() principal: AuthenticatedPrincipal, @Body() input: CreateObligationDto) { return this.operations.createObligation(organizationId, contractId, principal, input); }

  @Patch('obligations/:obligationId') @RequirePermissions('operations.manage')
  updateObligation(@Param('organizationId') organizationId: string, @Param('obligationId') obligationId: string, @CurrentPrincipal() principal: AuthenticatedPrincipal, @Body() input: UpdateObligationDto) { return this.operations.updateObligation(organizationId, obligationId, principal, input); }

  @Post('obligations/:obligationId/complete') @RequirePermissions('operations.manage')
  completeObligation(@Param('organizationId') organizationId: string, @Param('obligationId') obligationId: string, @CurrentPrincipal() principal: AuthenticatedPrincipal, @Body() input: CompleteObligationDto) { return this.operations.completeObligation(organizationId, obligationId, principal, input); }

  @Get('renewals') @RequirePermissions('operations.read')
  renewals(@Param('organizationId') organizationId: string) { return this.operations.listRenewals(organizationId); }

  @Put('contracts/:contractId/renewal') @RequirePermissions('renewal.manage')
  configureRenewal(@Param('organizationId') organizationId: string, @Param('contractId') contractId: string, @CurrentPrincipal() principal: AuthenticatedPrincipal, @Body() input: UpsertRenewalDto) { return this.operations.upsertRenewal(organizationId, contractId, principal, input); }

  @Post('renewals/:renewalId/decision') @RequirePermissions('renewal.manage')
  decideRenewal(@Param('organizationId') organizationId: string, @Param('renewalId') renewalId: string, @CurrentPrincipal() principal: AuthenticatedPrincipal, @Body() input: DecideRenewalDto) { return this.operations.decideRenewal(organizationId, renewalId, principal, input); }

  @Get('operational-alerts') @RequirePermissions('operations.read')
  alerts(@Param('organizationId') organizationId: string) { return this.operations.listAlerts(organizationId); }

  @Post('operational-alerts/:alertId/acknowledge') @RequirePermissions('operations.manage')
  acknowledge(@Param('organizationId') organizationId: string, @Param('alertId') alertId: string, @CurrentPrincipal() principal: AuthenticatedPrincipal) { return this.operations.acknowledgeAlert(organizationId, alertId, principal); }

  @Get('reports/operations') @RequirePermissions('report.read')
  report(@Param('organizationId') organizationId: string) { return this.operations.report(organizationId); }
}
