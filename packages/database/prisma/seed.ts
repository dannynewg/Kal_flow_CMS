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
  obligations: {
    insuranceCertificate: 'b0000000-0000-4000-8000-000000000001',
    solarDesign: 'b0000000-0000-4000-8000-000000000002',
    monthlySla: 'b0000000-0000-4000-8000-000000000003',
    hygieneAudit: 'b0000000-0000-4000-8000-000000000004',
    quarterlyReview: 'b0000000-0000-4000-8000-000000000005',
    exitPlan: 'b0000000-0000-4000-8000-000000000006',
  },
  clauses: {
    parties: 'd0000000-0000-4000-8000-000000000001', scope: 'd0000000-0000-4000-8000-000000000002',
    payment: 'd0000000-0000-4000-8000-000000000003', confidentiality: 'd0000000-0000-4000-8000-000000000004',
    data: 'd0000000-0000-4000-8000-000000000005', termination: 'd0000000-0000-4000-8000-000000000006',
    governingLaw: 'd0000000-0000-4000-8000-000000000007', forceMajeure: 'd0000000-0000-4000-8000-000000000008',
  },
  templates: {
    services: 'e0000000-0000-4000-8000-000000000001', nda: 'e0000000-0000-4000-8000-000000000002',
    supply: 'e0000000-0000-4000-8000-000000000003',
  },
};

async function seedUser(id: string, subject: string, email: string, displayName: string) {
  const existing = await prisma.user.findFirst({ where: { OR: [{ id }, { identityProvider: issuer, subject }, { email: { equals: email, mode: 'insensitive' } }] } });
  if (existing) return prisma.user.update({ where: { id: existing.id }, data: { identityProvider: issuer, subject, email, displayName } });
  return prisma.user.create({ data: { id, identityProvider: issuer, subject, email, displayName } });
}

async function main() {
  const existingAdmin = await prisma.user.findFirst({
    where: { email: { equals: 'admin@kalflow.local', mode: 'insensitive' } },
    orderBy: { createdAt: 'asc' },
  });
  const admin = existingAdmin ?? await seedUser(ids.users.admin, '00000000-0000-4000-8000-000000000001', 'admin@kalflow.local', 'Kal_flow Administrator');
  const manager = await seedUser(ids.users.manager, '00000000-0000-4000-8000-000000000002', 'manager@kalflow.local', 'Meron Bekele');
  const legal = await seedUser(ids.users.legal, '00000000-0000-4000-8000-000000000003', 'legal@kalflow.local', 'Nahom Tadesse');
  const finance = await seedUser(ids.users.finance, '00000000-0000-4000-8000-000000000004', 'finance@kalflow.local', 'Selamawit Girma');
  const procurement = await seedUser(ids.users.procurement, '00000000-0000-4000-8000-000000000005', 'procurement@kalflow.local', 'Dawit Kebede');
  const viewer = await seedUser(ids.users.viewer, '00000000-0000-4000-8000-000000000006', 'auditor@kalflow.local', 'Hana Mekonnen');

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
    const invitationTokenHash = tokenHash(`kal-flow-demo:${email}`);
    const existingInvitation = await prisma.invitation.findFirst({ where: { OR: [{ id }, { tokenHash: invitationTokenHash }] }, select: { id: true } });
    if (!existingInvitation) await prisma.invitation.create({
      data: {
        id, organizationId: organization.id, email, role, status,
        tokenHash: invitationTokenHash, invitedByUserId: admin.id,
        expiresAt: dateFromNow(expiresInDays), ...(status === 'REVOKED' ? { revokedAt: dateFromNow(-2) } : {}),
      },
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
    ['80000000-0000-4000-8000-000000000006', 'CON-2026-0004', 2, 'Executed catering agreement — revised', 'Service levels, monthly hygiene inspections, pricing, invoice reconciliation, and a thirty-day termination notice.'],
  ] as const;
  for (const [id, contractNumber, versionNumber, title, content] of versions) {
    await prisma.contractVersion.upsert({
      where: { contractId_versionNumber: { contractId: contracts.get(contractNumber)!.id, versionNumber } },
      create: { id, contractId: contracts.get(contractNumber)!.id, versionNumber, title, summary: content, content, createdByUserId: manager.id },
      update: {},
    });
  }

  const clauseSpecs = [
    [ids.clauses.parties, 'PARTIES', 'Foundation', 'Parties and purpose', 'ተዋዋይ ወገኖችና ዓላማ', '{{organization_name}} and {{counterparty_name}} enter into this agreement for the purpose described in the approved scope of work.', '{{organization_name}} እና {{counterparty_name}} በጸደቀው የሥራ ወሰን ውስጥ ለተገለጸው ዓላማ ይህን ውል ተዋውለዋል።', 'Confirm the registered names, addresses, and authority of both parties.', 'LOW'],
    [ids.clauses.scope, 'SCOPE', 'Commercial', 'Scope and deliverables', 'የሥራ ወሰንና የሚቀርቡ ውጤቶች', '{{counterparty_name}} shall provide the services and deliverables in the agreed schedule, specifications, and acceptance criteria. Any material change requires written approval.', '{{counterparty_name}} በተስማሙበት የጊዜ ሰሌዳ፣ ዝርዝር መስፈርትና የተቀባይነት መለኪያ መሠረት አገልግሎቱንና ውጤቶቹን ያቀርባል። ማንኛውም ዋና ለውጥ የጽሑፍ ፈቃድ ይፈልጋል።', 'Attach or reference a measurable statement of work.', 'MEDIUM'],
    [ids.clauses.payment, 'PAYMENT', 'Financial', 'Fees, tax, and payment', 'ክፍያ፣ ግብርና የክፍያ ሁኔታ', 'The total contract value is {{contract_value}}. Valid invoices are payable after acceptance and applicable Ethiopian taxes shall be handled according to law.', 'ጠቅላላ የውሉ ዋጋ {{contract_value}} ነው። ትክክለኛ ደረሰኞች ከተቀባይነት በኋላ ይከፈላሉ፤ ተፈጻሚ የኢትዮጵያ ግብሮችም በሕግ መሠረት ይፈጸማሉ።', 'Finance and qualified tax advisers must verify rates, withholding, and VAT treatment.', 'HIGH'],
    [ids.clauses.confidentiality, 'CONFIDENTIALITY', 'Protection', 'Confidentiality', 'ሚስጥራዊነት', 'Each party shall protect confidential information with reasonable safeguards, use it only for this agreement, and disclose it only when authorized or legally required.', 'እያንዳንዱ ወገን ሚስጥራዊ መረጃን በተገቢ ጥበቃ ይጠብቃል፣ ለዚህ ውል ብቻ ይጠቀማል፣ እና በፈቃድ ወይም በሕግ ሲጠየቅ ብቻ ይገልጻል።', 'Define exclusions, survival period, and permitted recipients for the transaction.', 'MEDIUM'],
    [ids.clauses.data, 'DATA_PROTECTION', 'Protection', 'Data protection and security', 'የመረጃ ጥበቃና ደህንነት', 'Personal and organizational data shall be processed only for authorized purposes using documented access, security, incident-response, retention, and deletion controls.', 'የግልና የድርጅት መረጃ ለተፈቀደ ዓላማ ብቻ በተመዘገበ የመዳረሻ፣ የደህንነት፣ የክስተት ምላሽ፣ የማቆያና የማጥፋት ቁጥጥር ይካሄዳል።', 'Security and legal teams must tailor this clause to the data, hosting location, and applicable rules.', 'HIGH'],
    [ids.clauses.termination, 'TERMINATION', 'Lifecycle', 'Termination and exit', 'የውል ማቋረጥና መውጫ', 'Either party may terminate for an uncured material breach after written notice. On exit, the parties shall complete payment, return property, transfer records, and preserve surviving duties.', 'አንዱ ወገን በጽሑፍ ካሳወቀ በኋላ ያልተስተካከለ ከባድ ጥሰት ካለ ውሉን ማቋረጥ ይችላል። ሲወጡ ክፍያ፣ ንብረት መመለስ፣ መዝገብ ማስተላለፍና ቀጣይ ግዴታዎች ይፈጸማሉ።', 'Set notice, cure, convenience termination, transition, and survival periods.', 'HIGH'],
    [ids.clauses.governingLaw, 'GOVERNING_LAW', 'Legal', 'Governing law and dispute process', 'ተፈጻሚ ሕግና የክርክር ሂደት', 'This agreement is governed by the laws of the Federal Democratic Republic of Ethiopia. The parties shall first seek good-faith negotiation before using the agreed dispute forum.', 'ይህ ውል በኢትዮጵያ ፌዴራላዊ ዴሞክራሲያዊ ሪፐብሊክ ሕጎች ይተዳደራል። ወገኖቹ ወደተስማሙበት የክርክር መድረክ ከመሄዳቸው በፊት በቅን ልቦና ይደራደራሉ።', 'Qualified Ethiopian counsel must select the appropriate court, arbitration, seat, and language.', 'HIGH'],
    [ids.clauses.forceMajeure, 'FORCE_MAJEURE', 'Risk', 'Force majeure', 'ከአቅም በላይ ሁኔታ', 'A party affected by an event beyond reasonable control shall promptly notify the other party, mitigate impact, and resume performance when practicable.', 'በተገቢ ቁጥጥር ውጭ ባለ ክስተት የተጎዳ ወገን ሌላውን ወገን ወዲያውኑ ያሳውቃል፣ ጉዳቱን ይቀንሳል፣ እና ሲቻል አፈጻጸሙን ይቀጥላል።', 'List exclusions and consequences appropriate to the contract.', 'MEDIUM'],
  ] as const;
  const clauses = new Map<string, { id: string }>();
  for (const [id, code, category, titleEn, titleAm, bodyEn, bodyAm, guidance, riskLevel] of clauseSpecs) {
    const clause = await prisma.clauseLibraryItem.upsert({ where: { organizationId_code: { organizationId: organization.id, code } }, create: { id, organizationId: organization.id, code, category, titleEn, titleAm, bodyEn, bodyAm, guidance, riskLevel }, update: {}, select: { id: true } });
    clauses.set(code, clause);
  }

  const templateSpecs = [
    [ids.templates.services, 'SERVICE_STD', 'Service Agreement', 'Standard service agreement', 'መደበኛ የአገልግሎት ውል', 'A bilingual starting point for recurring professional and operational services.', 'ለሙያዊና ለኦፕሬሽን አገልግሎቶች የሚያገለግል ባለሁለት ቋንቋ መነሻ።', ['PARTIES', 'SCOPE', 'PAYMENT', 'CONFIDENTIALITY', 'TERMINATION', 'GOVERNING_LAW']],
    [ids.templates.nda, 'NDA_STD', 'Non-disclosure Agreement', 'Mutual confidentiality agreement', 'የጋራ ሚስጥራዊነት ውል', 'A mutual confidentiality and data-handling starting point.', 'የጋራ ሚስጥራዊነትና የመረጃ አያያዝ መነሻ።', ['PARTIES', 'CONFIDENTIALITY', 'DATA_PROTECTION', 'GOVERNING_LAW']],
    [ids.templates.supply, 'SUPPLY_STD', 'Supply Agreement', 'Goods supply agreement', 'የዕቃ አቅርቦት ውል', 'A structured starting point for local supply and procurement transactions.', 'ለአገር ውስጥ ዕቃ አቅርቦትና ግዥ የሚያገለግል የተዋቀረ መነሻ።', ['PARTIES', 'SCOPE', 'PAYMENT', 'FORCE_MAJEURE', 'TERMINATION', 'GOVERNING_LAW']],
  ] as const;
  for (const [id, code, contractType, nameEn, nameAm, descriptionEn, descriptionAm, clauseCodes] of templateSpecs) {
    const template = await prisma.contractTemplate.upsert({ where: { organizationId_code: { organizationId: organization.id, code } }, create: { id, organizationId: organization.id, code, contractType, nameEn, nameAm, descriptionEn, descriptionAm }, update: {}, select: { id: true } });
    for (const [index, clauseCode] of clauseCodes.entries()) await prisma.contractTemplateClause.upsert({ where: { templateId_clauseId: { templateId: template.id, clauseId: clauses.get(clauseCode)!.id } }, create: { templateId: template.id, clauseId: clauses.get(clauseCode)!.id, sequence: index + 1 }, update: {} });
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

  const obligationSpecs = [
    [ids.obligations.insuranceCertificate, 'CON-2026-0001', 'OBLIGATION', 'Submit final insurance certificate', 'Provide the executed coverage certificate and member schedule.', -5, 'HIGH', 'OPEN', memberships.get(manager.id)!.id],
    [ids.obligations.solarDesign, 'CON-2026-0002', 'MILESTONE', 'Approve detailed solar system design', 'Engineering design review and written acceptance before procurement.', 7, 'CRITICAL', 'IN_PROGRESS', memberships.get(legal.id)!.id],
    [ids.obligations.monthlySla, 'CON-2026-0005', 'OBLIGATION', 'Deliver monthly SLA report', 'Report incidents, response times, availability, and unresolved service credits.', 14, 'MEDIUM', 'OPEN', memberships.get(manager.id)!.id],
    [ids.obligations.hygieneAudit, 'CON-2026-0004', 'MILESTONE', 'Complete quarterly kitchen hygiene audit', 'Document the joint inspection and close corrective actions.', 30, 'HIGH', 'OPEN', memberships.get(procurement.id)!.id],
    [ids.obligations.quarterlyReview, 'CON-2026-0004', 'OBLIGATION', 'Quarterly service performance review', 'Confirm service quality, volume, and invoice reconciliation.', -20, 'MEDIUM', 'COMPLETED', memberships.get(manager.id)!.id],
    [ids.obligations.exitPlan, 'CON-2026-0005', 'MILESTONE', 'Validate service exit and handover plan', 'Confirm data export, knowledge transfer, and transition responsibilities.', 75, 'LOW', 'OPEN', memberships.get(manager.id)!.id],
  ] as const;
  for (const [id, contractNumber, kind, title, description, dueInDays, priority, status, ownerMembershipId] of obligationSpecs) {
    await prisma.contractObligation.upsert({
      where: { id },
      create: { id, organizationId: organization.id, contractId: contracts.get(contractNumber)!.id, ownerMembershipId, kind, title, description, dueDate: dateFromNow(dueInDays), priority, status, reminderDays: [30, 14, 7], ...(status === 'COMPLETED' ? { completedAt: dateFromNow(-18), completedByUserId: manager.id, completionNote: 'Performance review completed and minutes filed.' } : {}) },
      update: {},
    });
  }

  const renewalSpecs = [
    ['c0000000-0000-4000-8000-000000000001', 'CON-2026-0004', 'AUTO_RENEW', 58, 28, 30, 'PENDING'],
    ['c0000000-0000-4000-8000-000000000002', 'CON-2026-0005', 'MANUAL_RENEW', 120, 60, 60, 'RENEGOTIATE'],
  ] as const;
  for (const [id, contractNumber, renewalType, renewalInDays, noticeInDays, noticePeriodDays, decision] of renewalSpecs) {
    await prisma.contractRenewal.upsert({
      where: { contractId: contracts.get(contractNumber)!.id },
      create: { id, organizationId: organization.id, contractId: contracts.get(contractNumber)!.id, renewalType, renewalDate: dateFromNow(renewalInDays), noticeDeadline: dateFromNow(noticeInDays), noticePeriodDays, decision, ...(decision !== 'PENDING' ? { decisionAt: dateFromNow(-3), decidedByUserId: admin.id, decisionNote: 'Renegotiate pricing and service-credit terms before renewal.' } : {}) },
      update: {},
    });
  }

  await prisma.notificationRule.upsert({
    where: { id: 'f0000000-0000-4000-8000-000000000001' },
    create: { id: 'f0000000-0000-4000-8000-000000000001', organizationId: organization.id, name: 'Legal team critical alerts', channel: 'EMAIL', recipient: 'legal@kalflow.local', alertTypes: ['OBLIGATION_OVERDUE', 'NOTICE_DEADLINE', 'CONTRACT_EXPIRY'], minimumSeverity: 'WARNING' },
    update: {},
  });
  await prisma.notificationRule.upsert({
    where: { id: 'f0000000-0000-4000-8000-000000000002' },
    create: { id: 'f0000000-0000-4000-8000-000000000002', organizationId: organization.id, name: 'Operations SMS reminders', channel: 'SMS', recipient: '+251911000000', alertTypes: ['OBLIGATION_DUE', 'OBLIGATION_OVERDUE'], minimumSeverity: 'CRITICAL' },
    update: {},
  });

  const counterpartySpecs = [
    ['11000000-0000-4000-8000-000000000001', 'Lucy Insurance SC', 'BUSINESS', '0023456789', 'Addis Ababa', 'Marta Alemu', 'Corporate Account Director', 'marta.alemu@example.test', '+251911111111'],
    ['11000000-0000-4000-8000-000000000002', 'Green Horizon Energy PLC', 'BUSINESS', '0054321098', 'Addis Ababa', 'Samuel Getachew', 'Commercial Director', 'samuel.getachew@example.test', '+251922222222'],
    ['11000000-0000-4000-8000-000000000003', 'Tadesse & Partners Law Office', 'BUSINESS', '0019876543', 'Addis Ababa', 'Liya Tadesse', 'Managing Partner', 'liya.tadesse@example.test', '+251933333333'],
    ['11000000-0000-4000-8000-000000000004', 'Enat Catering PLC', 'BUSINESS', '0067891234', 'Addis Ababa', 'Eden Assefa', 'General Manager', 'eden.assefa@example.test', '+251944444444'],
    ['11000000-0000-4000-8000-000000000005', 'Addis Digital Solutions PLC', 'BUSINESS', '0098765432', 'Addis Ababa', 'Bereket Hailu', 'Enterprise Sales Lead', 'bereket.hailu@example.test', '+251955555555'],
  ] as const;
  const counterparties = new Map<string, { id: string }>();
  for (const [id, legalName, type, tin, city, contactName, contactTitle, email, phone] of counterpartySpecs) {
    const counterparty = await prisma.counterparty.upsert({ where: { organizationId_legalName: { organizationId: organization.id, legalName } }, create: { id, organizationId: organization.id, legalName, type, tin, city, address: `${city}, Ethiopia` }, update: {}, select: { id: true } });
    counterparties.set(legalName, counterparty);
    const contactId = id.replace('11000000', '12000000');
    await prisma.counterpartyContact.upsert({ where: { id: contactId }, create: { id: contactId, counterpartyId: counterparty.id, name: contactName, title: contactTitle, email, phone, isPrimary: true }, update: {} });
  }
  for (const [, contractNumber, , , , , counterpartyName] of contractSpecs) {
    const counterparty = counterparties.get(counterpartyName);
    if (counterparty) await prisma.contract.updateMany({ where: { id: contracts.get(contractNumber)!.id, counterpartyId: null }, data: { counterpartyId: counterparty.id } });
  }

  const negotiationId = '13000000-0000-4000-8000-000000000001';
  await prisma.negotiation.upsert({
    where: { id: negotiationId },
    create: { id: negotiationId, organizationId: organization.id, contractId: contracts.get('CON-2026-0003')!.id, contractVersionId: '80000000-0000-4000-8000-000000000003', counterpartyId: counterparties.get('Tadesse & Partners Law Office')!.id, title: 'Fee cap and reimbursable expenses' },
    update: {},
  });
  await prisma.negotiationMessage.upsert({
    where: { id: '14000000-0000-4000-8000-000000000001' },
    create: { id: '14000000-0000-4000-8000-000000000001', negotiationId, authorUserId: finance.id, clauseReference: 'Fees and expenses', message: 'Please clarify the annual fee cap and require prior written approval for reimbursable expenses.', proposedText: 'Annual professional fees shall not exceed ETB 4,800,000. Reimbursable expenses require prior written approval and supporting receipts.' },
    update: {},
  });

  const signaturePacketId = '15000000-0000-4000-8000-000000000001';
  const managedServicesContent = versions.find((item) => item[1] === 'CON-2026-0005')![4];
  await prisma.signaturePacket.upsert({
    where: { id: signaturePacketId },
    create: { id: signaturePacketId, organizationId: organization.id, contractId: contracts.get('CON-2026-0005')!.id, contractVersionId: '80000000-0000-4000-8000-000000000005', createdByUserId: manager.id, title: 'Managed IT support — signature packet', documentSha256: tokenHash(managedServicesContent), message: 'Demo packet for ordered signature testing.', expiresAt: dateFromNow(14), signers: { create: [
      { id: '16000000-0000-4000-8000-000000000001', sequence: 1, name: 'Meron Bekele', email: 'manager@kalflow.local', role: 'Contract Manager' },
      { id: '16000000-0000-4000-8000-000000000002', sequence: 2, name: 'Bereket Hailu', email: 'bereket.hailu@example.test', role: 'Counterparty Signatory', counterpartyContactId: '12000000-0000-4000-8000-000000000005' },
    ] }, events: { create: { id: '17000000-0000-4000-8000-000000000001', type: 'PACKET_CREATED', actorEmail: 'manager@kalflow.local', metadata: { demoOnly: true } } } },
    update: {},
  });

  const auditSpecs = [
    ['a0000000-0000-4000-8000-000000000001', 'demo.seeded', 'organization', organization.id, { source: 'database-seed' }],
    ['a0000000-0000-4000-8000-000000000002', 'contract_request.submitted', 'contract_request', requests.get('REQ-2026-0002')!.id, { requestNumber: 'REQ-2026-0002' }],
    ['a0000000-0000-4000-8000-000000000003', 'contract.review_started', 'contract', contracts.get('CON-2026-0002')!.id, { round: 1 }],
    ['a0000000-0000-4000-8000-000000000004', 'contract.review_changes_requested', 'contract', contracts.get('CON-2026-0003')!.id, { round: 1, sequence: 2 }],
    ['a0000000-0000-4000-8000-000000000005', 'contract.activated', 'contract', contracts.get('CON-2026-0004')!.id, { contractNumber: 'CON-2026-0004' }],
    ['a0000000-0000-4000-8000-000000000006', 'obligation.completed', 'contract_obligation', ids.obligations.quarterlyReview, { contractNumber: 'CON-2026-0004' }],
    ['a0000000-0000-4000-8000-000000000007', 'renewal.configured', 'contract_renewal', 'c0000000-0000-4000-8000-000000000001', { contractNumber: 'CON-2026-0004' }],
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
