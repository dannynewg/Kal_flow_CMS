import { existsSync, readFileSync } from 'node:fs';

const requiredPaths = [
  '.devcontainer/devcontainer.json',
  '.env.example',
  '.env.staging.example',
  '.github/workflows/foundation.yml',
  '.github/workflows/pages.yml',
  'apps/api/src/main.ts',
  'apps/api/vitest.config.mts',
  'apps/api/src/auth/authentication.guard.ts',
  'apps/api/src/authorization/authorization.guard.ts',
  'apps/api/src/organizations/organizations.controller.ts',
  'apps/api/src/organizations/departments.controller.ts',
  'apps/api/src/organizations/invitations.controller.ts',
  'apps/api/src/organizations/audit.controller.ts',
  'apps/api/src/contracts/contracts.controller.ts',
  'apps/api/src/contracts/contracts.service.ts',
  'apps/api/src/contracts/documents.service.ts',
  'apps/api/src/storage/storage.service.ts',
  'apps/web/app/[locale]/page.tsx',
  'apps/web/app/[locale]/workspace.tsx',
  'apps/web/app/api/bff/[...path]/route.ts',
  'apps/web/auth.ts',
  'apps/showcase/index.html',
  'apps/showcase/styles.css',
  'apps/showcase/app.js',
  'apps/worker/src/main.ts',
  'docs/codespaces-preview.md',
  'docs/organization-management.md',
  'docs/contract-workflow.md',
  'docs/staging-deployment.md',
  'infrastructure/docker/compose.yaml',
  'infrastructure/docker/compose.staging.yaml',
  'infrastructure/docker/Dockerfile.staging',
  'infrastructure/staging/Caddyfile',
  'infrastructure/staging/configure-keycloak.sh',
  'infrastructure/keycloak/realm/kal-flow-realm.json',
  'packages/configuration/README.md',
  'packages/contracts/README.md',
  'packages/database/prisma/schema.prisma',
  'packages/database/prisma/migrations/20260801190000_identity_and_organizations/migration.sql',
  'packages/database/prisma/migrations/20260802190000_organization_departments_invitations_audit/migration.sql',
  'packages/database/prisma/migrations/20260802220000_contract_request_and_workflow/migration.sql',
  'packages/database/prisma/migrations/20260803100000_contract_documents/migration.sql',
  'packages/database/prisma.config.ts',
  'packages/localization/locales/am/common.json',
  'packages/localization/locales/en/common.json',
  'packages/ui/src/index.tsx',
  'pnpm-workspace.yaml',
  'scripts/configure-codespaces.mjs',
  'scripts/start-codespaces-preview.sh',
  'scripts/stop-codespaces-preview.sh',
  'tsconfig.base.json',
];

const missing = requiredPaths.filter((path) => !existsSync(path));
if (missing.length > 0) {
  console.error(`Missing foundation paths:\n${missing.join('\n')}`);
  process.exit(1);
}

for (const path of [
  '.devcontainer/devcontainer.json',
  'infrastructure/keycloak/realm/kal-flow-realm.json',
  'packages/localization/locales/am/common.json',
  'packages/localization/locales/en/common.json',
  'package.json',
  'tsconfig.base.json',
]) {
  JSON.parse(readFileSync(path, 'utf8'));
}

const envKeys = readFileSync('.env.example', 'utf8')
  .split('\n')
  .filter((line) => line && !line.startsWith('#'))
  .map((line) => line.split('=', 1)[0]);
const duplicates = envKeys.filter((key, index) => envKeys.indexOf(key) !== index);
if (duplicates.length > 0) {
  console.error(`Duplicate environment keys: ${[...new Set(duplicates)].join(', ')}`);
  process.exit(1);
}

const devcontainer = JSON.parse(readFileSync('.devcontainer/devcontainer.json', 'utf8'));
for (const port of ['3000', '4000', '8080', '9001']) {
  if (devcontainer.portsAttributes?.[port]?.visibility !== 'private') {
    console.error(`Codespaces port ${port} must remain private.`);
    process.exit(1);
  }
}

console.log('Kal_flow repository foundation is valid.');
