'use client';

import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';

type Locale = 'en' | 'am';
type Organization = { id: string; name: string; slug: string; memberships: { id: string; role: string; status: string }[] };
type Department = { id: string; code: string; name: string; isActive: boolean };
type Member = { id: string; role: string; status: string; user: { email: string | null; displayName: string | null } };
type ContractRequest = { id: string; requestNumber: string; title: string; description: string; contractType: string; counterpartyName: string; estimatedValueMinor: string | null; currency: string; riskLevel: string; status: string; departmentId: string; department?: Department; assignedTo?: { displayName: string | null; email: string | null } | null; contract?: { id: string; contractNumber: string; status: string } | null };
type ReviewStep = { id: string; round: number; sequence: number; name: string; requiredRole: string; status: string; comment?: string | null };
type DocumentRecord = { id: string; originalName: string; mimeType: string; sizeBytes: string; status: string; createdAt: string };
type Contract = { id: string; contractNumber: string; title: string; counterpartyName: string; contractType: string; status: string; riskLevel: string; currency: string; valueMinor: string | null; departmentId: string; versions?: { id: string; versionNumber: number; title: string; createdAt: string }[]; reviewSteps?: ReviewStep[] };

const copy = {
  en: { dashboard: 'Workspace', requests: 'Requests', contracts: 'Contracts', newRequest: 'New request', signOut: 'Sign out', signedIn: 'Signed in as', empty: 'Nothing here yet.', selectOrganization: 'Select an organization', loading: 'Loading workspace…', title: 'Contract title', description: 'Business need and scope', type: 'Contract type', counterparty: 'Counterparty', department: 'Department', value: 'Estimated value', effective: 'Desired effective date', saveDraft: 'Save draft', submit: 'Submit', triage: 'Triage', convert: 'Convert', addDraft: 'Add draft version', startReview: 'Start review', approve: 'Approve', changes: 'Request changes', activate: 'Activate', documents: 'Documents', upload: 'Upload document', overview: 'Overview', status: 'Status', owner: 'Owner', refresh: 'Refresh', retry: 'Try again', welcome: 'Move requests from intake to an active, auditable contract.', noOrganization: 'Create an organization through the API or ask an administrator to invite you.', selectRecord: 'Select a record to inspect its workflow.', actionDone: 'Action completed.', role: 'Your role', requestPipeline: 'Request pipeline', activeContracts: 'Active contracts', pendingReviews: 'Pending reviews', amountHelp: 'Enter whole ETB; Kal_flow stores minor units.', versionContent: 'Draft contract text', versionSummary: 'Version summary', versionNote: 'Change note', reviewHelp: 'Starts Legal review followed by Finance review.', comment: 'Decision comment', expiration: 'Expiration date', uploadHelp: 'PDF and DOCX, up to 25 MB.' },
  am: { dashboard: 'የሥራ ቦታ', requests: 'ጥያቄዎች', contracts: 'ውሎች', newRequest: 'አዲስ ጥያቄ', signOut: 'ውጣ', signedIn: 'የገቡት', empty: 'እስካሁን ምንም የለም።', selectOrganization: 'ድርጅት ይምረጡ', loading: 'የሥራ ቦታው እየተጫነ ነው…', title: 'የውል ርዕስ', description: 'የንግድ ፍላጎትና ወሰን', type: 'የውል ዓይነት', counterparty: 'ተዋዋይ ወገን', department: 'ክፍል', value: 'ግምታዊ ዋጋ', effective: 'የሚፈለገው መጀመሪያ ቀን', saveDraft: 'ረቂቅ አስቀምጥ', submit: 'አስገባ', triage: 'መድብ', convert: 'ወደ ውል ቀይር', addDraft: 'የውል ረቂቅ ጨምር', startReview: 'ግምገማ ጀምር', approve: 'አጽድቅ', changes: 'ማሻሻያ ጠይቅ', activate: 'ተግባራዊ አድርግ', documents: 'ሰነዶች', upload: 'ሰነድ ስቀል', overview: 'አጠቃላይ እይታ', status: 'ሁኔታ', owner: 'ኃላፊ', refresh: 'አድስ', retry: 'እንደገና ሞክር', welcome: 'ጥያቄዎችን ከመግቢያ እስከ ተግባራዊና ኦዲት የሚደረግ ውል ያስተዳድሩ።', noOrganization: 'ድርጅት ይፍጠሩ ወይም አስተዳዳሪ እንዲጋብዝዎ ይጠይቁ።', selectRecord: 'የሂደቱን ዝርዝር ለማየት መዝገብ ይምረጡ።', actionDone: 'ተግባሩ ተጠናቋል።', role: 'የእርስዎ ሚና', requestPipeline: 'የጥያቄ ሂደት', activeContracts: 'ተግባራዊ ውሎች', pendingReviews: 'የሚጠበቁ ግምገማዎች', amountHelp: 'ሙሉ ብር ያስገቡ፤ Kal_flow በሳንቲም ያስቀምጣል።', versionContent: 'የውል ረቂቅ ጽሑፍ', versionSummary: 'የስሪት ማጠቃለያ', versionNote: 'የለውጥ ማስታወሻ', reviewHelp: 'የሕግ ግምገማን ተከትሎ የፋይናንስ ግምገማ ይጀምራል።', comment: 'የውሳኔ አስተያየት', expiration: 'ማብቂያ ቀን', uploadHelp: 'PDF እና DOCX፣ እስከ 25 MB።' },
} as const;

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api/bff/${path}`, { ...init, headers: init?.body instanceof FormData ? init.headers : { 'content-type': 'application/json', ...init?.headers } });
  const payload = await response.json().catch(() => ({})) as { message?: string };
  if (!response.ok) throw new Error(payload.message ?? `Request failed (${response.status})`);
  return payload as T;
}

const money = (minor: string | null, currency: string) => minor ? new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(Number(minor) / 100) : '—';
const canManage = (role: string) => ['OWNER', 'ADMIN', 'CONTRACT_MANAGER', 'CONTRACT_OWNER'].includes(role);
const canTriage = (role: string) => ['OWNER', 'ADMIN', 'CONTRACT_MANAGER'].includes(role);
const canActivate = (role: string) => ['OWNER', 'ADMIN', 'CONTRACT_MANAGER'].includes(role);

export function ContractWorkspace({ locale, email, signOutAction }: { locale: Locale; email: string; signOutAction: () => Promise<void> }) {
  const t = copy[locale];
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [organizationId, setOrganizationId] = useState('');
  const [departments, setDepartments] = useState<Department[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [requests, setRequests] = useState<ContractRequest[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<ContractRequest | null>(null);
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [view, setView] = useState<'overview' | 'requests' | 'contracts'>('overview');
  const [showIntake, setShowIntake] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

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
      setDepartments(departmentItems.filter((item) => item.isActive));
      setMembers(memberItems.filter((item) => item.status === 'ACTIVE'));
      setRequests(requestItems);
      setContracts(contractItems);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to load workspace'); }
  }, [organizationId]);

  useEffect(() => { void loadOrganizations(); }, [loadOrganizations]);
  useEffect(() => { void loadWorkspace(); }, [loadWorkspace]);

  const refreshContract = useCallback(async (contractId: string) => {
    const contract = await api<Contract>(`organizations/${organizationId}/contracts/${contractId}`);
    const items = await api<DocumentRecord[]>(`organizations/${organizationId}/contracts/${contractId}/documents`);
    setSelectedContract(contract); setDocuments(items);
  }, [organizationId]);

  const run = async (action: () => Promise<unknown>, after?: () => Promise<void>) => {
    setBusy(true); setError(''); setNotice('');
    try { await action(); await (after?.() ?? loadWorkspace()); setNotice(t.actionDone); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Action failed'); }
    finally { setBusy(false); }
  };

  const metrics = useMemo(() => ({ requests: requests.filter((item) => !['CONVERTED', 'CANCELLED'].includes(item.status)).length, active: contracts.filter((item) => item.status === 'ACTIVE').length, reviews: contracts.filter((item) => item.status === 'IN_REVIEW').length }), [requests, contracts]);

  async function createRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = new FormData(event.currentTarget);
    const wholeValue = String(form.get('value') ?? '').replace(/,/g, '');
    await run(() => api(`organizations/${organizationId}/contract-requests`, { method: 'POST', body: JSON.stringify({ departmentId: form.get('departmentId'), title: form.get('title'), description: form.get('description'), contractType: form.get('contractType'), counterpartyName: form.get('counterpartyName'), estimatedValueMinor: wholeValue ? String(Math.round(Number(wholeValue) * 100)) : undefined, currency: 'ETB', desiredEffectiveDate: form.get('effectiveDate') || undefined }) }), async () => { setShowIntake(false); event.currentTarget.reset(); await loadWorkspace(); setView('requests'); });
  }

  async function uploadDocument(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!selectedContract) return; const form = new FormData(event.currentTarget);
    await run(() => api(`organizations/${organizationId}/contracts/${selectedContract.id}/documents`, { method: 'POST', body: form }), async () => { event.currentTarget.reset(); await refreshContract(selectedContract.id); });
  }

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><span className="brand-mark">K</span><div><strong>Kal_flow</strong><small>Contract intelligence</small></div></div>
      <nav>
        {([['overview', t.overview], ['requests', t.requests], ['contracts', t.contracts]] as const).map(([key, label]) => <button className={view === key ? 'active' : ''} key={key} onClick={() => setView(key)}><span>{key === 'overview' ? '⌂' : key === 'requests' ? '↳' : '▤'}</span>{label}</button>)}
      </nav>
      <div className="sidebar-foot"><span>{t.signedIn}</span><strong>{email}</strong><form action={signOutAction}><button type="submit">{t.signOut}</button></form></div>
    </aside>
    <main className="workspace">
      <header className="topbar"><div><span className="kicker">{t.dashboard}</span><h1>{currentOrganization?.name ?? 'Kal_flow'}</h1></div><div className="top-actions"><select aria-label={t.selectOrganization} value={organizationId} onChange={(event) => setOrganizationId(event.target.value)}>{organizations.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select><a className="language" href={`/${locale === 'en' ? 'am' : 'en'}`}>{locale === 'en' ? 'አማርኛ' : 'English'}</a><button className="primary" disabled={!organizationId || departments.length === 0} onClick={() => setShowIntake(true)}>＋ {t.newRequest}</button></div></header>
      {error && <div className="alert error"><span>{error}</span><button onClick={() => void loadWorkspace()}>{t.retry}</button></div>}
      {notice && <div className="alert success">{notice}</div>}
      {!organizations.length && !error ? <section className="empty-state"><div className="empty-icon">K</div><h2>{t.loading}</h2><p>{t.noOrganization}</p></section> : null}
      {organizations.length > 0 && <>
        {view === 'overview' && <>
          <section className="welcome"><div><span className="kicker">{currentOrganization?.slug}</span><h2>{t.welcome}</h2></div><div className="role-chip"><span>{t.role}</span><strong>{role.replaceAll('_', ' ')}</strong></div></section>
          <section className="metric-grid"><article><span>{t.requestPipeline}</span><strong>{metrics.requests}</strong><small>Draft · submitted · triaged</small></article><article><span>{t.pendingReviews}</span><strong>{metrics.reviews}</strong><small>Sequential approvals</small></article><article><span>{t.activeContracts}</span><strong>{metrics.active}</strong><small>Approved and activated</small></article></section>
          <section className="panel"><div className="panel-head"><div><span className="kicker">Live queue</span><h3>{t.requests}</h3></div><button className="text-button" onClick={() => setView('requests')}>View all →</button></div><RecordTable records={requests.slice(0, 5)} empty={t.empty} onSelect={(record) => { setSelectedRequest(record as ContractRequest); setView('requests'); }} /></section>
        </>}
        {view === 'requests' && <section className="split-view"><div className="panel list-panel"><div className="panel-head"><div><span className="kicker">Intake</span><h3>{t.requests}</h3></div><button className="text-button" onClick={() => void loadWorkspace()}>{t.refresh}</button></div><RecordTable records={requests} empty={t.empty} onSelect={(record) => setSelectedRequest(record as ContractRequest)} selectedId={selectedRequest?.id} /></div><RequestDetail request={selectedRequest} role={role} members={members} t={t} busy={busy} run={run} organizationId={organizationId} reload={loadWorkspace} onContract={async (id) => { await refreshContract(id); setView('contracts'); }} /></section>}
        {view === 'contracts' && <section className="split-view"><div className="panel list-panel"><div className="panel-head"><div><span className="kicker">Repository</span><h3>{t.contracts}</h3></div><button className="text-button" onClick={() => void loadWorkspace()}>{t.refresh}</button></div><RecordTable records={contracts} empty={t.empty} onSelect={(record) => void refreshContract(record.id)} selectedId={selectedContract?.id} /></div><ContractDetail contract={selectedContract} documents={documents} role={role} t={t} busy={busy} organizationId={organizationId} run={run} refreshContract={refreshContract} uploadDocument={uploadDocument} /></section>}
      </>}
    </main>
    {showIntake && <div className="modal-backdrop" onMouseDown={() => setShowIntake(false)}><section className="modal" onMouseDown={(event) => event.stopPropagation()}><div className="modal-head"><div><span className="kicker">Contract intake</span><h2>{t.newRequest}</h2></div><button className="close" onClick={() => setShowIntake(false)}>×</button></div><form className="form-grid" onSubmit={(event) => void createRequest(event)}><label className="wide">{t.title}<input required minLength={3} name="title" /></label><label>{t.type}<input required minLength={2} name="contractType" placeholder="Service agreement" /></label><label>{t.counterparty}<input required minLength={2} name="counterpartyName" /></label><label>{t.department}<select required name="departmentId"><option value="">—</option>{departments.map((item) => <option value={item.id} key={item.id}>{item.code} · {item.name}</option>)}</select></label><label>{t.value}<input min="0" step="0.01" type="number" name="value" /><small>{t.amountHelp}</small></label><label>{t.effective}<input type="date" name="effectiveDate" /></label><label className="wide">{t.description}<textarea required minLength={10} rows={6} name="description" /></label><div className="form-actions wide"><button type="button" onClick={() => setShowIntake(false)}>Cancel</button><button className="primary" disabled={busy} type="submit">{t.saveDraft}</button></div></form></section></div>}
  </div>;
}

function RecordTable({ records, empty, onSelect, selectedId }: { records: (ContractRequest | Contract)[]; empty: string; onSelect: (record: ContractRequest | Contract) => void; selectedId?: string }) {
  if (!records.length) return <div className="table-empty">{empty}</div>;
  return <div className="records">{records.map((record) => <button key={record.id} className={selectedId === record.id ? 'selected' : ''} onClick={() => onSelect(record)}><div><strong>{'requestNumber' in record ? record.requestNumber : record.contractNumber}</strong><span>{record.title}</span></div><div><span>{record.counterpartyName}</span><Status value={record.status} /></div></button>)}</div>;
}

function RequestDetail({ request, role, members, t, busy, run, organizationId, reload, onContract }: { request: ContractRequest | null; role: string; members: Member[]; t: typeof copy.en | typeof copy.am; busy: boolean; run: (action: () => Promise<unknown>, after?: () => Promise<void>) => Promise<void>; organizationId: string; reload: () => Promise<void>; onContract: (id: string) => Promise<void> }) {
  const [assignee, setAssignee] = useState(''); const [risk, setRisk] = useState('MEDIUM');
  if (!request) return <DetailEmpty text={t.selectRecord} />;
  const endpoint = `organizations/${organizationId}/contract-requests/${request.id}`;
  return <article className="panel detail"><div className="detail-head"><div><span className="reference">{request.requestNumber}</span><h2>{request.title}</h2><p>{request.counterpartyName} · {request.contractType}</p></div><Status value={request.status} /></div><dl className="facts"><div><dt>{t.department}</dt><dd>{request.department?.name ?? '—'}</dd></div><div><dt>{t.value}</dt><dd>{money(request.estimatedValueMinor, request.currency)}</dd></div><div><dt>Risk</dt><dd>{request.riskLevel}</dd></div><div><dt>{t.owner}</dt><dd>{request.assignedTo?.displayName ?? request.assignedTo?.email ?? 'Unassigned'}</dd></div></dl><section className="description"><span className="kicker">Business case</span><p>{request.description}</p></section><div className="workflow-actions">
    {request.status === 'DRAFT' && <button className="primary" disabled={busy} onClick={() => void run(() => api(`${endpoint}/submit`, { method: 'POST', body: '{}' }), reload)}>{t.submit}</button>}
    {request.status === 'SUBMITTED' && canTriage(role) && <><select value={assignee} onChange={(e) => setAssignee(e.target.value)}><option value="">Assign to…</option>{members.filter((item) => ['CONTRACT_MANAGER', 'CONTRACT_OWNER', 'LEGAL_OFFICER', 'OWNER', 'ADMIN'].includes(item.role)).map((item) => <option value={item.id} key={item.id}>{item.user.displayName ?? item.user.email} · {item.role}</option>)}</select><select value={risk} onChange={(e) => setRisk(e.target.value)}>{['LOW', 'MEDIUM', 'HIGH'].map((item) => <option key={item}>{item}</option>)}</select><button className="primary" disabled={busy || !assignee} onClick={() => void run(() => api(`${endpoint}/triage`, { method: 'POST', body: JSON.stringify({ assignedMembershipId: assignee, riskLevel: risk }) }), reload)}>{t.triage}</button></>}
    {request.status === 'TRIAGED' && canTriage(role) && <><select value={assignee} onChange={(e) => setAssignee(e.target.value)}><option value="">Contract owner…</option>{members.map((item) => <option value={item.id} key={item.id}>{item.user.displayName ?? item.user.email} · {item.role}</option>)}</select><button className="primary" disabled={busy || !assignee} onClick={() => void run(async () => { const contract = await api<Contract>(`${endpoint}/convert`, { method: 'POST', body: JSON.stringify({ ownerMembershipId: assignee }) }); await onContract(contract.id); }, reload)}>{t.convert}</button></>}
    {request.contract && <button className="primary" onClick={() => void onContract(request.contract!.id)}>Open {request.contract.contractNumber} →</button>}
  </div></article>;
}

function ContractDetail({ contract, documents, role, t, busy, organizationId, run, refreshContract, uploadDocument }: { contract: Contract | null; documents: DocumentRecord[]; role: string; t: typeof copy.en | typeof copy.am; busy: boolean; organizationId: string; run: (action: () => Promise<unknown>, after?: () => Promise<void>) => Promise<void>; refreshContract: (id: string) => Promise<void>; uploadDocument: (event: FormEvent<HTMLFormElement>) => Promise<void> }) {
  const [content, setContent] = useState(''); const [summary, setSummary] = useState(''); const [comment, setComment] = useState(''); const [effectiveDate, setEffectiveDate] = useState(''); const [expirationDate, setExpirationDate] = useState('');
  if (!contract) return <DetailEmpty text={t.selectRecord} />;
  const endpoint = `organizations/${organizationId}/contracts/${contract.id}`;
  const currentRound = Math.max(0, ...(contract.reviewSteps ?? []).map((step) => step.round));
  const activeSteps = (contract.reviewSteps ?? []).filter((step) => step.round === currentRound);
  return <article className="panel detail"><div className="detail-head"><div><span className="reference">{contract.contractNumber}</span><h2>{contract.title}</h2><p>{contract.counterpartyName} · {contract.contractType}</p></div><Status value={contract.status} /></div><dl className="facts"><div><dt>{t.value}</dt><dd>{money(contract.valueMinor, contract.currency)}</dd></div><div><dt>Risk</dt><dd>{contract.riskLevel}</dd></div><div><dt>Versions</dt><dd>{contract.versions?.length ?? 0}</dd></div><div><dt>Review round</dt><dd>{currentRound || '—'}</dd></div></dl>
    {(contract.status === 'DRAFT' || contract.status === 'CHANGES_REQUESTED') && canManage(role) && <section className="action-card"><span className="kicker">Drafting</span><h3>{t.addDraft}</h3><input value={summary} onChange={(e) => setSummary(e.target.value)} placeholder={t.versionSummary} /><textarea rows={8} value={content} onChange={(e) => setContent(e.target.value)} placeholder={t.versionContent} /><button className="primary" disabled={busy || content.length < 20} onClick={() => void run(() => api(`${endpoint}/versions`, { method: 'POST', body: JSON.stringify({ title: contract.title, summary: summary || undefined, content, changeNote: contract.status === 'CHANGES_REQUESTED' ? 'Revision after review' : undefined }) }), async () => { setContent(''); setSummary(''); await refreshContract(contract.id); })}>{t.addDraft}</button></section>}
    {contract.status === 'DRAFT' && canManage(role) && (contract.versions?.length ?? 0) > 0 && <section className="action-card compact"><div><span className="kicker">Approval route</span><h3>{t.startReview}</h3><p>{t.reviewHelp}</p></div><button className="primary" disabled={busy} onClick={() => void run(() => api(`${endpoint}/review`, { method: 'POST', body: JSON.stringify({ steps: [{ name: 'Legal review', requiredRole: 'LEGAL_OFFICER' }, { name: 'Finance approval', requiredRole: 'FINANCE_OFFICER' }] }) }), () => refreshContract(contract.id))}>{t.startReview}</button></section>}
    {activeSteps.length > 0 && <section className="review-route"><span className="kicker">Review route · round {currentRound}</span>{activeSteps.map((step) => <div className="review-step" key={step.id}><span className="step-number">{step.sequence}</span><div><strong>{step.name}</strong><small>{step.requiredRole.replaceAll('_', ' ')}</small></div><Status value={step.status} />{step.status === 'PENDING' && role === step.requiredRole && <div className="decision"><input value={comment} onChange={(e) => setComment(e.target.value)} placeholder={t.comment} /><button disabled={busy} onClick={() => void run(() => api(`${endpoint}/review-steps/${step.id}/decision`, { method: 'POST', body: JSON.stringify({ decision: 'CHANGES_REQUESTED', comment: comment || undefined }) }), () => refreshContract(contract.id))}>{t.changes}</button><button className="primary" disabled={busy} onClick={() => void run(() => api(`${endpoint}/review-steps/${step.id}/decision`, { method: 'POST', body: JSON.stringify({ decision: 'APPROVED', comment: comment || undefined }) }), () => refreshContract(contract.id))}>{t.approve}</button></div>}</div>)}</section>}
    {contract.status === 'APPROVED' && canActivate(role) && <section className="action-card compact"><label>Effective<input type="date" value={effectiveDate} onChange={(e) => setEffectiveDate(e.target.value)} /></label><label>{t.expiration}<input type="date" value={expirationDate} onChange={(e) => setExpirationDate(e.target.value)} /></label><button className="primary" disabled={busy || !effectiveDate} onClick={() => void run(() => api(`${endpoint}/activate`, { method: 'POST', body: JSON.stringify({ effectiveDate, expirationDate: expirationDate || undefined }) }), () => refreshContract(contract.id))}>{t.activate}</button></section>}
    <section className="documents"><div className="panel-head"><div><span className="kicker">Secure storage</span><h3>{t.documents}</h3><small>{t.uploadHelp}</small></div></div>{documents.length ? documents.map((document) => <button className="document-row" key={document.id} onClick={() => void run(async () => { const result = await api<{ url: string }>(`${endpoint}/documents/${document.id}/download`); window.open(result.url, '_blank', 'noopener,noreferrer'); })}><span className="file-icon">DOC</span><div><strong>{document.originalName}</strong><small>{(Number(document.sizeBytes) / 1024 / 1024).toFixed(2)} MB · {document.status}</small></div><span>↓</span></button>) : <div className="table-empty">{t.empty}</div>}<form className="upload" onSubmit={(event) => void uploadDocument(event)}><input name="file" type="file" accept="application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" required /><button className="primary" disabled={busy} type="submit">{t.upload}</button></form></section>
  </article>;
}

function Status({ value }: { value: string }) { return <span className={`status status-${value.toLowerCase()}`}>{value.replaceAll('_', ' ')}</span>; }
function DetailEmpty({ text }: { text: string }) { return <div className="panel detail-empty"><div>↗</div><p>{text}</p></div>; }
