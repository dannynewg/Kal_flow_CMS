import { Body, Controller, Get, Param, Patch, Post, Version } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentPrincipal } from '../auth/current-principal.decorator';
import type { AuthenticatedPrincipal } from '../auth/principal';
import { RequirePermissions } from '../authorization/require-permissions.decorator';
import { AddMembershipDto, CreateOrganizationDto, UpdateMembershipDto } from './dto';
import { OrganizationsService } from './organizations.service';

@ApiTags('organizations') @ApiBearerAuth('keycloak') @Controller({ path:'organizations', version:'1' })
export class OrganizationsController {
  constructor(private readonly organizations:OrganizationsService) {}
  @Post() create(@CurrentPrincipal() principal:AuthenticatedPrincipal,@Body() input:CreateOrganizationDto) { return this.organizations.create(principal,input); }
  @Get() list(@CurrentPrincipal() principal:AuthenticatedPrincipal) { return this.organizations.list(principal); }
  @Get(':organizationId') @RequirePermissions('organization.read') get(@Param('organizationId') id:string) { return this.organizations.get(id); }
  @Get(':organizationId/memberships') @RequirePermissions('membership.read') listMembers(@Param('organizationId') id:string) { return this.organizations.listMembers(id); }
  @Post(':organizationId/memberships') @RequirePermissions('membership.manage') addMember(@Param('organizationId') id:string,@Body() input:AddMembershipDto) { return this.organizations.addMember(id,input); }
  @Patch(':organizationId/memberships/:membershipId') @RequirePermissions('membership.manage') updateMember(@Param('organizationId') id:string,@Param('membershipId') membershipId:string,@Body() input:UpdateMembershipDto) { return this.organizations.updateMember(id,membershipId,input); }
}
