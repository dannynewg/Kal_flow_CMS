#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."
pid_file=.codespaces/preview.pid
if [[ ! -f "$pid_file" ]]; then
  echo "Kal_flow preview is not running."
  exit 0
fi

pid="$(<"$pid_file")"
if kill -0 "$pid" 2>/dev/null; then
  kill -- "-$pid" 2>/dev/null || kill "$pid" 2>/dev/null || true
fi
rm -f "$pid_file"
echo "Kal_flow preview stopped."
