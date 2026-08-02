import { createHash } from 'node:crypto';
import { createPrismaClient } from '../src/index';

const prisma = createPrismaClient();
const issuer = `${process.env.KEYCLOAK_URL ?? 'http://localhost:8080'}/realms/${process.env.KEYCLOAK_REALM ?? 'kal-flow'}`;
const now = new Date();
const day = 24 * 60 * 60 * 1_000;
const dateFromNow = (days: number) => new Date(now.getTime() + days * day);
const tokenHash = (value: string) => createHash('sha256').update(value).digest('hex');

const ids = {
  organization: '10000000-0000-4000-8000-000000000001',
  users: {
    admin: '20000000-0000-4000-8000-000000000001',
    manager: '20000000-0000-4000-8000-000000000002',
    legal: '20000000-0000-4000-8000-000000000003',
    finance: '20000000-0000-4000-8000-000000000004',
    procurement: '20000000-0000-4000-8000-000000000005',
    viewer: '20000000-0000-4000-8000-000000000006',
  },
  memberships: {
    admin: '30000000-0000-4000-8000-000000000001',
    manager: '30000000-0000-4000-8000-000000000002',
    legal: '30000000-0000-4000-8000-000000000003',
    finance: '30000000-0000-4000-8000-000000000004',
    procurement: '30000000-0000-4000-8000-000000000005',
    viewer: '30000000-0000-4000-8000-000000000006',
  },
  departments: {
    executive: '40000000-0000-4000-8000-000000000001',
    legal: '40000000-0000-4000-8000-000000000002',
    procurement: '40000000-0000-4000-8000-000000000003',
    finance: '40000000-0000-4000-8000-000000000004',
    operations: '40000000-0000-4000-8000-000000000005',
    hr: '40000000-0000-4000-8000-000000000006',
  },
};

async function seedUser(id: string, subject: string, email: string, displayName: string) {
  return prisma.user.upsert({
    where: { identityProvider_subject: { identityProvider: issuer, subject } },
    create: { id, identityProvider: issuer, subject, email, displayName },
    update: {},
  });
}

async function main() {
  const existingAdmin = await prisma.user.findFirst({
    where: { email: { equals: 'admin@kalflow.local', mode: 'insensitive' } },
    orderBy: { createdAt: 'asc' },
  });
  const admin = existingAdmin ?? await seedUser(ids.users.admin, '00000000-0000-4000-8000-000000000001', 'admin@kalflow.local', 'Kal_flow Administrator');
  const manager = await seedUser(ids.users.manager, 'demo-contract-manager', 'meron.bekele@kalflow.demo', 'Meron Bekele');
  const legal = await seedUser(ids.users.legal, 'demo-legal-officer', 'nahom.tadesse@kalflow.demo', 'Nahom Tadesse');
  const finance = await seedUser(ids.users.finance, 'demo-finance-officer', 'selamawit.girma@kalflow.demo', 'Selamawit Girma');
  const procurement = await seedUser(ids.users.procurement, 'demo-procurement-officer', 'dawit.kebede@kalflow.demo', 'Dawit Kebede');
  const viewer = await seedUser(ids.users.viewer, 'demo-auditor', 'hana.mekonnen@kalflow.demo', 'Hana Mekonnen');

  const organization = await prisma.organization.upsert({
    where: { slug: 'kal-flow-demo' },
    create: {
      id: ids.organization,
      slug: 'kal-flow-demo',
      name: 'Kal_flow Demo Enterprise',
      description: 'Fictional Ethiopian organization for safely testing the complete contract lifecycle.',
      timezone: 'Africa/Addis_Ababa',
      settings: { demo: true, defaultCurrency: 'ETB', fiscalYearStartMonth: 7 },
    },
    update: {},
  });

  const membershipSpecs = [
    [ids.memberships.admin, admin.id, 'OWNER'],
    [ids.memberships.manager, manager.id, 'CONTRACT_MANAGER'],
    [ids.memberships.legal, legal.id, 'LEGAL_OFFICER'],
    [ids.memberships.finance, finance.id, 'FINANCE_OFFICER'],
    [ids.memberships.procurement, procurement.id, 'PROCUREMENT_OFFICER'],
    [ids.memberships.viewer, viewer.id, 'AUDITOR'],
  ] as const;
  const memberships = new Map<string, { id: string }>();
  for (const [id, userId, role] of membershipSpecs) {
    const membership = await prisma.membership.upsert({
      where: { organizationId_userId: { organizationId: organization.id, userId } },
      create: { id, organizationId: organization.id, userId, role },
      update: {},
      select: { id: true },
    });
    memberships.set(userId, membership);
  }

  const departmentSpecs = [
    [ids.departments.executive, 'EXEC', 'Executive Office', null, 'Executive oversight and administration'],
    [ids.departments.legal, 'LEGAL', 'Legal & Compliance', ids.departments.executive, 'Contract drafting, review, and compliance'],
    [ids.departments.procurement, 'PROC', 'Procurement', ids.departments.executive, 'Strategic sourcing and supplier management'],
    [ids.departments.finance, 'FIN', 'Finance', ids.departments.executive, 'Financial controls, budgets, and approvals'],
    [ids.departments.operations, 'OPS', 'Operations', ids.departments.executive, 'Service delivery and operational contracts'],
    [ids.departments.hr, 'HR', 'People & Culture', ids.departments.executive, 'Employment and workforce agreements'],
  ] as const;
  const departments = new Map<string, { id: string }>();
  for (const [id, code, name, parentId, description] of departmentSpecs) {
    const department = await prisma.department.upsert({
      where: { organizationId_code: { organizationId: organization.id, code } },
      create: { id, organizationId: organization.id, code, name, parentId, description },
      update: {},
      select: { id: true },
    });
    departments.set(code, department);
  }

  const assignments = [
    ['EXEC', admin.id, true], ['LEGAL', legal.id, true], ['LEGAL', manager.id, false],
    ['PROC', procurement.id, true], ['PROC', manager.id, false], ['FIN', finance.id, true],
    ['OPS', manager.id, true], ['HR', viewer.id, false],
  ] as const;
  for (const [code, userId, isManager] of assignments) {
    await prisma.departmentMembership.upsert({
      where: { departmentId_membershipId: { departmentId: departments.get(code)!.id, membershipId: memberships.get(userId)!.id } },
      create: { departmentId: departments.get(code)!.id, membershipId: memberships.get(userId)!.id, isManager },
      update: {},
    });
  }

  const invitations = [
    ['50000000-0000-4000-8000-000000000001', 'abeba.worku@example.test', 'DEPARTMENT_MANAGER', 'PENDING', 7],
    ['50000000-0000-4000-8000-000000000002', 'yonas.abate@example.test', 'VIEWER', 'REVOKED', 14],
  ] as const;
  for (const [id, email, role, status, expiresInDays] of invitations) {
    await prisma.invitation.upsert({
      where: { tokenHash: tokenHash(`kal-flow-demo:${email}`) },
      create: {
        id, organizationId: organization.id, email, role, status,
        tokenHash: tokenHash(`kal-flow-demo:${email}`), invitedByUserId: admin.id,
        expiresAt: dateFromNow(expiresInDays), ...(status === 'REVOKED' ? { revokedAt: dateFromNow(-2) } : {}),
      },
      update: {},
    });
  }

  const requestSpecs = [
    ['60000000-0000-4000-8000-000000000001', 'REQ-2026-0001', 'Fleet maintenance framework', 'PROC', 'Procurement needs a two-year preventive and corrective maintenance framework for the Addis Ababa service fleet.', 'Service Agreement', 'Abyssinia Fleet Services PLC', 18_500_000_00n, 'DRAFT', 'MEDIUM'],
    ['60000000-0000-4000-8000-000000000002', 'REQ-2026-0002', 'Cloud backup subscription', 'OPS', 'Secure off-site backup and disaster recovery service for operational systems, including data residency safeguards.', 'Technology Subscription', 'Ethio Cloud Systems SC', 7_200_000_00n, 'SUBMITTED', 'HIGH'],
    ['60000000-0000-4000-8000-000000000003', 'REQ-2026-0003', 'Regional office lease renewal', 'EXEC', 'Renew the Bole regional office lease with revised escalation, maintenance, and early termination provisions.', 'Lease Agreement', 'Blue Nile Properties PLC', 12_600_000_00n, 'TRIAGED', 'MEDIUM'],
    ['60000000-0000-4000-8000-000000000004', 'REQ-2026-0004', 'Employee medical coverage', 'HR', 'Annual group medical coverage for employees and eligible dependants across Ethiopia.', 'Insurance Agreement', 'Lucy Insurance SC', 9_850_000_00n, 'CONVERTED', 'LOW'],
    ['60000000-0000-4000-8000-000000000005', 'REQ-2026-0005', 'Warehouse solar installation', 'OPS', 'Design and installation of rooftop solar generation at the main warehouse.', 'Works Contract', 'Green Horizon Energy PLC', 32_000_000_00n, 'CONVERTED', 'HIGH'],
    ['60000000-0000-4000-8000-000000000006', 'REQ-2026-0006', 'External legal retainer', 'LEGAL', 'Annual legal advisory retainer covering commercial disputes and regulatory updates.', 'Professional Services', 'Tadesse & Partners Law Office', 4_800_000_00n, 'CONVERTED', 'MEDIUM'],
    ['60000000-0000-4000-8000-000000000007', 'REQ-2026-0007', 'Office catering services', 'OPS', 'Daily catering service for the head office and scheduled corporate events.', 'Service Agreement', 'Enat Catering PLC', 3_900_000_00n, 'CONVERTED', 'LOW'],
    ['60000000-0000-4000-8000-000000000008', 'REQ-2026-0008', 'Managed IT support', 'OPS', 'Managed service desk, endpoint support, and infrastructure monitoring for the head office.', 'Managed Services Agreement', 'Addis Digital Solutions PLC', 6_750_000_00n, 'CONVERTED', 'MEDIUM'],
  ] as const;
  const requests = new Map<string, { id: string }>();
  for (const [id, requestNumber, title, departmentCode, description, contractType, counterpartyName, estimatedValueMinor, status, riskLevel] of requestSpecs) {
    const timestamps = status === 'DRAFT' ? {} : { submittedAt: dateFromNow(-18), ...(status === 'TRIAGED' || status === 'CONVERTED' ? { triagedAt: dateFromNow(-16) } : {}), ...(status === 'CONVERTED' ? { convertedAt: dateFromNow(-14) } : {}) };
    const request = await prisma.contractRequest.upsert({
      where: { organizationId_requestNumber: { organizationId: organization.id, requestNumber } },
      create: {
        id, organizationId: organization.id, departmentId: departments.get(departmentCode)!.id,
        requesterUserId: procurement.id, assignedToUserId: status === 'DRAFT' || status === 'SUBMITTED' ? null : manager.id,
        requestNumber, title, description, contractType, counterpartyName, estimatedValueMinor, currency: 'ETB',
        desiredEffectiveDate: dateFromNow(30), status, riskLevel, ...timestamps,
      },
      update: {},
      select: { id: true },
    });
    requests.set(requestNumber, request);
  }

  const contractSpecs = [
    ['70000000-0000-4000-8000-000000000001', 'CON-2026-0001', 'REQ-2026-0004', 'Employee medical coverage', 'HR', 'Insurance Agreement', 'Lucy Insurance SC', 9_850_000_00n, 'DRAFT', 'LOW'],
    ['70000000-0000-4000-8000-000000000002', 'CON-2026-0002', 'REQ-2026-0005', 'Warehouse solar installation', 'OPS', 'Works Contract', 'Green Horizon Energy PLC', 32_000_000_00n, 'IN_REVIEW', 'HIGH'],
    ['70000000-0000-4000-8000-000000000003', 'CON-2026-0003', 'REQ-2026-0006', 'External legal retainer', 'LEGAL', 'Professional Services', 'Tadesse & Partners Law Office', 4_800_000_00n, 'CHANGES_REQUESTED', 'MEDIUM'],
    ['70000000-0000-4000-8000-000000000004', 'CON-2026-0004', 'REQ-2026-0007', 'Office catering services', 'OPS', 'Service Agreement', 'Enat Catering PLC', 3_900_000_00n, 'ACTIVE', 'LOW'],
    ['70000000-0000-4000-8000-000000000005', 'CON-2026-0005', 'REQ-2026-0008', 'Managed IT support', 'OPS', 'Managed Services Agreement', 'Addis Digital Solutions PLC', 6_750_000_00n, 'APPROVED', 'MEDIUM'],
  ] as const;
  const contracts = new Map<string, { id: string }>();
  for (const [id, contractNumber, requestNumber, title, departmentCode, contractType, counterpartyName, valueMinor, status, riskLevel] of contractSpecs) {
    const lifecycle = status === 'ACTIVE' ? { approvedAt: dateFromNow(-40), activatedAt: dateFromNow(-38), effectiveDate: dateFromNow(-30), expirationDate: dateFromNow(335) } : {};
    const contract = await prisma.contract.upsert({
      where: { organizationId_contractNumber: { organizationId: organization.id, contractNumber } },
      create: {
        id, organizationId: organization.id, requestId: requests.get(requestNumber)!.id,
        departmentId: departments.get(departmentCode)!.id, ownerMembershipId: memberships.get(manager.id)!.id,
        contractNumber, title, contractType, counterpartyName, valueMinor, currency: 'ETB', status, riskLevel, ...lifecycle,
      },
      update: {},
      select: { id: true },
    });
    contracts.set(contractNumber, contract);
  }

  const versions = [
    ['80000000-0000-4000-8000-000000000001', 'CON-2026-0001', 1, 'Initial insurance wording', 'Coverage schedule and core terms prepared for review.'],
    ['80000000-0000-4000-8000-000000000002', 'CON-2026-0002', 1, 'Solar EPC draft', 'Engineering, procurement, construction, acceptance, and warranty terms.'],
    ['80000000-0000-4000-8000-000000000003', 'CON-2026-0003', 1, 'Legal retainer draft', 'Scope, response times, conflicts, confidentiality, and fee schedule.'],
    ['80000000-0000-4000-8000-000000000004', 'CON-2026-0004', 1, 'Executed catering agreement', 'Service levels, hygiene standards, pricing, and termination provisions.'],
    ['80000000-0000-4000-8000-000000000005', 'CON-2026-0005', 1, 'Approved managed services agreement', 'Service levels, escalation, security responsibilities, pricing, and exit assistance.'],
  ] as const;
  for (const [id, contractNumber, versionNumber, title, content] of versions) {
    await prisma.contractVersion.upsert({
      where: { contractId_versionNumber: { contractId: contracts.get(contractNumber)!.id, versionNumber } },
      create: { id, contractId: contracts.get(contractNumber)!.id, versionNumber, title, summary: content, content, createdByUserId: manager.id },
      update: {},
    });
  }

  const reviews = [
    ['90000000-0000-4000-8000-000000000001', 'CON-2026-0002', 1, 1, 'Legal review', 'LEGAL_OFFICER', legal.id, 'PENDING', null],
    ['90000000-0000-4000-8000-000000000002', 'CON-2026-0002', 1, 2, 'Finance approval', 'FINANCE_OFFICER', finance.id, 'PENDING', null],
    ['90000000-0000-4000-8000-000000000003', 'CON-2026-0003', 1, 1, 'Legal review', 'LEGAL_OFFICER', legal.id, 'APPROVED', 'Commercial terms are acceptable.'],
    ['90000000-0000-4000-8000-000000000004', 'CON-2026-0003', 1, 2, 'Finance approval', 'FINANCE_OFFICER', finance.id, 'CHANGES_REQUESTED', 'Clarify the annual fee cap and reimbursable expenses.'],
    ['90000000-0000-4000-8000-000000000005', 'CON-2026-0004', 1, 1, 'Legal review', 'LEGAL_OFFICER', legal.id, 'APPROVED', 'Approved.'],
    ['90000000-0000-4000-8000-000000000006', 'CON-2026-0004', 1, 2, 'Finance approval', 'FINANCE_OFFICER', finance.id, 'APPROVED', 'Budget confirmed.'],
    ['90000000-0000-4000-8000-000000000007', 'CON-2026-0005', 1, 1, 'Legal review', 'LEGAL_OFFICER', legal.id, 'APPROVED', 'Data protection and exit terms approved.'],
    ['90000000-0000-4000-8000-000000000008', 'CON-2026-0005', 1, 2, 'Finance approval', 'FINANCE_OFFICER', finance.id, 'APPROVED', 'Approved within the technology budget.'],
  ] as const;
  for (const [id, contractNumber, round, sequence, name, requiredRole, assignedUserId, status, comment] of reviews) {
    await prisma.contractReviewStep.upsert({
      where: { contractId_round_sequence: { contractId: contracts.get(contractNumber)!.id, round, sequence } },
      create: {
        id, contractId: contracts.get(contractNumber)!.id, round, sequence, name, requiredRole,
        assignedUserId, status, comment, ...(status !== 'PENDING' ? { decidedAt: dateFromNow(-10 + sequence) } : {}),
      },
      update: {},
    });
  }

  const auditSpecs = [
    ['a0000000-0000-4000-8000-000000000001', 'demo.seeded', 'organization', organization.id, { source: 'database-seed' }],
    ['a0000000-0000-4000-8000-000000000002', 'contract_request.submitted', 'contract_request', requests.get('REQ-2026-0002')!.id, { requestNumber: 'REQ-2026-0002' }],
    ['a0000000-0000-4000-8000-000000000003', 'contract.review_started', 'contract', contracts.get('CON-2026-0002')!.id, { round: 1 }],
    ['a0000000-0000-4000-8000-000000000004', 'contract.review_changes_requested', 'contract', contracts.get('CON-2026-0003')!.id, { round: 1, sequence: 2 }],
    ['a0000000-0000-4000-8000-000000000005', 'contract.activated', 'contract', contracts.get('CON-2026-0004')!.id, { contractNumber: 'CON-2026-0004' }],
  ] as const;
  for (const [id, action, entityType, entityId, metadata] of auditSpecs) {
    const exists = await prisma.auditEvent.findUnique({ where: { id }, select: { id: true } });
    if (!exists) await prisma.auditEvent.create({ data: { id, organizationId: organization.id, actorUserId: admin.id, action, entityType, entityId, metadata } });
  }

  console.log(`Demo data ready: ${organization.name} (${organization.slug})`);
  console.log('Sign in as admin@kalflow.local to access the seeded workspace.');
}

main()
  .catch((error) => {
    console.error('Unable to seed Kal_flow demo data.');
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
