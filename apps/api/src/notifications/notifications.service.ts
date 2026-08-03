import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { AuthenticatedPrincipal } from '../auth/principal';
import { AuditService } from '../organizations/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateNotificationRuleDto, UpdateNotificationRuleDto } from './dto';

const severityRank = { INFO: 0, WARNING: 1, CRITICAL: 2 } as const;

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService) {}

  listRules(organizationId: string) {
    return this.prisma.client.notificationRule.findMany({ where: { organizationId }, orderBy: [{ enabled: 'desc' }, { createdAt: 'desc' }] });
  }

  async createRule(organizationId: string, principal: AuthenticatedPrincipal, input: CreateNotificationRuleDto) {
    this.validateRecipient(input.channel, input.recipient);
    return this.prisma.client.$transaction(async (tx) => {
      const rule = await tx.notificationRule.create({ data: { organizationId, name: input.name.trim(), channel: input.channel, recipient: input.recipient.trim(), alertTypes: [...new Set(input.alertTypes)], minimumSeverity: input.minimumSeverity, enabled: input.enabled } });
      await this.audit.write(tx, { organizationId, actorUserId: principal.userId, action: 'notification_rule.created', entityType: 'notification_rule', entityId: rule.id, metadata: { channel: rule.channel, alertTypes: rule.alertTypes } });
      return rule;
    });
  }

  async updateRule(organizationId: string, ruleId: string, principal: AuthenticatedPrincipal, input: UpdateNotificationRuleDto) {
    const current = await this.requireRule(organizationId, ruleId);
    const channel = input.channel ?? current.channel; const recipient = input.recipient ?? current.recipient;
    this.validateRecipient(channel, recipient);
    return this.prisma.client.$transaction(async (tx) => {
      const rule = await tx.notificationRule.update({ where: { id: ruleId }, data: { name: input.name?.trim(), channel: input.channel, recipient: input.recipient?.trim(), alertTypes: input.alertTypes ? [...new Set(input.alertTypes)] : undefined, minimumSeverity: input.minimumSeverity, enabled: input.enabled } });
      await this.audit.write(tx, { organizationId, actorUserId: principal.userId, action: 'notification_rule.updated', entityType: 'notification_rule', entityId: rule.id, metadata: { enabled: rule.enabled, channel: rule.channel } });
      return rule;
    });
  }

  async removeRule(organizationId: string, ruleId: string, principal: AuthenticatedPrincipal) {
    const current = await this.requireRule(organizationId, ruleId);
    await this.prisma.client.$transaction(async (tx) => {
      await this.audit.write(tx, { organizationId, actorUserId: principal.userId, action: 'notification_rule.deleted', entityType: 'notification_rule', entityId: ruleId, metadata: { name: current.name, channel: current.channel } });
      await tx.notificationRule.delete({ where: { id: ruleId } });
    });
    return { deleted: true };
  }

  async deliveries(organizationId: string) {
    await this.reconcile(organizationId);
    return this.prisma.client.notificationDelivery.findMany({ where: { organizationId }, include: { rule: { select: { name: true } }, alert: { select: { type: true, severity: true, dueAt: true, contract: { select: { contractNumber: true, title: true } } } } }, orderBy: { createdAt: 'desc' }, take: 100 });
  }

  async retry(organizationId: string, deliveryId: string, principal: AuthenticatedPrincipal) {
    const delivery = await this.prisma.client.notificationDelivery.findFirst({ where: { id: deliveryId, organizationId } });
    if (!delivery) throw new NotFoundException('Notification delivery not found');
    const updated = await this.prisma.client.notificationDelivery.update({ where: { id: deliveryId }, data: { status: 'PENDING', lastError: null } });
    await this.audit.write(this.prisma.client, { organizationId, actorUserId: principal.userId, action: 'notification_delivery.retried', entityType: 'notification_delivery', entityId: deliveryId });
    return updated;
  }

  async reconcile(organizationId: string) {
    const [rules, alerts] = await Promise.all([
      this.prisma.client.notificationRule.findMany({ where: { organizationId, enabled: true } }),
      this.prisma.client.operationalAlert.findMany({ where: { organizationId, status: { not: 'RESOLVED' } }, include: { contract: { select: { contractNumber: true, title: true } } } }),
    ]);
    for (const rule of rules) for (const alert of alerts) {
      if (!rule.alertTypes.includes(alert.type) || severityRank[alert.severity] < severityRank[rule.minimumSeverity]) continue;
      const subject = `[Kal_flow] ${alert.severity}: ${alert.title}`;
      const body = `${alert.contract.contractNumber} — ${alert.contract.title}\n${alert.type.replaceAll('_', ' ')} is due ${alert.dueAt.toISOString().slice(0, 10)}. Open Kal_flow to review and acknowledge it.`;
      await this.prisma.client.notificationDelivery.upsert({ where: { ruleId_alertId: { ruleId: rule.id, alertId: alert.id } }, create: { organizationId, ruleId: rule.id, alertId: alert.id, channel: rule.channel, recipient: rule.recipient, subject, body }, update: {} });
    }
  }

  private async requireRule(organizationId: string, ruleId: string) {
    const rule = await this.prisma.client.notificationRule.findFirst({ where: { id: ruleId, organizationId } });
    if (!rule) throw new NotFoundException('Notification rule not found');
    return rule;
  }

  private validateRecipient(channel: 'EMAIL' | 'SMS', recipient: string) {
    const valid = channel === 'EMAIL' ? /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient) : /^\+[1-9]\d{7,14}$/.test(recipient);
    if (!valid) throw new BadRequestException(channel === 'EMAIL' ? 'Enter a valid email address' : 'Enter an SMS number in international format, for example +251911234567');
  }
}
