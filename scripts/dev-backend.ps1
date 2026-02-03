param(
  [string]$DbUser = "quitotine",
  [string]$DbPass = "quitotine",
  [string]$DbName = "quitotine",
  [string]$DbHost = "localhost",
  [int]$DbPort = 5432,
  [string]$VenvPath = ".venv"
)

$ErrorActionPreference = "Stop"

$BackendRoot = Join-Path $PSScriptRoot "..\\backend"
Push-Location $BackendRoot

try {
  if (-not (Test-Path $VenvPath)) {
    python -m venv $VenvPath
  }

  & "$VenvPath\\Scripts\\Activate.ps1"

  pip install -r requirements.txt

  $env:DATABASE_URL = "postgresql+psycopg2://$DbUser`:$DbPass@$DbHost`:$DbPort/$DbName"
  $env:SECRET_KEY = $env:SECRET_KEY ?? "dev-secret-change"
  $env:ACCESS_TOKEN_EXPIRE_MINUTES = $env:ACCESS_TOKEN_EXPIRE_MINUTES ?? "30"
  $env:REFRESH_TOKEN_EXPIRE_DAYS = $env:REFRESH_TOKEN_EXPIRE_DAYS ?? "30"
  $env:CORS_ORIGINS = $env:CORS_ORIGINS ?? "http://localhost:3000,http://localhost:5173,http://127.0.0.1:3000"

  uvicorn app.main:app --reload
}
finally {
  Pop-Location
}
