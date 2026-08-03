import { BadRequestException, ConflictException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { DraftingService } from './drafting.service';

const principal = { userId: 'user-1', subject: 'subject-1', issuer: 'issuer', email: 'owner@example.com' };

function makeService(client: Record<string, unknown>) {
  const audit = { write: vi.fn().mockResolvedValue({}) };
  return { service: new DraftingService({ client } as never, audit as never), audit };
}

describe('DraftingService', () => {
  it('rejects duplicate clauses within one template', async () => {
    const { service } = makeService({});
    await expect(service.createTemplate('org-1', principal, {
      code: 'SERVICES', contractType: 'Service Agreement', nameEn: 'Services template', nameAm: 'የአገልግሎት አብነት',
      clauses: [{ clauseId: '10000000-0000-4000-8000-000000000001' }, { clauseId: '10000000-0000-4000-8000-000000000001' }],
    })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('does not apply templates to contracts already in review', async () => {
    const tx = { contract: { findFirst: vi.fn().mockResolvedValue({ id: 'contract-1', status: 'IN_REVIEW', organization: { name: 'Demo' } }) } };
    const { service } = makeService({ $transaction: (callback: (value: typeof tx) => unknown) => callback(tx) });
    await expect(service.instantiate('org-1', 'contract-1', principal, { templateId: '10000000-0000-4000-8000-000000000001', language: 'en' })).rejects.toBeInstanceOf(ConflictException);
  });

  it('produces an auditable bilingual version from an organization template', async () => {
    const tx = {
      contract: {
        findFirst: vi.fn().mockResolvedValue({ id: 'contract-1', status: 'DRAFT', contractNumber: 'CON-1', title: 'Support', counterpartyName: 'Demo PLC', valueMinor: 10000n, currency: 'ETB', effectiveDate: null, expirationDate: null, organization: { name: 'Kal_flow' } }),
        update: vi.fn(),
      },
      contractTemplate: { findFirst: vi.fn().mockResolvedValue({ id: 'template-1', code: 'SERVICES', nameEn: 'Service Agreement', nameAm: 'የአገልግሎት ውል', clauses: [{ sequence: 1, isRequired: true, clause: { titleEn: 'Parties', titleAm: 'ተዋዋይ ወገኖች', bodyEn: '{{organization_name}} and {{counterparty_name}} agree.', bodyAm: '{{organization_name}} እና {{counterparty_name}} ተስማሙ።' } }] }) },
      contractVersion: { aggregate: vi.fn().mockResolvedValue({ _max: { versionNumber: 1 } }), create: vi.fn().mockImplementation(({ data }) => ({ id: 'version-2', ...data })) },
      auditEvent: { create: vi.fn().mockResolvedValue({}) },
    };
    const { service, audit } = makeService({ $transaction: (callback: (value: typeof tx) => unknown) => callback(tx) });
    const result = await service.instantiate('org-1', 'contract-1', principal, { templateId: '10000000-0000-4000-8000-000000000001', language: 'bilingual' });
    expect(result.content).toContain('Kal_flow and Demo PLC agree.');
    expect(result.content).toContain('Kal_flow እና Demo PLC ተስማሙ።');
    expect(result.versionNumber).toBe(2);
    expect(audit.write).toHaveBeenCalled();
  });

  it('returns line additions and removals between tenant-scoped versions', async () => {
    const client = {
      contract: { findFirst: vi.fn().mockResolvedValue({ id: 'contract-1' }) },
      contractVersion: { findMany: vi.fn().mockResolvedValue([
        { id: 'v1', versionNumber: 1, title: 'First', content: 'Alpha\nPayment in 30 days\nOmega' },
        { id: 'v2', versionNumber: 2, title: 'Second', content: 'Alpha\nPayment in 15 days\nOmega' },
      ]) },
    };
    const { service } = makeService(client);
    await expect(service.compareVersions('org-1', 'contract-1', 1, 2)).resolves.toMatchObject({ stats: { added: 1, removed: 1, unchanged: 2 } });
  });
});
