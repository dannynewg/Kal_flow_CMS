# Development environment

Kal_flow supports GitHub Codespaces, VS Code Dev Containers, and a local Docker Compose workflow.

## Codespaces or Dev Containers

1. Copy `.env.example` to `.env`; the committed values are development-only.
2. Open the repository in a Codespace or choose **Dev Containers: Reopen in Container**.
3. Wait for the post-create command to install the pnpm workspace and validate the foundation.

The environment starts PostgreSQL, a separate PostgreSQL instance for Keycloak, Redis, MinIO, and Keycloak. Ports 3000, 4000, 8080, and 9001 are forwarded for the web app, API, identity console, and object-storage console.

## Local Docker workflow

```bash
cp .env.example .env
corepack enable
pnpm install --frozen-lockfile
pnpm infra:up
pnpm db:generate
pnpm db:migrate
pnpm dev
pnpm check
```

Use `pnpm infra:down` to stop services. `pnpm infra:reset` deletes local development volumes and all data in them.

## Local endpoints

| Service | URL or port |
| --- | --- |
| Web application | http://localhost:3000 |
| REST API | http://localhost:4000/v1/health |
| OpenAPI documentation | http://localhost:4000/docs |
| Keycloak | http://localhost:8080 |
| MinIO API | http://localhost:9000 |
| MinIO console | http://localhost:9001 |
| PostgreSQL | localhost:5432 |
| Redis | localhost:6379 |

The example credentials are safe only for isolated local development. Production environments must inject unique secrets through their deployment platform.

## Local authentication

The development realm imports a confidential `kal-flow-web` client using Authorization Code with PKCE and a bearer-only `kal-flow-api` audience. Sign in with `admin@kalflow.local` and the temporary password `ChangeMe123!`; Keycloak requires a password change on first login. These credentials are strictly for an isolated development environment.

After login, the user may create an organization through the BFF endpoint. The creator receives the owner membership atomically. Existing organization data remains inaccessible until an active membership grants the required permission.
