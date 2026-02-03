$ErrorActionPreference = "Stop"

$FrontendRoot = Join-Path $PSScriptRoot "..\\frontend"
Push-Location $FrontendRoot

try {
  if (-not (Test-Path node_modules)) {
    npm install
  }

  npm run dev
}
finally {
  Pop-Location
}
