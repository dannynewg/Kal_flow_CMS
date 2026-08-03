import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { AuthenticatedPrincipal } from '../auth/principal';
import { AuditService } from '../organizations/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import type { CompleteObligationDto, CreateObligationDto, DecideRenewalDto, UpdateObligationDto, UpsertRenewalDto } from './dto';

const day = 86_400_000;
export const daysUntil = (date: Date, now = new Date()) => Math.ceil((date.getTime() - now.getTime()) / day);
export const alertSeverity = (days: number) => days < 0 ? 'CRITICAL' as const : days <= 7 ? 'WARNING' as const : 'INFO' as const;

@Injectable()
export class OperationsService {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService) {}

  async listObligations(organizationId: string) {
    return this.prisma.client.contractObligation.findMany({
      where: { organizationId },
      include: { contract: { select: { id: true, contractNumber: true, title: true, department: { select: { id: true, code: true, name: true } } } }, owner: { include: { user: { select: { id: true, email: true, displayName: true } } } } },
      orderBy: [{ status: 'asc' }, { dueDate: 'asc' }],
    });
  }

  async createObligation(organizationId: string, contractId: string, principal: AuthenticatedPrincipal, input: CreateObligationDto) {
    const [contract, owner] = await Promise.all([
      this.prisma.client.contract.findFirst({ where: { id: contractId, organizationId, status: { not: 'CANCELLED' } } }),
      this.prisma.client.membership.findFirst({ where: { id: input.ownerMembershipId, organizationId, status: 'ACTIVE' } }),
    ]);
    if (!contract) throw new NotFoundException('Contract not found');
    if (!owner) throw new NotFoundException('Active obligation owner not found');
    return this.prisma.client.$transaction(async (tx) => {
      const obligation = await tx.contractObligation.create({ data: {
        organizationId, contractId, ownerMembershipId: owner.id, kind: input.kind,
        title: input.title.trim(), description: input.description?.trim(), dueDate: new Date(input.dueDate),
        priority: input.priority, reminderDays: [...new Set(input.reminderDays ?? [30, 14, 7])].sort((a, b) => b - a),
      } });
      await this.audit.write(tx, { organizationId, actorUserId: principal.userId, action: 'obligation.created', entityType: 'contract_obligation', entityId: obligation.id, metadata: { contractId, dueDate: input.dueDate, kind: input.kind } });
      return obligation;
    });
  }

  async updateObligation(organizationId: string, obligationId: string, principal: AuthenticatedPrincipal, input: UpdateObligationDto) {
    const current = await this.requireObligation(organizationId, obligationId);
    if (['COMPLETED', 'WAIVED'].includes(current.status)) throw new ConflictException('Completed or waived obligations cannot be edited');
    if (input.ownerMembershipId) {
      const owner = await this.prisma.client.membership.findFirst({ where: { id: input.ownerMembershipId, organizationId, status: 'ACTIVE' } });
      if (!owner) throw new NotFoundException('Active obligation owner not found');
    }
    return this.prisma.client.$transaction(async (tx) => {
      const obligation = await tx.contractObligation.update({ where: { id: obligationId }, data: {
        ...(input.ownerMembershipId ? { ownerMembershipId: input.ownerMembershipId } : {}),
        ...(input.title ? { title: input.title.trim() } : {}), ...(input.description !== undefined ? { description: input.description.trim() } : {}),
        ...(input.dueDate ? { dueDate: new Date(input.dueDate) } : {}), ...(input.priority ? { priority: input.priority } : {}),
        ...(input.status ? { status: input.status } : {}),
      } });
      await this.audit.write(tx, { organizationId, actorUserId: principal.userId, action: 'obligation.updated', entityType: 'contract_obligation', entityId: obligationId });
      return obligation;
    });
  }

  async completeObligation(organizationId: string, obligationId: string, principal: AuthenticatedPrincipal, input: CompleteObligationDto) {
    const current = await this.requireObligation(organizationId, obligationId);
    if (current.status === 'COMPLETED') return current;
    if (current.status === 'WAIVED') throw new ConflictException('A waived obligation cannot be completed');
    return this.prisma.client.$transaction(async (tx) => {
      const obligation = await tx.contractObligation.update({ where: { id: obligationId }, data: { status: 'COMPLETED', completedAt: new Date(), completedByUserId: principal.userId, completionNote: input.note?.trim() } });
      await tx.operationalAlert.updateMany({ where: { obligationId, status: { not: 'RESOLVED' } }, data: { status: 'RESOLVED' } });
      await this.audit.write(tx, { organizationId, actorUserId: principal.userId, action: 'obligation.completed', entityType: 'contract_obligation', entityId: obligationId, metadata: { contractId: current.contractId } });
      return obligation;
    });
  }

  async removeObligation(organizationId: string, obligationId: string, principal: AuthenticatedPrincipal) {
    const obligation = await this.requireObligation(organizationId, obligationId);
    if (obligation.status === 'COMPLETED') throw new ConflictException('Completed obligations are retained for auditability');
    await this.prisma.client.$transaction(async (tx) => { await this.audit.write(tx, { organizationId, actorUserId: principal.userId, action: 'obligation.deleted', entityType: 'contract_obligation', entityId: obligationId, metadata: { contractId: obligation.contractId, title: obligation.title } }); await tx.contractObligation.delete({ where: { id: obligationId } }); });
    return { deleted: true };
  }

  async upsertRenewal(organizationId: string, contractId: string, principal: AuthenticatedPrincipal, input: UpsertRenewalDto) {
    const contract = await this.prisma.client.contract.findFirst({ where: { id: contractId, organizationId, status: { in: ['APPROVED', 'ACTIVE'] } } });
    if (!contract) throw new NotFoundException('Approved or active contract not found');
    const renewalDate = new Date(input.renewalDate);
    const noticeDeadline = input.noticeDeadline ? new Date(input.noticeDeadline) : input.noticePeriodDays !== undefined ? new Date(renewalDate.getTime() - input.noticePeriodDays * day) : null;
    if (noticeDeadline && noticeDeadline > renewalDate) throw new BadRequestException('Notice deadline cannot follow the renewal date');
    return this.prisma.client.$transaction(async (tx) => {
      const renewal = await tx.contractRenewal.upsert({ where: { contractId }, create: { organizationId, contractId, renewalType: input.renewalType, renewalDate, noticeDeadline, noticePeriodDays: input.noticePeriodDays }, update: { renewalType: input.renewalType, renewalDate, noticeDeadline, noticePeriodDays: input.noticePeriodDays } });
      await this.audit.write(tx, { organizationId, actorUserId: principal.userId, action: 'renewal.configured', entityType: 'contract_renewal', entityId: renewal.id, metadata: { contractId, renewalDate: input.renewalDate, noticeDeadline: noticeDeadline?.toISOString() ?? null } });
      return renewal;
    });
  }

  async decideRenewal(organizationId: string, renewalId: string, principal: AuthenticatedPrincipal, input: DecideRenewalDto) {
    if (input.decision === 'PENDING') throw new BadRequestException('Select a final renewal decision');
    const renewal = await this.prisma.client.contractRenewal.findFirst({ where: { id: renewalId, organizationId } });
    if (!renewal) throw new NotFoundException('Renewal record not found');
    return this.prisma.client.$transaction(async (tx) => {
      const decided = await tx.contractRenewal.update({ where: { id: renewalId }, data: { decision: input.decision, decisionNote: input.note?.trim(), decisionAt: new Date(), decidedByUserId: principal.userId } });
      await tx.operationalAlert.updateMany({ where: { renewalId, type: 'NOTICE_DEADLINE', status: { not: 'RESOLVED' } }, data: { status: 'RESOLVED' } });
      await this.audit.write(tx, { organizationId, actorUserId: principal.userId, action: 'renewal.decided', entityType: 'contract_renewal', entityId: renewalId, metadata: { contractId: renewal.contractId, decision: input.decision } });
      return decided;
    });
  }

  async removeRenewal(organizationId: string, renewalId: string, principal: AuthenticatedPrincipal) {
    const renewal = await this.prisma.client.contractRenewal.findFirst({ where: { id: renewalId, organizationId } });
    if (!renewal) throw new NotFoundException('Renewal record not found');
    if (renewal.decision !== 'PENDING') throw new ConflictException('Decided renewals are retained for auditability');
    await this.prisma.client.$transaction(async (tx) => { await this.audit.write(tx, { organizationId, actorUserId: principal.userId, action: 'renewal.deleted', entityType: 'contract_renewal', entityId: renewalId, metadata: { contractId: renewal.contractId } }); await tx.contractRenewal.delete({ where: { id: renewalId } }); });
    return { deleted: true };
  }

  async listRenewals(organizationId: string) {
    return this.prisma.client.contractRenewal.findMany({ where: { organizationId }, include: { contract: { select: { id: true, contractNumber: true, title: true, expirationDate: true, department: { select: { id: true, code: true, name: true } } } }, decidedBy: { select: { displayName: true, email: true } } }, orderBy: { renewalDate: 'asc' } });
  }

  async listAlerts(organizationId: string) {
    await this.reconcileAlerts(organizationId);
    return this.prisma.client.operationalAlert.findMany({ where: { organizationId, status: { not: 'RESOLVED' } }, include: { contract: { select: { id: true, contractNumber: true, title: true } }, obligation: { select: { id: true, kind: true, priority: true } } }, orderBy: [{ status: 'asc' }, { severity: 'desc' }, { dueAt: 'asc' }] });
  }

  async acknowledgeAlert(organizationId: string, alertId: string, principal: AuthenticatedPrincipal) {
    const alert = await this.prisma.client.operationalAlert.findFirst({ where: { id: alertId, organizationId } });
    if (!alert) throw new NotFoundException('Operational alert not found');
    if (alert.status === 'RESOLVED') throw new ConflictException('Resolved alerts cannot be acknowledged');
    return this.prisma.client.$transaction(async (tx) => {
      const acknowledged = await tx.operationalAlert.update({ where: { id: alertId }, data: { status: 'ACKNOWLEDGED', acknowledgedAt: new Date(), acknowledgedByUserId: principal.userId } });
      await this.audit.write(tx, { organizationId, actorUserId: principal.userId, action: 'operational_alert.acknowledged', entityType: 'operational_alert', entityId: alertId, metadata: { contractId: alert.contractId, type: alert.type } });
      return acknowledged;
    });
  }

  async report(organizationId: string) {
    await this.reconcileAlerts(organizationId);
    const [obligations, renewals, alerts, contracts] = await Promise.all([
      this.prisma.client.contractObligation.findMany({ where: { organizationId }, include: { contract: { select: { department: { select: { code: true, name: true } } } } } }),
      this.prisma.client.contractRenewal.findMany({ where: { organizationId } }),
      this.prisma.client.operationalAlert.findMany({ where: { organizationId, status: { not: 'RESOLVED' } } }),
      this.prisma.client.contract.findMany({ where: { organizationId, status: 'ACTIVE' }, select: { expirationDate: true } }),
    ]);
    const now = new Date(); const in30 = new Date(now.getTime() + 30 * day); const in90 = new Date(now.getTime() + 90 * day);
    const departmentMap = new Map<string, { code: string; name: string; total: number; completed: number; overdue: number }>();
    for (const item of obligations) { const key = item.contract.department.code; const row = departmentMap.get(key) ?? { ...item.contract.department, total: 0, completed: 0, overdue: 0 }; row.total++; if (item.status === 'COMPLETED') row.completed++; if (!['COMPLETED', 'WAIVED'].includes(item.status) && item.dueDate < now) row.overdue++; departmentMap.set(key, row); }
    const completed = obligations.filter((item) => item.status === 'COMPLETED').length;
    return {
      generatedAt: now.toISOString(),
      summary: { totalObligations: obligations.length, completed, completionRate: obligations.length ? Math.round(completed / obligations.length * 100) : 0, overdue: obligations.filter((item) => !['COMPLETED', 'WAIVED'].includes(item.status) && item.dueDate < now).length, dueNext30Days: obligations.filter((item) => !['COMPLETED', 'WAIVED'].includes(item.status) && item.dueDate >= now && item.dueDate <= in30).length, pendingRenewals: renewals.filter((item) => item.decision === 'PENDING').length, noticeDeadlinesNext30Days: renewals.filter((item) => item.decision === 'PENDING' && item.noticeDeadline && item.noticeDeadline >= now && item.noticeDeadline <= in30).length, expiringNext90Days: contracts.filter((item) => item.expirationDate && item.expirationDate >= now && item.expirationDate <= in90).length, openAlerts: alerts.filter((item) => item.status === 'OPEN').length, criticalAlerts: alerts.filter((item) => item.severity === 'CRITICAL').length },
      byDepartment: [...departmentMap.values()].sort((a, b) => b.overdue - a.overdue || b.total - a.total),
      byPriority: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((priority) => ({ priority, count: obligations.filter((item) => item.priority === priority && !['COMPLETED', 'WAIVED'].includes(item.status)).length })),
    };
  }

  private async reconcileAlerts(organizationId: string) {
    const now = new Date(); const horizon = new Date(now.getTime() + 90 * day);
    const [obligations, renewals, contracts] = await Promise.all([
      this.prisma.client.contractObligation.findMany({ where: { organizationId, status: { in: ['OPEN', 'IN_PROGRESS'] }, dueDate: { lte: horizon } } }),
      this.prisma.client.contractRenewal.findMany({ where: { organizationId, decision: 'PENDING', OR: [{ noticeDeadline: { lte: horizon } }, { renewalDate: { lte: horizon } }] } }),
      this.prisma.client.contract.findMany({ where: { organizationId, status: 'ACTIVE', expirationDate: { lte: horizon } }, select: { id: true, contractNumber: true, title: true, expirationDate: true } }),
    ]);
    const alerts: { organizationId: string; contractId: string; obligationId?: string; renewalId?: string; dedupeKey: string; type: 'OBLIGATION_DUE' | 'OBLIGATION_OVERDUE' | 'NOTICE_DEADLINE' | 'CONTRACT_EXPIRY'; severity: 'INFO' | 'WARNING' | 'CRITICAL'; title: string; dueAt: Date }[] = [];
    for (const item of obligations) { const days = daysUntil(item.dueDate, now); if (days <= Math.max(...item.reminderDays, 0)) alerts.push({ organizationId, contractId: item.contractId, obligationId: item.id, dedupeKey: `obligation:${item.id}:schedule`, type: days < 0 ? 'OBLIGATION_OVERDUE' : 'OBLIGATION_DUE', severity: alertSeverity(days), title: item.title, dueAt: item.dueDate }); }
    for (const item of renewals) if (item.noticeDeadline) { const days = daysUntil(item.noticeDeadline, now); if (days <= 30) alerts.push({ organizationId, contractId: item.contractId, renewalId: item.id, dedupeKey: `renewal:${item.id}:notice`, type: 'NOTICE_DEADLINE', severity: alertSeverity(days), title: 'Renewal notice decision required', dueAt: item.noticeDeadline }); }
    for (const item of contracts) if (item.expirationDate) { const days = daysUntil(item.expirationDate, now); alerts.push({ organizationId, contractId: item.id, dedupeKey: `contract:${item.id}:expiry`, type: 'CONTRACT_EXPIRY', severity: alertSeverity(days), title: `${item.contractNumber} · ${item.title}`, dueAt: item.expirationDate }); }
    await Promise.all(alerts.map((alert) => this.prisma.client.operationalAlert.upsert({ where: { dedupeKey: alert.dedupeKey }, create: alert, update: { type: alert.type, severity: alert.severity, title: alert.title, dueAt: alert.dueAt } })));
  }

  private async requireObligation(organizationId: string, obligationId: string) {
    const obligation = await this.prisma.client.contractObligation.findFirst({ where: { id: obligationId, organizationId } });
    if (!obligation) throw new NotFoundException('Contract obligation not found');
    return obligation;
  }
}
