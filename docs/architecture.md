# Architecture

Kal_flow uses a TypeScript modular-monolith architecture designed for secure, self-hosted contract management. The initial stack is formally accepted in [ADR-0001](architecture/adr/0001-application-stack.md).

## Technology stack

| Layer | Technology |
| --- | --- |
| Frontend | Next.js App Router, TypeScript, Tailwind CSS, shadcn/ui |
| Localization | next-intl with English and Amharic |
| Backend | NestJS with REST and OpenAPI |
| Database | PostgreSQL with Prisma ORM |
| Authentication | Keycloak using OpenID Connect |
| Authorization | Kal_flow domain permissions enforced by NestJS |
| Jobs | BullMQ with Redis |
| Documents | S3-compatible object storage, initially MinIO |
| Repository | pnpm workspace monorepo |
| Deployment | Containerized and self-hostable |

## System boundaries

- **Next.js web and BFF:** renders the user interface, manages locale routing, initiates OIDC flows, and keeps session tokens out of browser storage.
- **Keycloak:** owns identity, authentication, MFA, sessions, password policy, and future federation.
- **NestJS API:** owns business rules, tenant scoping, authorization, workflows, and transaction boundaries.
- **PostgreSQL:** stores relational application state and append-only audit events.
- **Object storage:** stores contract files; PostgreSQL stores their metadata, hashes, versions, and access rules.
- **Worker:** processes reminders, exports, notifications, and document jobs through BullMQ and Redis.

## Domain modules

The API is one deployable application with explicit internal modules:

- Organizations
- Users and access control
- Contracts
- Templates
- Clauses
- Workflows and approvals
- Obligations
- Documents
- Notifications
- Reports
- Audit
- Localization

Modules should expose clear application services and avoid leaking persistence details across boundaries. Domain logic belongs in services and domain components, not controllers.

## Authentication flow

Kal_flow uses the OpenID Connect Authorization Code flow with PKCE through the Next.js backend-for-frontend boundary. Secure HttpOnly cookies are used for the browser session; access and refresh tokens must not be stored in `localStorage`.

Authentication and authorization are deliberately separate:

- Keycloak verifies identity and manages login sessions.
- Kal_flow stores organizations, memberships, department roles, contract permissions, and approval authority.
- NestJS performs the final authorization check for every protected operation.

## Organization authorization

Keycloak identities are synchronized into the application user table on the first authenticated API request. Access to an organization requires an active membership in an active organization. Roles map to named permissions in NestJS; frontend visibility never grants authority.

The initial roles are owner, administrator, contract manager, legal officer, department manager, finance officer, procurement officer, contract owner, auditor, and viewer. Organization creation atomically grants the creator the owner membership. A dedicated transaction-safe workflow transfers ownership by demoting the previous owner to administrator and promoting one active member; general membership operations cannot assign or remove the owner role.

Departments are tenant-owned hierarchical records. Parent validation and membership assignment always include the organization boundary. Invitations contain a single-use random token; only its SHA-256 digest is persisted, it expires after seven days, and acceptance requires the authenticated Keycloak email to match the invitation email.

Organization, membership, department, invitation, and ownership mutations write an audit event inside the same PostgreSQL transaction. Audit events are append-only: the API exposes paginated reads but no update or delete operation.

## Data principles

- Use UUID primary keys.
- Add `organization_id` to every tenant-owned record.
- Use foreign keys, unique constraints, check constraints, and transactions for lifecycle integrity.
- Use `jsonb` only for configurable attributes, not core relationships.
- Start with PostgreSQL full-text search and `pg_trgm`.
- Keep audit events append-only.
- Store contract file bytes in S3-compatible object storage rather than ordinary database rows.
- Maintain encrypted, tested backups.

## Deployment model

The initial deployment contains the web application, API, background worker, Keycloak, PostgreSQL, Redis, and S3-compatible object storage. These services are containerized for local and self-hosted environments.

The modular monolith may be split only when measured scaling, reliability, ownership, or deployment requirements justify the added distributed-system complexity.

## Architecture decisions

- [ADR-0001: Adopt the Initial Application Stack](architecture/adr/0001-application-stack.md) — Accepted
- [ADR-0002: Separate Identity from Organization Authorization](architecture/adr/0002-identity-organizations-and-authorization.md) — Accepted
