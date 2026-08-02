import { BadRequestException, NotFoundException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { DocumentsService } from './documents.service';

const principal = { userId: 'user-1', subject: 'subject-1', issuer: 'issuer', email: 'owner@example.com' };

function serviceWith(client: Record<string, unknown>) {
  const storage = { put: vi.fn().mockResolvedValue(undefined), createDownloadUrl: vi.fn().mockResolvedValue({ url: 'https://storage.example/signed', expiresAt: '2026-08-03T00:05:00.000Z' }) };
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
    const tx = { contractDocument: { update: vi.fn().mockResolvedValue(available) } };
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
});
