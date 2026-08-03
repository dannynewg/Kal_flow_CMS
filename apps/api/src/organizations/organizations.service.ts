import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type { AuthenticatedPrincipal } from '../auth/principal';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from './audit.service';
import type { AddMembershipDto, CreateOrganizationDto, TransferOwnershipDto, UpdateMembershipDto, UpdateOrganizationDto } from './dto';

@Injectable()
export class OrganizationsService {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService) {}

  async create(principal: AuthenticatedPrincipal, input: CreateOrganizationDto) {
    try {
      return await this.prisma.client.$transaction(async (tx) => {
        const organization = await tx.organization.create({ data: { name: input.name.trim(), slug: input.slug } });
        const membership = await tx.membership.create({ data: { organizationId: organization.id, userId: principal.userId, role: 'OWNER' } });
        await this.audit.write(tx, { organizationId: organization.id, actorUserId: principal.userId, action: 'organization.created', entityType: 'organization', entityId: organization.id, metadata: { slug: organization.slug, ownerMembershipId: membership.id } });
        return organization;
      });
    } catch (error) {
      if (this.isUniqueViolation(error)) throw new ConflictException('Organization slug is already in use');
      throw error;
    }
  }

  list(principal: AuthenticatedPrincipal) {
    return this.prisma.client.organization.findMany({
      where: { memberships: { some: { userId: principal.userId, status: 'ACTIVE' } } },
      include: { memberships: { where: { userId: principal.userId }, select: { id: true, role: true, status: true } }, _count: { select: { departments: true, memberships: true } } },
      orderBy: { name: 'asc' },
    });
  }

  async get(organizationId: string) {
    const result = await this.prisma.client.organization.findUnique({ where: { id: organizationId }, include: { _count: { select: { departments: true, memberships: true } } } });
    if (!result) throw new NotFoundException('Organization not found');
    return result;
  }

  async update(organizationId: string, principal: AuthenticatedPrincipal, input: UpdateOrganizationDto) {
    const existing = await this.get(organizationId);
    return this.prisma.client.$transaction(async (tx) => {
      const organization = await tx.organization.update({ where: { id: organizationId }, data: {
        ...(input.name ? { name: input.name.trim() } : {}),
        ...(input.description !== undefined ? { description: input.description.trim() || null } : {}),
        ...(input.timezone ? { timezone: input.timezone } : {}),
        ...(input.settings ? { settings: input.settings } : {}),
        ...(input.status ? { status: input.status } : {}),
      } });
      await this.audit.write(tx, { organizationId, actorUserId: principal.userId, action: 'organization.updated', entityType: 'organization', entityId: organizationId, metadata: { previousStatus: existing.status, status: organization.status } });
      return organization;
    });
  }

  listMembers(organizationId: string) {
    return this.prisma.client.membership.findMany({
      where: { organizationId },
      include: { user: { select: { id: true, email: true, displayName: true } }, departments: { include: { department: { select: { id: true, code: true, name: true } } } } },
      orderBy: [{ role: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async addMember(organizationId: string, principal: AuthenticatedPrincipal, input: AddMembershipDto) {
    const user = await this.prisma.client.user.findFirst({ where: { email: { equals: input.email.toLowerCase(), mode: 'insensitive' } } });
    if (!user) throw new BadRequestException('Use an invitation when the user has not signed in before');
    if (input.role === 'OWNER') throw new BadRequestException('Ownership transfer requires the dedicated workflow');
    try {
      return await this.prisma.client.$transaction(async (tx) => {
        const membership = await tx.membership.create({ data: { organizationId, userId: user.id, role: input.role }, include: { user: { select: { id: true, email: true, displayName: true } } } });
        await this.audit.write(tx, { organizationId, actorUserId: principal.userId, action: 'membership.created', entityType: 'membership', entityId: membership.id, metadata: { userId: user.id, role: membership.role } });
        return membership;
      });
    } catch (error) {
      if (this.isUniqueViolation(error)) throw new ConflictException('The user is already a member');
      throw error;
    }
  }

  async updateMember(organizationId: string, membershipId: string, principal: AuthenticatedPrincipal, input: UpdateMembershipDto) {
    const existing = await this.prisma.client.membership.findFirst({ where: { id: membershipId, organizationId } });
    if (!existing) throw new NotFoundException('Membership not found');
    if (existing.role === 'OWNER') throw new ForbiddenException('The owner membership can only change through ownership transfer');
    if (input.role === 'OWNER') throw new BadRequestException('Ownership transfer requires the dedicated workflow');
    return this.prisma.client.$transaction(async (tx) => {
      const membership = await tx.membership.update({ where: { id: membershipId }, data: { ...(input.role ? { role: input.role } : {}), ...(input.status ? { status: input.status } : {}) } });
      await this.audit.write(tx, { organizationId, actorUserId: principal.userId, action: 'membership.updated', entityType: 'membership', entityId: membershipId, metadata: { previousRole: existing.role, role: membership.role, previousStatus: existing.status, status: membership.status } });
      return membership;
    });
  }

  async removeMember(organizationId: string, membershipId: string, principal: AuthenticatedPrincipal) {
    const existing = await this.prisma.client.membership.findFirst({ where: { id: membershipId, organizationId }, include: { _count: { select: { ownedContracts: true, assignedObligations: true } } } });
    if (!existing) throw new NotFoundException('Membership not found');
    if (existing.role === 'OWNER') throw new ForbiddenException('Transfer ownership before removing the owner');
    if (existing._count.ownedContracts || existing._count.assignedObligations) throw new ConflictException('Reassign owned contracts and obligations before removing this member');
    await this.prisma.client.$transaction(async (tx) => {
      await this.audit.write(tx, { organizationId, actorUserId: principal.userId, action: 'membership.deleted', entityType: 'membership', entityId: membershipId, metadata: { userId: existing.userId, role: existing.role } });
      await tx.membership.delete({ where: { id: membershipId } });
    });
    return { deleted: true };
  }

  async transferOwnership(organizationId: string, principal: AuthenticatedPrincipal, input: TransferOwnershipDto) {
    return this.prisma.client.$transaction(async (tx) => {
      const currentOwner = await tx.membership.findUnique({ where: { organizationId_userId: { organizationId, userId: principal.userId } } });
      if (!currentOwner || currentOwner.role !== 'OWNER' || currentOwner.status !== 'ACTIVE') throw new ForbiddenException('Only the active owner can transfer ownership');
      if (currentOwner.id === input.membershipId) throw new BadRequestException('Select another active member as the new owner');
      const target = await tx.membership.findFirst({ where: { id: input.membershipId, organizationId, status: 'ACTIVE' } });
      if (!target) throw new NotFoundException('Target active membership not found');

      await tx.membership.update({ where: { id: currentOwner.id }, data: { role: 'ADMIN' } });
      const newOwner = await tx.membership.update({ where: { id: target.id }, data: { role: 'OWNER' } });
      await this.audit.write(tx, { organizationId, actorUserId: principal.userId, action: 'organization.ownership_transferred', entityType: 'organization', entityId: organizationId, metadata: { previousOwnerMembershipId: currentOwner.id, newOwnerMembershipId: newOwner.id, newOwnerUserId: newOwner.userId } });
      return { previousOwnerMembershipId: currentOwner.id, owner: newOwner };
    });
  }

  private isUniqueViolation(error: unknown) {
    return typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002';
  }
}
