# Persistent staging deployment

Kal_flow staging runs the complete authenticated system on one Docker host while keeping PostgreSQL, Redis, the API, and administrative ports private. Caddy terminates TLS for the application, Keycloak, and contract-document storage.

## Prerequisites

- A Linux server with Docker Engine and Compose v2
- At least 4 vCPU, 8 GB RAM, 60 GB persistent disk
- Three DNS `A`/`AAAA` records pointing to the server: application, identity, and storage
- Inbound TCP 80/443 and UDP 443

## First deployment

```bash
git clone https://github.com/dannynewg/Kal_flow_CMS.git
cd Kal_flow_CMS
cp .env.staging.example .env.staging
```

Replace every example domain and secret. Generate secrets with `openssl rand -base64 48`; do not commit `.env.staging`.

```bash
docker compose --env-file .env.staging -f infrastructure/docker/compose.staging.yaml config
docker compose --env-file .env.staging -f infrastructure/docker/compose.staging.yaml up -d --build
docker compose --env-file .env.staging -f infrastructure/docker/compose.staging.yaml ps
```

The migration service applies every committed Prisma migration before the API starts. The Keycloak configuration service then replaces development callbacks and the BFF client secret with staging values.

## Verification

1. Open `https://<APP_DOMAIN>/api/health` and confirm a healthy response.
2. Sign in through `https://<IDP_DOMAIN>`.
3. Create a request, submit it, triage it, and convert it to a contract.
4. Add a draft, run the review route, activate the contract, and upload a test PDF.
5. Confirm the test PDF downloads through a five-minute signed storage URL.

## Operations

```bash
docker compose --env-file .env.staging -f infrastructure/docker/compose.staging.yaml logs -f --tail=200
git pull --ff-only origin main
docker compose --env-file .env.staging -f infrastructure/docker/compose.staging.yaml up -d --build
```

Back up the `postgres-data`, `keycloak-postgres-data`, and `minio-data` volumes before upgrades. Restore drills are required before staging is promoted to production. Production must also add managed backups, malware scanning, external secrets management, monitoring, and a non-bootstrap identity administration process.
