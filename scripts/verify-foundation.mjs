import { existsSync, readFileSync } from 'node:fs';

const requiredPaths = [
  '.devcontainer/devcontainer.json',
  '.env.example',
  '.github/workflows/foundation.yml',
  'apps/api/src/main.ts',
  'apps/api/src/auth/authentication.guard.ts',
  'apps/api/src/authorization/authorization.guard.ts',
  'apps/api/src/organizations/organizations.controller.ts',
  'apps/web/app/[locale]/page.tsx',
  'apps/web/auth.ts',
  'apps/worker/src/main.ts',
  'docs/codespaces-preview.md',
  'infrastructure/docker/compose.yaml',
  'infrastructure/keycloak/realm/kal-flow-realm.json',
  'packages/configuration/README.md',
  'packages/contracts/README.md',
  'packages/database/prisma/schema.prisma',
  'packages/database/prisma/migrations/20260801190000_identity_and_organizations/migration.sql',
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
