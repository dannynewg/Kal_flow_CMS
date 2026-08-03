import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentPrincipal } from '../auth/current-principal.decorator';
import type { AuthenticatedPrincipal } from '../auth/principal';
import { RequirePermissions } from '../authorization/require-permissions.decorator';
import { CreateNotificationRuleDto, UpdateNotificationRuleDto } from './dto';
import { NotificationsService } from './notifications.service';

@ApiTags('notifications')
@ApiBearerAuth('keycloak')
@Controller({ path: 'organizations/:organizationId/notifications', version: '1' })
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get('rules') @RequirePermissions('notification.read')
  rules(@Param('organizationId') organizationId: string) { return this.notifications.listRules(organizationId); }

  @Post('rules') @RequirePermissions('notification.manage')
  create(@Param('organizationId') organizationId: string, @CurrentPrincipal() principal: AuthenticatedPrincipal, @Body() input: CreateNotificationRuleDto) { return this.notifications.createRule(organizationId, principal, input); }

  @Patch('rules/:ruleId') @RequirePermissions('notification.manage')
  update(@Param('organizationId') organizationId: string, @Param('ruleId') ruleId: string, @CurrentPrincipal() principal: AuthenticatedPrincipal, @Body() input: UpdateNotificationRuleDto) { return this.notifications.updateRule(organizationId, ruleId, principal, input); }

  @Delete('rules/:ruleId') @RequirePermissions('notification.manage')
  remove(@Param('organizationId') organizationId: string, @Param('ruleId') ruleId: string, @CurrentPrincipal() principal: AuthenticatedPrincipal) { return this.notifications.removeRule(organizationId, ruleId, principal); }

  @Get('deliveries') @RequirePermissions('notification.read')
  deliveries(@Param('organizationId') organizationId: string) { return this.notifications.deliveries(organizationId); }

  @Post('deliveries/:deliveryId/retry') @RequirePermissions('notification.manage')
  retry(@Param('organizationId') organizationId: string, @Param('deliveryId') deliveryId: string, @CurrentPrincipal() principal: AuthenticatedPrincipal) { return this.notifications.retry(organizationId, deliveryId, principal); }
}
