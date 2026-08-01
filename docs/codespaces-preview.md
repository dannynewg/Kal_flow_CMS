# Private Codespaces preview

The Codespaces preview is Kal_flow's temporary development release environment. It runs the complete application stack from the private repository and is not a production or staging deployment.

## Lifecycle

- Dev Container creation installs the pinned pnpm workspace and runs repository validation.
- Container startup applies committed Prisma migrations, updates the development Keycloak redirect URI for the current Codespace, and starts the web, API, and worker processes.
- The web preview opens through private port 3000. GitHub authentication controls access to every forwarded port.
- PostgreSQL, Keycloak PostgreSQL, Redis, and MinIO data use named Docker volumes and survive ordinary Codespace restarts.
- Deleting the Codespace or resetting infrastructure removes the preview and its local data.

## Security boundary

- Do not change any forwarded port to public.
- Never enter production credentials, real contracts, personal data, or confidential documents.
- `.env` contains generated development configuration and is ignored by Git.
- The browser uses the forwarded Keycloak URL; server-side token and JWKS calls use the internal Compose network.
- The development account and client secret are disposable and must never be reused for staging or production.

## Troubleshooting

```bash
pnpm preview:logs
pnpm preview:stop
pnpm preview:start
pnpm check
```

If a stale Keycloak import prevents login and no preview data must be preserved, reset the local volumes and rebuild the container:

```bash
pnpm preview:stop
pnpm infra:reset
```

For persistent staging, use separate managed secrets, HTTPS hostnames, backups, and production Keycloak/database settings. Codespaces configuration must not be promoted unchanged.
