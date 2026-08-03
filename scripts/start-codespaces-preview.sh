#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."
mkdir -p .codespaces

node scripts/configure-codespaces.mjs
set -a
# shellcheck disable=SC1091
source .env
set +a

if [[ ! -x packages/database/node_modules/.bin/prisma || ! -x packages/database/node_modules/.bin/tsx ]]; then
  echo "Workspace dependencies are incomplete; repairing the pnpm installation..."
  if [[ "${CODESPACES:-false}" == "true" ]]; then
    sudo mkdir -p /home/node/.local/share/pnpm
    sudo chown -R "$(id -u):$(id -g)" /home/node/.local/share/pnpm
  fi
  pnpm install --frozen-lockfile
fi

pnpm db:generate
pnpm --filter @kal-flow/database migrate:deploy
pnpm db:seed
pnpm --filter @kal-flow/database build
node scripts/configure-codespaces.mjs --keycloak
node scripts/configure-demo-users.mjs

pid_file=.codespaces/preview.pid
log_file=.codespaces/preview.log
if [[ -f "$pid_file" ]] && kill -0 "$(<"$pid_file")" 2>/dev/null; then
  echo "Kal_flow preview is already running (PID $(<"$pid_file"))."
else
  nohup setsid pnpm dev >"$log_file" 2>&1 &
  echo "$!" >"$pid_file"
fi

for attempt in {1..45}; do
  if curl --fail --silent http://localhost:3000/api/health >/dev/null && \
     curl --fail --silent http://localhost:4000/v1/health >/dev/null; then
    node scripts/configure-codespaces.mjs --print
    exit 0
  fi
  if ! kill -0 "$(<"$pid_file")" 2>/dev/null; then
    tail -n 100 "$log_file"
    echo "Kal_flow preview exited before becoming healthy." >&2
    exit 1
  fi
  sleep 2
done

tail -n 100 "$log_file"
echo "Kal_flow preview did not become healthy in time." >&2
exit 1
