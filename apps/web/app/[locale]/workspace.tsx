'use client';

import { useCallback, useEffect, useMemo, useState, type CSSProperties, type FormEvent } from 'react';

type Locale = 'en' | 'am';
type View = 'overview' | 'requests' | 'contracts' | 'operations' | 'organization';
type Organization = { id: string; name: string; slug: string; description?: string | null; timezone?: string; status?: string; memberships: { id: string; role: string; status: string }[]; _count?: { departments: number; memberships: number } };
type Department = { id: string; code: string; name: string; description?: string | null; isActive: boolean; parentId?: string | null; parent?: { id: string; code: string; name: string } | null; _count?: { memberships: number; children: number } };
type Member = { id: string; role: string; status: string; user: { id?: string; email: string | null; displayName: string | null }; departments?: { department: { id: string; code: string; name: string }; isManager: boolean }[] };
type Invitation = { id: string; email: string; role: string; status: string; expiresAt: string; createdAt: string };
type AuditEvent = { id: string; action: string; entityType: string; createdAt: string; actor?: { email: string | null; displayName: string | null } | null };
type ContractRequest = { id: string; requestNumber: string; title: string; description: string; contractType: string; counterpartyName: string; estimatedValueMinor: string | null; currency: string; riskLevel: string; status: string; departmentId: string; createdAt?: string; department?: Department; assignedTo?: { displayName: string | null; email: string | null } | null; contract?: { id: string; contractNumber: string; status: string } | null };
type ReviewStep = { id: string; round: number; sequence: number; name: string; requiredRole: string; status: string; comment?: string | null };
type DocumentRecord = { id: string; originalName: string; mimeType: string; sizeBytes: string; status: string; createdAt: string };
type Contract = { id: string; contractNumber: string; title: string; counterpartyName: string; contractType: string; status: string; riskLevel: string; currency: string; valueMinor: string | null; departmentId: string; createdAt?: string; effectiveDate?: string | null; expirationDate?: string | null; versions?: { id: string; versionNumber: number; title: string; createdAt: string }[]; reviewSteps?: ReviewStep[] };
type Obligation = { id: string; contractId: string; ownerMembershipId: string; kind: 'OBLIGATION' | 'MILESTONE'; title: string; description?: string | null; dueDate: string; priority: string; status: string; completedAt?: string | null; contract: { id: string; contractNumber: string; title: string; department: { id: string; code: string; name: string } }; owner: Member };
type Renewal = { id: string; contractId: string; renewalType: string; renewalDate: string; noticeDeadline?: string | null; noticePeriodDays?: number | null; decision: string; decisionNote?: string | null; contract: { id: string; contractNumber: string; title: string; expirationDate?: string | null; department: { id: string; code: string; name: string } } };
type OperationalAlert = { id: string; contractId: string; type: string; severity: string; title: string; dueAt: string; status: string; contract: { id: string; contractNumber: string; title: string } };
type OperationsReport = { generatedAt: string; summary: { totalObligations: number; completed: number; completionRate: number; overdue: number; dueNext30Days: number; pendingRenewals: number; noticeDeadlinesNext30Days: number; expiringNext90Days: number; openAlerts: number; criticalAlerts: number }; byDepartment: { code: string; name: string; total: number; completed: number; overdue: number }[]; byPriority: { priority: string; count: number }[] };

const copy = {
  en: {
    overview: 'Overview', requests: 'Requests', contracts: 'Contracts', organization: 'Organization', dashboard: 'Executive workspace', newRequest: 'New request', signOut: 'Sign out', signedIn: 'Signed in as', empty: 'No records match this view.', selectOrganization: 'Select organization', loading: 'Preparing your workspace…', title: 'Contract title', description: 'Business need and scope', type: 'Contract type', counterparty: 'Counterparty', department: 'Department', value: 'Estimated value', effective: 'Desired effective date', saveDraft: 'Save draft', submit: 'Submit request', triage: 'Triage request', convert: 'Create contract', addDraft: 'Add draft version', startReview: 'Start review', approve: 'Approve', changes: 'Request changes', activate: 'Activate contract', documents: 'Documents', upload: 'Upload document', status: 'Status', owner: 'Owner', refresh: 'Refresh', retry: 'Try again', welcome: 'Good to see you. Here’s what needs attention.', noOrganization: 'Create an organization through the API or ask an administrator to invite you.', selectRecord: 'Choose a record to inspect its workflow.', actionDone: 'Your change was saved.', role: 'Your access', requestPipeline: 'Open requests', activeContracts: 'Active contracts', pendingReviews: 'In review', portfolio: 'Portfolio value', amountHelp: 'Enter whole ETB; Kal_flow stores minor units.', versionContent: 'Draft contract text', versionSummary: 'Version summary', reviewHelp: 'Legal review followed by Finance approval.', comment: 'Decision comment', expiration: 'Expiration date', uploadHelp: 'PDF or DOCX, up to 25 MB.', liveQueue: 'Priority queue', viewAll: 'View all', search: 'Search records', allStatus: 'All statuses', allRisk: 'All risk levels', results: 'results', workflow: 'Workflow', details: 'Details', businessCase: 'Business case', contractHealth: 'Contract health', recentActivity: 'Recent activity', noActivity: 'No recent activity.', profile: 'Profile', departments: 'Departments', team: 'Team & access', audit: 'Audit trail', orgSettings: 'Organization settings', orgDescription: 'Description', timezone: 'Timezone', updateProfile: 'Update profile', addDepartment: 'Add department', code: 'Code', parentDepartment: 'Parent department', inviteMember: 'Invite member', email: 'Email address', invite: 'Send invitation', members: 'Members', invitations: 'Invitations', pendingInvites: 'Pending invites', people: 'People', created: 'Created', revoke: 'Revoke', resend: 'Resend', active: 'Active', suspended: 'Suspended', quickAction: 'Quick action', intakeHint: 'Start a structured request in under two minutes.', openIntake: 'Start contract intake', pipelineTitle: 'Request pipeline', workflowSubtitle: 'Auditable progress from intake to activation', cancel: 'Cancel', risk: 'Risk', versions: 'Versions', reviewRound: 'Review round', secureStorage: 'Secure storage', drafting: 'Drafting', approvalRoute: 'Approval route', legalReview: 'Legal review', financeApproval: 'Finance approval', manager: 'Manager', member: 'Member', accessRole: 'Access role', save: 'Save', organizationHealth: 'Organization health', departmentsOnline: 'departments online', memberAccess: 'member access profiles', complianceReady: 'Audit trail enabled', updatedNow: 'Updated just now', menu: 'Open navigation', close: 'Close', previous: 'Previous', next: 'Next'
  },
  am: {
    overview: 'አጠቃላይ', requests: 'ጥያቄዎች', contracts: 'ውሎች', organization: 'ድርጅት', dashboard: 'የአስተዳደር የሥራ ቦታ', newRequest: 'አዲስ ጥያቄ', signOut: 'ውጣ', signedIn: 'የገቡት', empty: 'ከዚህ እይታ ጋር የሚዛመድ መዝገብ የለም።', selectOrganization: 'ድርጅት ይምረጡ', loading: 'የሥራ ቦታዎ እየተዘጋጀ ነው…', title: 'የውል ርዕስ', description: 'የንግድ ፍላጎትና ወሰን', type: 'የውል ዓይነት', counterparty: 'ተዋዋይ ወገን', department: 'ክፍል', value: 'ግምታዊ ዋጋ', effective: 'የሚፈለገው መጀመሪያ ቀን', saveDraft: 'ረቂቅ አስቀምጥ', submit: 'ጥያቄውን አስገባ', triage: 'ጥያቄውን መድብ', convert: 'ውል ፍጠር', addDraft: 'አዲስ ረቂቅ ጨምር', startReview: 'ግምገማ ጀምር', approve: 'አጽድቅ', changes: 'ማሻሻያ ጠይቅ', activate: 'ውሉን ተግባራዊ አድርግ', documents: 'ሰነዶች', upload: 'ሰነድ ስቀል', status: 'ሁኔታ', owner: 'ኃላፊ', refresh: 'አድስ', retry: 'እንደገና ሞክር', welcome: 'እንኳን ደህና መጡ። ትኩረት የሚፈልጉ ሥራዎች እነሆ።', noOrganization: 'ድርጅት ይፍጠሩ ወይም አስተዳዳሪ እንዲጋብዝዎ ይጠይቁ።', selectRecord: 'የሂደቱን ዝርዝር ለማየት መዝገብ ይምረጡ።', actionDone: 'ለውጡ ተቀምጧል።', role: 'የመዳረሻ ደረጃዎ', requestPipeline: 'ክፍት ጥያቄዎች', activeContracts: 'ተግባራዊ ውሎች', pendingReviews: 'በግምገማ ላይ', portfolio: 'የውሎች ጠቅላላ ዋጋ', amountHelp: 'ሙሉ ብር ያስገቡ፤ Kal_flow በሳንቲም ያስቀምጣል።', versionContent: 'የውል ረቂቅ ጽሑፍ', versionSummary: 'የስሪት ማጠቃለያ', reviewHelp: 'የሕግ ግምገማን ተከትሎ የፋይናንስ ማጽደቅ።', comment: 'የውሳኔ አስተያየት', expiration: 'ማብቂያ ቀን', uploadHelp: 'PDF ወይም DOCX፣ እስከ 25 MB።', liveQueue: 'ቅድሚያ የሚሰጣቸው', viewAll: 'ሁሉንም አሳይ', search: 'መዝገብ ይፈልጉ', allStatus: 'ሁሉም ሁኔታዎች', allRisk: 'ሁሉም የስጋት ደረጃዎች', results: 'ውጤቶች', workflow: 'የሥራ ሂደት', details: 'ዝርዝር', businessCase: 'የንግድ ምክንያት', contractHealth: 'የውሎች ጤና', recentActivity: 'የቅርብ ጊዜ እንቅስቃሴ', noActivity: 'የቅርብ ጊዜ እንቅስቃሴ የለም።', profile: 'መገለጫ', departments: 'ክፍሎች', team: 'ቡድንና መዳረሻ', audit: 'የኦዲት ታሪክ', orgSettings: 'የድርጅት ቅንብሮች', orgDescription: 'መግለጫ', timezone: 'የሰዓት ሰቅ', updateProfile: 'መገለጫውን አድስ', addDepartment: 'ክፍል ጨምር', code: 'ኮድ', parentDepartment: 'ዋና ክፍል', inviteMember: 'አባል ጋብዝ', email: 'የኢሜይል አድራሻ', invite: 'ግብዣ ላክ', members: 'አባላት', invitations: 'ግብዣዎች', pendingInvites: 'የሚጠበቁ ግብዣዎች', people: 'ሰዎች', created: 'የተፈጠረበት', revoke: 'ሰርዝ', resend: 'እንደገና ላክ', active: 'ንቁ', suspended: 'የታገደ', quickAction: 'ፈጣን ተግባር', intakeHint: 'የተዋቀረ የውል ጥያቄ በሁለት ደቂቃ ውስጥ ይጀምሩ።', openIntake: 'የውል ጥያቄ ጀምር', pipelineTitle: 'የጥያቄ ሂደት', workflowSubtitle: 'ከጥያቄ እስከ ተግባራዊነት የሚከታተል ግልጽ ሂደት', cancel: 'ተወው', risk: 'ስጋት', versions: 'ስሪቶች', reviewRound: 'የግምገማ ዙር', secureStorage: 'ደህንነቱ የተጠበቀ ማከማቻ', drafting: 'ረቂቅ ዝግጅት', approvalRoute: 'የማጽደቅ መንገድ', legalReview: 'የሕግ ግምገማ', financeApproval: 'የፋይናንስ ማጽደቅ', manager: 'ኃላፊ', member: 'አባል', accessRole: 'የመዳረሻ ሚና', save: 'አስቀምጥ', organizationHealth: 'የድርጅቱ ሁኔታ', departmentsOnline: 'ንቁ ክፍሎች', memberAccess: 'የአባላት መዳረሻ', complianceReady: 'የኦዲት ታሪክ ንቁ ነው', updatedNow: 'አሁን ዘምኗል', menu: 'መዳረሻ ክፈት', close: 'ዝጋ', previous: 'ቀዳሚ', next: 'ቀጣይ'
  }
} as const;

const operationalCopy = {
  en: { operations: 'Operations', obligations: 'Obligations', milestones: 'Milestones', renewals: 'Renewals', alerts: 'Alerts', operationalReport: 'Operational report', attention: 'Needs attention', overdue: 'Overdue', dueSoon: 'Due next 30 days', completionRate: 'Completion rate', expiring: 'Expiring in 90 days', addObligation: 'Add obligation or milestone', dueDate: 'Due date', priority: 'Priority', complete: 'Mark complete', acknowledge: 'Acknowledge', configureRenewal: 'Configure renewal', renewalDate: 'Renewal date', noticeDeadline: 'Notice deadline', renewalDecision: 'Renewal decision', reportingSubtitle: 'Live accountability across commitments, dates, renewals, and contract expiry.', allItems: 'All items', openItems: 'Open items', noOperationalData: 'No operational records match this view.', performanceByDepartment: 'Performance by department', evidenceNote: 'Completion evidence or note', renewalBoard: 'Renewal decision board' },
  am: { operations: 'ክትትል', obligations: 'ግዴታዎች', milestones: 'የሂደት ደረጃዎች', renewals: 'እድሳት', alerts: 'ማስጠንቀቂያዎች', operationalReport: 'የአፈጻጸም ሪፖርት', attention: 'ትኩረት የሚፈልጉ', overdue: 'ጊዜያቸው ያለፈ', dueSoon: 'በ30 ቀን ውስጥ', completionRate: 'የማጠናቀቅ መጠን', expiring: 'በ90 ቀን የሚያበቁ', addObligation: 'ግዴታ ወይም የሂደት ደረጃ ጨምር', dueDate: 'የማጠናቀቂያ ቀን', priority: 'ቅድሚያ', complete: 'ተጠናቋል በል', acknowledge: 'ታውቋል', configureRenewal: 'እድሳት አዋቅር', renewalDate: 'የእድሳት ቀን', noticeDeadline: 'የማሳወቂያ ገደብ', renewalDecision: 'የእድሳት ውሳኔ', reportingSubtitle: 'ግዴታዎችን፣ ቀናትን፣ እድሳትንና የውል ማብቂያን በቀጥታ ይከታተሉ።', allItems: 'ሁሉም', openItems: 'ክፍት ሥራዎች', noOperationalData: 'ከዚህ እይታ ጋር የሚዛመድ የክትትል መዝገብ የለም።', performanceByDepartment: 'በክፍል የተከፋፈለ አፈጻጸም', evidenceNote: 'የማጠናቀቂያ ማስረጃ ወይም ማስታወሻ', renewalBoard: 'የእድሳት ውሳኔ ሰሌዳ' },
} as const;

const roles = ['ADMIN', 'CONTRACT_MANAGER', 'LEGAL_OFFICER', 'DEPARTMENT_MANAGER', 'FINANCE_OFFICER', 'PROCUREMENT_OFFICER', 'CONTRACT_OWNER', 'AUDITOR', 'VIEWER'];
const requestStages = ['DRAFT', 'SUBMITTED', 'TRIAGED', 'CONVERTED'];
const contractStages = ['DRAFT', 'IN_REVIEW', 'APPROVED', 'ACTIVE'];

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api/bff/${path}`, { ...init, headers: init?.body instanceof FormData ? init.headers : { 'content-type': 'application/json', ...init?.headers } });
  const payload = await response.json().catch(() => ({})) as { message?: string | string[] };
  if (!response.ok) throw new Error(Array.isArray(payload.message) ? payload.message.join(', ') : payload.message ?? `Request failed (${response.status})`);
  return payload as T;
}

const labelize = (value: string) => value.replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
const money = (minor: string | null, currency: string, locale: Locale = 'en') => minor ? new Intl.NumberFormat(locale === 'am' ? 'am-ET' : 'en-ET', { style: 'currency', currency, maximumFractionDigits: 0 }).format(Number(minor) / 100) : '—';
const canManage = (role: string) => ['OWNER', 'ADMIN', 'CONTRACT_MANAGER', 'CONTRACT_OWNER'].includes(role);
const canTriage = (role: string) => ['OWNER', 'ADMIN', 'CONTRACT_MANAGER'].includes(role);
const canAdmin = (role: string) => ['OWNER', 'ADMIN'].includes(role);
const canDepartment = (role: string) => ['OWNER', 'ADMIN', 'DEPARTMENT_MANAGER'].includes(role);

export function ContractWorkspace({ locale, email, signOutAction }: { locale: Locale; email: string; signOutAction: () => Promise<void> }) {
  const t = { ...copy[locale], ...operationalCopy[locale] };
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [organizationId, setOrganizationId] = useState('');
  const [departments, setDepartments] = useState<Department[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([]);
  const [requests, setRequests] = useState<ContractRequest[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [obligations, setObligations] = useState<Obligation[]>([]);
  const [renewals, setRenewals] = useState<Renewal[]>([]);
  const [operationalAlerts, setOperationalAlerts] = useState<OperationalAlert[]>([]);
  const [operationsReport, setOperationsReport] = useState<OperationsReport | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<ContractRequest | null>(null);
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [view, setView] = useState<View>('overview');
  const [organizationTab, setOrganizationTab] = useState<'profile' | 'departments' | 'team' | 'audit'>('profile');
  const [showIntake, setShowIntake] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [riskFilter, setRiskFilter] = useState('ALL');

  const currentOrganization = organizations.find((item) => item.id === organizationId);
  const role = currentOrganization?.memberships[0]?.role ?? 'VIEWER';

  const loadOrganizations = useCallback(async () => {
    try {
      const items = await api<Organization[]>('organizations');
      setOrganizations(items);
      setOrganizationId((current) => current || items[0]?.id || '');
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to load organizations'); }
  }, []);

  const loadWorkspace = useCallback(async () => {
    if (!organizationId) return;
    setError('');
    try {
      const [departmentItems, memberItems, requestItems, contractItems] = await Promise.all([
        api<Department[]>(`organizations/${organizationId}/departments`),
        api<Member[]>(`organizations/${organizationId}/memberships`),
        api<ContractRequest[]>(`organizations/${organizationId}/contract-requests`),
        api<Contract[]>(`organizations/${organizationId}/contracts`),
      ]);
      setDepartments(departmentItems);
      setMembers(memberItems);
      setRequests(requestItems);
      setContracts(contractItems);
      const extras = await Promise.allSettled([
        api<Invitation[]>(`organizations/${organizationId}/invitations`),
        api<{ items: AuditEvent[] }>(`organizations/${organizationId}/audit-events?limit=50`),
        api<Obligation[]>(`organizations/${organizationId}/obligations`),
        api<Renewal[]>(`organizations/${organizationId}/renewals`),
        api<OperationalAlert[]>(`organizations/${organizationId}/operational-alerts`),
        api<OperationsReport>(`organizations/${organizationId}/reports/operations`),
      ]);
      setInvitations(extras[0].status === 'fulfilled' ? extras[0].value : []);
      setAuditEvents(extras[1].status === 'fulfilled' ? extras[1].value.items : []);
      setObligations(extras[2].status === 'fulfilled' ? extras[2].value : []);
      setRenewals(extras[3].status === 'fulfilled' ? extras[3].value : []);
      setOperationalAlerts(extras[4].status === 'fulfilled' ? extras[4].value : []);
      setOperationsReport(extras[5].status === 'fulfilled' ? extras[5].value : null);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to load workspace'); }
  }, [organizationId]);

  useEffect(() => { void loadOrganizations(); }, [loadOrganizations]);
  useEffect(() => { void loadWorkspace(); setSelectedRequest(null); setSelectedContract(null); }, [loadWorkspace]);
  useEffect(() => {
    const close = (event: KeyboardEvent) => { if (event.key === 'Escape') { setShowIntake(false); setMobileOpen(false); } };
    window.addEventListener('keydown', close); return () => window.removeEventListener('keydown', close);
  }, []);

  const refreshContract = useCallback(async (contractId: string) => {
    const [contract, items] = await Promise.all([
      api<Contract>(`organizations/${organizationId}/contracts/${contractId}`),
      api<DocumentRecord[]>(`organizations/${organizationId}/contracts/${contractId}/documents`),
    ]);
    setSelectedContract(contract); setDocuments(items);
  }, [organizationId]);

  const run = async (action: () => Promise<unknown>, after?: () => Promise<void>) => {
    setBusy(true); setError(''); setNotice('');
    try { await action(); await (after?.() ?? loadWorkspace()); setNotice(t.actionDone); window.setTimeout(() => setNotice(''), 3500); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Action failed'); }
    finally { setBusy(false); }
  };

  const metrics = useMemo(() => ({
    requests: requests.filter((item) => !['CONVERTED', 'CANCELLED'].includes(item.status)).length,
    active: contracts.filter((item) => item.status === 'ACTIVE').length,
    reviews: contracts.filter((item) => item.status === 'IN_REVIEW').length,
    portfolio: contracts.filter((item) => item.status !== 'CANCELLED').reduce((sum, item) => sum + Number(item.valueMinor ?? 0), 0).toString(),
  }), [requests, contracts]);

  const visibleRecords = useMemo(() => {
    const source: (ContractRequest | Contract)[] = view === 'requests' ? requests : contracts;
    const needle = search.trim().toLowerCase();
    return source.filter((record) => {
      const matchesSearch = !needle || [record.title, record.counterpartyName, 'requestNumber' in record ? record.requestNumber : record.contractNumber, record.contractType].some((value) => value.toLowerCase().includes(needle));
      return matchesSearch && (statusFilter === 'ALL' || record.status === statusFilter) && (riskFilter === 'ALL' || record.riskLevel === riskFilter);
    });
  }, [view, requests, contracts, search, statusFilter, riskFilter]);

  const navigate = (nextView: View) => { setView(nextView); setMobileOpen(false); setSearch(''); setStatusFilter('ALL'); setRiskFilter('ALL'); };

  async function createRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const formElement = event.currentTarget; const form = new FormData(formElement);
    const wholeValue = String(form.get('value') ?? '').replace(/,/g, '');
    await run(() => api(`organizations/${organizationId}/contract-requests`, { method: 'POST', body: JSON.stringify({ departmentId: form.get('departmentId'), title: form.get('title'), description: form.get('description'), contractType: form.get('contractType'), counterpartyName: form.get('counterpartyName'), estimatedValueMinor: wholeValue ? String(Math.round(Number(wholeValue) * 100)) : undefined, currency: 'ETB', desiredEffectiveDate: form.get('effectiveDate') || undefined }) }), async () => { setShowIntake(false); formElement.reset(); await loadWorkspace(); setView('requests'); });
  }

  async function uploadDocument(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!selectedContract) return; const formElement = event.currentTarget; const form = new FormData(formElement);
    await run(() => api(`organizations/${organizationId}/contracts/${selectedContract.id}/documents`, { method: 'POST', body: form }), async () => { formElement.reset(); await refreshContract(selectedContract.id); });
  }

  const navItems: { key: View; label: string; icon: string; badge?: number }[] = [
    { key: 'overview', label: t.overview, icon: '⌂' },
    { key: 'requests', label: t.requests, icon: '↗', badge: metrics.requests },
    { key: 'contracts', label: t.contracts, icon: '▤' },
    { key: 'operations', label: t.operations, icon: '◷', badge: operationalAlerts.filter((item) => item.status === 'OPEN').length },
    { key: 'organization', label: t.organization, icon: '◎' },
  ];

  return <div className="app-shell" lang={locale}>
    <a className="skip-link" href="#main-content">Skip to content</a>
    {mobileOpen && <button className="nav-scrim" aria-label={t.close} onClick={() => setMobileOpen(false)} />}
    <aside className={`sidebar ${mobileOpen ? 'mobile-open' : ''}`} aria-label="Primary navigation">
      <div className="brand"><span className="brand-mark">K</span><div><strong>Kal_flow</strong><small>Contract intelligence</small></div></div>
      <div className="nav-label">Workspace</div>
      <nav>{navItems.map((item) => <button aria-current={view === item.key ? 'page' : undefined} className={view === item.key ? 'active' : ''} key={item.key} onClick={() => navigate(item.key)}><span className="nav-icon" aria-hidden="true">{item.icon}</span><span>{item.label}</span>{item.badge ? <b>{item.badge}</b> : null}</button>)}</nav>
      <div className="sidebar-spotlight"><span>{t.quickAction}</span><strong>{t.intakeHint}</strong><button onClick={() => setShowIntake(true)}>＋ {t.openIntake}</button></div>
      <div className="sidebar-foot"><span>{t.signedIn}</span><strong>{email}</strong><small>{labelize(role)}</small><form action={signOutAction}><button type="submit">{t.signOut} ↗</button></form></div>
    </aside>

    <main className="workspace" id="main-content">
      <header className="topbar">
        <button className="mobile-menu" aria-label={t.menu} aria-expanded={mobileOpen} onClick={() => setMobileOpen(true)}>☰</button>
        <div className="page-title"><span className="kicker">{t.dashboard}</span><h1>{view === 'overview' ? currentOrganization?.name ?? 'Kal_flow' : t[view]}</h1></div>
        <div className="top-actions">
          <select aria-label={t.selectOrganization} value={organizationId} onChange={(event) => setOrganizationId(event.target.value)}>{organizations.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select>
          <a className="language" href={`/${locale === 'en' ? 'am' : 'en'}`} lang={locale === 'en' ? 'am' : 'en'}>{locale === 'en' ? 'አማ' : 'EN'}</a>
          <button className="primary" disabled={!organizationId || departments.filter((item) => item.isActive).length === 0} onClick={() => setShowIntake(true)}>＋ <span>{t.newRequest}</span></button>
        </div>
      </header>

      <div className="toast-region" aria-live="polite">
        {error && <div className="alert error"><span>{error}</span><button onClick={() => void loadWorkspace()}>{t.retry}</button></div>}
        {notice && <div className="alert success">✓ {notice}</div>}
      </div>

      {!organizations.length && !error ? <section className="empty-state"><div className="empty-icon">K</div><h2>{t.loading}</h2><p>{t.noOrganization}</p></section> : null}
      {organizations.length > 0 && <>
        {view === 'overview' && <DashboardView locale={locale} t={t} metrics={metrics} requests={requests} contracts={contracts} auditEvents={auditEvents} organization={currentOrganization} role={role} onView={navigate} onRequest={(record) => { setSelectedRequest(record); setView('requests'); }} onCreate={() => setShowIntake(true)} />}
        {(view === 'requests' || view === 'contracts') && <>
          <FilterBar t={t} search={search} setSearch={setSearch} status={statusFilter} setStatus={setStatusFilter} risk={riskFilter} setRisk={setRiskFilter} count={visibleRecords.length} statuses={view === 'requests' ? ['DRAFT', 'SUBMITTED', 'TRIAGED', 'CONVERTED', 'CANCELLED'] : ['DRAFT', 'IN_REVIEW', 'CHANGES_REQUESTED', 'APPROVED', 'ACTIVE', 'CANCELLED']} />
          <section className="split-view">
            <div className="panel list-panel"><div className="panel-head"><div><span className="kicker">{view === 'requests' ? t.pipelineTitle : t.contractHealth}</span><h2>{t[view]}</h2><small>{t.workflowSubtitle}</small></div><button className="icon-button" aria-label={t.refresh} onClick={() => void loadWorkspace()}>↻</button></div><RecordTable locale={locale} records={visibleRecords} empty={t.empty} onSelect={(record) => view === 'requests' ? setSelectedRequest(record as ContractRequest) : void refreshContract(record.id)} selectedId={view === 'requests' ? selectedRequest?.id : selectedContract?.id} /></div>
            {view === 'requests' ? <RequestDetail request={selectedRequest} role={role} members={members} t={t} busy={busy} run={run} organizationId={organizationId} reload={loadWorkspace} onContract={async (id) => { await refreshContract(id); setView('contracts'); }} locale={locale} /> : <ContractDetail contract={selectedContract} documents={documents} role={role} t={t} busy={busy} organizationId={organizationId} run={run} refreshContract={refreshContract} uploadDocument={uploadDocument} locale={locale} />}
          </section>
        </>}
        {view === 'operations' && <OperationsView locale={locale} t={t} organizationId={organizationId} role={role} contracts={contracts} members={members} obligations={obligations} renewals={renewals} alerts={operationalAlerts} report={operationsReport} busy={busy} run={run} reload={loadWorkspace} />}
        {view === 'organization' && <OrganizationView locale={locale} t={t} organization={currentOrganization!} organizationId={organizationId} role={role} departments={departments} members={members} invitations={invitations} auditEvents={auditEvents} tab={organizationTab} setTab={setOrganizationTab} busy={busy} run={run} reload={async () => { await loadOrganizations(); await loadWorkspace(); }} />}
      </>}
    </main>

    {showIntake && <div className="modal-backdrop" onMouseDown={() => setShowIntake(false)}><section className="modal" role="dialog" aria-modal="true" aria-labelledby="intake-title" onMouseDown={(event) => event.stopPropagation()}><div className="modal-head"><div><span className="kicker">Contract intake</span><h2 id="intake-title">{t.newRequest}</h2><p>{t.intakeHint}</p></div><button className="close" aria-label={t.close} onClick={() => setShowIntake(false)}>×</button></div><form className="form-grid" onSubmit={(event) => void createRequest(event)}><label className="wide">{t.title}<input autoFocus required minLength={3} name="title" /></label><label>{t.type}<input required minLength={2} name="contractType" placeholder="Service agreement" /></label><label>{t.counterparty}<input required minLength={2} name="counterpartyName" /></label><label>{t.department}<select required name="departmentId"><option value="">—</option>{departments.filter((item) => item.isActive).map((item) => <option value={item.id} key={item.id}>{item.code} · {item.name}</option>)}</select></label><label>{t.value}<div className="input-prefix"><span>ETB</span><input min="0" step="0.01" type="number" name="value" /></div><small>{t.amountHelp}</small></label><label>{t.effective}<input type="date" name="effectiveDate" /></label><label className="wide">{t.description}<textarea required minLength={10} rows={5} name="description" /></label><div className="form-actions wide"><button type="button" onClick={() => setShowIntake(false)}>{t.cancel}</button><button className="primary" disabled={busy} type="submit">{t.saveDraft} →</button></div></form></section></div>}
  </div>;
}

function DashboardView({ locale, t, metrics, requests, contracts, auditEvents, organization, role, onView, onRequest, onCreate }: { locale: Locale; t: typeof copy.en | typeof copy.am; metrics: { requests: number; active: number; reviews: number; portfolio: string }; requests: ContractRequest[]; contracts: Contract[]; auditEvents: AuditEvent[]; organization?: Organization; role: string; onView: (view: View) => void; onRequest: (record: ContractRequest) => void; onCreate: () => void }) {
  const progress = contracts.length ? Math.round((metrics.active / contracts.length) * 100) : 0;
  return <div className="dashboard-grid">
    <section className="hero-bento"><div><span className="eyebrow-dot"><i /> {organization?.slug}</span><h2>{t.welcome}</h2><p>{t.workflowSubtitle}</p></div><div className="hero-actions"><button className="primary" onClick={onCreate}>＋ {t.newRequest}</button><span>{t.updatedNow}</span></div><div className="hero-orb" aria-hidden="true"><span>{metrics.requests + metrics.reviews}</span><small>open</small></div></section>
    <MetricCard tone="mint" icon="↗" label={t.requestPipeline} value={String(metrics.requests)} note="Draft · submitted · triaged" onClick={() => onView('requests')} />
    <MetricCard tone="lilac" icon="✓" label={t.activeContracts} value={String(metrics.active)} note={`${progress}% ${t.contractHealth.toLowerCase()}`} onClick={() => onView('contracts')} />
    <MetricCard tone="white" icon="◎" label={t.pendingReviews} value={String(metrics.reviews)} note={t.approvalRoute} onClick={() => onView('contracts')} />
    <MetricCard tone="ink" icon="₿" label={t.portfolio} value={money(metrics.portfolio, 'ETB', locale)} note={`${contracts.length} ${t.contracts.toLowerCase()}`} onClick={() => onView('contracts')} />
    <section className="panel queue-bento"><div className="panel-head"><div><span className="kicker">{t.liveQueue}</span><h2>{t.requests}</h2></div><button className="text-button" onClick={() => onView('requests')}>{t.viewAll} →</button></div><RecordTable locale={locale} records={requests.slice(0, 5)} empty={t.empty} onSelect={(record) => onRequest(record as ContractRequest)} /></section>
    <section className="panel health-bento"><div className="panel-head no-border"><div><span className="kicker">{t.contractHealth}</span><h2>{progress}%</h2></div><span className="status status-active">{t.active}</span></div><div className="radial" style={{ '--progress': `${progress * 3.6}deg` } as CSSProperties}><div><strong>{metrics.active}</strong><small>/ {contracts.length}</small></div></div><div className="health-legend"><span><i className="active-dot" />{t.activeContracts}</span><span><i />{t.pendingReviews}</span></div></section>
    <section className="panel activity-bento"><div className="panel-head"><div><span className="kicker">{t.recentActivity}</span><h2>{t.workflow}</h2></div><button className="icon-button" onClick={() => onView('organization')}>↗</button></div><ActivityList events={auditEvents.slice(0, 5)} empty={t.noActivity} locale={locale} /></section>
    <section className="org-pulse"><div><span className="kicker">{t.organizationHealth}</span><h3>{organization?.name}</h3></div><ul><li><span>✓</span>{organization?._count?.departments ?? 0} {t.departmentsOnline}</li><li><span>✓</span>{organization?._count?.memberships ?? 0} {t.memberAccess}</li><li><span>✓</span>{t.complianceReady}</li></ul><button onClick={() => onView('organization')}>{t.organization} →</button><small>{t.role}: {labelize(role)}</small></section>
  </div>;
}

function MetricCard({ tone, icon, label, value, note, onClick }: { tone: string; icon: string; label: string; value: string; note: string; onClick: () => void }) {
  return <button className={`metric-card ${tone}`} onClick={onClick}><span className="metric-icon">{icon}</span><span>{label}</span><strong>{value}</strong><small>{note}</small><i aria-hidden="true">↗</i></button>;
}

function FilterBar({ t, search, setSearch, status, setStatus, risk, setRisk, count, statuses }: { t: typeof copy.en | typeof copy.am; search: string; setSearch: (value: string) => void; status: string; setStatus: (value: string) => void; risk: string; setRisk: (value: string) => void; count: number; statuses: string[] }) {
  return <section className="filter-bar" aria-label="Filters"><label className="search-field"><span aria-hidden="true">⌕</span><input aria-label={t.search} placeholder={t.search} value={search} onChange={(event) => setSearch(event.target.value)} /></label><select aria-label={t.status} value={status} onChange={(event) => setStatus(event.target.value)}><option value="ALL">{t.allStatus}</option>{statuses.map((item) => <option key={item} value={item}>{labelize(item)}</option>)}</select><select aria-label={t.risk} value={risk} onChange={(event) => setRisk(event.target.value)}><option value="ALL">{t.allRisk}</option>{['LOW', 'MEDIUM', 'HIGH'].map((item) => <option key={item} value={item}>{labelize(item)}</option>)}</select><span className="result-count"><strong>{count}</strong> {t.results}</span></section>;
}

function RecordTable({ records, empty, onSelect, selectedId, locale }: { records: (ContractRequest | Contract)[]; empty: string; onSelect: (record: ContractRequest | Contract) => void; selectedId?: string; locale: Locale }) {
  if (!records.length) return <div className="table-empty"><span>⌕</span><p>{empty}</p></div>;
  return <div className="records">{records.map((record) => <button key={record.id} className={selectedId === record.id ? 'selected' : ''} onClick={() => onSelect(record)}><span className="record-accent" /><div className="record-main"><span className="reference">{'requestNumber' in record ? record.requestNumber : record.contractNumber}</span><strong>{record.title}</strong><small>{record.counterpartyName} · {record.contractType}</small></div><div className="record-meta"><Status value={record.status} /><strong>{money('estimatedValueMinor' in record ? record.estimatedValueMinor : record.valueMinor, record.currency, locale)}</strong><small>{labelize(record.riskLevel)} risk</small></div><span className="chevron">›</span></button>)}</div>;
}

function WorkflowTimeline({ stages, current, labels }: { stages: string[]; current: string; labels?: Record<string, string> }) {
  const currentIndex = stages.indexOf(current);
  return <ol className="workflow-timeline">{stages.map((stage, index) => <li className={index < currentIndex ? 'done' : index === currentIndex ? 'current' : ''} key={stage}><span>{index < currentIndex ? '✓' : index + 1}</span><small>{labels?.[stage] ?? labelize(stage)}</small></li>)}</ol>;
}

function RequestDetail({ request, role, members, t, busy, run, organizationId, reload, onContract, locale }: { request: ContractRequest | null; role: string; members: Member[]; t: typeof copy.en | typeof copy.am; busy: boolean; run: (action: () => Promise<unknown>, after?: () => Promise<void>) => Promise<void>; organizationId: string; reload: () => Promise<void>; onContract: (id: string) => Promise<void>; locale: Locale }) {
  const [assignee, setAssignee] = useState(''); const [risk, setRisk] = useState('MEDIUM');
  if (!request) return <DetailEmpty text={t.selectRecord} />;
  const endpoint = `organizations/${organizationId}/contract-requests/${request.id}`;
  return <article className="panel detail"><div className="detail-head"><div><span className="reference">{request.requestNumber}</span><h2>{request.title}</h2><p>{request.counterpartyName} · {request.contractType}</p></div><Status value={request.status} /></div><section className="timeline-section"><span className="kicker">{t.workflow}</span><WorkflowTimeline stages={requestStages} current={request.status} /></section><dl className="facts"><div><dt>{t.department}</dt><dd>{request.department?.name ?? '—'}</dd></div><div><dt>{t.value}</dt><dd>{money(request.estimatedValueMinor, request.currency, locale)}</dd></div><div><dt>{t.risk}</dt><dd><Risk value={request.riskLevel} /></dd></div><div><dt>{t.owner}</dt><dd>{request.assignedTo?.displayName ?? request.assignedTo?.email ?? 'Unassigned'}</dd></div></dl><section className="description"><span className="kicker">{t.businessCase}</span><p>{request.description}</p></section><div className="workflow-actions">
    {request.status === 'DRAFT' && <button className="primary" disabled={busy} onClick={() => void run(() => api(`${endpoint}/submit`, { method: 'POST', body: '{}' }), reload)}>{t.submit} →</button>}
    {request.status === 'SUBMITTED' && canTriage(role) && <><select aria-label={t.owner} value={assignee} onChange={(e) => setAssignee(e.target.value)}><option value="">Assign to…</option>{members.filter((item) => ['CONTRACT_MANAGER', 'CONTRACT_OWNER', 'LEGAL_OFFICER', 'OWNER', 'ADMIN'].includes(item.role)).map((item) => <option value={item.id} key={item.id}>{item.user.displayName ?? item.user.email} · {labelize(item.role)}</option>)}</select><select aria-label={t.risk} value={risk} onChange={(e) => setRisk(e.target.value)}>{['LOW', 'MEDIUM', 'HIGH'].map((item) => <option key={item}>{labelize(item)}</option>)}</select><button className="primary" disabled={busy || !assignee} onClick={() => void run(() => api(`${endpoint}/triage`, { method: 'POST', body: JSON.stringify({ assignedMembershipId: assignee, riskLevel: risk }) }), reload)}>{t.triage}</button></>}
    {request.status === 'TRIAGED' && canTriage(role) && <><select aria-label={t.owner} value={assignee} onChange={(e) => setAssignee(e.target.value)}><option value="">Contract owner…</option>{members.filter((item) => item.status === 'ACTIVE').map((item) => <option value={item.id} key={item.id}>{item.user.displayName ?? item.user.email} · {labelize(item.role)}</option>)}</select><button className="primary" disabled={busy || !assignee} onClick={() => void run(async () => { const contract = await api<Contract>(`${endpoint}/convert`, { method: 'POST', body: JSON.stringify({ ownerMembershipId: assignee }) }); await onContract(contract.id); }, reload)}>{t.convert} →</button></>}
    {request.contract && <button className="primary" onClick={() => void onContract(request.contract!.id)}>Open {request.contract.contractNumber} →</button>}
  </div></article>;
}

function ContractDetail({ contract, documents, role, t, busy, organizationId, run, refreshContract, uploadDocument, locale }: { contract: Contract | null; documents: DocumentRecord[]; role: string; t: typeof copy.en | typeof copy.am; busy: boolean; organizationId: string; run: (action: () => Promise<unknown>, after?: () => Promise<void>) => Promise<void>; refreshContract: (id: string) => Promise<void>; uploadDocument: (event: FormEvent<HTMLFormElement>) => Promise<void>; locale: Locale }) {
  const [content, setContent] = useState(''); const [summary, setSummary] = useState(''); const [comment, setComment] = useState(''); const [effectiveDate, setEffectiveDate] = useState(''); const [expirationDate, setExpirationDate] = useState('');
  if (!contract) return <DetailEmpty text={t.selectRecord} />;
  const endpoint = `organizations/${organizationId}/contracts/${contract.id}`;
  const currentRound = Math.max(0, ...(contract.reviewSteps ?? []).map((step) => step.round));
  const activeSteps = (contract.reviewSteps ?? []).filter((step) => step.round === currentRound);
  return <article className="panel detail"><div className="detail-head"><div><span className="reference">{contract.contractNumber}</span><h2>{contract.title}</h2><p>{contract.counterpartyName} · {contract.contractType}</p></div><Status value={contract.status} /></div><section className="timeline-section"><span className="kicker">{t.workflow}</span><WorkflowTimeline stages={contractStages} current={contract.status === 'CHANGES_REQUESTED' ? 'IN_REVIEW' : contract.status} /></section><dl className="facts"><div><dt>{t.value}</dt><dd>{money(contract.valueMinor, contract.currency, locale)}</dd></div><div><dt>{t.risk}</dt><dd><Risk value={contract.riskLevel} /></dd></div><div><dt>{t.versions}</dt><dd>{contract.versions?.length ?? 0}</dd></div><div><dt>{t.reviewRound}</dt><dd>{currentRound || '—'}</dd></div></dl>
    {(contract.status === 'DRAFT' || contract.status === 'CHANGES_REQUESTED') && canManage(role) && <section className="action-card"><span className="kicker">{t.drafting}</span><h3>{t.addDraft}</h3><input value={summary} onChange={(e) => setSummary(e.target.value)} placeholder={t.versionSummary} /><textarea rows={7} value={content} onChange={(e) => setContent(e.target.value)} placeholder={t.versionContent} /><button className="primary" disabled={busy || content.length < 20} onClick={() => void run(() => api(`${endpoint}/versions`, { method: 'POST', body: JSON.stringify({ title: contract.title, summary: summary || undefined, content, changeNote: contract.status === 'CHANGES_REQUESTED' ? 'Revision after review' : undefined }) }), async () => { setContent(''); setSummary(''); await refreshContract(contract.id); })}>{t.addDraft} →</button></section>}
    {contract.status === 'DRAFT' && canManage(role) && (contract.versions?.length ?? 0) > 0 && <section className="action-card compact"><div><span className="kicker">{t.approvalRoute}</span><h3>{t.startReview}</h3><p>{t.reviewHelp}</p></div><button className="primary" disabled={busy} onClick={() => void run(() => api(`${endpoint}/review`, { method: 'POST', body: JSON.stringify({ steps: [{ name: t.legalReview, requiredRole: 'LEGAL_OFFICER' }, { name: t.financeApproval, requiredRole: 'FINANCE_OFFICER' }] }) }), () => refreshContract(contract.id))}>{t.startReview} →</button></section>}
    {activeSteps.length > 0 && <section className="review-route"><span className="kicker">{t.approvalRoute} · {t.reviewRound} {currentRound}</span>{activeSteps.map((step) => <div className="review-step" key={step.id}><span className="step-number">{step.status === 'APPROVED' ? '✓' : step.sequence}</span><div><strong>{step.name}</strong><small>{labelize(step.requiredRole)}</small></div><Status value={step.status} />{step.status === 'PENDING' && role === step.requiredRole && <div className="decision"><input value={comment} onChange={(e) => setComment(e.target.value)} placeholder={t.comment} /><button disabled={busy} onClick={() => void run(() => api(`${endpoint}/review-steps/${step.id}/decision`, { method: 'POST', body: JSON.stringify({ decision: 'CHANGES_REQUESTED', comment: comment || undefined }) }), () => refreshContract(contract.id))}>{t.changes}</button><button className="primary" disabled={busy} onClick={() => void run(() => api(`${endpoint}/review-steps/${step.id}/decision`, { method: 'POST', body: JSON.stringify({ decision: 'APPROVED', comment: comment || undefined }) }), () => refreshContract(contract.id))}>{t.approve}</button></div>}</div>)}</section>}
    {contract.status === 'APPROVED' && canTriage(role) && <section className="action-card compact"><label>{t.effective}<input type="date" value={effectiveDate} onChange={(e) => setEffectiveDate(e.target.value)} /></label><label>{t.expiration}<input type="date" value={expirationDate} onChange={(e) => setExpirationDate(e.target.value)} /></label><button className="primary" disabled={busy || !effectiveDate} onClick={() => void run(() => api(`${endpoint}/activate`, { method: 'POST', body: JSON.stringify({ effectiveDate, expirationDate: expirationDate || undefined }) }), () => refreshContract(contract.id))}>{t.activate}</button></section>}
    <section className="documents"><div className="panel-head"><div><span className="kicker">{t.secureStorage}</span><h3>{t.documents}</h3><small>{t.uploadHelp}</small></div></div>{documents.length ? documents.map((document) => <button className="document-row" key={document.id} onClick={() => void run(async () => { const result = await api<{ url: string }>(`${endpoint}/documents/${document.id}/download`); window.open(result.url, '_blank', 'noopener,noreferrer'); })}><span className="file-icon">{document.mimeType.includes('pdf') ? 'PDF' : 'DOC'}</span><div><strong>{document.originalName}</strong><small>{(Number(document.sizeBytes) / 1024 / 1024).toFixed(2)} MB · {labelize(document.status)}</small></div><span>↓</span></button>) : <div className="table-empty compact-empty"><p>{t.empty}</p></div>}<form className="upload" onSubmit={(event) => void uploadDocument(event)}><input name="file" type="file" accept="application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" required /><button className="primary" disabled={busy} type="submit">{t.upload}</button></form></section>
  </article>;
}

type OperationsCopy = Record<keyof typeof copy.en | keyof typeof operationalCopy.en, string>;

function OperationsView({ locale, t, organizationId, role, contracts, members, obligations, renewals, alerts, report, busy, run, reload }: { locale: Locale; t: OperationsCopy; organizationId: string; role: string; contracts: Contract[]; members: Member[]; obligations: Obligation[]; renewals: Renewal[]; alerts: OperationalAlert[]; report: OperationsReport | null; busy: boolean; run: (action: () => Promise<unknown>, after?: () => Promise<void>) => Promise<void>; reload: () => Promise<void> }) {
  const [tab, setTab] = useState<'obligations' | 'renewals' | 'report'>('obligations');
  const [scope, setScope] = useState<'ALL' | 'OPEN' | 'OVERDUE'>('OPEN');
  const canEdit = ['OWNER', 'ADMIN', 'CONTRACT_MANAGER', 'CONTRACT_OWNER', 'DEPARTMENT_MANAGER', 'FINANCE_OFFICER'].includes(role);
  const canRenew = ['OWNER', 'ADMIN', 'CONTRACT_MANAGER', 'CONTRACT_OWNER', 'LEGAL_OFFICER'].includes(role);
  const now = new Date();
  const visible = obligations.filter((item) => scope === 'ALL' || (scope === 'OPEN' && !['COMPLETED', 'WAIVED'].includes(item.status)) || (scope === 'OVERDUE' && !['COMPLETED', 'WAIVED'].includes(item.status) && new Date(item.dueDate) < now));
  const date = (value: string) => new Intl.DateTimeFormat(locale === 'am' ? 'am-ET' : 'en-ET', { year: 'numeric', month: 'short', day: 'numeric' }).format(new Date(value));
  const activeContracts = contracts.filter((item) => ['APPROVED', 'ACTIVE'].includes(item.status));

  const createObligation = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); const element = event.currentTarget; const form = new FormData(element); const contractId = String(form.get('contractId'));
    void run(() => api(`organizations/${organizationId}/contracts/${contractId}/obligations`, { method: 'POST', body: JSON.stringify({ ownerMembershipId: form.get('ownerMembershipId'), kind: form.get('kind'), title: form.get('title'), description: form.get('description') || undefined, dueDate: form.get('dueDate'), priority: form.get('priority'), reminderDays: [30, 14, 7] }) }), async () => { element.reset(); await reload(); });
  };
  const configureRenewal = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); const element = event.currentTarget; const form = new FormData(element); const contractId = String(form.get('contractId'));
    void run(() => api(`organizations/${organizationId}/contracts/${contractId}/renewal`, { method: 'PUT', body: JSON.stringify({ renewalType: form.get('renewalType'), renewalDate: form.get('renewalDate'), noticeDeadline: form.get('noticeDeadline') || undefined }) }), async () => { element.reset(); await reload(); });
  };

  return <div className="operations-view">
    <section className="operations-hero"><div><span className="eyebrow-dot"><i /> {t.operationalReport}</span><h2>{t.operations}</h2><p>{t.reportingSubtitle}</p></div><div className="ops-score"><strong>{report?.summary.completionRate ?? 0}%</strong><span>{t.completionRate}</span></div></section>
    <section className="ops-metrics" aria-label={t.operationalReport}>
      <article className="ops-metric danger"><span>!</span><div><small>{t.overdue}</small><strong>{report?.summary.overdue ?? 0}</strong></div></article>
      <article className="ops-metric amber"><span>◷</span><div><small>{t.dueSoon}</small><strong>{report?.summary.dueNext30Days ?? 0}</strong></div></article>
      <article className="ops-metric violet"><span>↻</span><div><small>{t.renewals}</small><strong>{report?.summary.pendingRenewals ?? 0}</strong></div></article>
      <article className="ops-metric mint"><span>⌁</span><div><small>{t.expiring}</small><strong>{report?.summary.expiringNext90Days ?? 0}</strong></div></article>
    </section>

    {alerts.length > 0 && <section className="attention-strip"><div className="attention-title"><span>!</span><div><small>{t.attention}</small><strong>{alerts.filter((item) => item.status === 'OPEN').length} {t.alerts.toLowerCase()}</strong></div></div><div className="alert-cards">{alerts.slice(0, 4).map((alert) => <article className={`alert-card severity-${alert.severity.toLowerCase()}`} key={alert.id}><div><span>{labelize(alert.type)}</span><strong>{alert.title}</strong><small>{alert.contract.contractNumber} · {date(alert.dueAt)}</small></div>{alert.status === 'OPEN' && canEdit && <button disabled={busy} onClick={() => void run(() => api(`organizations/${organizationId}/operational-alerts/${alert.id}/acknowledge`, { method: 'POST', body: '{}' }), reload)}>{t.acknowledge}</button>}</article>)}</div></section>}

    <div className="ops-tabs" role="tablist"><button className={tab === 'obligations' ? 'active' : ''} role="tab" aria-selected={tab === 'obligations'} onClick={() => setTab('obligations')}>{t.obligations} <b>{obligations.length}</b></button><button className={tab === 'renewals' ? 'active' : ''} role="tab" aria-selected={tab === 'renewals'} onClick={() => setTab('renewals')}>{t.renewals} <b>{renewals.length}</b></button><button className={tab === 'report' ? 'active' : ''} role="tab" aria-selected={tab === 'report'} onClick={() => setTab('report')}>{t.operationalReport}</button></div>

    {tab === 'obligations' && <div className="ops-content-grid"><section className="panel obligations-panel"><div className="panel-head"><div><span className="kicker">{t.openItems}</span><h2>{t.obligations} & {t.milestones}</h2></div><div className="scope-switch"><button className={scope === 'ALL' ? 'active' : ''} onClick={() => setScope('ALL')}>{t.allItems}</button><button className={scope === 'OPEN' ? 'active' : ''} onClick={() => setScope('OPEN')}>{t.openItems}</button><button className={scope === 'OVERDUE' ? 'active' : ''} onClick={() => setScope('OVERDUE')}>{t.overdue}</button></div></div><div className="obligation-list">{visible.length ? visible.map((item) => { const overdue = !['COMPLETED', 'WAIVED'].includes(item.status) && new Date(item.dueDate) < now; return <article key={item.id} className={overdue ? 'is-overdue' : ''}><span className={`kind-icon kind-${item.kind.toLowerCase()}`}>{item.kind === 'MILESTONE' ? '◆' : '✓'}</span><div className="obligation-main"><span className="reference">{item.contract.contractNumber} · {item.contract.department.code}</span><strong>{item.title}</strong><small>{item.owner.user.displayName ?? item.owner.user.email} · {labelize(item.kind)}</small></div><div className="obligation-date"><small>{t.dueDate}</small><strong>{date(item.dueDate)}</strong><span className={`priority priority-${item.priority.toLowerCase()}`}>{labelize(item.priority)}</span></div><Status value={item.status} />{canEdit && !['COMPLETED', 'WAIVED'].includes(item.status) && <button className="complete-button" disabled={busy} onClick={() => { const note = window.prompt(t.evidenceNote) ?? undefined; void run(() => api(`organizations/${organizationId}/obligations/${item.id}/complete`, { method: 'POST', body: JSON.stringify({ note }) }), reload); }}>{t.complete}</button>}</article>; }) : <div className="table-empty"><p>{t.noOperationalData}</p></div>}</div></section>
      {canEdit && <section className="panel create-card ops-create"><span className="kicker">{t.addObligation}</span><h2>{t.addObligation}</h2><form onSubmit={createObligation}><label>{t.contracts}<select name="contractId" required><option value="">—</option>{contracts.filter((item) => item.status !== 'CANCELLED').map((item) => <option value={item.id} key={item.id}>{item.contractNumber} · {item.title}</option>)}</select></label><div className="form-pair"><label>{t.type}<select name="kind"><option value="OBLIGATION">{t.obligations}</option><option value="MILESTONE">{t.milestones}</option></select></label><label>{t.priority}<select name="priority"><option>MEDIUM</option><option>HIGH</option><option>CRITICAL</option><option>LOW</option></select></label></div><label>{t.title}<input name="title" minLength={3} required /></label><label>{t.description}<textarea name="description" rows={3} /></label><label>{t.owner}<select name="ownerMembershipId" required><option value="">—</option>{members.filter((item) => item.status === 'ACTIVE').map((item) => <option value={item.id} key={item.id}>{item.user.displayName ?? item.user.email}</option>)}</select></label><label>{t.dueDate}<input name="dueDate" type="date" required /></label><button className="primary" disabled={busy} type="submit">＋ {t.addObligation}</button></form></section>}
    </div>}

    {tab === 'renewals' && <div className="ops-content-grid"><section className="panel renewal-panel"><div className="panel-head"><div><span className="kicker">{t.renewalBoard}</span><h2>{t.renewals}</h2></div></div><div className="renewal-list">{renewals.length ? renewals.map((item) => <article key={item.id}><div className="renewal-date"><span>{new Date(item.renewalDate).getDate()}</span><small>{new Intl.DateTimeFormat(locale === 'am' ? 'am-ET' : 'en-ET', { month: 'short' }).format(new Date(item.renewalDate))}</small></div><div><span className="reference">{item.contract.contractNumber} · {item.contract.department.code}</span><strong>{item.contract.title}</strong><small>{labelize(item.renewalType)} · {t.noticeDeadline}: {item.noticeDeadline ? date(item.noticeDeadline) : '—'}</small></div><Status value={item.decision} />{canRenew && item.decision === 'PENDING' && <div className="renewal-actions"><button onClick={() => void run(() => api(`organizations/${organizationId}/renewals/${item.id}/decision`, { method: 'POST', body: JSON.stringify({ decision: 'TERMINATE' }) }), reload)}>Terminate</button><button onClick={() => void run(() => api(`organizations/${organizationId}/renewals/${item.id}/decision`, { method: 'POST', body: JSON.stringify({ decision: 'RENEGOTIATE' }) }), reload)}>Renegotiate</button><button className="primary" onClick={() => void run(() => api(`organizations/${organizationId}/renewals/${item.id}/decision`, { method: 'POST', body: JSON.stringify({ decision: 'RENEW' }) }), reload)}>Renew</button></div>}</article>) : <div className="table-empty"><p>{t.noOperationalData}</p></div>}</div></section>
      {canRenew && <section className="panel create-card ops-create"><span className="kicker">{t.configureRenewal}</span><h2>{t.configureRenewal}</h2><form onSubmit={configureRenewal}><label>{t.contracts}<select name="contractId" required><option value="">—</option>{activeContracts.map((item) => <option value={item.id} key={item.id}>{item.contractNumber} · {item.title}</option>)}</select></label><label>{t.type}<select name="renewalType"><option value="MANUAL_RENEW">Manual renew</option><option value="AUTO_RENEW">Auto renew</option><option value="NON_RENEWING">Non-renewing</option></select></label><label>{t.renewalDate}<input type="date" name="renewalDate" required /></label><label>{t.noticeDeadline}<input type="date" name="noticeDeadline" /></label><button className="primary" disabled={busy} type="submit">↻ {t.configureRenewal}</button></form></section>}
    </div>}

    {tab === 'report' && <div className="report-grid"><section className="panel department-report"><div className="panel-head"><div><span className="kicker">{t.operationalReport}</span><h2>{t.performanceByDepartment}</h2></div><small>{report ? date(report.generatedAt) : '—'}</small></div><div>{report?.byDepartment.map((row) => { const percent = row.total ? Math.round(row.completed / row.total * 100) : 0; return <article key={row.code}><span className="department-code">{row.code}</span><div><strong>{row.name}</strong><div className="report-bar"><i style={{ width: `${percent}%` }} /></div><small>{row.completed}/{row.total} {t.complete.toLowerCase()}</small></div><b className={row.overdue ? 'has-overdue' : ''}>{row.overdue} {t.overdue.toLowerCase()}</b></article>; })}</div></section><section className="report-summary"><div className="report-ring" style={{ '--progress': `${(report?.summary.completionRate ?? 0) * 3.6}deg` } as CSSProperties}><span>{report?.summary.completionRate ?? 0}%</span></div><h3>{t.completionRate}</h3><p>{report?.summary.completed ?? 0} / {report?.summary.totalObligations ?? 0} {t.obligations.toLowerCase()}</p><ul>{report?.byPriority.map((item) => <li key={item.priority}><span className={`priority priority-${item.priority.toLowerCase()}`}>{labelize(item.priority)}</span><strong>{item.count}</strong></li>)}</ul></section></div>}
  </div>;
}

function OrganizationView({ locale, t, organization, organizationId, role, departments, members, invitations, auditEvents, tab, setTab, busy, run, reload }: { locale: Locale; t: typeof copy.en | typeof copy.am; organization: Organization; organizationId: string; role: string; departments: Department[]; members: Member[]; invitations: Invitation[]; auditEvents: AuditEvent[]; tab: 'profile' | 'departments' | 'team' | 'audit'; setTab: (tab: 'profile' | 'departments' | 'team' | 'audit') => void; busy: boolean; run: (action: () => Promise<unknown>, after?: () => Promise<void>) => Promise<void>; reload: () => Promise<void> }) {
  const tabs = [['profile', t.profile], ['departments', t.departments], ['team', t.team], ['audit', t.audit]] as const;
  return <div className="organization-view"><section className="organization-hero"><div className="org-monogram">{organization.name.slice(0, 2).toUpperCase()}</div><div><span className="eyebrow-dot"><i /> {organization.status ?? 'ACTIVE'}</span><h2>{organization.name}</h2><p>{organization.description || t.workflowSubtitle}</p></div><div className="org-stats"><span><strong>{departments.filter((item) => item.isActive).length}</strong>{t.departments}</span><span><strong>{members.filter((item) => item.status === 'ACTIVE').length}</strong>{t.members}</span><span><strong>{invitations.filter((item) => item.status === 'PENDING').length}</strong>{t.pendingInvites}</span></div></section><div className="tabs" role="tablist">{tabs.map(([key, label]) => <button role="tab" aria-selected={tab === key} className={tab === key ? 'active' : ''} key={key} onClick={() => setTab(key)}>{label}</button>)}</div>
    {tab === 'profile' && <OrganizationProfile t={t} organization={organization} canEdit={canAdmin(role)} busy={busy} save={(payload) => run(() => api(`organizations/${organizationId}`, { method: 'PATCH', body: JSON.stringify(payload) }), reload)} />}
    {tab === 'departments' && <DepartmentsPanel t={t} departments={departments} canEdit={canDepartment(role)} busy={busy} create={(payload) => run(() => api(`organizations/${organizationId}/departments`, { method: 'POST', body: JSON.stringify(payload) }), reload)} toggle={(department) => run(() => api(`organizations/${organizationId}/departments/${department.id}`, { method: 'PATCH', body: JSON.stringify({ isActive: !department.isActive }) }), reload)} />}
    {tab === 'team' && <TeamPanel t={t} members={members} invitations={invitations} canEdit={canAdmin(role)} busy={busy} invite={(payload) => run(() => api(`organizations/${organizationId}/invitations`, { method: 'POST', body: JSON.stringify(payload) }), reload)} updateMember={(id, payload) => run(() => api(`organizations/${organizationId}/memberships/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }), reload)} invitationAction={(id, action) => run(() => api(`organizations/${organizationId}/invitations/${id}/${action}`, { method: 'POST', body: '{}' }), reload)} />}
    {tab === 'audit' && <section className="panel organization-panel"><div className="panel-head"><div><span className="kicker">{t.complianceReady}</span><h2>{t.audit}</h2></div><span className="result-count"><strong>{auditEvents.length}</strong> events</span></div><ActivityList events={auditEvents} empty={t.noActivity} locale={locale} detailed /></section>}
  </div>;
}

function OrganizationProfile({ t, organization, canEdit, busy, save }: { t: typeof copy.en | typeof copy.am; organization: Organization; canEdit: boolean; busy: boolean; save: (payload: Record<string, string>) => Promise<void> }) {
  const submit = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); const form = new FormData(event.currentTarget); void save({ name: String(form.get('name')), description: String(form.get('description')), timezone: String(form.get('timezone')) }); };
  return <section className="panel organization-panel profile-grid"><div className="profile-copy"><span className="kicker">{t.orgSettings}</span><h2>{t.profile}</h2><p>{t.workflowSubtitle}</p><div className="profile-badges"><span>✓ Tenant isolated</span><span>✓ Role controlled</span><span>✓ Audit ready</span></div></div><form className="settings-form" onSubmit={submit}><label>{t.organization}<input name="name" defaultValue={organization.name} disabled={!canEdit} required /></label><label>{t.orgDescription}<textarea name="description" defaultValue={organization.description ?? ''} disabled={!canEdit} rows={4} /></label><label>{t.timezone}<select name="timezone" defaultValue={organization.timezone ?? 'Africa/Addis_Ababa'} disabled={!canEdit}><option>Africa/Addis_Ababa</option><option>UTC</option></select></label>{canEdit && <button className="primary" disabled={busy} type="submit">{t.updateProfile}</button>}</form></section>;
}

function DepartmentsPanel({ t, departments, canEdit, busy, create, toggle }: { t: typeof copy.en | typeof copy.am; departments: Department[]; canEdit: boolean; busy: boolean; create: (payload: Record<string, string>) => Promise<void>; toggle: (department: Department) => Promise<void> }) {
  const submit = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); const element = event.currentTarget; const form = new FormData(element); void create({ code: String(form.get('code')).toUpperCase(), name: String(form.get('name')), description: String(form.get('description')), ...(form.get('parentId') ? { parentId: String(form.get('parentId')) } : {}) }).then(() => element.reset()); };
  return <div className="management-grid"><section className="panel organization-panel"><div className="panel-head"><div><span className="kicker">{t.organization}</span><h2>{t.departments}</h2></div><span className="result-count"><strong>{departments.length}</strong></span></div><div className="department-list">{departments.map((department) => <article key={department.id} className={!department.isActive ? 'disabled' : ''}><span className="department-code">{department.code}</span><div><strong>{department.name}</strong><small>{department.parent ? `${department.parent.code} · ${department.parent.name}` : 'Top level'} · {department._count?.memberships ?? 0} {t.members.toLowerCase()}</small></div><Status value={department.isActive ? 'ACTIVE' : 'SUSPENDED'} />{canEdit && <button className="icon-button" disabled={busy} aria-label={department.isActive ? t.suspended : t.active} onClick={() => void toggle(department)}>{department.isActive ? '−' : '+'}</button>}</article>)}</div></section>{canEdit && <section className="panel create-card"><span className="kicker">{t.addDepartment}</span><h2>{t.addDepartment}</h2><form onSubmit={submit}><label>{t.code}<input name="code" required minLength={2} maxLength={20} placeholder="LEGAL" /></label><label>{t.department}<input name="name" required minLength={2} /></label><label>{t.parentDepartment}<select name="parentId"><option value="">—</option>{departments.filter((item) => item.isActive).map((item) => <option key={item.id} value={item.id}>{item.code} · {item.name}</option>)}</select></label><label>{t.description}<textarea name="description" rows={3} /></label><button className="primary" disabled={busy} type="submit">＋ {t.addDepartment}</button></form></section>}</div>;
}

function TeamPanel({ t, members, invitations, canEdit, busy, invite, updateMember, invitationAction }: { t: typeof copy.en | typeof copy.am; members: Member[]; invitations: Invitation[]; canEdit: boolean; busy: boolean; invite: (payload: { email: string; role: string }) => Promise<void>; updateMember: (id: string, payload: Record<string, string>) => Promise<void>; invitationAction: (id: string, action: 'resend' | 'revoke') => Promise<void> }) {
  const submit = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); const element = event.currentTarget; const form = new FormData(element); void invite({ email: String(form.get('email')), role: String(form.get('role')) }).then(() => element.reset()); };
  return <div className="team-stack">{canEdit && <section className="invite-strip"><div><span className="kicker">{t.inviteMember}</span><h3>{t.inviteMember}</h3></div><form onSubmit={submit}><input aria-label={t.email} type="email" name="email" placeholder={t.email} required /><select aria-label={t.accessRole} name="role">{roles.map((item) => <option key={item} value={item}>{labelize(item)}</option>)}</select><button className="primary" disabled={busy} type="submit">＋ {t.invite}</button></form></section>}<section className="panel organization-panel"><div className="panel-head"><div><span className="kicker">{t.people}</span><h2>{t.members}</h2></div><span className="result-count"><strong>{members.length}</strong></span></div><div className="people-table">{members.map((member) => <div className="person-row" key={member.id}><span className="avatar">{(member.user.displayName ?? member.user.email ?? 'K').slice(0, 2).toUpperCase()}</span><div><strong>{member.user.displayName ?? member.user.email}</strong><small>{member.user.email}</small></div>{canEdit && member.role !== 'OWNER' ? <select aria-label={t.accessRole} value={member.role} disabled={busy} onChange={(event) => void updateMember(member.id, { role: event.target.value })}>{roles.map((item) => <option key={item}>{item}</option>)}</select> : <span className="role-label">{labelize(member.role)}</span>}<Status value={member.status} />{canEdit && member.role !== 'OWNER' && <button className="icon-button" aria-label={member.status === 'ACTIVE' ? t.suspended : t.active} onClick={() => void updateMember(member.id, { status: member.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE' })}>{member.status === 'ACTIVE' ? '−' : '+'}</button>}</div>)}</div></section>{invitations.length > 0 && <section className="panel organization-panel"><div className="panel-head"><div><span className="kicker">{t.pendingInvites}</span><h2>{t.invitations}</h2></div></div><div className="people-table">{invitations.map((invitation) => <div className="person-row invitation-row" key={invitation.id}><span className="avatar invite-avatar">@</span><div><strong>{invitation.email}</strong><small>{labelize(invitation.role)} · {new Date(invitation.expiresAt).toLocaleDateString()}</small></div><Status value={invitation.status} />{canEdit && ['PENDING', 'EXPIRED'].includes(invitation.status) && <div className="row-actions"><button onClick={() => void invitationAction(invitation.id, 'resend')}>{t.resend}</button>{invitation.status === 'PENDING' && <button onClick={() => void invitationAction(invitation.id, 'revoke')}>{t.revoke}</button>}</div>}</div>)}</div></section>}</div>;
}

function ActivityList({ events, empty, locale, detailed = false }: { events: AuditEvent[]; empty: string; locale: Locale; detailed?: boolean }) {
  if (!events.length) return <div className="table-empty compact-empty"><p>{empty}</p></div>;
  return <div className={`activity-list ${detailed ? 'detailed' : ''}`}>{events.map((event) => <div key={event.id}><span className="activity-icon">{event.action.includes('created') ? '+' : event.action.includes('approved') || event.action.includes('activated') ? '✓' : '↗'}</span><div><strong>{labelize(event.action.replace('.', ' · '))}</strong><small>{event.actor?.displayName ?? event.actor?.email ?? 'System'} · {event.entityType.replaceAll('_', ' ')}</small></div><time dateTime={event.createdAt}>{new Intl.DateTimeFormat(locale === 'am' ? 'am-ET' : 'en-ET', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(event.createdAt))}</time></div>)}</div>;
}

function Status({ value }: { value: string }) { return <span className={`status status-${value.toLowerCase()}`}>{labelize(value)}</span>; }
function Risk({ value }: { value: string }) { return <span className={`risk risk-${value.toLowerCase()}`}><i />{labelize(value)}</span>; }
function DetailEmpty({ text }: { text: string }) { return <div className="panel detail-empty"><div>↗</div><h3>Ready when you are</h3><p>{text}</p></div>; }
