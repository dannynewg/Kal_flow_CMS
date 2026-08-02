# Security Architecture

Kal_flow separates authentication from tenant authorization. Keycloak proves identity; an active PostgreSQL membership in an active organization grants the scoped role used by the NestJS permission guard. Browser visibility never grants authority.

## Implemented controls

- OIDC signature, issuer, expiry, and API-audience verification
- Authorization Code + PKCE and encrypted HttpOnly browser sessions
- Organization-scoped permission checks on every management route
- Organization-scoped contract intake, ownership, version, review, and activation checks
- Explicit owner-only ownership transfer with transactional role changes
- Department parent and membership checks constrained to the same organization
- Cryptographically random invitation tokens with only SHA-256 digests persisted
- Seven-day invitation expiry, revocation, resend, email matching, and single-use acceptance
- Append-only audit events written in the same transaction as each management mutation
- Pagination and role checks for audit-log access
- Input validation through DTOs and database referential constraints

## Operational requirements

- Use TLS for every externally reachable endpoint.
- Replace development credentials before deployment.
- Deliver invitation links through an approved email provider; the API currently returns the one-time token to the trusted caller because notification delivery is not implemented yet.
- Treat audit retention, encrypted backups, document scanning, file validation, and dependency scanning as release requirements before production use.
- Never log access tokens, refresh tokens, invitation tokens, passwords, or uploaded contract contents.

See [Organization and department management](organization-management.md) for endpoints and lifecycle invariants.
See [Contract request intake and workflow](contract-workflow.md) for contract lifecycle permissions and integrity rules.
