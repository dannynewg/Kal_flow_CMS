# Contract Request Intake and Workflow

Kal_flow's first contract-management workflow turns a departmental business request into an approved, active contract without allowing clients to skip lifecycle controls.

## Lifecycle

1. A member creates and edits a request in `DRAFT`.
2. Only its requester can submit it.
3. A contract manager assigns an active organization member and records the risk level.
4. The triaged request is converted once into a tenant-owned draft contract.
5. Authorized contract staff add immutable version snapshots.
6. A review round defines one to twelve sequential steps, each requiring an organization role and optionally a named user.
7. An authorized reviewer approves the current step or requests changes.
8. A change request returns the contract to drafting when a new version is added. Resubmission creates a new review round and retains prior decisions.
9. After every step in the current round is approved, a contract manager can activate the contract with valid effective and expiration dates.

Direct arbitrary status updates are intentionally not exposed.

The requester may cancel their own request while it is still draft or submitted. Triaged and converted requests require the managed workflow and cannot be cancelled through the intake endpoint.

## API endpoints

| Capability | Endpoint | Permission |
| --- | --- | --- |
| Create/list requests | `POST/GET /v1/organizations/:organizationId/contract-requests` | `contract.request.create/read` |
| Read/edit request | `GET/PATCH /v1/organizations/:organizationId/contract-requests/:requestId` | `contract.request.read/create` |
| Submit request | `POST .../contract-requests/:requestId/submit` | `contract.request.create` |
| Cancel request | `POST .../contract-requests/:requestId/cancel` | `contract.request.create` |
| Triage request | `POST .../contract-requests/:requestId/triage` | `contract.request.triage` |
| Convert request | `POST .../contract-requests/:requestId/convert` | `contract.request.triage` |
| List/read contracts | `GET /v1/organizations/:organizationId/contracts[/:contractId]` | `contract.read` |
| Add version | `POST .../contracts/:contractId/versions` | `contract.manage` |
| Start review round | `POST .../contracts/:contractId/review` | `contract.manage` |
| Record decision | `POST .../contracts/:contractId/review-steps/:stepId/decision` | `contract.review` |
| Activate contract | `POST .../contracts/:contractId/activate` | `contract.activate` |
| List documents | `GET .../contracts/:contractId/documents` | `document.read` |
| Upload PDF/DOCX | `POST .../contracts/:contractId/documents` | `document.upload` |
| Create signed download | `GET .../contracts/:contractId/documents/:documentId/download` | `document.read` |
| Search governed repository | `GET /v1/organizations/:organizationId/documents` | `document.read` |
| Update classification metadata | `PATCH .../documents/:documentId` | `document.manage` |
| Archive a document | `POST .../documents/:documentId/archive` | `document.manage` |

All endpoints also require an active membership in the active organization. IDs for departments, owners, assignees, contracts, requests, and review steps are resolved inside that organization boundary.

## Integrity and audit rules

- Request and contract references are server-generated and unique within the organization.
- Request conversion is retry-safe: an already converted request returns its existing contract.
- Monetary values are stored as non-negative minor units and serialized as strings to avoid precision loss.
- Contract versions are immutable rows with increasing version numbers.
- Review decisions are ordered within a numbered review round; later steps cannot decide before earlier ones.
- A named reviewer must also hold the step's required active organization role.
- Expiration cannot precede the effective date.
- Request, conversion, version, review, approval, change-request, and activation mutations write append-only audit events in the same transaction.

PDF and DOCX attachments are stored under randomized tenant/contract object keys. The API validates type and size, computes a SHA-256 fingerprint, writes metadata to PostgreSQL, and issues five-minute signed download URLs without exposing storage credentials. Upload audit metadata includes the fingerprint and never includes document bytes.

The organization document center searches filenames, titles, descriptions, tags, contract references, titles, and counterparties inside the active tenant. Authorized users can assign category, confidentiality, normalized tags, and a retention date. Archival is reversible. Permanent deletion requires an archived state and is blocked until the retention date has passed. Quarantined files are excluded from downloads and cannot be edited or archived.

The embedded document workspace shows PDFs beside a governed page editor. DOCX files remain available through a short-lived signed download while their managed page content is edited in the same workspace. Every save creates an immutable revision snapshot before replacing the current ordered pages. Page changes, restoration, archival, and deletion all produce audit events.

Operational alerts can feed organization notification rules for email or SMS. The worker deduplicates each rule/alert pair and posts pending deliveries to the configured provider webhook. Missing providers are recorded as `SKIPPED`; provider errors are recorded as `FAILED` and can be retried from the UI. A delivery is marked `SENT` only after a successful provider response.

Electronic signatures, malware scanning, binary DOCX editing, and file-content comparison remain later phases. Staging must not be promoted to production until document malware scanning, production notification providers, and backup/restore drills are in place.
