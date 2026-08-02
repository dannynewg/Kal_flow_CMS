import { BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { ContractsService } from './contracts.service';

const principal = { userId: 'user-1', subject: 'subject-1', issuer: 'issuer', email: 'owner@example.com' };

function serviceWith(client: Record<string, unknown>) {
  const prisma = { client };
  const audit = { write: vi.fn().mockResolvedValue({}) };
  return { service: new ContractsService(prisma as never, audit as never), audit };
}

describe('ContractsService workflow invariants', () => {
  it('allows only the requester to submit a draft', async () => {
    const client = { contractRequest: { findFirst: vi.fn().mockResolvedValue({ id: 'request-1', organizationId: 'org-1', requesterUserId: 'user-2', status: 'DRAFT' }) } };
    const { service } = serviceWith(client);
    await expect(service.submitRequest('org-1', 'request-1', principal)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects submission after the request leaves draft', async () => {
    const client = { contractRequest: { findFirst: vi.fn().mockResolvedValue({ id: 'request-1', organizationId: 'org-1', requesterUserId: 'user-1', status: 'SUBMITTED' }) } };
    const { service } = serviceWith(client);
    await expect(service.submitRequest('org-1', 'request-1', principal)).rejects.toBeInstanceOf(ConflictException);
  });

  it('prevents the requester from cancelling after triage', async () => {
    const client = { contractRequest: { findFirst: vi.fn().mockResolvedValue({ id: 'request-1', organizationId: 'org-1', requesterUserId: 'user-1', status: 'TRIAGED' }) } };
    const { service } = serviceWith(client);
    await expect(service.cancelRequest('org-1', 'request-1', principal)).rejects.toBeInstanceOf(ConflictException);
  });

  it('returns the existing contract when conversion is retried', async () => {
    const existing = { id: 'contract-1', valueMinor: 12500n, contractNumber: 'KF-CON-2026-001' };
    const tx = {
      contractRequest: { findFirst: vi.fn().mockResolvedValue({ id: 'request-1', status: 'CONVERTED' }) },
      contract: { findUnique: vi.fn().mockResolvedValue(existing) },
    };
    const client = {
      membership: { findFirst: vi.fn().mockResolvedValue({ id: 'member-1', userId: 'user-1' }) },
      $transaction: (callback: (value: typeof tx) => unknown) => callback(tx),
    };
    const { service, audit } = serviceWith(client);
    await expect(service.convertRequest('org-1', 'request-1', principal, { ownerMembershipId: 'member-1' })).resolves.toMatchObject({ id: 'contract-1', valueMinor: '12500' });
    expect(audit.write).not.toHaveBeenCalled();
  });

  it('requires a draft version before review starts', async () => {
    const tx = { contract: { findFirst: vi.fn().mockResolvedValue({ id: 'contract-1', status: 'DRAFT', _count: { versions: 0 } }) } };
    const client = { $transaction: (callback: (value: typeof tx) => unknown) => callback(tx) };
    const { service } = serviceWith(client);
    await expect(service.startReview('org-1', 'contract-1', principal, { steps: [{ name: 'Legal', requiredRole: 'LEGAL_OFFICER' }] })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('enforces the assigned review role', async () => {
    const tx = {
      contract: { findFirst: vi.fn().mockResolvedValue({ id: 'contract-1', status: 'IN_REVIEW' }) },
      contractReviewStep: { findFirst: vi.fn().mockResolvedValue({ id: 'step-1', contractId: 'contract-1', status: 'PENDING', requiredRole: 'LEGAL_OFFICER', assignedUserId: null }) },
      membership: { findUnique: vi.fn().mockResolvedValue({ userId: 'user-1', status: 'ACTIVE', role: 'FINANCE_OFFICER' }) },
    };
    const client = { $transaction: (callback: (value: typeof tx) => unknown) => callback(tx) };
    const { service } = serviceWith(client);
    await expect(service.decideReviewStep('org-1', 'contract-1', 'step-1', principal, { decision: 'APPROVED' })).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('preserves a change decision and skips later steps in its review round', async () => {
    const tx = {
      contract: { findFirst: vi.fn().mockResolvedValue({ id: 'contract-1', status: 'IN_REVIEW' }), update: vi.fn().mockResolvedValue({}) },
      contractReviewStep: {
        findFirst: vi.fn().mockResolvedValue({ id: 'step-1', contractId: 'contract-1', round: 2, sequence: 1, status: 'PENDING', requiredRole: 'LEGAL_OFFICER', assignedUserId: 'user-1' }),
        count: vi.fn().mockResolvedValue(0),
        update: vi.fn().mockResolvedValue({ id: 'step-1', status: 'CHANGES_REQUESTED' }),
        updateMany: vi.fn().mockResolvedValue({ count: 2 }),
      },
      membership: { findUnique: vi.fn().mockResolvedValue({ userId: 'user-1', status: 'ACTIVE', role: 'LEGAL_OFFICER' }) },
      auditEvent: { create: vi.fn().mockResolvedValue({}) },
    };
    const client = { $transaction: (callback: (value: typeof tx) => unknown) => callback(tx) };
    const { service } = serviceWith(client);
    await expect(service.decideReviewStep('org-1', 'contract-1', 'step-1', principal, { decision: 'CHANGES_REQUESTED', comment: 'Revise liability cap' })).resolves.toMatchObject({ contractStatus: 'CHANGES_REQUESTED' });
    expect(tx.contractReviewStep.updateMany).toHaveBeenCalledWith({ where: { contractId: 'contract-1', round: 2, sequence: { gt: 1 }, status: 'PENDING' }, data: { status: 'SKIPPED' } });
  });

  it('rejects an expiration date before the effective date', async () => {
    const { service } = serviceWith({});
    await expect(service.activate('org-1', 'contract-1', principal, { effectiveDate: '2026-09-01', expirationDate: '2026-08-01' })).rejects.toBeInstanceOf(BadRequestException);
  });
});
