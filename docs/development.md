# Development environment

Kal_flow supports GitHub Codespaces, VS Code Dev Containers, and a local Docker Compose workflow.

## Public GitHub Pages showcase

The static showcase at <https://dannynewg.github.io/Kal_flow_CMS/> provides a public, no-login preview of the product direction. GitHub Actions deploys `apps/showcase` whenever it changes on `main`.

The showcase contains fictional sample data and no secrets. It is deliberately separate from the executable application because GitHub Pages cannot run Next.js server sessions, NestJS, Keycloak, PostgreSQL, Redis, or MinIO. Never add real contracts, personal data, credentials, or production configuration to the showcase.

## Private Codespaces preview

1. In the private repository, select **Code → Codespaces → Create codespace on main**.
2. Wait for the post-create and post-start tasks to finish. The first start installs dependencies, validates the repository, applies Prisma migrations, configures the Keycloak callback, and launches the web, API, and worker processes.
3. Open the forwarded **Kal_flow private preview** port when Codespaces prompts you. Port 3000 opens automatically and remains private to authenticated GitHub users who can access the Codespace.
4. Sign in with `admin@kalflow.local` and the temporary password `ChangeMe123!`. Keycloak requires a password change on first login.

The preview URL is unique to each Codespace. `scripts/configure-codespaces.mjs` writes that URL and a generated Auth.js secret only to the ignored local `.env`, then updates the development Keycloak client's exact redirect URI. PostgreSQL, Redis, MinIO, Keycloak, API, and web ports remain private.

Useful commands inside the Codespace:

```bash
pnpm preview:logs
pnpm preview:stop
pnpm preview:start
pnpm check
```

Rebuilding the Dev Container preserves Docker volumes. Running `pnpm infra:reset` intentionally deletes all local preview data.

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
