import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';
import type { AuthenticatedPrincipal } from '../auth/principal';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from './audit.service';
import type { CreateInvitationDto } from './dto';

export const hashInvitationToken = (token: string) => createHash('sha256').update(token).digest('hex');
export const invitationExpiresAt = (now = new Date()) => new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

@Injectable()
export class InvitationsService {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService) {}

  list(organizationId: string) {
    return this.prisma.client.invitation.findMany({
      where: { organizationId },
      select: { id: true, email: true, role: true, status: true, expiresAt: true, acceptedAt: true, revokedAt: true, createdAt: true, invitedBy: { select: { id: true, email: true, displayName: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(organizationId: string, principal: AuthenticatedPrincipal, input: CreateInvitationDto) {
    if (input.role === 'OWNER') throw new BadRequestException('Ownership can only be assigned through ownership transfer');
    const email = input.email.trim().toLowerCase();
    const existingMember = await this.prisma.client.membership.findFirst({ where: { organizationId, user: { email: { equals: email, mode: 'insensitive' } } } });
    if (existingMember) throw new ConflictException('This user is already an organization member');
    const token = randomBytes(32).toString('base64url');
    try {
      const invitation = await this.prisma.client.$transaction(async (tx) => {
        const expired = await tx.invitation.findMany({ where: { organizationId, email, status: 'PENDING', expiresAt: { lte: new Date() } }, select: { id: true } });
        if (expired.length) {
          await tx.invitation.updateMany({ where: { id: { in: expired.map(({ id }) => id) } }, data: { status: 'EXPIRED' } });
          for (const item of expired) await this.audit.write(tx, { organizationId, action: 'invitation.expired', entityType: 'invitation', entityId: item.id, metadata: { email } });
        }
        const active = await tx.invitation.findFirst({ where: { organizationId, email, status: 'PENDING' } });
        if (active) throw new ConflictException('A pending invitation already exists; resend or revoke it');
        const created = await tx.invitation.create({ data: { organizationId, email, role: input.role, tokenHash: hashInvitationToken(token), invitedByUserId: principal.userId, expiresAt: invitationExpiresAt() } });
        await this.audit.write(tx, { organizationId, actorUserId: principal.userId, action: 'invitation.created', entityType: 'invitation', entityId: created.id, metadata: { email, role: input.role, expiresAt: created.expiresAt.toISOString() } });
        return created;
      });
      return { ...invitation, token };
    } catch (error) {
      if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002') throw new ConflictException('A pending invitation already exists');
      throw error;
    }
  }

  async resend(organizationId: string, invitationId: string, principal: AuthenticatedPrincipal) {
    const existing = await this.requireInvitation(organizationId, invitationId);
    if (existing.status === 'ACCEPTED' || existing.status === 'REVOKED') throw new ConflictException('Only pending or expired invitations can be resent');
    const token = randomBytes(32).toString('base64url');
    const invitation = await this.prisma.client.$transaction(async (tx) => {
      const updated = await tx.invitation.update({ where: { id: invitationId }, data: { tokenHash: hashInvitationToken(token), status: 'PENDING', expiresAt: invitationExpiresAt(), acceptedAt: null, acceptedByUserId: null, revokedAt: null } });
      await this.audit.write(tx, { organizationId, actorUserId: principal.userId, action: 'invitation.resent', entityType: 'invitation', entityId: invitationId, metadata: { email: updated.email, expiresAt: updated.expiresAt.toISOString() } });
      return updated;
    });
    return { ...invitation, token };
  }

  async revoke(organizationId: string, invitationId: string, principal: AuthenticatedPrincipal) {
    const existing = await this.requireInvitation(organizationId, invitationId);
    if (existing.status !== 'PENDING') throw new ConflictException('Only pending invitations can be revoked');
    return this.prisma.client.$transaction(async (tx) => {
      const invitation = await tx.invitation.update({ where: { id: invitationId }, data: { status: 'REVOKED', revokedAt: new Date() } });
      await this.audit.write(tx, { organizationId, actorUserId: principal.userId, action: 'invitation.revoked', entityType: 'invitation', entityId: invitationId, metadata: { email: invitation.email } });
      return invitation;
    });
  }

  async accept(principal: AuthenticatedPrincipal, token: string) {
    const tokenHash = hashInvitationToken(token);
    const invitation = await this.prisma.client.invitation.findUnique({ where: { tokenHash } });
    if (!invitation) throw new NotFoundException('Invitation not found');
    if (invitation.status !== 'PENDING') throw new ConflictException('Invitation is no longer active');
    if (invitation.expiresAt <= new Date()) {
      await this.prisma.client.$transaction(async (tx) => {
        await tx.invitation.update({ where: { id: invitation.id }, data: { status: 'EXPIRED' } });
        await this.audit.write(tx, { organizationId: invitation.organizationId, action: 'invitation.expired', entityType: 'invitation', entityId: invitation.id, metadata: { email: invitation.email } });
      });
      throw new ConflictException('Invitation has expired');
    }
    if (!principal.email || principal.email.toLowerCase() !== invitation.email.toLowerCase()) throw new ForbiddenException('Sign in with the email address that received this invitation');

    return this.prisma.client.$transaction(async (tx) => {
      const claim = await tx.invitation.updateMany({ where: { id: invitation.id, status: 'PENDING', expiresAt: { gt: new Date() } }, data: { status: 'ACCEPTED', acceptedAt: new Date(), acceptedByUserId: principal.userId } });
      if (claim.count !== 1) throw new ConflictException('Invitation is no longer active');
      const membership = await tx.membership.upsert({
        where: { organizationId_userId: { organizationId: invitation.organizationId, userId: principal.userId } },
        create: { organizationId: invitation.organizationId, userId: principal.userId, role: invitation.role, status: 'ACTIVE' },
        update: { role: invitation.role, status: 'ACTIVE' },
      });
      await this.audit.write(tx, { organizationId: invitation.organizationId, actorUserId: principal.userId, action: 'invitation.accepted', entityType: 'invitation', entityId: invitation.id, metadata: { membershipId: membership.id, role: membership.role } });
      return membership;
    });
  }

  private async requireInvitation(organizationId: string, invitationId: string) {
    const invitation = await this.prisma.client.invitation.findFirst({ where: { id: invitationId, organizationId } });
    if (!invitation) throw new NotFoundException('Invitation not found');
    return invitation;
  }
}
