const env = process.env;
const baseUrl = env.CODESPACES === 'true' ? (env.KEYCLOAK_INTERNAL_URL ?? 'http://keycloak:8080') : (env.KEYCLOAK_URL ?? 'http://localhost:8080');
const realm = env.KEYCLOAK_REALM ?? 'kal-flow';
const password = env.DEMO_USER_PASSWORD ?? 'ChangeMe123!';
const users = [
  ['00000000-0000-4000-8000-000000000002', 'manager@kalflow.local', 'Meron', 'Bekele'],
  ['00000000-0000-4000-8000-000000000003', 'legal@kalflow.local', 'Nahom', 'Tadesse'],
  ['00000000-0000-4000-8000-000000000004', 'finance@kalflow.local', 'Selamawit', 'Girma'],
  ['00000000-0000-4000-8000-000000000005', 'procurement@kalflow.local', 'Dawit', 'Kebede'],
  ['00000000-0000-4000-8000-000000000006', 'auditor@kalflow.local', 'Hana', 'Mekonnen'],
];

async function readyToken() {
  for (let attempt = 1; attempt <= 45; attempt += 1) {
    try {
      const response = await fetch(`${baseUrl}/realms/master/protocol/openid-connect/token`, { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ grant_type: 'password', client_id: 'admin-cli', username: env.KEYCLOAK_ADMIN ?? 'admin', password: env.KEYCLOAK_ADMIN_PASSWORD ?? 'admin_local_change_me' }) });
      if (response.ok) return (await response.json()).access_token;
    } catch { /* Keycloak is still starting. */ }
    if (attempt === 45) throw new Error('Keycloak did not become ready while provisioning demo users');
    await new Promise((resolve) => setTimeout(resolve, 2_000));
  }
}

const token = await readyToken();
const headers = { authorization: `Bearer ${token}`, 'content-type': 'application/json' };
for (const [id, email, firstName, lastName] of users) {
  const lookup = await fetch(`${baseUrl}/admin/realms/${realm}/users?username=${encodeURIComponent(email)}&exact=true`, { headers });
  if (!lookup.ok) throw new Error(`Unable to inspect demo user ${email} (${lookup.status})`);
  if ((await lookup.json()).length) continue;
  const response = await fetch(`${baseUrl}/admin/realms/${realm}/users`, { method: 'POST', headers, body: JSON.stringify({ id, username: email, email, emailVerified: true, enabled: true, firstName, lastName, credentials: [{ type: 'password', value: password, temporary: false }] }) });
  if (!response.ok) throw new Error(`Unable to create demo user ${email} (${response.status})`);
}
console.log('Kal_flow role-testing identities are ready.');
