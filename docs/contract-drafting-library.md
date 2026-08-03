# Contract Drafting Library

Kal_flow provides a tenant-scoped drafting library for building consistent English, Amharic, or bilingual contract versions from organization-approved clauses.

## Capabilities

- Clause records contain an organization-unique code, category, English and Amharic titles, English and Amharic wording, risk level, and internal review guidance.
- Templates arrange one to forty active organization clauses in an explicit order.
- Contract managers and contract owners can apply an active template only while a contract is in `DRAFT` or `CHANGES_REQUESTED`.
- Template application creates a new immutable `ContractVersion`; it never overwrites an existing version.
- Generated versions record their source template and write an append-only audit event.
- Any authorized contract reader can compare two versions with line-level additions, removals, and unchanged-line counts.

## Template variables

The composition engine supplies these values from the tenant-scoped contract record:

- `{{organization_name}}`
- `{{contract_number}}`
- `{{contract_title}}`
- `{{counterparty_name}}`
- `{{contract_value}}`
- `{{effective_date}}`
- `{{expiration_date}}`

Callers may provide up to thirty additional short `snake_case` string values. Unknown placeholders remain visibly bracketed in the generated draft so missing information cannot silently disappear.

## Permissions

| Capability | Permission |
| --- | --- |
| Read templates and clauses | `library.read` |
| Create templates and clauses | `library.manage` |
| Generate a contract version | `contract.manage` |
| Compare contract versions | `contract.read` |

Every API query includes the active organization boundary. A template cannot reference a clause from another tenant, and a template from one tenant cannot generate a version for another tenant's contract.

## Legal review boundary

The included seed content is fictional demonstration material and is not legal advice. Organizations must have qualified Ethiopian legal professionals review templates, Amharic translations, dispute language, tax treatment, sector requirements, and each production contract before use. Library status and audit history support governance but do not replace professional review.

## API endpoints

| Capability | Endpoint |
| --- | --- |
| List/create clauses | `GET/POST /v1/organizations/:organizationId/clause-library` |
| List/create templates | `GET/POST /v1/organizations/:organizationId/contract-templates` |
| Generate draft version | `POST /v1/organizations/:organizationId/contracts/:contractId/draft-from-template` |
| Compare versions | `GET /v1/organizations/:organizationId/contracts/:contractId/versions/compare` |
