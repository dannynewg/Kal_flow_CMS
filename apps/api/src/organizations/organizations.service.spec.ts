import { BadRequestException, ConflictException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { OrganizationsService } from './organizations.service';

describe('OrganizationsService ownership transfer', () => {
  it('changes both roles and records the transfer in one transaction', async () => {
    const owner = { id: 'membership-owner', organizationId: 'organization-1', userId: 'user-owner', role: 'OWNER', status: 'ACTIVE' };
    const target = { id: 'membership-target', organizationId: 'organization-1', userId: 'user-target', role: 'ADMIN', status: 'ACTIVE' };
    const tx = {
      membership: {
        findUnique: vi.fn().mockResolvedValue(owner),
        findFirst: vi.fn().mockResolvedValue(target),
        update: vi.fn()
          .mockResolvedValueOnce({ ...owner, role: 'ADMIN' })
          .mockResolvedValueOnce({ ...target, role: 'OWNER' }),
      },
    };
    const prisma = { client: { $transaction: vi.fn(async (callback: (client: typeof tx) => unknown) => callback(tx)) } };
    const audit = { write: vi.fn().mockResolvedValue({}) };
    const service = new OrganizationsService(prisma as never, audit as never);

    const result = await service.transferOwnership('organization-1', { userId: 'user-owner', subject: 'subject', issuer: 'issuer' }, { membershipId: 'membership-target' });
    expect(tx.membership.update).toHaveBeenNthCalledWith(1, { where: { id: 'membership-owner' }, data: { role: 'ADMIN' } });
    expect(tx.membership.update).toHaveBeenNthCalledWith(2, { where: { id: 'membership-target' }, data: { role: 'OWNER' } });
    expect(audit.write).toHaveBeenCalledOnce();
    expect(result.owner.role).toBe('OWNER');
  });

  it('rejects transferring ownership to the current owner', async () => {
    const owner = { id: 'membership-owner', organizationId: 'organization-1', userId: 'user-owner', role: 'OWNER', status: 'ACTIVE' };
    const tx = { membership: { findUnique: vi.fn().mockResolvedValue(owner) } };
    const prisma = { client: { $transaction: vi.fn(async (callback: (client: typeof tx) => unknown) => callback(tx)) } };
    const service = new OrganizationsService(prisma as never, { write: vi.fn() } as never);
    await expect(service.transferOwnership('organization-1', { userId: 'user-owner', subject: 'subject', issuer: 'issuer' }, { membershipId: 'membership-owner' })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('requires work reassignment before removing a member', async () => {
    const prisma = { client: { membership: { findFirst: vi.fn().mockResolvedValue({ id: 'membership-1', organizationId: 'organization-1', userId: 'user-1', role: 'CONTRACT_MANAGER', _count: { ownedContracts: 1, assignedObligations: 0 } }) } } };
    const service = new OrganizationsService(prisma as never, { write: vi.fn() } as never);
    await expect(service.removeMember('organization-1', 'membership-1', { userId: 'owner-1', subject: 'subject', issuer: 'issuer' })).rejects.toBeInstanceOf(ConflictException);
  });
});
