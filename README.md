# Kal_flow

**Kal_flow** is a Contract Management System (CMS) and ERP platform designed for Ethiopian organizations. It aims to help teams create, review, approve, organize, monitor, renew, and archive contracts within a centralized and localized workspace.

The project is built around the legal, linguistic, and operational requirements of Ethiopian users, including support for Ethiopian contract practices, reusable local templates, and the Amharic language.

> **Project status:** Early development.

## Overview

Many organizations manage contracts across paper files, email threads, spreadsheets, and disconnected storage systems. This makes it difficult to find the latest document, track approvals, monitor obligations, or respond before renewal and expiration deadlines.

Kal_flow is intended to provide a structured contract lifecycle covering:

1. Contract requests
2. Drafting and template selection
3. Legal and departmental review
4. Approval
5. Execution
6. Obligation and milestone monitoring
7. Amendments and version control
8. Renewal, termination, and closure
9. Secure archiving and reporting

## Core Features

### Ethiopian Context

Kal_flow is tailored to the needs of Ethiopian businesses, institutions, NGOs, and public-sector organizations.

Planned localization includes:

- Ethiopian organizational and administrative workflows
- Local date, address, contact, and currency formats
- Ethiopian Birr support
- Configurable departmental approval structures
- Local contract categories and business practices
- Africa/Addis_Ababa timezone support

### Legal Compliance

The system is intended to help organizations structure their contract processes around applicable Ethiopian laws and internal policies.

Compliance-oriented capabilities may include:

- Ethiopian legal clause libraries
- Required-field and document validation
- Legal-review checkpoints
- Approval and authorization controls
- Contract amendment history
- Audit trails
- Expiration and compliance reminders
- Configurable document-retention rules

> **Legal disclaimer:** Kal_flow is a contract-management tool and does not provide legal advice. Contract templates, clauses, workflows, and legal references must be reviewed by qualified Ethiopian legal professionals before production use.

### Ethiopian Contract Templates

Kal_flow is planned to include reusable and customizable Ethiopian contract templates, including:

- Employment agreements
- Service agreements
- Consultancy agreements
- Sales and supply agreements
- Procurement contracts
- Lease and rental agreements
- Construction contracts
- Partnership agreements
- Non-disclosure agreements
- Vendor agreements
- Memoranda of understanding

Organizations will be able to customize templates according to their industry, internal policies, approval structure, and legal requirements.

### Amharic Language Support

Kal_flow is designed to support both Amharic and English.

Localization may cover:

- Application navigation
- Forms and field labels
- Contract templates
- Notifications
- Validation messages
- Reports
- Search
- User-generated contract content

The system may also support bilingual Amharic-English contracts where required.

## Planned Modules

### Contract Repository

A centralized and searchable record of organizational contracts.

Potential fields and capabilities include:

- Contract number
- Contract title and description
- Contract type and category
- Parties and counterparties
- Contract owner and department
- Contract value and currency
- Effective, renewal, and expiration dates
- Contract status
- Related documents
- Tags and classifications
- Advanced search and filtering

### Contract Drafting

Create contracts from approved templates and reusable clauses.

Planned capabilities include:

- Dynamic contract templates
- Clause selection
- Conditional contract sections
- Amharic and English content
- Draft versioning
- Document preview
- Export-ready documents

### Review and Approval Workflows

Configure workflows according to contract type, department, value, risk level, or organizational policy.

Planned capabilities include:

- Sequential approvals
- Parallel approvals
- Role-based routing
- Approval delegation
- Review comments
- Rejection and revision requests
- Escalation rules
- Approval history

### Obligations and Deliverables

Track contractual commitments made by the organization and its counterparties.

Planned capabilities include:

- Obligation owners
- Deliverables
- Milestones
- Payment schedules
- Performance indicators
- Evidence and attachments
- Completion status
- Overdue alerts

### Renewal and Expiration Management

Reduce missed deadlines and unwanted contract renewals.

Planned capabilities include:

- Expiration reminders
- Configurable notification periods
- Auto-renewal indicators
- Renewal assessments
- Termination-notice deadlines
- Renewal and termination history

### Document Management

Store documents associated with each contract, including:

- Drafts
- Signed agreements
- Amendments
- Supporting documents
- Legal opinions
- Approval records
- Correspondence
- Performance reports
- Completion certificates

### Reporting and Dashboards

Provide visibility into contract operations and organizational exposure.

Potential reports include:

- Active contracts
- Expiring contracts
- Contract value by department
- Contracts by category
- Pending approvals
- Overdue obligations
- Renewal pipeline
- Counterparty activity
- Contract risk distribution
- User and audit activity

### User and Access Management

Protect sensitive contract information through role-based access control.

Potential roles include:

| Role | Typical responsibilities |
| --- | --- |
| System Administrator | Manages system configuration, users, roles, and permissions |
| Contract Administrator | Registers contracts and manages lifecycle records |
| Legal Officer | Reviews terms, clauses, legal risks, and compliance |
| Department Manager | Reviews and approves departmental contracts |
| Finance Officer | Reviews values, payment terms, and financial obligations |
| Procurement Officer | Manages supplier and procurement agreements |
| Contract Owner | Monitors performance, milestones, and deliverables |
| Auditor | Reviews contract records, approvals, and audit history |
| Viewer | Accesses authorized contracts without editing them |

Actual permissions should be configurable according to each organization's policies.

### Audit Trail

Important events should be traceable throughout the contract lifecycle, including:

- Contract creation
- Field changes
- Document uploads
- Version updates
- Reviews
- Approvals and rejections
- Status changes
- Renewal and termination actions
- User and administrative activity

## Intended Users

Kal_flow can be adapted for:

- Private companies
- Government institutions
- Non-governmental organizations
- Financial institutions
- Educational institutions
- Healthcare organizations
- Construction companies
- Manufacturing businesses
- Professional service firms
- Procurement departments
- Legal departments
- Human-resource departments

## Benefits

Kal_flow aims to help organizations:

- Centralize contract information
- Standardize contract preparation
- Improve approval accountability
- Reduce missed deadlines
- Track contractual obligations
- Maintain reliable version history
- Strengthen document security
- Improve legal and internal compliance
- Support Amharic-speaking users
- Reduce dependence on paper-based processes
- Improve management reporting and visibility

## Architecture

The initial architecture is accepted in [ADR-0001](docs/architecture/adr/0001-application-stack.md). Kal_flow will begin as a **TypeScript modular monolith** in a **pnpm monorepo**.

| Layer | Selected stack |
| --- | --- |
| Frontend | Next.js App Router, TypeScript, Tailwind CSS, shadcn/ui |
| Localization | next-intl with English and Amharic |
| Backend | NestJS with REST and OpenAPI |
| Database | PostgreSQL with Prisma ORM |
| Authentication | Keycloak using OpenID Connect |
| Authorization | Kal_flow domain permissions enforced by NestJS |
| Background jobs | BullMQ with Redis |
| Contract files | S3-compatible object storage, initially MinIO |
| Deployment | Containerized and self-hostable |

The Next.js application acts as a backend-for-frontend for browser sessions. Keycloak manages identity, login, MFA, and federation; Kal_flow manages organization memberships, department roles, contract-level permissions, and approval authority. The NestJS API performs the final authorization check.

The backend remains one deployable application with explicit domain modules so contract changes, approvals, versions, obligations, and audit events can share reliable transactions. See the [architecture overview](docs/architecture.md) for boundaries and data principles.

## Getting Started

The repository foundation is ready for application scaffolding. It provides a pinned pnpm workspace, GitHub Codespaces/Dev Container configuration, local Docker infrastructure, environment templates, and CI validation.

### Codespaces

1. Open the repository in GitHub Codespaces.
2. Copy `.env.example` to `.env` if the Codespace has not done so already.
3. Wait for the post-create command to install the workspace and run validation.

### Local development

Requirements: Node.js 22+, Corepack, and Docker Compose.

```bash
git clone https://github.com/dannynewg/Kal_flow_CMS.git
cd Kal_flow_CMS
cp .env.example .env
corepack enable
pnpm install --frozen-lockfile
pnpm infra:up
pnpm check
```

Keycloak is available at `http://localhost:8080` and the MinIO console at `http://localhost:9001`. The future web application and API reserve ports 3000 and 4000. See the [development environment guide](docs/development.md) and [configuration reference](docs/configuration.md).

The example credentials are for isolated local development only. Never reuse them in production or commit real passwords, tokens, private keys, or client secrets.

## Project Structure

The accepted pnpm monorepo foundation now uses this structure:

```text
Kal_flow_CMS/
├── .devcontainer/               # Codespaces and VS Code container setup
├── .github/                     # CI, dependency updates, and PR template
├── apps/
│   ├── web/                     # Next.js UI and BFF
│   ├── api/                     # NestJS modular-monolith API
│   └── worker/                  # BullMQ background jobs
├── packages/
│   ├── database/                # Prisma schema, migrations, and seeds
│   ├── contracts/               # Shared API schemas and types
│   ├── localization/            # English and Amharic resources
│   ├── ui/                      # Shared UI components
│   └── configuration/           # Validated shared configuration
├── infrastructure/
│   ├── docker/                  # PostgreSQL, Redis, MinIO, and Keycloak
│   └── keycloak/                # Development realm configuration
├── scripts/                     # Repository validation
├── docs/                        # Architecture and development documentation
├── tests/                       # Cross-application and end-to-end tests
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── package.json
├── .env.example
└── README.md
```

The application directories are boundary placeholders; Next.js, NestJS, Prisma, and worker implementation code will be generated in the next phase. Domain modules—including organizations, users, contracts, templates, clauses, workflows, approvals, obligations, documents, notifications, reports, audit, and localization—will live within the NestJS API rather than as independently deployed microservices.

## Localization Guidelines

When adding user-facing content:

- Do not hard-code interface text inside components
- Store text in localization files
- Provide English and Amharic translations
- Verify Unicode and Ethiopic-script rendering
- Test long Amharic labels in forms, tables, and navigation
- Use locale-aware date and number formatting
- Keep legal terminology consistent
- Have legal translations reviewed by qualified professionals

Example structure:

```text
locales/
├── en/
│   └── common.json
└── am/
    └── common.json
```

## Security Considerations

Contracts can contain confidential, personal, commercial, and legally sensitive information. Production deployments should apply appropriate security controls, including:

- Secure authentication
- Role-based authorization
- Least-privilege permissions
- Strong password hashing
- Session expiration
- Multi-factor authentication where appropriate
- HTTPS enforcement
- Encryption in transit
- Encryption at rest where appropriate
- Input validation
- File-type and file-size validation
- Malware scanning for uploaded documents
- Rate limiting
- Secure secret management
- Audit logging
- Regular backups
- Dependency vulnerability scanning
- Security testing
- Incident-response procedures

Security vulnerabilities should not be published in public issues before maintainers have had an opportunity to review them.

## Testing

Future contributions should include appropriate automated and manual testing.

Important workflows to test include:

- Authentication
- Role and permission enforcement
- Contract creation
- Template generation
- Document upload and download
- Contract review
- Approval routing
- Rejection and resubmission
- Version history
- Obligation reminders
- Renewal notifications
- Reporting
- Amharic rendering
- Audit-log creation

## Contributing

Contributions are welcome.

1. Fork the repository.
2. Create a feature branch.
3. Make a focused change.
4. Add or update tests.
5. Update relevant documentation.
6. Commit the change with a clear message.
7. Push the branch.
8. Open a pull request.

Example:

```bash
git checkout -b feature/contract-renewal-alerts
git add .
git commit -m "feat: add contract renewal alerts"
git push origin feature/contract-renewal-alerts
```

Recommended branch prefixes:

```text
feature/
fix/
docs/
refactor/
test/
chore/
```

A pull request should explain:

- What changed
- Why the change is needed
- How the change was tested
- Any database migration requirements
- Any localization changes
- Any security considerations
- Screenshots for user-interface changes

## Development Principles

Contributors should preserve the following principles:

- **Localization first:** Features should work for Ethiopian users and support Amharic.
- **Security by design:** Contract data must be treated as confidential.
- **Legal review:** Templates and legal rules must be validated by qualified professionals.
- **Traceability:** Important actions should produce reliable audit records.
- **Configurability:** Organizations should be able to adapt workflows to their policies.
- **Accessibility:** Interfaces should remain clear and usable for different users.
- **Maintainability:** Prefer clear modules, tests, documentation, and predictable conventions.

## Roadmap

- [x] Select and document the application technology stack
- [x] Add initial application structure
- [ ] Add authentication and role-based access control
- [ ] Add organization and department management
- [ ] Add contract request intake
- [ ] Add centralized contract repository
- [ ] Add Ethiopian contract template library
- [ ] Add reusable legal clause library
- [ ] Add Amharic and English localization
- [ ] Add configurable approval workflows
- [ ] Add contract version comparison
- [ ] Add obligation and milestone tracking
- [ ] Add expiration and renewal alerts
- [ ] Add counterparty management
- [ ] Add dashboards and reports
- [ ] Add document search
- [ ] Add calendar, email, and SMS integrations
- [ ] Add data import and export
- [ ] Add an application API
- [ ] Add automated tests and CI
- [ ] Add deployment and security documentation

Roadmap items are proposals and do not represent guaranteed release commitments.

## Support

Use GitHub Issues for bug reports, feature requests, and technical discussions.

Before opening an issue:

- Search for an existing report
- Use a descriptive title
- Explain the expected and actual behavior
- Include reproduction steps
- Mention the application version and environment
- Add screenshots or logs where useful
- Remove credentials and confidential information

Do not include passwords, access tokens, private contracts, personal data, legal documents, or production database records in public issues.

## License

A license has not yet been added to this repository.

Before distributing the application or accepting external contributions, add a `LICENSE` file and update this section with the selected terms. Until a license is explicitly provided, all rights remain with the repository owner unless otherwise stated.

## Acknowledgements

Kal_flow is being developed to improve contract administration for Ethiopian organizations through localized workflows, Amharic support, reusable templates, and structured contract lifecycle management.

---

<p align="center">
  <strong>Kal_flow — Contract management designed for Ethiopia.</strong>
</p>
