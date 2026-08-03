import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { DocumentsService } from './documents.service';

const principal = { userId: 'user-1', subject: 'subject-1', issuer: 'issuer', email: 'owner@example.com' };

function serviceWith(client: Record<string, unknown>) {
  const storage = { put: vi.fn().mockResolvedValue(undefined), remove: vi.fn().mockResolvedValue(undefined), createDownloadUrl: vi.fn().mockResolvedValue({ url: 'https://storage.example/signed', expiresAt: '2026-08-03T00:05:00.000Z' }) };
  const audit = { write: vi.fn().mockResolvedValue({}) };
  return { service: new DocumentsService({ client } as never, storage as never, audit as never), storage, audit };
}

describe('DocumentsService security boundaries', () => {
  it('rejects unsupported file types before storage', async () => {
    const { service, storage } = serviceWith({});
    const file = { originalname: 'payload.exe', mimetype: 'application/octet-stream', size: 4, buffer: Buffer.from('test') };
    await expect(service.upload('org-1', 'contract-1', principal, file as never)).rejects.toBeInstanceOf(BadRequestException);
    expect(storage.put).not.toHaveBeenCalled();
  });

  it('stores a randomized object key and SHA-256 fingerprint', async () => {
    const pending = { id: 'document-1' };
    const available = { ...pending, originalName: 'agreement.pdf', sizeBytes: 4n, status: 'AVAILABLE' };
    const tx = { contractDocument: { update: vi.fn().mockResolvedValue(available) }, documentPage: { create: vi.fn().mockResolvedValue({}) } };
    const client = {
      contract: { findFirst: vi.fn().mockResolvedValue({ id: 'contract-1' }) },
      contractDocument: { create: vi.fn().mockResolvedValue(pending), delete: vi.fn() },
      $transaction: (callback: (value: typeof tx) => unknown) => callback(tx),
    };
    const { service, storage, audit } = serviceWith(client);
    const file = { originalname: 'agreement.pdf', mimetype: 'application/pdf', size: 4, buffer: Buffer.from('test') };
    await expect(service.upload('org-1', 'contract-1', principal, file as never)).resolves.toMatchObject({ id: 'document-1', sizeBytes: '4', status: 'AVAILABLE' });
    expect(storage.put).toHaveBeenCalledWith(expect.stringMatching(/^org-1\/contract-1\/[a-f0-9-]+-agreement\.pdf$/), file.buffer, 'application/pdf');
    expect(client.contractDocument.create).toHaveBeenCalledWith({ data: expect.objectContaining({ sha256: '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08' }) });
    expect(audit.write).toHaveBeenCalledWith(tx, expect.objectContaining({ action: 'contract.document_uploaded', organizationId: 'org-1' }));
  });

  it('does not issue a download URL across a tenant boundary', async () => {
    const client = { contractDocument: { findFirst: vi.fn().mockResolvedValue(null) } };
    const { service, storage } = serviceWith(client);
    await expect(service.download('org-other', 'contract-1', 'document-1')).rejects.toBeInstanceOf(NotFoundException);
    expect(client.contractDocument.findFirst).toHaveBeenCalledWith({ where: { id: 'document-1', organizationId: 'org-other', contractId: 'contract-1', status: 'AVAILABLE' } });
    expect(storage.createDownloadUrl).not.toHaveBeenCalled();
  });

  it('scopes document-center search to one organization', async () => {
    const findMany = vi.fn().mockResolvedValue([{ id: 'document-1', sizeBytes: 1200n, contract: { contractNumber: 'CON-1' } }]);
    const { service } = serviceWith({ contractDocument: { findMany } });
    await expect(service.search('org-1', { query: 'supplier', category: 'SUPPORTING' as never })).resolves.toEqual([{ id: 'document-1', sizeBytes: '1200', contract: { contractNumber: 'CON-1' } }]);
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ organizationId: 'org-1', category: 'SUPPORTING' }) }));
  });

  it('archives metadata without deleting the stored file', async () => {
    const existing = { id: 'document-1', contractId: 'contract-1', sha256: 'abc', status: 'AVAILABLE' };
    const archived = { ...existing, sizeBytes: 50n, status: 'ARCHIVED' };
    const tx = { contractDocument: { update: vi.fn().mockResolvedValue(archived) } };
    const client = { contractDocument: { findFirst: vi.fn().mockResolvedValue(existing) }, $transaction: (callback: (value: typeof tx) => unknown) => callback(tx) };
    const { service, audit, storage } = serviceWith(client);
    await expect(service.archive('org-1', 'document-1', principal)).resolves.toMatchObject({ status: 'ARCHIVED', sizeBytes: '50' });
    expect(audit.write).toHaveBeenCalledWith(tx, expect.objectContaining({ action: 'contract.document_archived', organizationId: 'org-1' }));
    expect(storage.put).not.toHaveBeenCalled();
  });

  it('protects archived documents until their retention date', async () => {
    const existing = { id: 'document-1', contractId: 'contract-1', originalName: 'agreement.pdf', objectKey: 'org/doc', sha256: 'abc', status: 'ARCHIVED', retentionUntil: new Date('2099-01-01') };
    const { service, storage } = serviceWith({ contractDocument: { findFirst: vi.fn().mockResolvedValue(existing) } });
    await expect(service.remove('org-1', 'document-1', principal)).rejects.toBeInstanceOf(ConflictException);
    expect(storage.remove).not.toHaveBeenCalled();
  });

  it('saves consecutive pages as an immutable revision snapshot', async () => {
    const existing = { id: 'document-1', contractId: 'contract-1', status: 'AVAILABLE' };
    const pages = [{ id: 'page-1', documentId: 'document-1', pageNumber: 1, title: 'Scope', content: 'Terms' }];
    const tx = { documentRevision: { aggregate: vi.fn().mockResolvedValue({ _max: { revisionNumber: 2 } }), create: vi.fn().mockResolvedValue({}) }, documentPage: { deleteMany: vi.fn(), createMany: vi.fn(), findMany: vi.fn().mockResolvedValue(pages) } };
    const client = { contractDocument: { findFirst: vi.fn().mockResolvedValue(existing) }, $transaction: (callback: (value: typeof tx) => unknown) => callback(tx) };
    const { service, audit } = serviceWith(client);
    await expect(service.saveWorkspace('org-1', 'document-1', principal, { pages: [{ pageNumber: 1, title: 'Scope', content: 'Terms' }], summary: 'Legal edits' })).resolves.toEqual({ revisionNumber: 3, pages });
    expect(tx.documentRevision.create).toHaveBeenCalledWith({ data: expect.objectContaining({ revisionNumber: 3, createdByUserId: 'user-1' }) });
    expect(audit.write).toHaveBeenCalledWith(tx, expect.objectContaining({ action: 'contract.document_pages_updated' }));
  });
});
