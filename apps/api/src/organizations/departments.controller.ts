import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentPrincipal } from '../auth/current-principal.decorator';
import type { AuthenticatedPrincipal } from '../auth/principal';
import { RequirePermissions } from '../authorization/require-permissions.decorator';
import { DepartmentsService } from './departments.service';
import { AssignDepartmentMemberDto, CreateDepartmentDto, UpdateDepartmentDto } from './dto';

@ApiTags('departments')
@ApiBearerAuth('keycloak')
@Controller({ path: 'organizations/:organizationId/departments', version: '1' })
export class DepartmentsController {
  constructor(private readonly departments: DepartmentsService) {}

  @Get() @RequirePermissions('department.read')
  list(@Param('organizationId') organizationId: string) { return this.departments.list(organizationId); }

  @Post() @RequirePermissions('department.manage')
  create(@Param('organizationId') organizationId: string, @CurrentPrincipal() principal: AuthenticatedPrincipal, @Body() input: CreateDepartmentDto) {
    return this.departments.create(organizationId, principal, input);
  }

  @Patch(':departmentId') @RequirePermissions('department.manage')
  update(@Param('organizationId') organizationId: string, @Param('departmentId') departmentId: string, @CurrentPrincipal() principal: AuthenticatedPrincipal, @Body() input: UpdateDepartmentDto) {
    return this.departments.update(organizationId, departmentId, principal, input);
  }

  @Delete(':departmentId') @RequirePermissions('department.manage')
  remove(@Param('organizationId') organizationId: string, @Param('departmentId') departmentId: string, @CurrentPrincipal() principal: AuthenticatedPrincipal) {
    return this.departments.remove(organizationId, departmentId, principal);
  }

  @Get(':departmentId/memberships') @RequirePermissions('department.read')
  listMembers(@Param('organizationId') organizationId: string, @Param('departmentId') departmentId: string) {
    return this.departments.listMembers(organizationId, departmentId);
  }

  @Post(':departmentId/memberships') @RequirePermissions('department.manage')
  assignMember(@Param('organizationId') organizationId: string, @Param('departmentId') departmentId: string, @CurrentPrincipal() principal: AuthenticatedPrincipal, @Body() input: AssignDepartmentMemberDto) {
    return this.departments.assignMember(organizationId, departmentId, principal, input);
  }

  @Delete(':departmentId/memberships/:membershipId') @RequirePermissions('department.manage')
  removeMember(@Param('organizationId') organizationId: string, @Param('departmentId') departmentId: string, @Param('membershipId') membershipId: string, @CurrentPrincipal() principal: AuthenticatedPrincipal) {
    return this.departments.removeMember(organizationId, departmentId, membershipId, principal);
  }
}
