# Organization and Department Management

This phase completes the tenant administration boundary used by future contract workflows.

## Invariants

- Every tenant-owned query includes `organizationId`.
- An organization has one active owner role. Only the owner-only transfer endpoint may change it.
- Department parents and assigned memberships must belong to the same organization.
- A department cannot be its own ancestor, and a department with children cannot be deleted.
- Invitation tokens are returned once, stored only as SHA-256 digests, expire after seven days, and can be accepted only by the matching authenticated email.
- Every management mutation and ownership transfer writes an audit event in the same transaction.
- Audit records have no update or delete API.

## API surface

All routes are under `/v1`, require a Keycloak bearer token, and—except invitation acceptance—use the organization permission guard.

| Area | Routes | Permission |
| --- | --- | --- |
| Organization | `GET/PATCH /organizations/:organizationId` | `organization.read/manage` |
| Memberships | `GET/POST/PATCH /organizations/:organizationId/memberships` | `membership.read/manage` |
| Ownership | `POST /organizations/:organizationId/ownership-transfer` | `organization.transfer` (owner only) |
| Departments | `GET/POST/PATCH/DELETE /organizations/:organizationId/departments` | `department.read/manage` |
| Department members | `GET/POST/DELETE .../departments/:departmentId/memberships` | `department.read/manage` |
| Invitations | `GET/POST .../invitations`, `POST .../:id/resend`, `POST .../:id/revoke` | `invitation.read/manage` |
| Invitation acceptance | `POST /invitations/accept` | Authenticated matching identity |
| Audit | `GET /organizations/:organizationId/audit-events` | `audit.read` |

Invitation creation and resend return a plaintext token once so a trusted caller can construct the acceptance link. A notification worker and email provider should consume that result in the staging phase; plaintext tokens must not be written to logs or audit metadata.

## Role boundaries

Owners have every organization permission. Administrators can manage organizations, memberships, departments, and invitations but cannot transfer ownership. Department managers can manage department structure and assignments. Auditors can read organization, membership, department, invitation, and audit data without changing it. Other domain roles receive read access needed for their work.
