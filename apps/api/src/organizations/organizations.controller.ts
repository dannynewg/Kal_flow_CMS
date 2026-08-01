import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentPrincipal } from '../auth/current-principal.decorator';
import type { AuthenticatedPrincipal } from '../auth/principal';
import { RequirePermissions } from '../authorization/require-permissions.decorator';
import { AddMembershipDto, CreateOrganizationDto, TransferOwnershipDto, UpdateMembershipDto, UpdateOrganizationDto } from './dto';
import { OrganizationsService } from './organizations.service';

@ApiTags('organizations')
@ApiBearerAuth('keycloak')
@Controller({ path: 'organizations', version: '1' })
export class OrganizationsController {
  constructor(private readonly organizations: OrganizationsService) {}

  @Post() create(@CurrentPrincipal() principal: AuthenticatedPrincipal, @Body() input: CreateOrganizationDto) { return this.organizations.create(principal, input); }
  @Get() list(@CurrentPrincipal() principal: AuthenticatedPrincipal) { return this.organizations.list(principal); }

  @Get(':organizationId') @RequirePermissions('organization.read')
  get(@Param('organizationId') organizationId: string) { return this.organizations.get(organizationId); }

  @Patch(':organizationId') @RequirePermissions('organization.manage')
  update(@Param('organizationId') organizationId: string, @CurrentPrincipal() principal: AuthenticatedPrincipal, @Body() input: UpdateOrganizationDto) {
    return this.organizations.update(organizationId, principal, input);
  }

  @Get(':organizationId/memberships') @RequirePermissions('membership.read')
  listMembers(@Param('organizationId') organizationId: string) { return this.organizations.listMembers(organizationId); }

  @Post(':organizationId/memberships') @RequirePermissions('membership.manage')
  addMember(@Param('organizationId') organizationId: string, @CurrentPrincipal() principal: AuthenticatedPrincipal, @Body() input: AddMembershipDto) {
    return this.organizations.addMember(organizationId, principal, input);
  }

  @Patch(':organizationId/memberships/:membershipId') @RequirePermissions('membership.manage')
  updateMember(@Param('organizationId') organizationId: string, @Param('membershipId') membershipId: string, @CurrentPrincipal() principal: AuthenticatedPrincipal, @Body() input: UpdateMembershipDto) {
    return this.organizations.updateMember(organizationId, membershipId, principal, input);
  }

  @Post(':organizationId/ownership-transfer') @RequirePermissions('organization.transfer')
  transferOwnership(@Param('organizationId') organizationId: string, @CurrentPrincipal() principal: AuthenticatedPrincipal, @Body() input: TransferOwnershipDto) {
    return this.organizations.transferOwnership(organizationId, principal, input);
  }
}
