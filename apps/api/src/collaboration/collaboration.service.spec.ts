import { BadRequestException, ConflictException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { CollaborationService } from './collaboration.service';

const principal = { userId: 'user-1', subject: 'subject-1', issuer: 'issuer', email: 'manager@kalflow.local' };
const makeService = (client: Record<string, unknown>) => new CollaborationService({ client } as never, { write: vi.fn().mockResolvedValue({}) } as never);

describe('CollaborationService', () => {
  it('retains counterparties linked to contract history', async () => {
    const service = makeService({ counterparty: { findFirst: vi.fn().mockResolvedValue({ id: 'party-1', legalName: 'Demo PLC', _count: { contracts: 1, negotiations: 0 } }) } });
    await expect(service.deleteCounterparty('org-1', 'party-1', principal)).rejects.toBeInstanceOf(ConflictException);
  });

  it('requires every negotiation item to be resolved before agreement', async () => {
    const service = makeService({ negotiation: { findFirst: vi.fn().mockResolvedValue({ id: 'neg-1', status: 'OPEN' }) }, negotiationMessage: { count: vi.fn().mockResolvedValue(1) } });
    await expect(service.agreeNegotiation('org-1', 'neg-1', principal)).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects duplicate signer order before creating signature evidence', async () => {
    const service = makeService({});
    await expect(service.createPacket('org-1', principal, { contractId: 'contract-1', contractVersionId: 'version-1', title: 'Packet', signers: [{ sequence: 1, name: 'One', email: 'one@example.com' }, { sequence: 1, name: 'Two', email: 'two@example.com' }] } as never)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('prevents later demo signers from signing out of order', async () => {
    const service = makeService({ signaturePacket: { findFirst: vi.fn().mockResolvedValue({ id: 'packet-1', status: 'SENT', provider: 'INTERNAL_DEMO', documentSha256: 'abc', signers: [{ id: 'signer-1', sequence: 1, email: 'one@example.com', status: 'SENT' }, { id: 'signer-2', sequence: 2, email: 'two@example.com', status: 'SENT' }] }) } });
    await expect(service.demoSign('org-1', 'packet-1', 'signer-2', principal)).rejects.toBeInstanceOf(ConflictException);
  });
});
