import { randomBytes } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

const envPath = '.env';
const examplePath = '.env.example';
const isCodespace = process.env.CODESPACES === 'true';

function parseEnv(content) {
  return Object.fromEntries(
    content
      .split(/\r?\n/)
      .filter((line) => line && !line.startsWith('#') && line.includes('='))
      .map((line) => {
        const separator = line.indexOf('=');
        return [line.slice(0, separator), line.slice(separator + 1)];
      }),
  );
}

function updateEnv(content, updates) {
  const remaining = new Map(Object.entries(updates));
  const lines = content.split(/\r?\n/).map((line) => {
    const separator = line.indexOf('=');
    const key = separator > 0 ? line.slice(0, separator) : '';
    if (!remaining.has(key)) return line;
    const value = remaining.get(key);
    remaining.delete(key);
    return `${key}=${value}`;
  });
  for (const [key, value] of remaining) lines.push(`${key}=${value}`);
  return `${lines.join('\n').replace(/\n+$/, '')}\n`;
}

function previewUrls() {
  if (!isCodespace) {
    return {
      web: 'http://localhost:3000',
      api: 'http://localhost:4000',
      keycloak: 'http://localhost:8080',
      minio: 'http://localhost:9001',
    };
  }
  const name = process.env.CODESPACE_NAME;
  const domain = process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN;
  if (!name || !domain) throw new Error('Codespaces forwarding variables are unavailable');
  const url = (port) => `https://${name}-${port}.${domain}`;
  return { web: url(3000), api: url(4000), keycloak: url(8080), minio: url(9001) };
}

function ensureEnvironment() {
  const initial = existsSync(envPath) ? readFileSync(envPath, 'utf8') : readFileSync(examplePath, 'utf8');
  const current = parseEnv(initial);
  const urls = previewUrls();
  const updates = {
    AUTH_SECRET:
      !current.AUTH_SECRET || current.AUTH_SECRET.startsWith('replace_')
        ? randomBytes(48).toString('base64url')
        : current.AUTH_SECRET,
  };
  if (isCodespace) {
    Object.assign(updates, {
      WEB_URL: urls.web,
      AUTH_URL: urls.web,
      API_URL: 'http://localhost:4000',
      KEYCLOAK_URL: urls.keycloak,
      KEYCLOAK_INTERNAL_URL: 'http://keycloak:8080',
      DATABASE_URL: 'postgresql://kal_flow:kal_flow_local@postgres:5432/kal_flow?schema=public',
      REDIS_URL: 'redis://redis:6379',
    });
  }
  writeFileSync(envPath, updateEnv(initial, updates), { mode: 0o600 });
  return { ...parseEnv(readFileSync(envPath, 'utf8')), ...process.env };
}

const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function configureKeycloak(env) {
  if (!isCodespace) return;
  const internalUrl = env.KEYCLOAK_INTERNAL_URL;
  const realm = env.KEYCLOAK_REALM;
  let tokenResponse;
  for (let attempt = 1; attempt <= 45; attempt += 1) {
    try {
      tokenResponse = await fetch(`${internalUrl}/realms/master/protocol/openid-connect/token`, {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'password',
          client_id: 'admin-cli',
          username: env.KEYCLOAK_ADMIN,
          password: env.KEYCLOAK_ADMIN_PASSWORD,
        }),
      });
      if (tokenResponse.ok) break;
    } catch {
      // Keycloak is still starting.
    }
    if (attempt === 45) throw new Error('Keycloak did not become ready in time');
    await wait(2_000);
  }
  const { access_token: accessToken } = await tokenResponse.json();
  const headers = { authorization: `Bearer ${accessToken}`, 'content-type': 'application/json' };
  const clientsResponse = await fetch(
    `${internalUrl}/admin/realms/${realm}/clients?clientId=${encodeURIComponent(env.KEYCLOAK_WEB_CLIENT_ID)}`,
    { headers },
  );
  if (!clientsResponse.ok) throw new Error(`Unable to read the Keycloak web client (${clientsResponse.status})`);
  const [client] = await clientsResponse.json();
  if (!client) throw new Error('The Keycloak web client was not imported');
  const callback = `${env.WEB_URL}/api/auth/callback/keycloak`;
  const response = await fetch(`${internalUrl}/admin/realms/${realm}/clients/${client.id}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({
      ...client,
      rootUrl: env.WEB_URL,
      baseUrl: env.WEB_URL,
      redirectUris: [callback],
      postLogoutRedirectUris: [`${env.WEB_URL}/*`],
      webOrigins: [env.WEB_URL],
    }),
  });
  if (!response.ok) throw new Error(`Unable to configure the Keycloak web client (${response.status})`);
}

function printUrls() {
  const urls = previewUrls();
  console.log('\nKal_flow development endpoints');
  console.log(`Web:        ${urls.web}`);
  console.log(`API docs:   ${urls.api}/docs`);
  console.log(`Keycloak:   ${urls.keycloak}`);
  console.log(`MinIO:      ${urls.minio}\n`);
}

const env = ensureEnvironment();
if (process.argv.includes('--keycloak')) await configureKeycloak(env);
if (process.argv.includes('--print')) printUrls();
