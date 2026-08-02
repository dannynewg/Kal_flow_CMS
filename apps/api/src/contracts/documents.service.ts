import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { createHash, randomUUID } from 'node:crypto';
import type { AuthenticatedPrincipal } from '../auth/principal';
import { AuditService } from '../organizations/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';

const allowedTypes = new Set(['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']);

@Injectable()
export class DocumentsService {
  constructor(private readonly prisma: PrismaService, private readonly storage: StorageService, private readonly audit: AuditService) {}

  async list(organizationId: string, contractId: string) {
    await this.requireContract(organizationId, contractId);
    const documents = await this.prisma.client.contractDocument.findMany({
      where: { organizationId, contractId },
      select: { id: true, contractVersionId: true, originalName: true, mimeType: true, sizeBytes: true, sha256: true, status: true, createdAt: true, uploadedBy: { select: { email: true, displayName: true } } },
      orderBy: { createdAt: 'desc' },
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

  private async requireContract(organizationId: string, contractId: string) {
    const contract = await this.prisma.client.contract.findFirst({ where: { id: contractId, organizationId }, select: { id: true } });
    if (!contract) throw new NotFoundException('Contract not found');
    return contract;
  }
}
