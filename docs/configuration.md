# Configuration

Copy `.env.example` to `.env` before starting a local environment. The committed values are development-only defaults and must never be reused in production.

## Configuration groups

| Group | Purpose |
| --- | --- |
| Application | Runtime mode, product name, timezone, and supported locales |
| Web and API | Local ports and the API base URL |
| PostgreSQL | Primary application database and Prisma connection URL |
| Redis | BullMQ and transient application coordination |
| MinIO/S3 | Contract-document object storage |
| Keycloak | Identity provider, realm, client, and its dedicated database |
| Uploads | File-size policy baseline |

Codespaces and Dev Containers use the same variables as the local Docker Compose workflow. Service-to-service URLs use Compose names such as `postgres`, `redis`, `minio`, and `keycloak`; browser-facing URLs use `localhost`.

## Secret handling

- Commit only `.env.example`; never commit `.env`.
- Treat every value in the example file as local-development-only.
- Inject production secrets through the hosting platform or an approved secret manager.
- Rotate credentials immediately if a real secret enters Git history.
- Do not expose Keycloak client secrets, database credentials, or S3 secrets in browser bundles.

See [Development environment](development.md) for setup and service endpoints.
