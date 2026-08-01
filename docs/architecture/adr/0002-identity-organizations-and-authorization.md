# ADR-0002: Separate Identity from Organization Authorization

- Status: Accepted
- Date: 2026-08-01
- Decision owners: Kal_flow maintainers

## Context

Kal_flow is a multi-organization contract-management system. Authentication must support self-hosting, MFA, federation, and secure browser sessions, while authorization must reflect organization-specific responsibilities that can differ for the same person in different organizations.

## Decision

Keycloak is the identity provider and issues OpenID Connect tokens. The Next.js backend-for-frontend uses Authorization Code with PKCE and keeps tokens in an encrypted HttpOnly session cookie. NestJS validates access-token signature, issuer, expiry, and the `kal-flow-api` audience.

Kal_flow stores users, organizations, and memberships in PostgreSQL. A membership assigns exactly one organization role and status to a user. NestJS maps roles to named permissions and performs the final check on every protected organization operation. Client-side visibility is never treated as authorization.

An authenticated user may create an organization and becomes its owner in the same database transaction. Owner membership cannot be reassigned through the general membership endpoint; ownership transfer requires a future dedicated workflow.

## Initial roles

`OWNER`, `ADMIN`, `CONTRACT_MANAGER`, `LEGAL_OFFICER`, `DEPARTMENT_MANAGER`, `FINANCE_OFFICER`, `PROCUREMENT_OFFICER`, `CONTRACT_OWNER`, `AUDITOR`, and `VIEWER`.

The initial permission surface covers organization read/manage and membership read/manage. Contract permissions will be added with the contract domain rather than inferred prematurely.

## Consequences

- A Keycloak account alone grants no access to an existing organization.
- The same identity can hold different roles in different organizations.
- Tenant status and membership status are checked before role permissions.
- Access and refresh tokens are not stored in browser local storage.
- Membership changes and ownership transfer require later audit and invitation workflows before production readiness.
