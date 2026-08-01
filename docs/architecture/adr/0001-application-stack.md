# ADR-0001: Adopt the Initial Application Stack

- **Status:** Accepted
- **Date:** 2026-08-01
- **Decision owners:** Kal_flow maintainers

## Context

Kal_flow needs a stable application architecture before executable code is generated. The system will manage confidential contracts for Ethiopian organizations and must support:

- English and Amharic user experiences
- Self-hosted and containerized deployment
- Multi-organization data isolation
- Configurable role-based and contract-level authorization
- Reliable audit trails and lifecycle transactions
- Document storage, reminders, exports, and future integrations
- A development model that remains maintainable while the product is still evolving

The repository is currently documentation-first, so this decision can be adopted without migrating an existing application.

## Decision

Kal_flow will use a **TypeScript modular monolith** in a **pnpm monorepo**.

| Layer | Selected technology |
| --- | --- |
| Web application | Next.js App Router, TypeScript, Tailwind CSS, shadcn/ui |
| Localization | next-intl with English and Amharic resources |
| Forms and data tables | React Hook Form, Zod, TanStack Table |
| API | NestJS, TypeScript, REST, OpenAPI |
| Primary database | PostgreSQL |
| ORM and migrations | Prisma |
| Authentication | Keycloak over OpenID Connect |
| Authorization | Kal_flow domain permissions enforced by NestJS |
| Background processing | BullMQ and Redis |
| Contract file storage | S3-compatible object storage, initially MinIO |
| Packaging | pnpm workspaces |
| Deployment | Containerized, self-hostable services |

### Application shape

The initial backend will be one deployable NestJS application organized into domain modules. Contract creation, review, approvals, document versions, obligations, and audit records frequently share transaction boundaries; they should remain in one process and one primary database until operational evidence justifies extraction.

The initial domain modules are:

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

A separate worker application may consume background jobs while sharing domain contracts and database packages with the API.

### Authentication and authorization

Keycloak owns identity concerns:

- Login and logout
- User sessions
- Multi-factor authentication
- Password and account policies
- OpenID Connect tokens
- Future identity federation

Kal_flow owns application authorization concerns:

- Organizations and memberships
- Department and workflow roles
- Contract-level permissions
- Approval authority
- Resource access decisions

The browser will use the OpenID Connect Authorization Code flow with PKCE through the Next.js backend-for-frontend boundary. Access and refresh tokens must not be stored in browser `localStorage`. The NestJS API remains the final authorization enforcement point for every protected operation.

### Data and documents

PostgreSQL is the system of record for relational application data. Tenant-owned tables must include an `organization_id`, and lifecycle integrity must be protected with transactions, foreign keys, constraints, and append-only audit events.

Contract files must not be stored directly in ordinary database rows. S3-compatible object storage will hold file bytes, while PostgreSQL stores metadata, object references, versions, cryptographic hashes, and access rules.

## Consequences

### Positive

- TypeScript can be shared across the web, API, workers, and common packages.
- A modular monolith keeps deployment and transactions simpler during early development.
- PostgreSQL matches the relational and audit-heavy contract domain.
- Keycloak provides mature, self-hostable identity and federation capabilities.
- The BFF pattern reduces token exposure in the browser.
- The stack supports containerized deployment and future service extraction.

### Trade-offs

- Keycloak and Redis add operational services that must be deployed and monitored.
- Next.js and NestJS remain separate runtime applications even though they share a monorepo.
- Prisma does not replace explicit database constraints or careful transaction design.
- Organization isolation and authorization require consistent enforcement in application and database access patterns.
- The team must maintain English and Amharic localization from the start.

## Alternatives considered

### Microservices from the first release

Rejected for the initial release because service boundaries, distributed transactions, observability, and operational overhead would slow development before scaling requirements are known.

### Custom password authentication

Rejected because authentication, MFA, recovery, session security, and identity federation are security-sensitive capabilities already provided by Keycloak.

### MongoDB as the primary database

Rejected because contracts, organizations, approval sequences, versions, obligations, permissions, and audits are strongly relational and benefit from PostgreSQL constraints and transactions.

### Elasticsearch in the initial release

Deferred. PostgreSQL full-text search and `pg_trgm` are sufficient until measured search requirements justify a separate search service.

## Implementation constraints

Future executable scaffolding must:

1. Follow the repository structure documented in the root README.
2. Keep domain logic out of transport controllers and UI components.
3. Generate and maintain OpenAPI documentation for the REST API.
4. Enforce organization scoping and authorization on every protected operation.
5. Treat audit records as append-only.
6. Store secrets outside source control.
7. include English and Amharic translation resources for user-facing features.
8. Add automated tests for authentication, authorization, tenant isolation, workflows, and audit creation.

## Revisit conditions

Revisit this ADR when production evidence shows a need for:

- Independent scaling or deployment of a domain module
- A dedicated search engine
- Database-enforced row-level security
- A different identity provider required by customer infrastructure
- A separate event platform beyond the transactional outbox and job queue

Any replacement decision must be recorded in a new ADR that supersedes this one.
