#!/usr/bin/env bash
set -euo pipefail

FRONTEND_ROOT="$(cd "$(dirname "$0")/../frontend" && pwd)"
pushd "$FRONTEND_ROOT" >/dev/null

if [ ! -d node_modules ]; then
  npm install
fi

npm run dev

popd >/dev/null
