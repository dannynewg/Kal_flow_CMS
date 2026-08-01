import { existsSync, readFileSync } from 'node:fs';

const requiredPaths = [
  '.devcontainer/devcontainer.json',
  '.env.example',
  '.github/workflows/foundation.yml',
  'apps/api/README.md',
  'apps/web/README.md',
  'apps/worker/README.md',
  'infrastructure/docker/compose.yaml',
  'infrastructure/keycloak/realm/kal-flow-realm.json',
  'packages/configuration/README.md',
  'packages/contracts/README.md',
  'packages/database/README.md',
  'packages/localization/locales/am/common.json',
  'packages/localization/locales/en/common.json',
  'packages/ui/README.md',
  'pnpm-workspace.yaml',
  'tsconfig.base.json'
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
  'tsconfig.base.json'
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

console.log('Kal_flow repository foundation is valid.');
