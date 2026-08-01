import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentPrincipal } from '../auth/current-principal.decorator';
import type { AuthenticatedPrincipal } from '../auth/principal';
import { RequirePermissions } from '../authorization/require-permissions.decorator';
import { AcceptInvitationDto, CreateInvitationDto } from './dto';
import { InvitationsService } from './invitations.service';

@ApiTags('invitations')
@ApiBearerAuth('keycloak')
@Controller({ path: 'invitations', version: '1' })
export class InvitationAcceptanceController {
  constructor(private readonly invitations: InvitationsService) {}

  @Post('accept')
  accept(@CurrentPrincipal() principal: AuthenticatedPrincipal, @Body() input: AcceptInvitationDto) {
    return this.invitations.accept(principal, input.token);
  }
}

@ApiTags('invitations')
@ApiBearerAuth('keycloak')
@Controller({ path: 'organizations/:organizationId/invitations', version: '1' })
export class InvitationsController {
  constructor(private readonly invitations: InvitationsService) {}

  @Get() @RequirePermissions('invitation.read')
  list(@Param('organizationId') organizationId: string) { return this.invitations.list(organizationId); }

  @Post() @RequirePermissions('invitation.manage')
  create(@Param('organizationId') organizationId: string, @CurrentPrincipal() principal: AuthenticatedPrincipal, @Body() input: CreateInvitationDto) {
    return this.invitations.create(organizationId, principal, input);
  }

  @Post(':invitationId/resend') @RequirePermissions('invitation.manage')
  resend(@Param('organizationId') organizationId: string, @Param('invitationId') invitationId: string, @CurrentPrincipal() principal: AuthenticatedPrincipal) {
    return this.invitations.resend(organizationId, invitationId, principal);
  }

  @Post(':invitationId/revoke') @RequirePermissions('invitation.manage')
  revoke(@Param('organizationId') organizationId: string, @Param('invitationId') invitationId: string, @CurrentPrincipal() principal: AuthenticatedPrincipal) {
    return this.invitations.revoke(organizationId, invitationId, principal);
  }
}
