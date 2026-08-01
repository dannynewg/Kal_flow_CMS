# Configuration

Copy `.env.example` to `.env` before starting a local environment. The committed values are development-only defaults and must never be reused in production.

## Configuration groups

| Group | Purpose |
| --- | --- |
| Application | Runtime mode, product name, timezone, and supported locales |
| Web and API | Browser-facing web URL, internal API URL, and local ports |
| PostgreSQL | Primary application database and Prisma connection URL |
| Redis | BullMQ and transient application coordination |
| MinIO/S3 | Contract-document object storage |
| Keycloak and Auth.js | Identity provider, API audience, web BFF client, callback URL, session encryption, and dedicated identity database |
| Uploads | File-size policy baseline |

Codespaces and Dev Containers use the same variables as the local Docker Compose workflow. `scripts/configure-codespaces.mjs` derives the private forwarded URLs from GitHub's Codespace variables and writes them only to the ignored local `.env`. Service-to-service URLs use Compose names such as `postgres`, `redis`, `minio`, and `keycloak`; browser-facing URLs use the current Codespaces host.

## Secret handling

- Commit only `.env.example`; never commit `.env`.
- Treat every value in the example file as local-development-only.
- Codespaces generates a unique `AUTH_SECRET` when the example placeholder is detected.
- Inject staging and production secrets through the hosting platform or an approved secret manager.
- Rotate credentials immediately if a real secret enters Git history.
- Do not expose Keycloak client secrets, database credentials, or S3 secrets in browser bundles.

See [Development environment](development.md) and [Private Codespaces preview](codespaces-preview.md) for setup and service endpoints.

## Authentication variables

- `KEYCLOAK_URL` is the browser-visible issuer base URL and must match the token issuer.
- `KEYCLOAK_INTERNAL_URL` is used by server processes for token exchange, token refresh, user information, and JWKS retrieval.
- `KEYCLOAK_API_AUDIENCE` identifies the NestJS API audience required in access tokens.
- `AUTH_URL` is the canonical browser-facing Auth.js URL, including the unique Codespaces host in a private preview.
- `AUTH_SECRET` encrypts the HttpOnly BFF session and must be a unique high-entropy staging or production secret.
- `KEYCLOAK_WEB_CLIENT_SECRET` is server-only and must never enter the browser bundle.
