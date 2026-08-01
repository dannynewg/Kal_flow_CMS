import { ForbiddenException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { AuthorizationGuard } from './authorization.guard';

const contextFor = (organizationId: string) => {
  const request = { params: { organizationId }, headers: {}, principal: { userId: 'user-1' } };
  return {
    request,
    context: {
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({ getRequest: () => request }),
    },
  };
};

describe('AuthorizationGuard tenant isolation', () => {
  it('rejects access when no membership exists in the requested organization', async () => {
    const reflector = { getAllAndOverride: vi.fn().mockReturnValue(['department.read']) };
    const prisma = { client: { membership: { findUnique: vi.fn().mockResolvedValue(null) } } };
    const guard = new AuthorizationGuard(reflector as never, prisma as never);
    const { context } = contextFor('other-organization');
    await expect(guard.canActivate(context as never)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('attaches the active tenant membership when its role has permission', async () => {
    const reflector = { getAllAndOverride: vi.fn().mockReturnValue(['department.read']) };
    const prisma = { client: { membership: { findUnique: vi.fn().mockResolvedValue({ id: 'membership-1', organizationId: 'organization-1', role: 'VIEWER', status: 'ACTIVE', organization: { status: 'ACTIVE' } }) } } };
    const guard = new AuthorizationGuard(reflector as never, prisma as never);
    const { context, request } = contextFor('organization-1');
    await expect(guard.canActivate(context as never)).resolves.toBe(true);
    expect((request as Record<string, unknown>).membership).toEqual({ id: 'membership-1', organizationId: 'organization-1', role: 'VIEWER' });
  });
});
