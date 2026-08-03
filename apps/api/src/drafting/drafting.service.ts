import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { AuthenticatedPrincipal } from '../auth/principal';
import { AuditService } from '../organizations/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateClauseDto, CreateTemplateDto, InstantiateTemplateDto, UpdateClauseDto, UpdateTemplateDto } from './dto';

@Injectable()
export class DraftingService {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService) {}

  listClauses(organizationId: string, query?: string, category?: string) {
    const needle = query?.trim();
    return this.prisma.client.clauseLibraryItem.findMany({
      where: {
        organizationId,
        status: 'ACTIVE',
        ...(category ? { category } : {}),
        ...(needle ? { OR: [
          { code: { contains: needle, mode: 'insensitive' } },
          { titleEn: { contains: needle, mode: 'insensitive' } },
          { titleAm: { contains: needle, mode: 'insensitive' } },
          { bodyEn: { contains: needle, mode: 'insensitive' } },
          { bodyAm: { contains: needle, mode: 'insensitive' } },
        ] } : {}),
      },
      orderBy: [{ category: 'asc' }, { code: 'asc' }],
    });
  }

  async createClause(organizationId: string, principal: AuthenticatedPrincipal, input: CreateClauseDto) {
    return this.prisma.client.$transaction(async (tx) => {
      const clause = await tx.clauseLibraryItem.create({ data: {
        organizationId,
        code: input.code.toUpperCase(),
        category: input.category.trim(),
        titleEn: input.titleEn.trim(), titleAm: input.titleAm.trim(),
        bodyEn: input.bodyEn.trim(), bodyAm: input.bodyAm.trim(),
        guidance: input.guidance?.trim(), riskLevel: input.riskLevel ?? 'MEDIUM',
      } });
      await this.audit.write(tx, { organizationId, actorUserId: principal.userId, action: 'clause.created', entityType: 'clause_library_item', entityId: clause.id, metadata: { code: clause.code } });
      return clause;
    }).catch((error: { code?: string }) => {
      if (error.code === 'P2002') throw new ConflictException('A clause with this code already exists');
      throw error;
    });
  }

  async updateClause(organizationId: string, clauseId: string, principal: AuthenticatedPrincipal, input: UpdateClauseDto) {
    const current = await this.prisma.client.clauseLibraryItem.findFirst({ where: { id: clauseId, organizationId } });
    if (!current) throw new NotFoundException('Clause not found');
    return this.prisma.client.$transaction(async (tx) => {
      const clause = await tx.clauseLibraryItem.update({ where: { id: clauseId }, data: { category: input.category?.trim(), titleEn: input.titleEn?.trim(), titleAm: input.titleAm?.trim(), bodyEn: input.bodyEn?.trim(), bodyAm: input.bodyAm?.trim(), guidance: input.guidance?.trim(), riskLevel: input.riskLevel } });
      await this.audit.write(tx, { organizationId, actorUserId: principal.userId, action: 'clause.updated', entityType: 'clause_library_item', entityId: clauseId });
      return clause;
    });
  }

  async deleteClause(organizationId: string, clauseId: string, principal: AuthenticatedPrincipal) {
    const clause = await this.prisma.client.clauseLibraryItem.findFirst({ where: { id: clauseId, organizationId }, include: { _count: { select: { templateClauses: true } } } });
    if (!clause) throw new NotFoundException('Clause not found');
    if (clause._count.templateClauses) throw new ConflictException('Remove this clause from all templates before deleting it');
    await this.prisma.client.$transaction(async (tx) => { await this.audit.write(tx, { organizationId, actorUserId: principal.userId, action: 'clause.deleted', entityType: 'clause_library_item', entityId: clauseId, metadata: { code: clause.code } }); await tx.clauseLibraryItem.delete({ where: { id: clauseId } }); });
    return { deleted: true };
  }

  listTemplates(organizationId: string) {
    return this.prisma.client.contractTemplate.findMany({
      where: { organizationId, status: 'ACTIVE' },
      include: { clauses: { orderBy: { sequence: 'asc' }, include: { clause: true } } },
      orderBy: [{ contractType: 'asc' }, { code: 'asc' }],
    });
  }

  async createTemplate(organizationId: string, principal: AuthenticatedPrincipal, input: CreateTemplateDto) {
    const clauseIds = input.clauses.map((item) => item.clauseId);
    if (new Set(clauseIds).size !== clauseIds.length) throw new BadRequestException('Each clause may appear only once in a template');
    const validClauses = await this.prisma.client.clauseLibraryItem.count({ where: { id: { in: clauseIds }, organizationId, status: 'ACTIVE' } });
    if (validClauses !== clauseIds.length) throw new BadRequestException('Every template clause must be active and belong to this organization');
    return this.prisma.client.$transaction(async (tx) => {
      const template = await tx.contractTemplate.create({ data: {
        organizationId, code: input.code.toUpperCase(), contractType: input.contractType.trim(),
        nameEn: input.nameEn.trim(), nameAm: input.nameAm.trim(),
        descriptionEn: input.descriptionEn?.trim(), descriptionAm: input.descriptionAm?.trim(),
        clauses: { create: input.clauses.map((item, index) => ({ clauseId: item.clauseId, sequence: index + 1, isRequired: item.isRequired ?? true })) },
      }, include: { clauses: { orderBy: { sequence: 'asc' }, include: { clause: true } } } });
      await this.audit.write(tx, { organizationId, actorUserId: principal.userId, action: 'contract_template.created', entityType: 'contract_template', entityId: template.id, metadata: { code: template.code, clauseCount: input.clauses.length } });
      return template;
    }).catch((error: { code?: string }) => {
      if (error.code === 'P2002') throw new ConflictException('A template with this code already exists');
      throw error;
    });
  }

  async updateTemplate(organizationId: string, templateId: string, principal: AuthenticatedPrincipal, input: UpdateTemplateDto) {
    const current = await this.prisma.client.contractTemplate.findFirst({ where: { id: templateId, organizationId } });
    if (!current) throw new NotFoundException('Template not found');
    if (input.clauses) {
      const ids = input.clauses.map((item) => item.clauseId);
      if (new Set(ids).size !== ids.length || await this.prisma.client.clauseLibraryItem.count({ where: { id: { in: ids }, organizationId, status: 'ACTIVE' } }) !== ids.length) throw new BadRequestException('Every template clause must be unique, active, and belong to this organization');
    }
    return this.prisma.client.$transaction(async (tx) => {
      if (input.clauses) { await tx.contractTemplateClause.deleteMany({ where: { templateId } }); await tx.contractTemplateClause.createMany({ data: input.clauses.map((item, index) => ({ templateId, clauseId: item.clauseId, sequence: index + 1, isRequired: item.isRequired ?? true })) }); }
      const template = await tx.contractTemplate.update({ where: { id: templateId }, data: { contractType: input.contractType?.trim(), nameEn: input.nameEn?.trim(), nameAm: input.nameAm?.trim(), descriptionEn: input.descriptionEn?.trim(), descriptionAm: input.descriptionAm?.trim() }, include: { clauses: { orderBy: { sequence: 'asc' }, include: { clause: true } } } });
      await this.audit.write(tx, { organizationId, actorUserId: principal.userId, action: 'contract_template.updated', entityType: 'contract_template', entityId: templateId });
      return template;
    });
  }

  async deleteTemplate(organizationId: string, templateId: string, principal: AuthenticatedPrincipal) {
    const template = await this.prisma.client.contractTemplate.findFirst({ where: { id: templateId, organizationId }, include: { _count: { select: { generatedVersions: true } } } });
    if (!template) throw new NotFoundException('Template not found');
    if (template._count.generatedVersions) throw new ConflictException('Templates used to generate contract versions are retained for auditability');
    await this.prisma.client.$transaction(async (tx) => { await this.audit.write(tx, { organizationId, actorUserId: principal.userId, action: 'contract_template.deleted', entityType: 'contract_template', entityId: templateId, metadata: { code: template.code } }); await tx.contractTemplate.delete({ where: { id: templateId } }); });
    return { deleted: true };
  }

  async instantiate(organizationId: string, contractId: string, principal: AuthenticatedPrincipal, input: InstantiateTemplateDto) {
    const supplied = input.variables ?? {};
    if (Object.keys(supplied).length > 30 || Object.entries(supplied).some(([key, value]) => !/^[a-z][a-z0-9_]{1,39}$/.test(key) || typeof value !== 'string' || value.length > 1000)) {
      throw new BadRequestException('Template variables must contain at most 30 short snake_case text values');
    }
    return this.prisma.client.$transaction(async (tx) => {
      const contract = await tx.contract.findFirst({ where: { id: contractId, organizationId }, include: { organization: true } });
      if (!contract) throw new NotFoundException('Contract not found');
      if (!['DRAFT', 'CHANGES_REQUESTED'].includes(contract.status)) throw new ConflictException('A template can only be applied while drafting or revising');
      const template = await tx.contractTemplate.findFirst({ where: { id: input.templateId, organizationId, status: 'ACTIVE' }, include: { clauses: { orderBy: { sequence: 'asc' }, include: { clause: true } } } });
      if (!template) throw new NotFoundException('Active contract template not found');
      const values: Record<string, string> = {
        organization_name: contract.organization.name,
        contract_number: contract.contractNumber,
        contract_title: contract.title,
        counterparty_name: contract.counterpartyName,
        contract_value: contract.valueMinor ? `${(Number(contract.valueMinor) / 100).toLocaleString('en-ET')} ${contract.currency}` : 'Not specified',
        effective_date: contract.effectiveDate?.toISOString().slice(0, 10) ?? 'To be agreed',
        expiration_date: contract.expirationDate?.toISOString().slice(0, 10) ?? 'To be agreed',
        ...supplied,
      };
      const content = this.compose(template, input.language, values);
      const latest = await tx.contractVersion.aggregate({ where: { contractId }, _max: { versionNumber: true } });
      const version = await tx.contractVersion.create({ data: {
        contractId, versionNumber: (latest._max.versionNumber ?? 0) + 1,
        title: input.language === 'am' ? template.nameAm : template.nameEn,
        summary: input.summary?.trim() ?? `Generated from ${template.code}`,
        content, changeNote: `Template ${template.code}`, createdByUserId: principal.userId, sourceTemplateId: template.id,
      } });
      if (contract.status === 'CHANGES_REQUESTED') await tx.contract.update({ where: { id: contractId }, data: { status: 'DRAFT' } });
      await this.audit.write(tx, { organizationId, actorUserId: principal.userId, action: 'contract.version_generated', entityType: 'contract', entityId: contractId, metadata: { versionId: version.id, versionNumber: version.versionNumber, templateId: template.id, language: input.language } });
      return version;
    });
  }

  async compareVersions(organizationId: string, contractId: string, fromVersion: number, toVersion: number) {
    if (!Number.isInteger(fromVersion) || !Number.isInteger(toVersion) || fromVersion < 1 || toVersion < 1 || fromVersion === toVersion) throw new BadRequestException('Choose two different positive version numbers');
    const contract = await this.prisma.client.contract.findFirst({ where: { id: contractId, organizationId }, select: { id: true } });
    if (!contract) throw new NotFoundException('Contract not found');
    const versions = await this.prisma.client.contractVersion.findMany({ where: { contractId, versionNumber: { in: [fromVersion, toVersion] } }, orderBy: { versionNumber: 'asc' } });
    if (versions.length !== 2) throw new NotFoundException('One or both contract versions were not found');
    const from = versions.find((item) => item.versionNumber === fromVersion)!;
    const to = versions.find((item) => item.versionNumber === toVersion)!;
    const changes = this.lineDiff(from.content, to.content);
    return { from: { id: from.id, versionNumber: from.versionNumber, title: from.title }, to: { id: to.id, versionNumber: to.versionNumber, title: to.title }, stats: {
      added: changes.filter((item) => item.type === 'added').length,
      removed: changes.filter((item) => item.type === 'removed').length,
      unchanged: changes.filter((item) => item.type === 'unchanged').length,
    }, changes };
  }

  private compose(template: { nameEn: string; nameAm: string; clauses: { sequence: number; isRequired: boolean; clause: { titleEn: string; titleAm: string; bodyEn: string; bodyAm: string } }[] }, language: 'en' | 'am' | 'bilingual', values: Record<string, string>) {
    const render = (text: string) => text.replace(/\{\{([a-z][a-z0-9_]*)\}\}/g, (_, key: string) => values[key] ?? `[${key}]`);
    const en = [`# ${render(template.nameEn)}`, ...template.clauses.map((item) => `## ${item.sequence}. ${render(item.clause.titleEn)}\n\n${render(item.clause.bodyEn)}`)].join('\n\n');
    const am = [`# ${render(template.nameAm)}`, ...template.clauses.map((item) => `## ${item.sequence}. ${render(item.clause.titleAm)}\n\n${render(item.clause.bodyAm)}`)].join('\n\n');
    return language === 'en' ? en : language === 'am' ? am : `${en}\n\n---\n\n${am}`;
  }

  private lineDiff(before: string, after: string) {
    const left = before.split(/\r?\n/).slice(0, 600);
    const right = after.split(/\r?\n/).slice(0, 600);
    const table = Array.from({ length: left.length + 1 }, () => new Uint16Array(right.length + 1));
    for (let i = left.length - 1; i >= 0; i--) for (let j = right.length - 1; j >= 0; j--) table[i]![j] = left[i] === right[j] ? table[i + 1]![j + 1]! + 1 : Math.max(table[i + 1]![j]!, table[i]![j + 1]!);
    const changes: { type: 'added' | 'removed' | 'unchanged'; text: string }[] = [];
    let i = 0; let j = 0;
    while (i < left.length && j < right.length) {
      if (left[i] === right[j]) { changes.push({ type: 'unchanged', text: left[i]! }); i++; j++; }
      else if (table[i + 1]![j]! >= table[i]![j + 1]!) { changes.push({ type: 'removed', text: left[i++]! }); }
      else { changes.push({ type: 'added', text: right[j++]! }); }
    }
    while (i < left.length) changes.push({ type: 'removed', text: left[i++]! });
    while (j < right.length) changes.push({ type: 'added', text: right[j++]! });
    return changes;
  }
}
