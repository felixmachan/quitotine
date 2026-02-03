#!/usr/bin/env bash
set -euo pipefail

BACKEND_ROOT="$(cd "$(dirname "$0")/../backend" && pwd)"
pushd "$BACKEND_ROOT" >/dev/null

DB_USER=${DB_USER:-quitotine}
DB_PASS=${DB_PASS:-quitotine}
DB_NAME=${DB_NAME:-quitotine}
DB_HOST=${DB_HOST:-localhost}
DB_PORT=${DB_PORT:-5432}
VENV_PATH=${VENV_PATH:-.venv}

if [ ! -d "$VENV_PATH" ]; then
  python -m venv "$VENV_PATH"
fi

# shellcheck source=/dev/null
if [ -f "$VENV_PATH/Scripts/activate" ]; then
  source "$VENV_PATH/Scripts/activate"
elif [ -f "$VENV_PATH/bin/activate" ]; then
  source "$VENV_PATH/bin/activate"
fi

pip install -r requirements.txt

export DATABASE_URL="postgresql+psycopg2://${DB_USER}:${DB_PASS}@${DB_HOST}:${DB_PORT}/${DB_NAME}"
export SECRET_KEY=${SECRET_KEY:-dev-secret-change}
export ACCESS_TOKEN_EXPIRE_MINUTES=${ACCESS_TOKEN_EXPIRE_MINUTES:-30}
export REFRESH_TOKEN_EXPIRE_DAYS=${REFRESH_TOKEN_EXPIRE_DAYS:-30}
export CORS_ORIGINS=${CORS_ORIGINS:-"http://localhost:3000,http://localhost:5173,http://127.0.0.1:3000"}

uvicorn app.main:app --reload

popd >/dev/null
