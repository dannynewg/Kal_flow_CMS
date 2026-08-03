import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { createHash, randomUUID } from 'node:crypto';
import type { AuthenticatedPrincipal } from '../auth/principal';
import { AuditService } from '../organizations/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import type { SaveDocumentPagesDto, SearchDocumentsDto, UpdateDocumentDto } from './dto';

const allowedTypes = new Set(['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']);

@Injectable()
export class DocumentsService {
  constructor(private readonly prisma: PrismaService, private readonly storage: StorageService, private readonly audit: AuditService) {}

  async list(organizationId: string, contractId: string) {
    await this.requireContract(organizationId, contractId);
    const documents = await this.prisma.client.contractDocument.findMany({
      where: { organizationId, contractId },
      select: { id: true, contractVersionId: true, originalName: true, title: true, description: true, category: true, confidentiality: true, tags: true, retentionUntil: true, mimeType: true, sizeBytes: true, sha256: true, status: true, createdAt: true, uploadedBy: { select: { email: true, displayName: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return documents.map((document) => ({ ...document, sizeBytes: document.sizeBytes.toString() }));
  }

  async search(organizationId: string, input: SearchDocumentsDto) {
    const query = input.query?.trim();
    const documents = await this.prisma.client.contractDocument.findMany({
      where: {
        organizationId,
        status: input.status ?? { in: ['AVAILABLE', 'ARCHIVED'] },
        ...(input.category ? { category: input.category } : {}),
        ...(input.confidentiality ? { confidentiality: input.confidentiality } : {}),
        ...(query ? { OR: [
          { originalName: { contains: query, mode: 'insensitive' } },
          { title: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
          { tags: { has: query.toLowerCase() } },
          { contract: { is: { OR: [{ contractNumber: { contains: query, mode: 'insensitive' } }, { title: { contains: query, mode: 'insensitive' } }, { counterpartyName: { contains: query, mode: 'insensitive' } }] } } },
        ] } : {}),
      },
      select: {
        id: true, contractId: true, contractVersionId: true, originalName: true, title: true, description: true,
        category: true, confidentiality: true, tags: true, retentionUntil: true, mimeType: true, sizeBytes: true,
        sha256: true, status: true, createdAt: true,
        contract: { select: { id: true, contractNumber: true, title: true, counterpartyName: true, department: { select: { id: true, code: true, name: true } } } },
        uploadedBy: { select: { email: true, displayName: true } },
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: 200,
    });
    return documents.map((document) => ({ ...document, sizeBytes: document.sizeBytes.toString() }));
  }

  async upload(organizationId: string, contractId: string, principal: AuthenticatedPrincipal, file: Express.Multer.File | undefined, contractVersionId?: string) {
    if (!file) throw new BadRequestException('A document file is required');
    if (!allowedTypes.has(file.mimetype)) throw new BadRequestException('Only PDF and DOCX documents are supported');
    const maxMegabytes = Number(process.env.MAX_UPLOAD_SIZE_MB ?? 25);
    if (file.size > maxMegabytes * 1024 * 1024) throw new BadRequestException(`Document exceeds the ${maxMegabytes} MB limit`);
    await this.requireContract(organizationId, contractId);
    if (contractVersionId) {
      const version = await this.prisma.client.contractVersion.findFirst({ where: { id: contractVersionId, contractId, contract: { organizationId } } });
      if (!version) throw new BadRequestException('Contract version does not belong to this contract');
    }

    const safeName = file.originalname.normalize('NFKC').replace(/[^a-zA-Z0-9._-]+/g, '-').slice(-120) || 'document';
    const objectKey = `${organizationId}/${contractId}/${randomUUID()}-${safeName}`;
    const sha256 = createHash('sha256').update(file.buffer).digest('hex');
    const pending = await this.prisma.client.contractDocument.create({ data: { organizationId, contractId, contractVersionId, uploadedByUserId: principal.userId, objectKey, originalName: file.originalname.slice(0, 255), mimeType: file.mimetype, sizeBytes: BigInt(file.size), sha256 } });
    try {
      await this.storage.put(objectKey, file.buffer, file.mimetype);
      return await this.prisma.client.$transaction(async (tx) => {
        const document = await tx.contractDocument.update({ where: { id: pending.id }, data: { status: 'AVAILABLE' } });
        await tx.documentPage.create({ data: { documentId: document.id, pageNumber: 1, title: 'Page 1', content: '' } });
        await this.audit.write(tx, { organizationId, actorUserId: principal.userId, action: 'contract.document_uploaded', entityType: 'contract_document', entityId: document.id, metadata: { contractId, contractVersionId: contractVersionId ?? null, fileName: document.originalName, sizeBytes: document.sizeBytes.toString(), sha256 } });
        return { ...document, sizeBytes: document.sizeBytes.toString() };
      });
    } catch (error) {
      await this.prisma.client.contractDocument.delete({ where: { id: pending.id } }).catch(() => undefined);
      throw error;
    }
  }

  async download(organizationId: string, contractId: string, documentId: string) {
    const document = await this.prisma.client.contractDocument.findFirst({ where: { id: documentId, organizationId, contractId, status: 'AVAILABLE' } });
    if (!document) throw new NotFoundException('Contract document not found');
    return this.storage.createDownloadUrl(document.objectKey);
  }

  async downloadByOrganization(organizationId: string, documentId: string) {
    const document = await this.prisma.client.contractDocument.findFirst({ where: { id: documentId, organizationId, status: { in: ['AVAILABLE', 'ARCHIVED'] } } });
    if (!document) throw new NotFoundException('Contract document not found');
    return this.storage.createDownloadUrl(document.objectKey);
  }

  async update(organizationId: string, documentId: string, principal: AuthenticatedPrincipal, input: UpdateDocumentDto) {
    const existing = await this.requireDocument(organizationId, documentId);
    if (existing.status === 'QUARANTINED') throw new BadRequestException('Quarantined documents cannot be edited');
    const tags = input.tags?.map((tag) => tag.trim().toLowerCase()).filter(Boolean);
    return this.prisma.client.$transaction(async (tx) => {
      const document = await tx.contractDocument.update({
        where: { id: documentId },
        data: {
          title: input.title?.trim(), description: input.description?.trim(), category: input.category,
          confidentiality: input.confidentiality, tags, retentionUntil: input.retentionUntil ? new Date(input.retentionUntil) : undefined,
        },
        include: { contract: { select: { id: true, contractNumber: true, title: true, counterpartyName: true, department: { select: { id: true, code: true, name: true } } } }, uploadedBy: { select: { email: true, displayName: true } } },
      });
      await this.audit.write(tx, { organizationId, actorUserId: principal.userId, action: 'contract.document_metadata_updated', entityType: 'contract_document', entityId: documentId, metadata: { contractId: existing.contractId, category: document.category, confidentiality: document.confidentiality, tags: document.tags } });
      return { ...document, sizeBytes: document.sizeBytes.toString() };
    });
  }

  async archive(organizationId: string, documentId: string, principal: AuthenticatedPrincipal) {
    const existing = await this.requireDocument(organizationId, documentId);
    if (existing.status === 'QUARANTINED') throw new BadRequestException('Quarantined documents cannot be archived');
    return this.prisma.client.$transaction(async (tx) => {
      const document = await tx.contractDocument.update({ where: { id: documentId }, data: { status: 'ARCHIVED' } });
      await this.audit.write(tx, { organizationId, actorUserId: principal.userId, action: 'contract.document_archived', entityType: 'contract_document', entityId: documentId, metadata: { contractId: existing.contractId, sha256: existing.sha256 } });
      return { ...document, sizeBytes: document.sizeBytes.toString() };
    });
  }

  async restore(organizationId: string, documentId: string, principal: AuthenticatedPrincipal) {
    const existing = await this.requireDocument(organizationId, documentId);
    if (existing.status !== 'ARCHIVED') throw new ConflictException('Only archived documents can be restored');
    return this.prisma.client.$transaction(async (tx) => {
      const document = await tx.contractDocument.update({ where: { id: documentId }, data: { status: 'AVAILABLE' } });
      await this.audit.write(tx, { organizationId, actorUserId: principal.userId, action: 'contract.document_restored', entityType: 'contract_document', entityId: documentId, metadata: { contractId: existing.contractId } });
      return { ...document, sizeBytes: document.sizeBytes.toString() };
    });
  }

  async remove(organizationId: string, documentId: string, principal: AuthenticatedPrincipal) {
    const existing = await this.requireDocument(organizationId, documentId);
    if (existing.status !== 'ARCHIVED') throw new ConflictException('Archive the document before permanent deletion');
    if (existing.retentionUntil && existing.retentionUntil > new Date()) throw new ConflictException('This document is protected by its retention date');
    await this.storage.remove(existing.objectKey);
    await this.prisma.client.$transaction(async (tx) => {
      await this.audit.write(tx, { organizationId, actorUserId: principal.userId, action: 'contract.document_deleted', entityType: 'contract_document', entityId: documentId, metadata: { contractId: existing.contractId, fileName: existing.originalName, sha256: existing.sha256 } });
      await tx.contractDocument.delete({ where: { id: documentId } });
    });
    return { deleted: true };
  }

  async workspace(organizationId: string, documentId: string) {
    const document = await this.prisma.client.contractDocument.findFirst({
      where: { id: documentId, organizationId, status: { in: ['AVAILABLE', 'ARCHIVED'] } },
      include: { pages: { orderBy: { pageNumber: 'asc' } }, revisions: { orderBy: { revisionNumber: 'desc' }, take: 20, select: { id: true, revisionNumber: true, summary: true, createdAt: true, createdBy: { select: { displayName: true, email: true } } } } },
    });
    if (!document) throw new NotFoundException('Document workspace not found');
    const preview = await this.storage.createDownloadUrl(document.objectKey);
    return { document: { id: document.id, originalName: document.originalName, mimeType: document.mimeType, status: document.status }, pages: document.pages.length ? document.pages : [{ pageNumber: 1, title: 'Page 1', content: '' }], revisions: document.revisions, preview };
  }

  async saveWorkspace(organizationId: string, documentId: string, principal: AuthenticatedPrincipal, input: SaveDocumentPagesDto) {
    const document = await this.requireDocument(organizationId, documentId);
    if (document.status !== 'AVAILABLE') throw new ConflictException('Only available documents can be edited');
    const ordered = [...input.pages].sort((a, b) => a.pageNumber - b.pageNumber);
    if (ordered.some((page, index) => page.pageNumber !== index + 1)) throw new BadRequestException('Page numbers must be consecutive and begin at 1');
    return this.prisma.client.$transaction(async (tx) => {
      const latest = await tx.documentRevision.aggregate({ where: { documentId }, _max: { revisionNumber: true } });
      const revisionNumber = (latest._max.revisionNumber ?? 0) + 1;
      const snapshot = ordered.map(({ pageNumber, title, content }) => ({ pageNumber, title: title ?? null, content }));
      await tx.documentRevision.create({ data: { documentId, revisionNumber, summary: input.summary?.trim(), pages: snapshot, createdByUserId: principal.userId } });
      await tx.documentPage.deleteMany({ where: { documentId } });
      await tx.documentPage.createMany({ data: ordered.map((page) => ({ documentId, pageNumber: page.pageNumber, title: page.title?.trim(), content: page.content })) });
      await this.audit.write(tx, { organizationId, actorUserId: principal.userId, action: 'contract.document_pages_updated', entityType: 'contract_document', entityId: documentId, metadata: { contractId: document.contractId, revisionNumber, pageCount: ordered.length } });
      return { revisionNumber, pages: await tx.documentPage.findMany({ where: { documentId }, orderBy: { pageNumber: 'asc' } }) };
    });
  }

  private async requireContract(organizationId: string, contractId: string) {
    const contract = await this.prisma.client.contract.findFirst({ where: { id: contractId, organizationId }, select: { id: true } });
    if (!contract) throw new NotFoundException('Contract not found');
    return contract;
  }

  private async requireDocument(organizationId: string, documentId: string) {
    const document = await this.prisma.client.contractDocument.findFirst({ where: { id: documentId, organizationId } });
    if (!document) throw new NotFoundException('Contract document not found');
    return document;
  }
}
