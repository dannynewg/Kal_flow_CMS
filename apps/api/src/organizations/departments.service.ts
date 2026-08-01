import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { AuthenticatedPrincipal } from '../auth/principal';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from './audit.service';
import type { AssignDepartmentMemberDto, CreateDepartmentDto, UpdateDepartmentDto } from './dto';

@Injectable()
export class DepartmentsService {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService) {}

  list(organizationId: string) {
    return this.prisma.client.department.findMany({
      where: { organizationId },
      include: {
        _count: { select: { memberships: true, children: true } },
        parent: { select: { id: true, code: true, name: true } },
      },
      orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
    });
  }

  async create(organizationId: string, principal: AuthenticatedPrincipal, input: CreateDepartmentDto) {
    if (input.parentId) await this.requireDepartment(organizationId, input.parentId);
    try {
      return await this.prisma.client.$transaction(async (tx) => {
        const department = await tx.department.create({ data: {
          organizationId,
          code: input.code,
          name: input.name.trim(),
          description: input.description?.trim(),
          parentId: input.parentId,
        } });
        await this.audit.write(tx, { organizationId, actorUserId: principal.userId, action: 'department.created', entityType: 'department', entityId: department.id, metadata: { code: department.code, parentId: department.parentId } });
        return department;
      });
    } catch (error) {
      if (this.isUniqueViolation(error)) throw new ConflictException('Department code is already in use');
      throw error;
    }
  }

  async update(organizationId: string, departmentId: string, principal: AuthenticatedPrincipal, input: UpdateDepartmentDto) {
    const current = await this.requireDepartment(organizationId, departmentId);
    if (input.parentId) {
      if (input.parentId === departmentId) throw new BadRequestException('A department cannot be its own parent');
      await this.assertNoCycle(organizationId, departmentId, input.parentId);
    }
    try {
      return await this.prisma.client.$transaction(async (tx) => {
        const department = await tx.department.update({ where: { id: departmentId }, data: {
          ...(input.code ? { code: input.code } : {}),
          ...(input.name ? { name: input.name.trim() } : {}),
          ...(input.description !== undefined ? { description: input.description.trim() || null } : {}),
          ...(input.parentId !== undefined ? { parentId: input.parentId } : {}),
          ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
        } });
        await this.audit.write(tx, { organizationId, actorUserId: principal.userId, action: 'department.updated', entityType: 'department', entityId: departmentId, metadata: { previousCode: current.code, code: department.code } });
        return department;
      });
    } catch (error) {
      if (this.isUniqueViolation(error)) throw new ConflictException('Department code is already in use');
      throw error;
    }
  }

  async remove(organizationId: string, departmentId: string, principal: AuthenticatedPrincipal) {
    const department = await this.requireDepartment(organizationId, departmentId);
    const children = await this.prisma.client.department.count({ where: { organizationId, parentId: departmentId } });
    if (children > 0) throw new ConflictException('Move or archive child departments before deleting this department');
    await this.prisma.client.$transaction(async (tx) => {
      await tx.department.delete({ where: { id: departmentId } });
      await this.audit.write(tx, { organizationId, actorUserId: principal.userId, action: 'department.deleted', entityType: 'department', entityId: departmentId, metadata: { code: department.code, name: department.name } });
    });
    return { deleted: true };
  }

  listMembers(organizationId: string, departmentId: string) {
    return this.requireDepartment(organizationId, departmentId).then(() => this.prisma.client.departmentMembership.findMany({
      where: { departmentId, membership: { organizationId } },
      include: { membership: { include: { user: { select: { id: true, email: true, displayName: true } } } } },
      orderBy: { createdAt: 'asc' },
    }));
  }

  async assignMember(organizationId: string, departmentId: string, principal: AuthenticatedPrincipal, input: AssignDepartmentMemberDto) {
    await this.requireDepartment(organizationId, departmentId);
    const membership = await this.prisma.client.membership.findFirst({ where: { id: input.membershipId, organizationId, status: 'ACTIVE' } });
    if (!membership) throw new NotFoundException('Active organization membership not found');
    return this.prisma.client.$transaction(async (tx) => {
      const assignment = await tx.departmentMembership.upsert({
        where: { departmentId_membershipId: { departmentId, membershipId: input.membershipId } },
        create: { departmentId, membershipId: input.membershipId, isManager: input.isManager ?? false },
        update: { isManager: input.isManager ?? false },
      });
      await this.audit.write(tx, { organizationId, actorUserId: principal.userId, action: 'department.member_assigned', entityType: 'department', entityId: departmentId, metadata: { membershipId: input.membershipId, isManager: assignment.isManager } });
      return assignment;
    });
  }

  async removeMember(organizationId: string, departmentId: string, membershipId: string, principal: AuthenticatedPrincipal) {
    const assignment = await this.prisma.client.departmentMembership.findFirst({ where: { departmentId, membershipId, department: { organizationId }, membership: { organizationId } } });
    if (!assignment) throw new NotFoundException('Department membership not found');
    await this.prisma.client.$transaction(async (tx) => {
      await tx.departmentMembership.delete({ where: { departmentId_membershipId: { departmentId, membershipId } } });
      await this.audit.write(tx, { organizationId, actorUserId: principal.userId, action: 'department.member_removed', entityType: 'department', entityId: departmentId, metadata: { membershipId } });
    });
    return { deleted: true };
  }

  private async assertNoCycle(organizationId: string, departmentId: string, parentId: string) {
    let cursor: string | null = parentId;
    while (cursor) {
      if (cursor === departmentId) throw new BadRequestException('Department hierarchy cannot contain a cycle');
      const parent: { parentId: string | null } | null = await this.prisma.client.department.findFirst({ where: { id: cursor, organizationId }, select: { parentId: true } });
      if (!parent) throw new NotFoundException('Parent department not found');
      cursor = parent.parentId;
    }
  }

  private async requireDepartment(organizationId: string, departmentId: string) {
    const department = await this.prisma.client.department.findFirst({ where: { id: departmentId, organizationId } });
    if (!department) throw new NotFoundException('Department not found');
    return department;
  }

  private isUniqueViolation(error: unknown) {
    return typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002';
  }
}
