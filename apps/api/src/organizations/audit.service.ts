import { Injectable } from '@nestjs/common';
import type { Prisma } from '@kal-flow/database';
import { PrismaService } from '../prisma/prisma.service';

export interface AuditInput {
  organizationId: string;
  actorUserId?: string;
  action: string;
  entityType: string;
  entityId?: string;
  metadata?: Prisma.InputJsonValue;
}

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  write(tx: Prisma.TransactionClient, input: AuditInput) {
    return tx.auditEvent.create({
      data: {
        organizationId: input.organizationId,
        actorUserId: input.actorUserId,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId,
        metadata: input.metadata ?? {},
      },
    });
  }

  list(organizationId: string, cursor?: string, limit = 50) {
    const take = Number.isFinite(limit) ? Math.min(Math.max(Math.trunc(limit), 1), 100) : 50;
    return this.prisma.client.auditEvent.findMany({
      where: { organizationId },
      include: { actor: { select: { id: true, email: true, displayName: true } } },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: take + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    }).then((rows) => ({
      items: rows.slice(0, take),
      nextCursor: rows.length > take ? rows[take - 1]?.id ?? null : null,
    }));
  }
}
