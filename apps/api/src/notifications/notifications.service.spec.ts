import { BadRequestException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { NotificationsService } from './notifications.service';

const principal = { userId: 'user-1', subject: 'subject-1', issuer: 'issuer' };

function serviceWith(client: Record<string, unknown>) {
  const audit = { write: vi.fn().mockResolvedValue({}) };
  return { service: new NotificationsService({ client } as never, audit as never), audit };
}

describe('NotificationsService', () => {
  it('rejects an SMS recipient outside international format', async () => {
    const { service } = serviceWith({});
    await expect(service.createRule('org-1', principal, { name: 'SMS expiry', channel: 'SMS', recipient: '0911000000', alertTypes: ['CONTRACT_EXPIRY'], minimumSeverity: 'WARNING' } as never)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('creates at most one delivery for each rule and alert pair', async () => {
    const upsert = vi.fn().mockResolvedValue({});
    const client = {
      notificationRule: { findMany: vi.fn().mockResolvedValue([{ id: 'rule-1', channel: 'EMAIL', recipient: 'legal@example.com', alertTypes: ['CONTRACT_EXPIRY'], minimumSeverity: 'WARNING' }]) },
      operationalAlert: { findMany: vi.fn().mockResolvedValue([{ id: 'alert-1', type: 'CONTRACT_EXPIRY', severity: 'CRITICAL', title: 'Expiry', dueAt: new Date('2026-09-01'), contract: { contractNumber: 'CON-1', title: 'Lease' } }]) },
      notificationDelivery: { upsert },
    };
    const { service } = serviceWith(client);
    await service.reconcile('org-1');
    expect(upsert).toHaveBeenCalledOnce();
    expect(upsert).toHaveBeenCalledWith(expect.objectContaining({ where: { ruleId_alertId: { ruleId: 'rule-1', alertId: 'alert-1' } }, create: expect.objectContaining({ organizationId: 'org-1', channel: 'EMAIL' }) }));
  });
});
