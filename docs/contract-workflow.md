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

Document bytes, templates, clause composition, signatures, and file comparison are deliberately deferred to later phases. This phase stores controlled contract content snapshots so those modules can attach to a stable contract and version identity.
