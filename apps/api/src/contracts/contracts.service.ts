import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { AuthenticatedPrincipal } from '../auth/principal';
import { AuditService } from '../organizations/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import type { ActivateContractDto, ConvertContractRequestDto, CreateContractRequestDto, CreateContractVersionDto, DecideReviewStepDto, StartContractReviewDto, TriageContractRequestDto, UpdateContractRequestDto } from './dto';

@Injectable()
export class ContractsService {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService) {}

  async createRequest(organizationId: string, principal: AuthenticatedPrincipal, input: CreateContractRequestDto) {
    await this.requireDepartment(organizationId, input.departmentId);
    return this.prisma.client.$transaction(async (tx) => {
      const request = await tx.contractRequest.create({ data: {
        organizationId,
        departmentId: input.departmentId,
        requesterUserId: principal.userId,
        requestNumber: this.reference('REQ'),
        title: input.title.trim(),
        description: input.description.trim(),
        contractType: input.contractType.trim(),
        counterpartyName: input.counterpartyName.trim(),
        estimatedValueMinor: input.estimatedValueMinor ? BigInt(input.estimatedValueMinor) : null,
        currency: input.currency ?? 'ETB',
        desiredEffectiveDate: input.desiredEffectiveDate ? new Date(input.desiredEffectiveDate) : null,
      } });
      await this.audit.write(tx, { organizationId, actorUserId: principal.userId, action: 'contract_request.created', entityType: 'contract_request', entityId: request.id, metadata: { requestNumber: request.requestNumber, departmentId: request.departmentId } });
      return this.presentRequest(request);
    });
  }

  async listRequests(organizationId: string) {
    const requests = await this.prisma.client.contractRequest.findMany({
      where: { organizationId },
      include: { department: { select: { id: true, code: true, name: true } }, requester: { select: { id: true, email: true, displayName: true } }, assignedTo: { select: { id: true, email: true, displayName: true } }, contract: { select: { id: true, contractNumber: true, status: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return requests.map((request) => this.presentRequest(request));
  }

  async getRequest(organizationId: string, requestId: string) {
    const request = await this.prisma.client.contractRequest.findFirst({
      where: { id: requestId, organizationId },
      include: { department: true, requester: { select: { id: true, email: true, displayName: true } }, assignedTo: { select: { id: true, email: true, displayName: true } }, contract: { select: { id: true, contractNumber: true, status: true } } },
    });
    if (!request) throw new NotFoundException('Contract request not found');
    return this.presentRequest(request);
  }

  async updateRequest(organizationId: string, requestId: string, principal: AuthenticatedPrincipal, input: UpdateContractRequestDto) {
    const current = await this.requireRequest(organizationId, requestId);
    if (current.status !== 'DRAFT') throw new ConflictException('Only a draft request can be edited');
    if (current.requesterUserId !== principal.userId) throw new ForbiddenException('Only the requester can edit this draft');
    if (input.departmentId) await this.requireDepartment(organizationId, input.departmentId);
    return this.prisma.client.$transaction(async (tx) => {
      const request = await tx.contractRequest.update({ where: { id: requestId }, data: {
        ...(input.departmentId ? { departmentId: input.departmentId } : {}),
        ...(input.title ? { title: input.title.trim() } : {}),
        ...(input.description ? { description: input.description.trim() } : {}),
        ...(input.contractType ? { contractType: input.contractType.trim() } : {}),
        ...(input.counterpartyName ? { counterpartyName: input.counterpartyName.trim() } : {}),
        ...(input.estimatedValueMinor !== undefined ? { estimatedValueMinor: BigInt(input.estimatedValueMinor) } : {}),
        ...(input.currency ? { currency: input.currency } : {}),
        ...(input.desiredEffectiveDate ? { desiredEffectiveDate: new Date(input.desiredEffectiveDate) } : {}),
      } });
      await this.audit.write(tx, { organizationId, actorUserId: principal.userId, action: 'contract_request.updated', entityType: 'contract_request', entityId: requestId });
      return this.presentRequest(request);
    });
  }

  async submitRequest(organizationId: string, requestId: string, principal: AuthenticatedPrincipal) {
    const current = await this.requireRequest(organizationId, requestId);
    if (current.status !== 'DRAFT') throw new ConflictException('Only a draft request can be submitted');
    if (current.requesterUserId !== principal.userId) throw new ForbiddenException('Only the requester can submit this request');
    return this.prisma.client.$transaction(async (tx) => {
      const request = await tx.contractRequest.update({ where: { id: requestId }, data: { status: 'SUBMITTED', submittedAt: new Date() } });
      await this.audit.write(tx, { organizationId, actorUserId: principal.userId, action: 'contract_request.submitted', entityType: 'contract_request', entityId: requestId });
      return this.presentRequest(request);
    });
  }

  async cancelRequest(organizationId: string, requestId: string, principal: AuthenticatedPrincipal) {
    const current = await this.requireRequest(organizationId, requestId);
    if (!['DRAFT', 'SUBMITTED'].includes(current.status)) throw new ConflictException('Only a draft or submitted request can be cancelled');
    if (current.requesterUserId !== principal.userId) throw new ForbiddenException('Only the requester can cancel this request');
    return this.prisma.client.$transaction(async (tx) => {
      const request = await tx.contractRequest.update({ where: { id: requestId }, data: { status: 'CANCELLED' } });
      await this.audit.write(tx, { organizationId, actorUserId: principal.userId, action: 'contract_request.cancelled', entityType: 'contract_request', entityId: requestId });
      return this.presentRequest(request);
    });
  }

  async triageRequest(organizationId: string, requestId: string, principal: AuthenticatedPrincipal, input: TriageContractRequestDto) {
    const current = await this.requireRequest(organizationId, requestId);
    if (!['SUBMITTED', 'TRIAGED'].includes(current.status)) throw new ConflictException('Only submitted requests can be triaged');
    const assignee = await this.requireActiveMembership(organizationId, input.assignedMembershipId);
    return this.prisma.client.$transaction(async (tx) => {
      const request = await tx.contractRequest.update({ where: { id: requestId }, data: { status: 'TRIAGED', assignedToUserId: assignee.userId, riskLevel: input.riskLevel, triagedAt: new Date() } });
      await this.audit.write(tx, { organizationId, actorUserId: principal.userId, action: 'contract_request.triaged', entityType: 'contract_request', entityId: requestId, metadata: { assignedToUserId: assignee.userId, riskLevel: input.riskLevel } });
      return this.presentRequest(request);
    });
  }

  async convertRequest(organizationId: string, requestId: string, principal: AuthenticatedPrincipal, input: ConvertContractRequestDto) {
    const owner = await this.requireActiveMembership(organizationId, input.ownerMembershipId);
    return this.prisma.client.$transaction(async (tx) => {
      const request = await tx.contractRequest.findFirst({ where: { id: requestId, organizationId } });
      if (!request) throw new NotFoundException('Contract request not found');
      const existing = await tx.contract.findUnique({ where: { requestId } });
      if (existing) return this.presentContract(existing);
      if (request.status !== 'TRIAGED') throw new ConflictException('The request must be triaged before conversion');
      const contract = await tx.contract.create({ data: {
        organizationId,
        requestId,
        departmentId: request.departmentId,
        ownerMembershipId: owner.id,
        contractNumber: this.reference('CON'),
        title: request.title,
        contractType: request.contractType,
        counterpartyName: request.counterpartyName,
        valueMinor: request.estimatedValueMinor,
        currency: request.currency,
        riskLevel: request.riskLevel,
        effectiveDate: request.desiredEffectiveDate,
      } });
      await tx.contractRequest.update({ where: { id: requestId }, data: { status: 'CONVERTED', convertedAt: new Date() } });
      await this.audit.write(tx, { organizationId, actorUserId: principal.userId, action: 'contract_request.converted', entityType: 'contract', entityId: contract.id, metadata: { requestId, contractNumber: contract.contractNumber } });
      return this.presentContract(contract);
    });
  }

  async listContracts(organizationId: string) {
    const contracts = await this.prisma.client.contract.findMany({
      where: { organizationId },
      include: { department: { select: { id: true, code: true, name: true } }, owner: { include: { user: { select: { id: true, email: true, displayName: true } } } }, _count: { select: { versions: true, reviewSteps: true } } },
      orderBy: { updatedAt: 'desc' },
    });
    return contracts.map((contract) => this.presentContract(contract));
  }

  async getContract(organizationId: string, contractId: string) {
    const contract = await this.prisma.client.contract.findFirst({
      where: { id: contractId, organizationId },
      include: { department: true, owner: { include: { user: { select: { id: true, email: true, displayName: true } } } }, versions: { orderBy: { versionNumber: 'desc' } }, reviewSteps: { orderBy: [{ round: 'desc' }, { sequence: 'asc' }], include: { assignedUser: { select: { id: true, email: true, displayName: true } } } } },
    });
    if (!contract) throw new NotFoundException('Contract not found');
    return this.presentContract(contract);
  }

  async addVersion(organizationId: string, contractId: string, principal: AuthenticatedPrincipal, input: CreateContractVersionDto) {
    return this.prisma.client.$transaction(async (tx) => {
      const contract = await tx.contract.findFirst({ where: { id: contractId, organizationId } });
      if (!contract) throw new NotFoundException('Contract not found');
      if (!['DRAFT', 'CHANGES_REQUESTED'].includes(contract.status)) throw new ConflictException('A new version can only be added while drafting or revising');
      const latest = await tx.contractVersion.aggregate({ where: { contractId }, _max: { versionNumber: true } });
      const version = await tx.contractVersion.create({ data: { contractId, versionNumber: (latest._max.versionNumber ?? 0) + 1, title: input.title.trim(), summary: input.summary?.trim(), content: input.content, changeNote: input.changeNote?.trim(), createdByUserId: principal.userId } });
      if (contract.status === 'CHANGES_REQUESTED') await tx.contract.update({ where: { id: contractId }, data: { status: 'DRAFT' } });
      await this.audit.write(tx, { organizationId, actorUserId: principal.userId, action: 'contract.version_created', entityType: 'contract', entityId: contractId, metadata: { versionId: version.id, versionNumber: version.versionNumber } });
      return version;
    });
  }

  async startReview(organizationId: string, contractId: string, principal: AuthenticatedPrincipal, input: StartContractReviewDto) {
    return this.prisma.client.$transaction(async (tx) => {
      const contract = await tx.contract.findFirst({ where: { id: contractId, organizationId }, include: { _count: { select: { versions: true } } } });
      if (!contract) throw new NotFoundException('Contract not found');
      if (contract.status !== 'DRAFT') throw new ConflictException('Only a draft contract can enter review');
      if (contract._count.versions === 0) throw new BadRequestException('Create a draft version before starting review');
      const latestRound = await tx.contractReviewStep.aggregate({ where: { contractId }, _max: { round: true } });
      const round = (latestRound._max.round ?? 0) + 1;
      const steps = [];
      for (const [index, step] of input.steps.entries()) {
        let assignedUserId: string | null = null;
        if (step.assignedMembershipId) {
          const membership = await tx.membership.findFirst({ where: { id: step.assignedMembershipId, organizationId, status: 'ACTIVE' } });
          if (!membership || membership.role !== step.requiredRole) throw new BadRequestException(`Review step ${index + 1} assignee must have role ${step.requiredRole}`);
          assignedUserId = membership.userId;
        }
        steps.push({ round, sequence: index + 1, name: step.name.trim(), requiredRole: step.requiredRole, assignedUserId });
      }
      await tx.contractReviewStep.createMany({ data: steps.map((step) => ({ contractId, ...step })) });
      await tx.contract.update({ where: { id: contractId }, data: { status: 'IN_REVIEW' } });
      await this.audit.write(tx, { organizationId, actorUserId: principal.userId, action: 'contract.review_started', entityType: 'contract', entityId: contractId, metadata: { round, stepCount: steps.length } });
      return tx.contractReviewStep.findMany({ where: { contractId, round }, orderBy: { sequence: 'asc' } });
    });
  }

  async decideReviewStep(organizationId: string, contractId: string, stepId: string, principal: AuthenticatedPrincipal, input: DecideReviewStepDto) {
    return this.prisma.client.$transaction(async (tx) => {
      const contract = await tx.contract.findFirst({ where: { id: contractId, organizationId } });
      if (!contract) throw new NotFoundException('Contract not found');
      if (contract.status !== 'IN_REVIEW') throw new ConflictException('Contract is not in review');
      const step = await tx.contractReviewStep.findFirst({ where: { id: stepId, contractId } });
      if (!step) throw new NotFoundException('Review step not found');
      if (step.status !== 'PENDING') throw new ConflictException('Review step already has a decision');
      const membership = await tx.membership.findUnique({ where: { organizationId_userId: { organizationId, userId: principal.userId } } });
      if (!membership || membership.status !== 'ACTIVE' || membership.role !== step.requiredRole || (step.assignedUserId && step.assignedUserId !== principal.userId)) {
        throw new ForbiddenException('This review decision is assigned to another role or user');
      }
      const earlierPending = await tx.contractReviewStep.count({ where: { contractId, round: step.round, sequence: { lt: step.sequence }, status: { not: 'APPROVED' } } });
      if (earlierPending > 0) throw new ConflictException('Earlier review steps must be approved first');
      const decided = await tx.contractReviewStep.update({ where: { id: stepId }, data: { status: input.decision, comment: input.comment?.trim(), decidedAt: new Date() } });
      let contractStatus: 'IN_REVIEW' | 'CHANGES_REQUESTED' | 'APPROVED' = 'IN_REVIEW';
      if (input.decision === 'CHANGES_REQUESTED') {
        contractStatus = 'CHANGES_REQUESTED';
        await tx.contractReviewStep.updateMany({ where: { contractId, round: step.round, sequence: { gt: step.sequence }, status: 'PENDING' }, data: { status: 'SKIPPED' } });
      }
      else {
        const pending = await tx.contractReviewStep.count({ where: { contractId, round: step.round, status: 'PENDING' } });
        if (pending === 0) contractStatus = 'APPROVED';
      }
      await tx.contract.update({ where: { id: contractId }, data: { status: contractStatus, ...(contractStatus === 'APPROVED' ? { approvedAt: new Date() } : {}) } });
      await this.audit.write(tx, { organizationId, actorUserId: principal.userId, action: input.decision === 'APPROVED' ? 'contract.review_approved' : 'contract.changes_requested', entityType: 'contract', entityId: contractId, metadata: { reviewStepId: stepId, round: step.round, sequence: step.sequence } });
      return { step: decided, contractStatus };
    });
  }

  async activate(organizationId: string, contractId: string, principal: AuthenticatedPrincipal, input: ActivateContractDto) {
    const effectiveDate = new Date(input.effectiveDate);
    const expirationDate = input.expirationDate ? new Date(input.expirationDate) : null;
    if (expirationDate && expirationDate < effectiveDate) throw new BadRequestException('Expiration date cannot precede the effective date');
    return this.prisma.client.$transaction(async (tx) => {
      const contract = await tx.contract.findFirst({ where: { id: contractId, organizationId } });
      if (!contract) throw new NotFoundException('Contract not found');
      if (contract.status !== 'APPROVED') throw new ConflictException('Only an approved contract can be activated');
      const active = await tx.contract.update({ where: { id: contractId }, data: { status: 'ACTIVE', effectiveDate, expirationDate, activatedAt: new Date() } });
      await this.audit.write(tx, { organizationId, actorUserId: principal.userId, action: 'contract.activated', entityType: 'contract', entityId: contractId, metadata: { effectiveDate: input.effectiveDate, expirationDate: input.expirationDate ?? null } });
      return this.presentContract(active);
    });
  }

  private async requireRequest(organizationId: string, requestId: string) {
    const request = await this.prisma.client.contractRequest.findFirst({ where: { id: requestId, organizationId } });
    if (!request) throw new NotFoundException('Contract request not found');
    return request;
  }

  private async requireDepartment(organizationId: string, departmentId: string) {
    const department = await this.prisma.client.department.findFirst({ where: { id: departmentId, organizationId, isActive: true } });
    if (!department) throw new NotFoundException('Active department not found');
    return department;
  }

  private async requireActiveMembership(organizationId: string, membershipId: string) {
    const membership = await this.prisma.client.membership.findFirst({ where: { id: membershipId, organizationId, status: 'ACTIVE' } });
    if (!membership) throw new NotFoundException('Active organization membership not found');
    return membership;
  }

  private reference(kind: 'REQ' | 'CON') {
    return `KF-${kind}-${new Date().getUTCFullYear()}-${randomUUID().slice(0, 8).toUpperCase()}`;
  }

  private presentRequest<T extends { estimatedValueMinor: bigint | null }>(request: T) {
    return { ...request, estimatedValueMinor: request.estimatedValueMinor?.toString() ?? null };
  }

  private presentContract<T extends { valueMinor: bigint | null }>(contract: T) {
    return { ...contract, valueMinor: contract.valueMinor?.toString() ?? null };
  }
}
