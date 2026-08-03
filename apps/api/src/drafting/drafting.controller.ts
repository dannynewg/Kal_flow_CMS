import { Body, Controller, Get, Param, ParseIntPipe, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentPrincipal } from '../auth/current-principal.decorator';
import type { AuthenticatedPrincipal } from '../auth/principal';
import { RequirePermissions } from '../authorization/require-permissions.decorator';
import { CreateClauseDto, CreateTemplateDto, InstantiateTemplateDto } from './dto';
import { DraftingService } from './drafting.service';

@ApiTags('contract drafting library')
@ApiBearerAuth('keycloak')
@Controller({ path: 'organizations/:organizationId', version: '1' })
export class DraftingController {
  constructor(private readonly drafting: DraftingService) {}

  @Get('clause-library') @RequirePermissions('library.read')
  clauses(@Param('organizationId') organizationId: string, @Query('query') query?: string, @Query('category') category?: string) { return this.drafting.listClauses(organizationId, query, category); }

  @Post('clause-library') @RequirePermissions('library.manage')
  createClause(@Param('organizationId') organizationId: string, @CurrentPrincipal() principal: AuthenticatedPrincipal, @Body() input: CreateClauseDto) { return this.drafting.createClause(organizationId, principal, input); }

  @Get('contract-templates') @RequirePermissions('library.read')
  templates(@Param('organizationId') organizationId: string) { return this.drafting.listTemplates(organizationId); }

  @Post('contract-templates') @RequirePermissions('library.manage')
  createTemplate(@Param('organizationId') organizationId: string, @CurrentPrincipal() principal: AuthenticatedPrincipal, @Body() input: CreateTemplateDto) { return this.drafting.createTemplate(organizationId, principal, input); }

  @Post('contracts/:contractId/draft-from-template') @RequirePermissions('contract.manage')
  instantiate(@Param('organizationId') organizationId: string, @Param('contractId') contractId: string, @CurrentPrincipal() principal: AuthenticatedPrincipal, @Body() input: InstantiateTemplateDto) { return this.drafting.instantiate(organizationId, contractId, principal, input); }

  @Get('contracts/:contractId/versions/compare') @RequirePermissions('contract.read')
  compare(@Param('organizationId') organizationId: string, @Param('contractId') contractId: string, @Query('fromVersion', ParseIntPipe) fromVersion: number, @Query('toVersion', ParseIntPipe) toVersion: number) { return this.drafting.compareVersions(organizationId, contractId, fromVersion, toVersion); }
}
