import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { alertSeverity, daysUntil, OperationsService } from './operations.service';

const principal = { userId: 'user-1', subject: 'subject-1', issuer: 'issuer', email: 'owner@example.com' };
const serviceWith = (client: Record<string, unknown>) => new OperationsService({ client } as never, { write: vi.fn().mockResolvedValue({}) } as never);

describe('OperationsService', () => {
  it('classifies overdue and near-term operational dates', () => {
    const now = new Date('2026-08-03T00:00:00Z');
    expect(daysUntil(new Date('2026-08-02T00:00:00Z'), now)).toBe(-1);
    expect(alertSeverity(-1)).toBe('CRITICAL');
    expect(alertSeverity(7)).toBe('WARNING');
    expect(alertSeverity(30)).toBe('INFO');
  });

  it('rejects an obligation owner outside the active organization', async () => {
    const client = { contract: { findFirst: vi.fn().mockResolvedValue({ id: 'contract-1' }) }, membership: { findFirst: vi.fn().mockResolvedValue(null) } };
    await expect(serviceWith(client).createObligation('org-1', 'contract-1', principal, { ownerMembershipId: 'member-1', kind: 'OBLIGATION', title: 'Submit monthly report', dueDate: '2026-09-01', priority: 'HIGH' })).rejects.toBeInstanceOf(NotFoundException);
  });

  it('prevents editing a completed obligation', async () => {
    const client = { contractObligation: { findFirst: vi.fn().mockResolvedValue({ id: 'obligation-1', status: 'COMPLETED' }) } };
    await expect(serviceWith(client).updateObligation('org-1', 'obligation-1', principal, { title: 'Changed title' })).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects a renewal notice deadline after renewal', async () => {
    const client = { contract: { findFirst: vi.fn().mockResolvedValue({ id: 'contract-1', status: 'ACTIVE' }) } };
    await expect(serviceWith(client).upsertRenewal('org-1', 'contract-1', principal, { renewalType: 'MANUAL_RENEW', renewalDate: '2026-09-01', noticeDeadline: '2026-09-02' })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('requires a final renewal decision', async () => {
    await expect(serviceWith({}).decideRenewal('org-1', 'renewal-1', principal, { decision: 'PENDING' })).rejects.toBeInstanceOf(BadRequestException);
  });
});
